import { AsyncMessageChannelHandlers } from '@/AsyncMessageChannel';
import { AsyncMessageTypes, VariableUsageResult, VariableComponentUsage } from '@/types/AsyncMessages';

const STYLE_PROPS = ['fillStyleId', 'strokeStyleId', 'textStyleId', 'effectStyleId', 'gridStyleId'] as const;

function extractVariableIdsRecursive(value: unknown, acc: Set<string>) {
  if (!value) return;
  if (typeof value === 'object' && value !== null && 'id' in value && typeof (value as { id?: unknown }).id === 'string') {
    acc.add((value as { id: string }).id);
    return;
  }
  if (Array.isArray(value)) {
    value.forEach((item) => extractVariableIdsRecursive(item, acc));
    return;
  }
  if (typeof value === 'object' && value !== null) {
    Object.values(value).forEach((v) => extractVariableIdsRecursive(v, acc));
  }
}

export const calculateVariablesImpact: AsyncMessageChannelHandlers[AsyncMessageTypes.CALCULATE_VARIABLES_IMPACT] = async (msg) => {
  const { variableIds } = msg;

  if (!variableIds || variableIds.length === 0) {
    return { variables: [] };
  }

  const matchingVarIds = new Set(variableIds);

  // 1. Resolve all target variables — try local first, fall back to getVariableByIdAsync for library vars
  const localVariables = await figma.variables.getLocalVariablesAsync();
  const collections = await figma.variables.getLocalVariableCollectionsAsync();
  const collectionMap = new Map(collections.map((c) => [c.id, c]));
  const collectionNameMap = new Map(collections.map((c) => [c.id, c.name]));

  // Map so we always have O(1) lookup
  const matchingVarsMap = new Map<string, Variable>(
    localVariables.filter((v) => matchingVarIds.has(v.id)).map((v) => [v.id, v]),
  );

  // For any IDs not found locally, resolve via async API (handles library/imported variables)
  const missingIds = variableIds.filter((id) => !matchingVarsMap.has(id));
  if (missingIds.length > 0) {
    const resolved = await Promise.allSettled(
      missingIds.map((id) => figma.variables.getVariableByIdAsync(id)),
    );
    for (const result of resolved) {
      if (result.status === 'fulfilled' && result.value) {
        matchingVarsMap.set(result.value.id, result.value);
      }
    }
  }

  if (matchingVarsMap.size === 0) {
    return { variables: [] };
  }

  // 2. Usage tracking
  const usageMap = new Map<string, { totalCount: number; components: Map<string, string[]> }>();

  // Style → variable IDs cache (shared across all nodes to avoid redundant async calls)
  const styleVarCache = new Map<string, string[]>();

  function findClosestComponent(node: SceneNode): string | null {
    let current: BaseNode | null = node;
    while (current) {
      if (current.type === 'COMPONENT' || current.type === 'COMPONENT_SET' || current.type === 'INSTANCE') {
        if (current.type === 'INSTANCE') {
          const inst = current as InstanceNode;
          if (inst.mainComponent) return inst.mainComponent.name;
        }
        return current.name;
      }
      current = current.parent;
    }
    return null;
  }

  async function extractAllVarIdsFromNode(node: SceneNode): Promise<Set<string>> {
    const ids = new Set<string>();

    // Direct boundVariables (fills, strokes, radii, spacing, opacity, etc.)
    if ('boundVariables' in node && node.boundVariables) {
      extractVariableIdsRecursive(node.boundVariables, ids);
    }

    // Per-effect boundVariables
    if ('effects' in node && Array.isArray((node as any).effects)) {
      (node as any).effects.forEach((effect: any) => {
        if (effect?.boundVariables) extractVariableIdsRecursive(effect.boundVariables, ids);
      });
    }

    // Variables bound through Paint/Text/Effect styles (e.g. fillStyleId → style.boundVariables)
    for (const prop of STYLE_PROPS) {
      if (!(prop in node)) continue;
      const styleId = (node as any)[prop];
      if (typeof styleId !== 'string' || styleId === '') continue;

      if (styleVarCache.has(styleId)) {
        styleVarCache.get(styleId)!.forEach((id) => ids.add(id));
        continue;
      }

      try {
        const style = await figma.getStyleByIdAsync(styleId);
        const varIds: string[] = [];
        if (style && (style as any).boundVariables) {
          const acc = new Set<string>();
          extractVariableIdsRecursive((style as any).boundVariables, acc);
          acc.forEach((id) => { varIds.push(id); ids.add(id); });
        }
        styleVarCache.set(styleId, varIds);
      } catch {
        styleVarCache.set(styleId, []);
      }
    }

    return ids;
  }

  function recordUsage(varId: string, node: SceneNode) {
    if (!usageMap.has(varId)) {
      usageMap.set(varId, { totalCount: 0, components: new Map() });
    }
    const entry = usageMap.get(varId)!;
    entry.totalCount += 1;
    const componentName = findClosestComponent(node) || '(Unstyled / Frame)';
    if (!entry.components.has(componentName)) entry.components.set(componentName, []);
    const existing = entry.components.get(componentName)!;
    if (!existing.includes(node.id)) existing.push(node.id);
  }

  // 3. Walk ALL pages (load each page first for dynamic-page mode compatibility)
  for (const page of figma.root.children) {
    try { await (page as PageNode).loadAsync(); } catch { /* already loaded */ }

    const queue: SceneNode[] = Array.from((page as PageNode).children);
    let processedCount = 0;
    const CHECK_INTERVAL = 20;
    const YIELD_MS = 12;
    let lastYieldTime = Date.now();

    while (queue.length > 0) {
      const node = queue.pop()!;
      processedCount += 1;

      if (processedCount % CHECK_INTERVAL === 0) {
        const now = Date.now();
        if (now - lastYieldTime > YIELD_MS) {
          await new Promise((resolve) => { setTimeout(resolve, 0); });
          lastYieldTime = Date.now();
        }
      }

      try {
        const varIds = await extractAllVarIdsFromNode(node);
        for (const varId of varIds) {
          if (matchingVarIds.has(varId)) {
            recordUsage(varId, node);
          }
        }
      } catch {
        // skip problem nodes
      }

      if ('children' in node) {
        for (const child of (node as ChildrenMixin).children) {
          queue.push(child);
        }
      }
    }
  }

  // 4. Format results
  const variables: VariableUsageResult[] = [];

  for (const v of matchingVarsMap.values()) {
    const usage = usageMap.get(v.id);
    const components: VariableComponentUsage[] = [];
    if (usage) {
      usage.components.forEach((nodeIds, componentName) => {
        components.push({ componentName, nodeIds });
      });
    }

    // Resolve collection info (local collections fast, library collections via async)
    let collectionName = collectionNameMap.get(v.variableCollectionId);
    const coll = collectionMap.get(v.variableCollectionId);

    if (!collectionName) {
      try {
        const libColl = await figma.variables.getVariableCollectionByIdAsync(v.variableCollectionId);
        if (libColl) collectionName = libColl.name;
      } catch { /* ignore */ }
    }

    const modes: { modeId: string; modeName: string; value: any }[] = [];
    if (coll) {
      for (const mode of coll.modes) {
        modes.push({ modeId: mode.modeId, modeName: mode.name, value: v.valuesByMode[mode.modeId] });
      }
    }

    variables.push({
      variableName: v.name,
      variableId: v.id,
      collectionName: collectionName || 'Unknown Collection',
      totalCount: usage ? usage.totalCount : 0,
      componentCount: components.length,
      components,
      modes,
      resolvedType: v.resolvedType,
    });
  }

  variables.sort((a, b) => b.totalCount - a.totalCount);

  return { variables };
};
