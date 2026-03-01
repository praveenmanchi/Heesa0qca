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

  // Styles with boundVariables – fetch in parallel for better performance
  const styleProps = ['fillStyleId', 'strokeStyleId', 'textStyleId', 'effectStyleId', 'gridStyleId'] as const;
  const styleIds = styleProps
    .filter((prop) => prop in node && typeof (node as any)[prop] === 'string' && (node as any)[prop])
    .map((prop) => (node as any)[prop] as string);

  if (styleIds.length > 0) {
    const styles = await Promise.all(
      styleIds.map((styleId) => figma.getStyleByIdAsync(styleId).catch(() => null)),
    );
    styles.forEach((style) => {
      if (style && (style as any).boundVariables) {
        extractVariableIdsRecursive((style as any).boundVariables, ids);
      }
    });
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
      const childNodes = (node as ChildrenMixin).children;
      if (childNodes.length > 0) {
        const childTrees = await Promise.all(
          childNodes.map((child) => walk(child as SceneNode)),
        );
        children.push(...childTrees);
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
  const { selection } = figma.currentPage;
  if (!selection.length) {
    return {
      type: AsyncMessageTypes.GET_SELECTION_VISUALIZATION,
    };
  }

  const rootNode = selection[0] as SceneNode;
  const { tree, varIds, nodeVarIds } = await buildSelectionTree(rootNode);

  // Cache basic metadata for variables so we can show human-readable names
  // without doing a full document-wide usage scan.
  const variableMetaCache = new Map<string, { name: string; collectionName: string; resolvedType: string }>();

  async function getVariableMeta(id: string): Promise<{ name: string; collectionName: string; resolvedType: string }> {
    const cached = variableMetaCache.get(id);
    if (cached) return cached;

    try {
      const variable = await figma.variables.getVariableByIdAsync(id);
      if (variable) {
        let collectionName = 'Local variables';
        if (variable.variableCollectionId) {
          try {
            const coll = await figma.variables.getVariableCollectionByIdAsync(variable.variableCollectionId);
            if (coll) collectionName = coll.name;
          } catch { /* ignore */ }
        }

        const meta = {
          name: variable.name,
          collectionName,
          resolvedType: variable.resolvedType,
        };
        variableMetaCache.set(id, meta);
        return meta;
      }
    } catch {
      // ignore resolution errors and fall back to id
    }

    const fallback = { name: id, collectionName: 'Unknown Collection', resolvedType: 'UNKNOWN' };
    variableMetaCache.set(id, fallback);
    return fallback;
  }

  async function enrich(node: SelectionVisualizationNode): Promise<SelectionVisualizationNode> {
    const vIds = nodeVarIds.get(node.id) || [];
    const variables: (SelectionVisualizationVariable & { resolvedType?: string })[] = await Promise.all(
      vIds.map(async (id) => {
        const meta = await getVariableMeta(id);
        return {
          variableId: id,
          variableName: meta.name,
          collectionName: meta.collectionName,
          resolvedType: meta.resolvedType,
          totalCount: 0, // to be populated if needed, or left as 0 for this isolated graph
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
