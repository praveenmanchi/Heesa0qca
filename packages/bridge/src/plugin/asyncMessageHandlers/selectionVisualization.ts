import { AsyncMessageChannelHandlers } from '@/AsyncMessageChannel';
import {
  AsyncMessageTypes,
  type SelectionVisualizationNode,
  type SelectionVisualizationVariable,
} from '@/types/AsyncMessages';

type Handler = AsyncMessageChannelHandlers[AsyncMessageTypes.GET_SELECTION_VISUALIZATION];

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

async function extractVarIdsFromNode(node: SceneNode): Promise<string[]> {
  const ids = new Set<string>();

  // Direct boundVariables
  if ('boundVariables' in node && node.boundVariables) {
    extractVariableIdsRecursive(node.boundVariables, ids);
  }

  // Styles with boundVariables – must use async API in dynamic-page mode
  const styleProps = ['fillStyleId', 'strokeStyleId', 'textStyleId', 'effectStyleId', 'gridStyleId'] as const;
  for (const prop of styleProps) {
    if (prop in node && typeof (node as any)[prop] === 'string' && (node as any)[prop]) {
      const styleId = (node as any)[prop] as string;
      try {
        const style = await figma.getStyleByIdAsync(styleId);
        if (style && (style as any).boundVariables) {
          extractVariableIdsRecursive((style as any).boundVariables, ids);
        }
      } catch {
        // Ignore styles that cannot be resolved (e.g. missing or inaccessible)
      }
    }
  }

  return Array.from(ids);
}

async function buildSelectionTree(
  root: SceneNode,
): Promise<{ tree: SelectionVisualizationNode; varIds: Set<string>; nodeVarIds: Map<string, string[]> }> {
  const nodeVarIds = new Map<string, string[]>();
  const allVarIds = new Set<string>();

  async function walk(node: SceneNode): Promise<SelectionVisualizationNode> {
    const vIds = await extractVarIdsFromNode(node);
    if (vIds.length) {
      nodeVarIds.set(node.id, vIds);
      vIds.forEach((id) => allVarIds.add(id));
    }

    const children: SelectionVisualizationNode[] = [];
    if ('children' in node) {
      for (const child of (node as ChildrenMixin).children) {
        // Walk children sequentially to avoid overwhelming the host with async work
        // eslint-disable-next-line no-await-in-loop
        children.push(await walk(child as SceneNode));
      }
    }

    return {
      id: node.id,
      name: node.name,
      type: node.type,
      children,
      variables: [],
    };
  }

  const tree = await walk(root);
  return { tree, varIds: allVarIds, nodeVarIds };
}

export const getSelectionVisualization: Handler = async () => {
  const selection = figma.currentPage.selection;
  if (!selection.length) {
    return {
      type: AsyncMessageTypes.GET_SELECTION_VISUALIZATION,
    };
  }

  const rootNode = selection[0] as SceneNode;
  const { tree, varIds, nodeVarIds } = await buildSelectionTree(rootNode);

  // Cache basic metadata for variables so we can show human-readable names
  // without doing a full document-wide usage scan.
  const variableMetaCache = new Map<string, { name: string; collectionName: string }>();

  async function getVariableMeta(id: string): Promise<{ name: string; collectionName: string }> {
    const cached = variableMetaCache.get(id);
    if (cached) return cached;

    try {
      const variable = await figma.variables.getVariableByIdAsync(id);
      if (variable) {
        const meta = {
          name: variable.name,
          collectionName: 'Local variables',
        };
        variableMetaCache.set(id, meta);
        return meta;
      }
    } catch {
      // ignore resolution errors and fall back to id
    }

    const fallback = { name: id, collectionName: 'Unknown Collection' };
    variableMetaCache.set(id, fallback);
    return fallback;
  }

  async function enrich(node: SelectionVisualizationNode): Promise<SelectionVisualizationNode> {
    const vIds = nodeVarIds.get(node.id) || [];
    const variables: SelectionVisualizationVariable[] = await Promise.all(
      vIds.map(async (id) => {
        const meta = await getVariableMeta(id);
        return {
          variableId: id,
          variableName: meta.name,
          collectionName: meta.collectionName,
          totalCount: 0,
          componentCount: 0,
        };
      }),
    );

    const enrichedChildren = await Promise.all(node.children.map((child) => enrich(child)));

    return {
      ...node,
      variables,
      children: enrichedChildren,
    };
  }

  const enrichedRoot = await enrich(tree);

  return {
    type: AsyncMessageTypes.GET_SELECTION_VISUALIZATION,
    root: enrichedRoot,
    selectionName: rootNode.name,
  };
};

