import { clone } from '@figma-plugin/helpers';
import { AsyncMessageChannelHandlers } from '@/AsyncMessageChannel';
import { AsyncMessageTypes } from '@/types/AsyncMessages';
import { convertToFigmaColor } from '../figmaTransforms/colors';
import { sendSelectionChange } from '../sendSelectionChange';

/** Rebind nodes from oldVariableId to newVariable across the document */
async function remapVariableBindings(oldVariableId: string, newVariableId: string): Promise<number> {
  const oldVar = await figma.variables.getVariableByIdAsync(oldVariableId);
  const newVar = await figma.variables.getVariableByIdAsync(newVariableId);
  if (!oldVar || !newVar) return 0;

  let remapped = 0;
  const defaultPaint: SolidPaint = { type: 'SOLID', color: { r: 0, g: 0, b: 0 } };

  async function traverse(nodes: readonly SceneNode[]) {
    for (const node of nodes) {
      try {
        const bv = (node as SceneNode & { boundVariables?: Record<string, unknown> }).boundVariables;
        if (!bv) {
          if ('children' in node) await traverse((node as ChildrenMixin).children);
          continue;
        }

        for (const [key, value] of Object.entries(bv)) {
          if (key === 'componentProperties' && value && typeof value === 'object') {
            for (const [propName, alias] of Object.entries(value as Record<string, { id?: string }>)) {
              if (alias?.id === oldVariableId && 'setBoundVariable' in node) {
                (node as any).setBoundVariable(propName, newVar);
                remapped += 1;
              }
            }
          } else if (Array.isArray(value) && (key === 'fills' || key === 'strokes')) {
            const paints = key === 'fills' ? (node as GeometryMixin).fills : (node as GeometryMixin).strokes;
            if (!paints || !Array.isArray(paints)) continue;
            let changed = false;
            const arr = value as { id?: string }[];
            const paintsCopy = clone(paints) as Paint[];
            for (let i = 0; i < arr.length; i++) {
              if (arr[i]?.id === oldVariableId && paintsCopy[i]) {
                paintsCopy[i] = figma.variables.setBoundVariableForPaint(paintsCopy[i] as SolidPaint, 'color', newVar);
                changed = true;
              }
            }
            if (changed) {
              if (key === 'fills') (node as GeometryMixin).fills = paintsCopy;
              else (node as GeometryMixin).strokes = paintsCopy;
              remapped += 1;
            }
          } else if (value && typeof value === 'object' && (value as { id?: string }).id === oldVariableId && 'setBoundVariable' in node) {
            (node as any).setBoundVariable(key, newVar);
            remapped += 1;
          }
        }
        if ('children' in node) await traverse((node as ChildrenMixin).children);
      } catch {
        // skip problematic nodes
      }
    }
  }

  for (const page of figma.root.children) {
    try {
      await page.loadAsync();
    } catch {
      // ignore
    }
    await traverse(page.children);
  }
  return remapped;
}

export const applyUxaiChanges: AsyncMessageChannelHandlers[AsyncMessageTypes.APPLY_UXAI_CHANGES] = async (msg) => {
  const { updates = [], creates = [] } = msg;
  const errors: string[] = [];
  let applied = 0;
  let remapped = 0;

  // Apply updates to existing variables
  for (const u of updates) {
    try {
      let variable = await figma.variables.getVariableByIdAsync(u.variableId);
      if (!variable && u.variableName) {
        const allVars = await figma.variables.getLocalVariablesAsync();
        variable = allVars.find((v) => v.name === u.variableName) ?? null;
      }
      if (!variable) {
        errors.push(`Variable ${u.variableId}${u.variableName ? ` (${u.variableName})` : ''} not found`);
        continue;
      }

      const { modeId } = u;

      let figmaValue: VariableValue;
      switch (u.type) {
        case 'COLOR': {
          const { color, opacity } = convertToFigmaColor(String(u.value));
          figmaValue = { ...color, a: opacity };
          break;
        }
        case 'FLOAT':
          figmaValue = typeof u.value === 'number' ? u.value : parseFloat(String(u.value));
          break;
        case 'STRING':
          figmaValue = String(u.value);
          break;
        case 'BOOLEAN':
          figmaValue = u.value === true || u.value === 'true';
          break;
        default:
          errors.push(`Unknown type ${u.type} for variable ${variable.name}`);
          continue;
      }

      variable.setValueForMode(modeId, figmaValue);
      applied += 1;
    } catch (e: any) {
      errors.push(`Update failed for ${u.variableId}: ${e?.message ?? String(e)}`);
    }
  }

  // Create new variables
  for (const c of creates) {
    try {
      const collection = await figma.variables.getVariableCollectionByIdAsync(c.collectionId);
      if (!collection) {
        errors.push(`Collection ${c.collectionId} not found for create ${c.variableName}`);
        continue;
      }

      const hasMode = collection.modes.some((m) => m.modeId === c.modeId);
      if (!hasMode) {
        errors.push(`Mode ${c.modeId} not found in collection for ${c.variableName}`);
        continue;
      }

      const variableType = c.type as VariableResolvedDataType;
      const variable = figma.variables.createVariable(c.variableName, collection, variableType);

      let figmaValue: VariableValue;
      switch (c.type) {
        case 'COLOR': {
          const { color, opacity } = convertToFigmaColor(String(c.value));
          figmaValue = { ...color, a: opacity };
          break;
        }
        case 'FLOAT':
          figmaValue = typeof c.value === 'number' ? c.value : parseFloat(String(c.value));
          break;
        case 'STRING':
          figmaValue = String(c.value);
          break;
        case 'BOOLEAN':
          figmaValue = c.value === true || c.value === 'true';
          break;
        default:
          errors.push(`Unknown type ${c.type} for create ${c.variableName}`);
          variable.remove();
          continue;
      }

      variable.setValueForMode(c.modeId, figmaValue);
      applied += 1;

      if (c.remapFromVariableId) {
        try {
          remapped += await remapVariableBindings(c.remapFromVariableId, variable.id);
        } catch (e: any) {
          errors.push(`Remap failed for ${c.variableName}: ${e?.message ?? String(e)}`);
        }
      }
    } catch (e: any) {
      errors.push(`Create failed for ${c.variableName}: ${e?.message ?? String(e)}`);
    }
  }

  sendSelectionChange();
  return { applied, remapped, errors };
};
