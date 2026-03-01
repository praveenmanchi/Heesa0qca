import { VariableUsageResult, VariableComponentUsage, TextStyleUsageResult } from '@/types/AsyncMessages';

/** Recursively extract all variable alias IDs from any boundVariables structure (handles nested effects, layoutGrids, etc.) */
function extractVariableIdsRecursive(value: unknown): string[] {
  if (!value) return [];

  // Duck-type specifically for Figma's variable object id format
  if (typeof value === 'object' && value !== null && 'id' in value && typeof (value as { id?: unknown }).id === 'string') {
    return [(value as { id: string }).id];
  }

  const ids: string[] = [];
  if (Array.isArray(value)) {
    value.forEach((v) => ids.push(...extractVariableIdsRecursive(v)));
  } else if (typeof value === 'object' && value !== null) {
    Object.values(value).forEach((v) => ids.push(...extractVariableIdsRecursive(v)));
  }
  return ids;
}

/** Extract variable IDs from styles applied to a node */
async function getVariableIdsFromStyles(node: SceneNode, styleVarCache: Map<string, string[]>): Promise<string[]> {
  const ids: string[] = [];
  const props = ['fillStyleId', 'strokeStyleId', 'textStyleId', 'effectStyleId', 'gridStyleId'];
  for (const prop of props) {
    if (prop in node && typeof (node as any)[prop] === 'string' && (node as any)[prop] !== '') {
      const styleId = (node as any)[prop] as string;
      if (styleVarCache.has(styleId)) {
        ids.push(...styleVarCache.get(styleId)!);
      } else {
        const newIds: string[] = [];
        try {
          const style = await figma.getStyleByIdAsync(styleId);
          if (style && (style as any).boundVariables) {
            newIds.push(...extractVariableIdsRecursive((style as any).boundVariables));
          }
        } catch {
          // Ignore styles that cannot be resolved (e.g. missing or inaccessible)
        }
        styleVarCache.set(styleId, newIds);
        ids.push(...newIds);
      }
    }
  }
  return ids;
}

