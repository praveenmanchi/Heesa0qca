import { VariableUsageResult, VariableComponentUsage, TextStyleUsageResult } from '@/types/AsyncMessages';

/** Recursively extract all variable alias IDs from any boundVariables structure (handles nested effects, layoutGrids, etc.) */
function extractVariableIdsRecursive(value: unknown): string[] {
  const ids: string[] = [];
  if (!value) return ids;
  if (typeof value === 'object' && value !== null && 'id' in value && typeof (value as { id?: unknown }).id === 'string') {
    ids.push((value as { id: string }).id);
    return ids;
  }
  if (Array.isArray(value)) {
    value.forEach((item) => ids.push(...extractVariableIdsRecursive(item)));
    return ids;
  }
  if (typeof value === 'object' && value !== null) {
    Object.values(value).forEach((v) => ids.push(...extractVariableIdsRecursive(v)));
  }
  return ids;
}

/** Extract variable IDs from styles applied to a node */
function getVariableIdsFromStyles(node: SceneNode): string[] {
  const ids: string[] = [];
  const props = ['fillStyleId', 'strokeStyleId', 'textStyleId', 'effectStyleId', 'gridStyleId'];
  props.forEach((prop) => {
    if (prop in node && typeof (node as any)[prop] === 'string' && (node as any)[prop] !== '') {
      const styleId = (node as any)[prop];
      const style = figma.getStyleById(styleId);
      if (style && style.boundVariables) {
        ids.push(...extractVariableIdsRecursive(style.boundVariables));
      }
    }
  });
  return ids;
}

