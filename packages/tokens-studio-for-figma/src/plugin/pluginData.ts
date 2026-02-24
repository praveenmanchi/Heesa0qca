import get from 'just-safe-get';
import { isEqual } from '@/utils/isEqual';
import { Properties } from '@/constants/Properties';
import { notifySelection, notifyException } from './notifiers';
import removeValuesFromNode from './removeValuesFromNode';
import { NodeManagerNode } from './NodeManager';
import { tokensSharedDataHandler } from './SharedDataHandler';
import { SelectionGroup, SelectionValue } from '@/types';
import { TokenTypes } from '@/constants/TokenTypes';
import getAppliedStylesFromNode from './getAppliedStylesFromNode';
import getAppliedVariablesFromNode from './getAppliedVariablesFromNode';

// @TODO FIX TYPINGS! Missing or bad typings are very difficult for other developers to work in

function findClosestComponentName(node: BaseNode): string | undefined {
  if (node.type === 'DOCUMENT' || node.type === 'PAGE') return undefined;
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
  return undefined;
}

function createNodeInfo(curr: NodeManagerNode): { id: string; name: string; type: NodeType; componentName?: string } {
  const { id, node: { name, type } } = curr;
  const componentName = findClosestComponentName(curr.node);
  return {
    id, name, type, componentName,
  };
}

export function transformPluginDataToSelectionValues(pluginData: NodeManagerNode[]): SelectionGroup[] {
  const selectionValues = pluginData.reduce<SelectionGroup[]>((acc, curr) => {
    const { tokens, id, node: { name, type } } = curr;
    const nodeInfo = createNodeInfo(curr);

    // First we add plugin tokens
    Object.entries(tokens).forEach(([key, value]) => {
      const existing = acc.find((item) => item.type === key && item.value === value);
      if (existing) {
        existing.nodes.push(nodeInfo);
      } else {
        const category = get(Properties, key) as Properties | TokenTypes;

        acc.push({
          value, type: key, category, nodes: [nodeInfo], appliedType: 'token',
        });
      }
    });

    // Second we add variables
    const localVariables = getAppliedVariablesFromNode(curr.node);
    localVariables.forEach((variable) => {
      // Check if the token has been applied. If the token has been applied then we don't add variable.
      const isTokenApplied = acc.find((item) => item.type === variable.type && item.nodes.find((node) => isEqual(node, { id, name, type })));
      if (!isTokenApplied) {
        const category = get(Properties, variable.type) as Properties | TokenTypes;
        const existingVar = acc.find((item) => item.type === variable.type && item.value === variable.name);
        if (existingVar) {
          existingVar.nodes.push(nodeInfo);
        } else {
          acc.push({
            value: variable.name,
            type: variable.type,
            category,
            nodes: [nodeInfo],
            resolvedValue: variable.value,
            appliedType: 'variable',
            modes: variable.modes,
          });
        }
      }
    });

    // Third we add styles
    const localStyles = getAppliedStylesFromNode(curr.node);
    localStyles.forEach((style) => {
      // Check if the token or variable has been applied. If the token has been applied then we don't add style.
      const isTokenApplied = acc.find((item) => item.type === style.type && item.nodes.find((node) => isEqual(node, { id, name, type })));
      if (!isTokenApplied) {
        const category = get(Properties, style.type) as Properties | TokenTypes;
        const existingStyle = acc.find((item) => item.type === style.type && item.value === style.name);
        if (existingStyle) {
          existingStyle.nodes.push(nodeInfo);
        } else {
          acc.push({
            value: style.name,
            type: style.type,
            category,
            nodes: [nodeInfo],
            resolvedValue: style.value,
            appliedType: 'style',
          });
        }
      }
    });
    return acc;
  }, []);

  return selectionValues;
}

export function transformPluginDataToMainNodeSelectionValues(pluginData: NodeManagerNode[]): SelectionValue[] {
  const mainNodeSelectionValues = pluginData.reduce<SelectionValue[]>((acc, curr) => {
    // Fist we add styles. And then variables. This way, styles will be override by the variables
    const localStyles = getAppliedStylesFromNode(curr.node);
    localStyles.forEach((style) => {
      acc.push({
        [style.type]: style.name,
      });
    });

    // Second we add variables. And then tokens. This way, variables will be override by the tokens
    const localVariables = getAppliedVariablesFromNode(curr.node);
    localVariables.forEach((style) => {
      acc.push({
        [style.type]: style.name,
      });
    });
    acc.push(curr.tokens);
    return acc;
  }, []);
  return mainNodeSelectionValues;
}

export type SelectionContent = {
  selectionValues?: SelectionGroup[]
  mainNodeSelectionValues: SelectionValue[]
  selectedNodes: number
};

export async function sendPluginValues({ nodes, shouldSendSelectionValues }: { nodes: readonly NodeManagerNode[], shouldSendSelectionValues: boolean }): Promise<SelectionContent> {
  try {
    let mainNodeSelectionValues: SelectionValue[] = [];
    let selectionValues: SelectionGroup[] | undefined;
    if (Array.isArray(nodes) && nodes?.length > 0) {
      if (shouldSendSelectionValues) selectionValues = transformPluginDataToSelectionValues(nodes);
      mainNodeSelectionValues = transformPluginDataToMainNodeSelectionValues(nodes);
    }
    const selectedNodes = figma.currentPage.selection.length;
    notifySelection({ selectionValues: selectionValues ?? [], mainNodeSelectionValues, selectedNodes });
    return { selectionValues: selectionValues ?? [], mainNodeSelectionValues, selectedNodes };
  } catch (err: any) {
    notifyException(err?.message || 'Failed to process selection');
    throw err;
  }
}

export async function removePluginData({ nodes, key, shouldRemoveValues = true }: { nodes: readonly (BaseNode | SceneNode)[], key?: Properties, shouldRemoveValues?: boolean }) {
  return Promise.all(nodes.map(async (node) => {
    if (key) {
      tokensSharedDataHandler.set(node, key, '');
      if (shouldRemoveValues) {
        removeValuesFromNode(node, key);
      }
    } else {
      Object.values(Properties).forEach((prop) => {
        tokensSharedDataHandler.set(node, prop, '');
        if (shouldRemoveValues) {
          removeValuesFromNode(node, prop);
        }
      });
    }
  }));
}

export async function setNonePluginData({ nodes, key }: { nodes: readonly (BaseNode | SceneNode)[], key: Properties }) {
  return Promise.all(nodes.map(async (node) => {
    tokensSharedDataHandler.set(node, key, 'none');
    removeValuesFromNode(node, key);
  }));
}
