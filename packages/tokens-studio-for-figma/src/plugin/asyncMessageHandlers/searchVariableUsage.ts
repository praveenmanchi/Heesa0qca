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

/** Cache style → variable IDs so we don't repeatedly call figma.getStyleById for the same style. */
const styleVariableIdCache = new Map<string, string[]>();

/** Extract variable IDs from styles applied to a node */
function getVariableIdsFromStyles(node: SceneNode): string[] {
  const ids: string[] = [];
  const props = ['fillStyleId', 'strokeStyleId', 'textStyleId', 'effectStyleId', 'gridStyleId'] as const;

  props.forEach((prop) => {
    if (prop in node && typeof (node as any)[prop] === 'string' && (node as any)[prop] !== '') {
      const styleId = (node as any)[prop] as string;

      let cached = styleVariableIdCache.get(styleId);
      if (!cached) {
        const style = figma.getStyleById(styleId);
        const collected: string[] = [];
        if (style && (style as any).boundVariables) {
          collected.push(...extractVariableIdsRecursive((style as any).boundVariables));
        }
        cached = collected;
        styleVariableIdCache.set(styleId, cached);
      }
      if (cached.length) {
        ids.push(...cached);
      }
    }
  });

  return ids;
}

type UsageEntry = { pageName: string; totalCount: number; components: Map<string, string[]> };

type UsageIndex = {
  variableUsage: Map<string, UsageEntry>;
  textStyleUsage: Map<string, UsageEntry>;
  variablesById: Map<string, Variable>;
  textStylesById: Map<string, TextStyle>;
  collectionMap: Map<string, string>;
  collectionModesMap: Map<string, Array<{ name: string }>>;
};

let cachedAllPagesIndex: UsageIndex | null = null;

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