export async function searchVariableUsage(
  msg: { query: string; allPages?: boolean },
): Promise<{ variables: VariableUsageResult[]; textStyles?: TextStyleUsageResult[] }> {
  const { query, allPages = false } = msg;
  const lowerQuery = query.toLowerCase().trim();

  // 1. Get all local variables + collections
  const localVariables = await figma.variables.getLocalVariablesAsync();
  const collections = await figma.variables.getLocalVariableCollectionsAsync();
  const collectionMap = new Map(collections.map((c) => [c.id, c.name]));
  const collectionModesMap = new Map(collections.map((c) => [c.id, c.modes]));

  // 2. Get local text styles (async API for reliability across Figma environments)
  const localTextStyles = await figma.getLocalTextStylesAsync();
  const matchingTextStylesFromLocal = lowerQuery
    ? localTextStyles.filter((s) => s.name.toLowerCase().includes(lowerQuery))
    : localTextStyles;
  // Include library text styles found during traversal
  const matchingTextStyles: TextStyle[] = [...matchingTextStylesFromLocal];
  const matchingTextStyleIds = new Set(matchingTextStyles.map((s) => s.id));

  // 3. Filter local variables by query (fuzzy: any substring match)
  const matchingVarsFromLocal = lowerQuery
    ? localVariables.filter((v) => v.name.toLowerCase().includes(lowerQuery))
    : localVariables;

  // Include library variables found during traversal; start with local matches
  const matchingVars = [...matchingVarsFromLocal];
  const matchingVarIds = new Set(matchingVars.map((v) => v.id));

  // 3b. Search Team Libraries for published variables that match the query
  if (lowerQuery) {
    try {
      figma.ui.postMessage({
        type: 'scan-progress',
        text: 'Checking Team Libraries...',
      });
      const libraries = await figma.teamLibrary.getAvailableLibraryVariableCollectionsAsync();
      for (const lib of libraries) {
        const libVars = await figma.teamLibrary.getVariablesInLibraryCollectionAsync(lib.key);
        for (const vInfo of libVars) {
          if (vInfo.name.toLowerCase().includes(lowerQuery)) {
            try {
              const variable = await figma.variables.importVariableByKeyAsync(vInfo.key);
              if (variable && !matchingVarIds.has(variable.id)) {
                matchingVars.push(variable);
                matchingVarIds.add(variable.id);
              }
            } catch (e) {
              console.warn(`Failed to import variable ${vInfo.name}:`, e);
            }
          }
        }
      }
    } catch (e) {
      console.warn('Failed to search team libraries:', e);
    }
  }

  const resolvedVariableCache = new Map<string, Variable | null>();

  // Don't return early when no local vars match - we may find library variables during traversal

  // 4. Map: variableId → { pageName, totalCount, components: Map<ComponentName, nodeIds[]> }
  type UsageEntry = { pageName: string; totalCount: number; components: Map<string, string[]> };
  const usageMap = new Map<string, UsageEntry>();
  const textStyleUsageMap = new Map<string, UsageEntry>();

  // Helper: find closest named component
  function findClosestComponent(node: SceneNode): string | null {
    let current: BaseNode | null = node;
    while (current) {
      if (
        current.type === 'COMPONENT'
        || current.type === 'COMPONENT_SET'
        || current.type === 'INSTANCE'
      ) {
        return current.name;
      }
      current = current.parent;
    }
    return null;
  }

  function variableMatchesQuery(v: Variable): boolean {
    if (!lowerQuery) return true;
    return v.name.toLowerCase().includes(lowerQuery);
  }

  // Extract all variable IDs bound to a node (recursive for nested structures like effects, layoutGrids)
  function extractVariableIdsFromNode(node: SceneNode): string[] {
    const ids: string[] = [];
    const bv = node.boundVariables;
    if (bv) {
      ids.push(...extractVariableIdsRecursive(bv));
    }
    // Check component property bindings (e.g., text content, boolean visibility bound to variables)
    if ('componentPropertyBindings' in node) {
      const bindings = (node as any).componentPropertyBindings;
      if (bindings) {
        Object.values(bindings).forEach((binding) => {
          if (typeof binding === 'object' && binding !== null && 'id' in (binding as Record<string, unknown>)) {
            ids.push((binding as { id: string }).id);
          }
        });
      }
    }
    // Also check effects on the node - each effect can have its own boundVariables
    if ('effects' in node) {
      const { effects } = (node as any);
      if (Array.isArray(effects)) {
        effects.forEach((effect: { boundVariables?: unknown }) => {
          if (effect?.boundVariables) ids.push(...extractVariableIdsRecursive(effect.boundVariables));
        });
      }
    }
    return ids;
  }

  // Walk a page, accumulate usage into usageMap
  async function traversePage(pageChildren: readonly SceneNode[], pageName: string) {
    // Notify UI of page start
    figma.ui.postMessage({
      type: 'scan-progress',
      text: `Scanning page: ${pageName}...`,
    });

    const queue: SceneNode[] = [];
    for (const child of pageChildren) {
      queue.push(child);
    }

    let processedCount = 0;
    const CHECK_INTERVAL = 5;
    const YIELD_MS = 8;
    let lastYieldTime = Date.now();

    while (queue.length > 0) {
      const node = queue.pop();
      if (node) {
        processedCount += 1;

        if (processedCount % CHECK_INTERVAL === 0) {
          const now = Date.now();
          if (now - lastYieldTime > YIELD_MS) {
            await new Promise<void>((resolve) => {
              setTimeout(resolve, 0);
            });
            lastYieldTime = Date.now();
          }
        }

        try {
          const varIds = new Set<string>();
          // 1. Direct variable bindings
          if ('boundVariables' in node && node.boundVariables) {
            extractVariableIdsFromNode(node).forEach((id) => varIds.add(id));
          }
          // 2. Indirect variable bindings via styles
          getVariableIdsFromStyles(node).forEach((id) => varIds.add(id));

          if (varIds.size > 0) {
            for (const varId of varIds) {
              let variable: Variable | null = null;
              if (matchingVarIds.has(varId)) {
                variable = matchingVars.find((v) => v.id === varId) ?? null;
              } else {
                // Resolve library/imported variables
                if (!resolvedVariableCache.has(varId)) {
                  try {
                    resolvedVariableCache.set(varId, await figma.variables.getVariableByIdAsync(varId));
                  } catch {
                    resolvedVariableCache.set(varId, null);
                  }
                }
                variable = resolvedVariableCache.get(varId) ?? null;
                if (variable && variableMatchesQuery(variable)) {
                  matchingVarIds.add(varId);
                  if (!matchingVars.some((v) => v.id === varId)) matchingVars.push(variable);
                }
              }

              if (variable && matchingVarIds.has(varId)) {
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
          // Track text style usage (local + library styles)
          if (node.type === 'TEXT' && 'textStyleId' in node && node.textStyleId && node.textStyleId !== figma.mixed) {
            const styleId = node.textStyleId as string;
            let style: TextStyle | null = null;
            if (matchingTextStyleIds.has(styleId)) {
              style = matchingTextStyles.find((s) => s.id === styleId) ?? null;
            } else {
              // Resolve library text styles
              const resolved = figma.getStyleById(styleId);
              if (resolved && resolved.type === 'TEXT') {
                const textStyle = resolved as TextStyle;
                const matchesQuery = !lowerQuery || textStyle.name.toLowerCase().includes(lowerQuery);
                if (matchesQuery) {
                  matchingTextStyleIds.add(styleId);
                  if (!matchingTextStyles.some((s) => s.id === styleId)) matchingTextStyles.push(textStyle);
                  style = textStyle;
                }
              }
            }
            if (style && matchingTextStyleIds.has(styleId)) {
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
          const { children } = (node as ChildrenMixin);
          for (const child of children) {
            queue.push(child);
          }
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

  // 6. Format variable results (use async API for library variable collections)
  const variables: VariableUsageResult[] = await Promise.all(matchingVars.map(async (v) => {
    const usage = usageMap.get(v.id);
    const components: VariableComponentUsage[] = [];
    if (usage) {
      usage.components.forEach((nodeIds, componentName) => {
        components.push({ componentName, nodeIds });
      });
    }

    let collectionName = collectionMap.get(v.variableCollectionId);
    let modes = collectionModesMap.get(v.variableCollectionId);
    if ((!collectionName || !modes) && v.variableCollectionId) {
      try {
        const coll = await figma.variables.getVariableCollectionByIdAsync(v.variableCollectionId);
        if (coll) {
          collectionName = collectionName || coll.name;
          modes = modes ?? coll.modes;
        }
      } catch (_) {
        /* keep Unknown Collection for library/unresolved collections */
      }
    }
    collectionName = collectionName || 'Unknown Collection';
    const modeNames = (modes || []).map((m) => m.name);

    return {
      variableName: v.name,
      variableId: v.id,
      collectionName,
      totalCount: usage ? usage.totalCount : 0,
      componentCount: components.length,
      components,
      pageName: usage ? usage.pageName : undefined,
      modeCount: modeNames.length,
      modeNames,
    };
  }));

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
