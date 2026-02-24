import { VariableUsageResult, VariableComponentUsage, TextStyleUsageResult } from '@/types/AsyncMessages';

export async function searchVariableUsage(
    msg: { query: string; allPages?: boolean },
): Promise<{ variables: VariableUsageResult[]; textStyles?: TextStyleUsageResult[] }> {
    const { query, allPages = false } = msg;
    const lowerQuery = query.toLowerCase().trim();

    // 1. Get all local variables + collections
    const localVariables = await figma.variables.getLocalVariablesAsync();
    const collections = await figma.variables.getLocalVariableCollectionsAsync();
    const collectionMap = new Map(collections.map((c) => [c.id, c.name]));

    // 2. Get local text styles (async API for reliability across Figma environments)
    const localTextStyles = await figma.getLocalTextStylesAsync();
    const matchingTextStyles = lowerQuery
        ? localTextStyles.filter((s) => s.name.toLowerCase().includes(lowerQuery))
        : localTextStyles;
    const matchingTextStyleIds = new Set(matchingTextStyles.map((s) => s.id));

    // 3. Filter variables by query (fuzzy: any substring match)
    const matchingVars = lowerQuery
        ? localVariables.filter((v) => v.name.toLowerCase().includes(lowerQuery))
        : localVariables;

    const matchingVarIds = new Set(matchingVars.map((v) => v.id));

    if (matchingVars.length === 0 && matchingTextStyles.length === 0) {
        return { variables: [], textStyles: [] };
    }

    // 4. Map: variableId → { pageName, totalCount, components: Map<ComponentName, nodeIds[]> }
    type UsageEntry = { pageName: string; totalCount: number; components: Map<string, string[]> };
    const usageMap = new Map<string, UsageEntry>();
    const textStyleUsageMap = new Map<string, UsageEntry>();

    // Helper: find closest named component
    function findClosestComponent(node: SceneNode): string | null {
        let current: BaseNode | null = node;
        while (current) {
            if (
                current.type === 'COMPONENT' ||
                current.type === 'COMPONENT_SET' ||
                current.type === 'INSTANCE'
            ) {
                return current.name;
            }
            current = current.parent;
        }
        return null;
    }

    // Extract all variable IDs bound to a node
    function extractVariableIdsFromNode(node: SceneNode): string[] {
        const ids: string[] = [];
        const bv = node.boundVariables;
        if (!bv) return ids;

        Object.entries(bv).forEach(([key, value]) => {
            if (key === 'componentProperties' && value) {
                Object.values(value).forEach((alias: any) => {
                    if (alias && alias.id) ids.push(alias.id);
                });
            } else if (Array.isArray(value)) {
                value.forEach((alias: any) => {
                    if (alias && alias.id) ids.push(alias.id);
                });
            } else if (value && (value as any).id) {
                ids.push((value as any).id);
            }
        });

        return ids;
    }

    // Walk a page, accumulate usage into usageMap
    async function traversePage(pageChildren: readonly SceneNode[], pageName: string) {
        const queue: SceneNode[] = [];
        for (const child of pageChildren) {
            queue.push(child);
        }

        let processedCount = 0;
        const CHECK_INTERVAL = 10;
        const YIELD_MS = 12;
        let lastYieldTime = Date.now();

        while (queue.length > 0) {
            const node = queue.pop();
            if (!node) continue;

            processedCount++;

            if (processedCount % CHECK_INTERVAL === 0) {
                const now = Date.now();
                if (now - lastYieldTime > YIELD_MS) {
                    await new Promise((resolve) => setTimeout(resolve, 5));
                    lastYieldTime = Date.now();
                }
            }

            try {
                if ('boundVariables' in node && node.boundVariables) {
                    const varIds = extractVariableIdsFromNode(node);
                    for (const varId of varIds) {
                        if (matchingVarIds.has(varId)) {
                            if (!usageMap.has(varId)) {
                                usageMap.set(varId, { pageName, totalCount: 0, components: new Map() });
                            }
                            const entry = usageMap.get(varId)!;
                            entry.totalCount += 1;

                            const componentName = findClosestComponent(node) || '(Unstyled / Frame)';
                            if (!entry.components.has(componentName)) {
                                entry.components.set(componentName, []);
                            }
                            entry.components.get(componentName)!.push(node.id);
                        }
                    }
                }
                // Track text style usage
                if (matchingTextStyleIds.size > 0 && node.type === 'TEXT' && 'textStyleId' in node && node.textStyleId && node.textStyleId !== figma.mixed) {
                    const styleId = node.textStyleId as string;
                    if (matchingTextStyleIds.has(styleId)) {
                        if (!textStyleUsageMap.has(styleId)) {
                            textStyleUsageMap.set(styleId, { pageName, totalCount: 0, components: new Map() });
                        }
                        const entry = textStyleUsageMap.get(styleId)!;
                        entry.totalCount += 1;
                        const componentName = findClosestComponent(node) || '(Unstyled / Frame)';
                        if (!entry.components.has(componentName)) {
                            entry.components.set(componentName, []);
                        }
                        entry.components.get(componentName)!.push(node.id);
                    }
                }
            } catch (e) {
                // skip problem nodes silently
            }

            if ('children' in node) {
                const children = (node as ChildrenMixin).children;
                for (const child of children) {
                    queue.push(child);
                }
            }
        }
    }

    // 4. Determine which pages to scan
    if (allPages) {
        // Walk every page in the document
        for (const page of figma.root.children) {
            // Load the page if needed (avoids "Page not loaded" error on remote pages)
            try {
                await page.loadAsync();
            } catch (_) {
                // page may already be loaded or not support loadAsync
            }
            await traversePage(page.children, page.name);
        }
    } else {
        await traversePage(figma.currentPage.children, figma.currentPage.name);
    }

    // 6. Format variable results
    const variables: VariableUsageResult[] = matchingVars.map((v) => {
        const usage = usageMap.get(v.id);
        const components: VariableComponentUsage[] = [];
        if (usage) {
            usage.components.forEach((nodeIds, componentName) => {
                components.push({ componentName, nodeIds });
            });
        }

        return {
            variableName: v.name,
            variableId: v.id,
            collectionName: collectionMap.get(v.variableCollectionId) || 'Unknown Collection',
            totalCount: usage ? usage.totalCount : 0,
            componentCount: components.length,
            components,
            pageName: usage ? usage.pageName : undefined,
        };
    });

    // 7. Format text style results
    const textStyles: TextStyleUsageResult[] = matchingTextStyles.map((s) => {
        const usage = textStyleUsageMap.get(s.id);
        const components: VariableComponentUsage[] = [];
        if (usage) {
            usage.components.forEach((nodeIds, componentName) => {
                components.push({ componentName, nodeIds });
            });
        }
        return {
            styleName: s.name,
            styleId: s.id,
            totalCount: usage ? usage.totalCount : 0,
            componentCount: components.length,
            components,
            pageName: usage ? usage.pageName : undefined,
        };
    });

    // Sort by usage count desc
    variables.sort((a, b) => b.totalCount - a.totalCount);
    textStyles.sort((a, b) => b.totalCount - a.totalCount);

    return { variables, textStyles };
}