export async function searchVariableUsage(
  msg: {
    query: string;
    allPages?: boolean;
    pageIds?: string[];
    onlyComponents?: boolean;
    suggestionsOnly?: boolean;
  },
): Promise<{ variables: VariableUsageResult[]; textStyles?: TextStyleUsageResult[] }> {
  const {
    query, allPages = true, pageIds = [], onlyComponents = false, suggestionsOnly = false,
  } = msg;
  console.log(`[Backend] searchVariableUsage received. query: "${query}", onlyComponents: ${onlyComponents}, allPages: ${allPages}, suggestionsOnly: ${suggestionsOnly}`);
  const lowerQuery = query.toLowerCase().trim();

  // 1. Get all local variables + collections
  const localVariables = await figma.variables.getLocalVariablesAsync();
  console.log(`[Backend] Loaded ${localVariables.length} local variables.`);
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

  // (Team library search has been explicitly removed by user request)

  const resolvedVariableCache = new Map<string, Variable | null>();
  // Pre-fill cache with matching variables
  matchingVars.forEach(v => resolvedVariableCache.set(v.id, v));

  const resolvedStyleVarCache = new Map<string, string[]>();
  const nonMatchingTextStyleCache = new Set<string>();

  // Track all discovered variable IDs that we need to resolve later if they aren't in matchingVarIds yet
  const pendingVariableIdsToResolve = new Set<string>();

  // Don't return early when no local vars match - we may find library variables during traversal

  // 4. Map: variableId → { pageName, totalCount, components: Map<ComponentName, nodeIds[]> }
  type UsageEntry = { pageName: string; totalCount: number; components: Map<string, string[]> };
  const usageMap = new Map<string, UsageEntry>();
  const textStyleUsageMap = new Map<string, UsageEntry>();

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
  async function traversePage(page: PageNode) {
    const pageName = page.name;
    figma.ui.postMessage({ type: 'scan-progress', text: `Scanning page: ${pageName}...` });

    // Use a manual async stack traversal instead of a synchronous `page.findAll`
    // to prevent the plugin from freezing Figma's main thread on large files.
    const YIELD_MS = 15; // Target 60fps window
    let lastYieldTime = Date.now();

    const stack: SceneNode[] = Array.from(page.children);

    while (stack.length > 0) {
      if (Date.now() - lastYieldTime > YIELD_MS) {
        await new Promise<void>((resolve) => setTimeout(resolve, 0));
        lastYieldTime = Date.now();
      }

      const node = stack.pop()!;
      if ('children' in node) {
        for (const child of node.children) {
          stack.push(child);
        }
      }

      const hasBindings = ('boundVariables' in node && !!node.boundVariables)
        || node.type === 'TEXT'
        || ('effects' in node && Array.isArray(node.effects) && node.effects.some((e) => !!e.boundVariables))
        || ('componentPropertyBindings' in node && !!(node as any).componentPropertyBindings)
        // Ensure we check style properties so indirect variable usages are caught
        || ('fillStyleId' in node && typeof node.fillStyleId === 'string' && node.fillStyleId !== '')
        || ('strokeStyleId' in node && typeof node.strokeStyleId === 'string' && node.strokeStyleId !== '')
        || ('effectStyleId' in node && typeof node.effectStyleId === 'string' && node.effectStyleId !== '')
        || ('gridStyleId' in node && typeof node.gridStyleId === 'string' && node.gridStyleId !== '');

      if (!hasBindings) continue;

      // Trace upwards to find the topmost Component, ComponentSet, or Instance
      let current: BaseNode | null = node;
      let topContainer: ComponentNode | ComponentSetNode | InstanceNode | null = null;
      while (current && current.type !== 'PAGE' && current.type !== 'DOCUMENT') {
        if (current.type === 'COMPONENT' || current.type === 'COMPONENT_SET' || current.type === 'INSTANCE') {
          // If we hit a component set, prefer it. If we hit a component inside a component set, we'll hit the set next.
          topContainer = current as any;
        }
        current = current.parent;
      }

      // If user requested onlyComponents, skip raw canvas nodes
      if (onlyComponents && !topContainer) continue;

      try {
        const varIds = new Set<string>();
        // 1. Direct, effect, and component property bindings
        extractVariableIdsFromNode(node).forEach((id) => varIds.add(id));
        // 2. Style-based bindings
        (await getVariableIdsFromStyles(node, resolvedStyleVarCache)).forEach((id) => varIds.add(id));

        if (varIds.size > 0) {
          for (const varId of varIds) {
            if (resolvedVariableCache.has(varId)) {
              const variable = resolvedVariableCache.get(varId);
              if (!variable || !variableMatchesQuery(variable)) continue;
            } else {
              pendingVariableIdsToResolve.add(varId);
            }

            if (!usageMap.has(varId)) {
              usageMap.set(varId, { pageName, totalCount: 0, components: new Map() });
            }
            const entry = usageMap.get(varId)!;

            let componentName = topContainer ? topContainer.name : '(Unstyled / Frame)';
            if (topContainer && topContainer.type === 'INSTANCE' && topContainer.mainComponent) {
              componentName = topContainer.mainComponent.name;
            }
            const targetId = topContainer ? topContainer.id : node.id;

            if (!entry.components.has(componentName)) {
              entry.components.set(componentName, []);
            }
            const targetArr = entry.components.get(componentName)!;
            // Deduplicate the target IDs per component row so we don't spam the UI
            if (!targetArr.includes(targetId)) {
              targetArr.push(targetId);
              // Only increment usage count relative to distinct objects bounding it
              entry.totalCount += 1;
            }
          }
        }

        // Track text style usage
        if (node.type === 'TEXT' && 'textStyleId' in node && node.textStyleId && node.textStyleId !== figma.mixed) {
          const styleId = node.textStyleId as string;
          let style: TextStyle | null = null;
          if (matchingTextStyleIds.has(styleId)) {
            style = matchingTextStyles.find((s) => s.id === styleId) ?? null;
          } else if (nonMatchingTextStyleCache.has(styleId)) {
            style = null;
          } else {
            try {
              const resolved = await figma.getStyleByIdAsync(styleId);
              if (resolved && resolved.type === 'TEXT') {
                const textStyle = resolved as TextStyle;
                const matchesQuery = !lowerQuery || textStyle.name.toLowerCase().includes(lowerQuery);
                if (matchesQuery) {
                  matchingTextStyleIds.add(styleId);
                  if (!matchingTextStyles.some((s) => s.id === styleId)) matchingTextStyles.push(textStyle);
                  style = textStyle;
                } else {
                  nonMatchingTextStyleCache.add(styleId);
                }
              } else {
                nonMatchingTextStyleCache.add(styleId);
              }
            } catch {
              nonMatchingTextStyleCache.add(styleId);
            }
          }

          if (style && matchingTextStyleIds.has(styleId)) {
            if (!textStyleUsageMap.has(styleId)) {
              textStyleUsageMap.set(styleId, { pageName, totalCount: 0, components: new Map() });
            }
            const entry = textStyleUsageMap.get(styleId)!;
            let componentName = topContainer ? topContainer.name : '(Unstyled / Frame)';
            if (topContainer && topContainer.type === 'INSTANCE' && topContainer.mainComponent) {
              componentName = topContainer.mainComponent.name;
            }
            const targetId = topContainer ? topContainer.id : node.id;

            if (!entry.components.has(componentName)) {
              entry.components.set(componentName, []);
            }
            const targetArr = entry.components.get(componentName)!;
            if (!targetArr.includes(targetId)) {
              targetArr.push(targetId);
              entry.totalCount += 1;
            }
          }
        }
      } catch (e) {
        // Skip problematic nodes
      }
    }
  }
  // 4. Determine which pages to scan (Skip if just fetching suggestions)
  if (!suggestionsOnly) {
    if (allPages) {
      // Walk every page in the document
      for (const page of figma.root.children) {
        await traversePage(page);
      }
    } else if (pageIds.length > 0) {
      const pages = figma.root.children.filter((p: any) => pageIds.includes(p.id));
      for (const page of pages) {
        await traversePage(page as PageNode);
      }
    } else {
      await traversePage(figma.currentPage);
    }

    // POST-TRAVERSAL: Resolve all unknown variable IDs exactly ONCE.
    if (pendingVariableIdsToResolve.size > 0) {
      figma.ui.postMessage({ type: 'scan-progress', text: `Resolving ${pendingVariableIdsToResolve.size} unknown variables...` });

      // Batch resolve
      const resolvePromises = Array.from(pendingVariableIdsToResolve).map(async (id) => {
        try {
          const v = await figma.variables.getVariableByIdAsync(id);
          resolvedVariableCache.set(id, v);
          if (v && variableMatchesQuery(v)) {
            matchingVarIds.add(id);
            if (!matchingVars.some((existing) => existing.id === id)) {
              matchingVars.push(v);
            }
          } else {
            // It resolved, but didn't match the query. Strip it from usageMap.
            usageMap.delete(id);
          }
        } catch {
          resolvedVariableCache.set(id, null);
          usageMap.delete(id);
        }
      });

      // We await all missing variables simultaneously rather than blocking the traverse loop
      await Promise.all(resolvePromises);
    }
  }

  // Clean up usageMap to ONLY include matchingVarIds
  for (const key of usageMap.keys()) {
    if (!matchingVarIds.has(key)) {
      usageMap.delete(key);
    }
  }

  // 6. Pre-resolve collection metadata for library variables (dedupe to avoid N async calls)
  const collectionIdsToResolve = [...new Set(
    matchingVars
      .filter((v) => v.variableCollectionId && !collectionMap.has(v.variableCollectionId))
      .map((v) => v.variableCollectionId),
  )];
  if (collectionIdsToResolve.length > 0) {
    const resolvedCollections = await Promise.all(
      collectionIdsToResolve.map((id) => figma.variables.getVariableCollectionByIdAsync(id).catch(() => null)),
    );
    resolvedCollections.forEach((coll) => {
      if (coll) {
        collectionMap.set(coll.id, coll.name);
        collectionModesMap.set(coll.id, coll.modes);
      }
    });
  }

  // 7. Format variable results (collection metadata now cached)
  const variables: VariableUsageResult[] = matchingVars.map((v) => {
    const usage = usageMap.get(v.id);
    const components: VariableComponentUsage[] = [];
    if (usage) {
      usage.components.forEach((nodeIds, componentName) => {
        components.push({ componentName, nodeIds });
      });
    }
    const collectionName = collectionMap.get(v.variableCollectionId) || 'Unknown Collection';
    const modes = collectionModesMap.get(v.variableCollectionId);
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
  });

  // 8. Format text style results
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
