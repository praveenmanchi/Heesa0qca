import { clone, figmaRGBToHex } from '@figma-plugin/helpers';
import { Properties } from '@/constants/Properties';
import { SingleColorToken } from '@/types/tokens';
import convertVariableTypeToProperty from '@/utils/convertVariableTypeToProperty';

export type SelectionVariable = {
  name: string;
  type: Properties;
  value?: string;
  modes?: Record<string, string>;
};

function getModesFromVariable(variable: Variable): Record<string, string> {
  const modes: Record<string, string> = {};
  if (!variable || !variable.valuesByMode || !variable.variableCollectionId) return modes;

  const collection = figma.variables.getVariableCollectionById(variable.variableCollectionId);
  if (!collection) return modes;

  Object.entries(variable.valuesByMode).forEach(([modeId, val]) => {
    const modeName = collection.modes.find((m) => m.modeId === modeId)?.name || modeId;
    let resolvedVal = val;
    if (typeof val === 'object' && val !== null && 'type' in val && val.type === 'VARIABLE_ALIAS') {
      const aliasVar = figma.variables.getVariableById(val.id);
      resolvedVal = aliasVar ? `{${aliasVar.name.split('/').join('.')}}` : `{${val.id}}`;
    } else if (variable.resolvedType === 'COLOR') {
      resolvedVal = figmaRGBToHex(val as RGBA);
    }
    modes[modeName] = String(resolvedVal);
  });

  return modes;
}

export default function getAppliedVariablesFromNode(node: BaseNode): SelectionVariable[] {
  const localVariables: SelectionVariable[] = [];
  if (node.type !== 'DOCUMENT' && node.type !== 'PAGE' && node.boundVariables) {
    Object.entries(node.boundVariables).forEach(([key, value]) => {
      if ('fills' in node && key === 'fills' && Array.isArray(value)) {
        const variableId = node.boundVariables?.fills?.[0].id;
        if (variableId) {
          const variable = figma.variables.getVariableById(variableId);
          if (variable) {
            const paint = clone(node.fills);
            let variableObject: SingleColorToken | null = {} as SingleColorToken;
            if (paint[0].type === 'SOLID') {
              const { r, g, b } = paint[0].color;
              const a = paint[0].opacity;
              variableObject.value = figmaRGBToHex({
                r,
                g,
                b,
                a,
              });
            } else {
              variableObject = null;
            }
            localVariables.push({
              ...variableObject,
              name: variable?.name.split('/').join('.'),
              type: Properties.fill,
              modes: getModesFromVariable(variable),
            });
          }
        }
      }
      if (key === 'strokes' && Array.isArray(value)) {
        const variableId = node.boundVariables?.strokes?.[0].id;

        if (variableId) {
          const variable = figma.variables.getVariableById(variableId);
          if (variable && 'strokes' in node && typeof node.strokes !== 'undefined') {
            const paint = clone(node.strokes);
            let variableObject: SingleColorToken | null = {} as SingleColorToken;
            if (paint[0].type === 'SOLID') {
              const { r, g, b } = paint[0].color;
              const a = paint[0].opacity;
              variableObject.value = figmaRGBToHex({
                r,
                g,
                b,
                a,
              });
            } else {
              variableObject = null;
            }
            localVariables.push({
              ...variableObject,
              name: variable?.name.split('/').join('.'),
              type: Properties.borderColor,
              modes: getModesFromVariable(variable),
            });
          }
        }
      }
      if (key === 'componentProperties' && value && typeof value === 'object') {
        Object.entries(value).forEach(([propName, alias]) => {
          const variableId = (alias as { id?: string })?.id;
          if (variableId && typeof variableId === 'string') {
            const variable = figma.variables.getVariableById(variableId);
            if (variable) {
              const varTypeToProp: Record<string, Properties> = {
                COLOR: Properties.fill,
                FLOAT: Properties.number,
                STRING: Properties.typography,
                BOOLEAN: Properties.visibility,
              };
              const propType = varTypeToProp[variable.resolvedType] || (Properties.tokenValue as Properties);
              localVariables.push({
                name: variable.name.split('/').join('.'),
                type: propType,
                modes: getModesFromVariable(variable),
              });
            }
          }
        });
      }
      if (!Array.isArray(value) && key !== 'componentProperties' && key in node) {
        const variableId = (value as { id?: string })?.id;
        if (variableId && typeof variableId === 'string') {
          const variable = figma.variables.getVariableById(variableId);
          if (variable) {
            localVariables.push({
              name: variable?.name.split('/').join('.'),
              type: convertVariableTypeToProperty(key),
              // @TODO:: Rightnow, We get value from node directly. We Should investigate whether we can get value from variable by current mode. Rightnow, seems like that there is noway to know the current mode
              ...(key in node && { value: String(node[key as keyof typeof node]) }),
              modes: getModesFromVariable(variable),
            });
          }
        }
      }
    });
  }

  return localVariables;
}