// Extract all variable IDs bound to a node (recursive for nested structures like effects, layoutGrids)
function extractVariableIdsFromNode(node: SceneNode): string[] {
  const ids: string[] = [];
  const bv = (node as any).boundVariables;
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

async function buildUsageIndex(allPages: boolean): Promise<UsageIndex> {
  // 1. Get all local variables + collections
  const localVariables = await figma.variables.getLocalVariablesAsync();
  const collections = await figma.variables.getLocalVariableCollectionsAsync();
  const collectionMap = new Map(collections.map((c) => [c.id, c.name]));
  const collectionModesMap = new Map(collections.map((c) => [c.id, c.modes as Array<{ name: string }>])); // modes only used for names

  // 2. Get local text styles
  const localTextStyles = await figma.getLocalTextStylesAsync();

  const variableUsage = new Map<string, UsageEntry>();
  const textStyleUsage = new Map<string, UsageEntry>();
  const variablesById = new Map<string, Variable>();
  const textStylesById = new Map<string, TextStyle>();

  // Seed with local definitions so we can filter by name later without extra Figma calls.
  localVariables.forEach((v) => {
    variablesById.set(v.id, v);
  });
  localTextStyles.forEach((s) => {
    textStylesById.set(s.id, s);
  });

  const resolvedVariableCache = new Map<string, Variable | null>();

  async function traversePage(pageChildren: readonly SceneNode[], pageName: string) {
    const queue: SceneNode[] = [];
    for (const child of pageChildren) {
      queue.push(child);
    }

    let processedCount = 0;
    const CHECK_INTERVAL = 20;
    const YIELD_MS = 8;
    let lastYieldTime = Date.now();

    while (queue.length > 0) {
      const node = queue.pop();
      if (!node) continue;

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
        if ('boundVariables' in node && (node as any).boundVariables) {
          extractVariableIdsFromNode(node).forEach((id) => varIds.add(id));
        }
        // 2. Indirect variable bindings via styles
        getVariableIdsFromStyles(node).forEach((id) => varIds.add(id));

        if (varIds.size > 0) {
          for (const varId of varIds) {
            let variable = variablesById.get(varId) ?? null;
            if (!variable) {
              if (!resolvedVariableCache.has(varId)) {
                try {
                  resolvedVariableCache.set(varId, await figma.variables.getVariableByIdAsync(varId));
                } catch {
                  resolvedVariableCache.set(varId, null);
                }
              }
              variable = resolvedVariableCache.get(varId) ?? null;
              if (variable) {
                variablesById.set(varId, variable);
              }
            }

            if (variable) {
              let entry = variableUsage.get(varId);
              if (!entry) {
                entry = { pageName, totalCount: 0, components: new Map() };
                variableUsage.set(varId, entry);
              }
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
        if (node.type === 'TEXT' && 'textStyleId' in node && (node as any).textStyleId && (node as any).textStyleId !== figma.mixed) {
          const styleId = (node as any).textStyleId as string;
          let style = textStylesById.get(styleId) ?? null;
          if (!style) {
            const resolved = figma.getStyleById(styleId);
            if (resolved && resolved.type === 'TEXT') {
              style = resolved as TextStyle;
              textStylesById.set(styleId, style);
            }
          }
          if (style) {
            let entry = textStyleUsage.get(styleId);
            if (!entry) {
              entry = { pageName, totalCount: 0, components: new Map() };
              textStyleUsage.set(styleId, entry);
            }
            entry.totalCount += 1;
            const componentName = findClosestComponent(node) || '(Unstyled / Frame)';
            if (!entry.components.has(componentName)) {
              entry.components.set(componentName, []);
            }
            entry.components.get(componentName)!.push(node.id);
          }
        }
      } catch {
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

  if (allPages) {
    const pages = [...figma.root.children];
    const totalPages = pages.length;
    for (let index = 0; index < pages.length; index += 1) {
      const page = pages[index];
      const pageNumber = index + 1;
      try {
        await page.loadAsync();
      } catch {
        // ignore
      }
      figma.ui.postMessage({
        type: 'scan-progress',
        text: `Scanning page ${pageNumber} of ${totalPages}: ${page.name}…`,
      });
      await traversePage(page.children as readonly SceneNode[], page.name);
    }
  } else {
    figma.ui.postMessage({
      type: 'scan-progress',
      text: `Scanning current page: ${figma.currentPage.name}…`,
    });
    await traversePage(figma.currentPage.children as readonly SceneNode[], figma.currentPage.name);
  }

  return {
    variableUsage,
    textStyleUsage,
    variablesById,
    textStylesById,
    collectionMap,
    collectionModesMap,
  };
}

export async function searchVariableUsage(
  msg: { query: string; allPages?: boolean; includeLibraries?: boolean },
): Promise<{ variables: VariableUsageResult[]; textStyles?: TextStyleUsageResult[] }> {
  const { query, allPages = false, includeLibraries = false } = msg;
  const lowerQuery = query.toLowerCase().trim();

  // Build or reuse the usage index. All-pages scans are cached for the session.
  const index = allPages
    ? (cachedAllPagesIndex || (cachedAllPagesIndex = await buildUsageIndex(true)))
    : await buildUsageIndex(false);

  // Filter variables by query
  let matchingVars = Array.from(index.variablesById.values());
  if (lowerQuery) {
    matchingVars = matchingVars.filter((v) => v.name.toLowerCase().includes(lowerQuery));
  }
  const matchingVarIds = new Set(matchingVars.map((v) => v.id));

  // Optionally augment with Team Library variables (no extra traversal; just metadata)
  if (lowerQuery && includeLibraries) {
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

  // Filter text styles by query
  let matchingTextStyles = Array.from(index.textStylesById.values());
  if (lowerQuery) {
    matchingTextStyles = matchingTextStyles.filter((s) => s.name.toLowerCase().includes(lowerQuery));
  }

  // 6. Format variable results (use async API for library variable collections)
  const variables: VariableUsageResult[] = await Promise.all(matchingVars.map(async (v) => {
    const usage = index.variableUsage.get(v.id);
    const components: VariableComponentUsage[] = [];
    if (usage) {
      usage.components.forEach((nodeIds, componentName) => {
        components.push({ componentName, nodeIds });
      });
    }

    let collectionName = index.collectionMap.get(v.variableCollectionId);
    let modes = index.collectionModesMap.get(v.variableCollectionId);
    if ((!collectionName || !modes) && v.variableCollectionId) {
      try {
        const coll = await figma.variables.getVariableCollectionByIdAsync(v.variableCollectionId);
        if (coll) {
          collectionName = collectionName || coll.name;
          modes = modes ?? (coll.modes as Array<{ name: string }>);
        }
      } catch {
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
    const usage = index.textStyleUsage.get(s.id);
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
