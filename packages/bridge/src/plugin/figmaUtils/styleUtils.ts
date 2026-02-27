import { tokensSharedDataHandler } from '../SharedDataHandler';

type StyleTypeName = 'effects' | 'fills' | 'strokes' | 'typography';
type StyleType<T> =
  T extends 'effects' ? EffectStyle :
    T extends 'fills' | 'strokes' ? PaintStyle :
      T extends 'typography' ? TextStyle :
        never;

export function getStyleId(node: BaseNode, key: StyleTypeName) {
  if (key === 'effects' && key in node && typeof node.effectStyleId === 'string') {
    return node.effectStyleId;
  }
  if (key === 'fills' && key in node && typeof node.fillStyleId === 'string') {
    return node.fillStyleId;
  }
  if (key === 'strokes' && key in node && typeof node.strokeStyleId === 'string') {
    return node.strokeStyleId;
  }
  if (key === 'typography' && node.type === 'TEXT' && typeof node.textStyleId === 'string') {
    return node.textStyleId;
  }
  return undefined;
}

function getStyleIdFromBackup(node: BaseNode, backupKey: string) {
  return tokensSharedDataHandler.get(node, backupKey, (val) => {
    if (val) {
      try {
        const parsedValue = JSON.parse(val) as string;
        return parsedValue;
      } catch (e) {
        return val;
      }
    }
    return val;
  });
}

export async function getNonLocalStyle<T extends StyleTypeName>(
  node: BaseNode,
  backupKey: string,
  key: T,
): Promise<StyleType<T> | undefined> {
  let nonLocalStyle: BaseStyle | undefined;
  const styleId = getStyleId(node, key) || getStyleIdFromBackup(node, backupKey);
  if (styleId) {
    try {
      const style = await figma.getStyleByIdAsync(styleId);
      if (style?.remote) {
        nonLocalStyle = style;
      }
    } catch {
      // Ignore styles that cannot be resolved
    }
  }
  return nonLocalStyle as StyleType<T>;
}

export async function getLocalStyle<T extends StyleTypeName>(
  node: BaseNode,
  backupKey: string,
  key: T,
): Promise<StyleType<T> | undefined> {
  const styleId = getStyleId(node, key) || getStyleIdFromBackup(node, backupKey);
  if (!styleId) return undefined;
  try {
    return await figma.getStyleByIdAsync(styleId) as StyleType<T>;
  } catch {
    return undefined;
  }
}

export function setStyleIdBackup(node: BaseNode, backupKey: string, styleId: string) {
  // Setting to empty string will delete the plugin data key if the style id doesn't exist:
  tokensSharedDataHandler.set(node, backupKey, styleId ? JSON.stringify(styleId) : '');
}

export function clearStyleIdBackup(node: BaseNode, backupKey: string) {
  // Setting to empty string will delete the plugin data key:
  tokensSharedDataHandler.set(node, backupKey, '');
}
