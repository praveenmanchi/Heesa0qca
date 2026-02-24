import { AsyncMessageChannelHandlers } from '@/AsyncMessageChannel';
import { AsyncMessageTypes, VariableUsageResult, VariableComponentUsage } from '@/types/AsyncMessages';

export const calculateVariablesImpact: AsyncMessageChannelHandlers[AsyncMessageTypes.CALCULATE_VARIABLES_IMPACT] = async (msg) => {
  const { variableIds } = msg;

  if (!variableIds || variableIds.length === 0) {
    return { variables: [] };
  }

  const matchingVarIds = new Set(variableIds);

  // 1. Get all local variables to map IDs to Names and Collections
  const localVariables = await figma.variables.getLocalVariablesAsync();
  const collections = await figma.variables.getLocalVariableCollectionsAsync();
  const collectionMap = new Map(collections.map((c) => [c.id, c.name]));

  const matchingVars = localVariables.filter((v) => matchingVarIds.has(v.id));

  if (matchingVars.length === 0) {
    return { variables: [] };
  }

  // 2. Map to store usage: VariableID -> { totalCount, components: Map<ComponentName, NodeIDs[]> }
  const usageMap = new Map<
  string,
  { totalCount: number; components: Map<string, string[]> }
  >();

  // Helper to find closest component parent
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

  // 3. Walk the document tree
  // Optimized for performance: non-blocking chunked traversal
  async function traverseAndCount() {
    const queue: SceneNode[] = [];
    const pageChildren = figma.currentPage.children;
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

      processedCount += 1;

      if (processedCount % CHECK_INTERVAL === 0) {
        const now = Date.now();
        if (now - lastYieldTime > YIELD_MS) {
          // eslint-disable-next-line
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
                usageMap.set(varId, { totalCount: 0, components: new Map() });
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
      } catch (e) {
        console.error('Error processing node:', e);
      }

      if ('children' in node) {
        const { children } = (node as ChildrenMixin);
        for (const child of children) {
          queue.push(child);
        }
      }
    }
  }

  await traverseAndCount();

  // 4. Format results
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
    };
  });

  variables.sort((a, b) => b.totalCount - a.totalCount);

  return { variables };
};
