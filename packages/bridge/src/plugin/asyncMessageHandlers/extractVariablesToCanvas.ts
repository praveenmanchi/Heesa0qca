import { AsyncMessageChannelHandlers } from '@/AsyncMessageChannel';
import { AsyncMessageTypes } from '@/types/AsyncMessages';

export type CollectionModeInfo = { modeId: string; name: string };
export type CollectionInfo = { id: string; name: string; modes: CollectionModeInfo[] };

export const extractVariablesToCanvas: AsyncMessageChannelHandlers[AsyncMessageTypes.EXTRACT_VARIABLES_TO_CANVAS] = async (_msg) => {
  try {
    const localVariables = await figma.variables.getLocalVariablesAsync();
    const localCollections = await figma.variables.getLocalVariableCollectionsAsync();
    const localTextStyles = await figma.getLocalTextStylesAsync();

    const collectionMap = new Map(localCollections.map((c) => [c.id, c.name]));
    const collectionsInfo: CollectionInfo[] = localCollections.map((c) => ({
      id: c.id,
      name: c.name,
      modes: c.modes.map((m) => ({ modeId: m.modeId, name: m.name })),
    }));

    // Map the variables to a clean JSON structure with chunked yielding
    const variablesJson: any[] = [];
    const CHUNK_SIZE = 100;
    const YIELD_MS = 12;
    let lastYieldTime = Date.now();

    for (let i = 0; i < localVariables.length; i += 1) {
      const v = localVariables[i];
      variablesJson.push({
        id: v.id,
        name: v.name,
        description: v.description,
        type: v.resolvedType,
        collectionId: v.variableCollectionId,
        collectionName: collectionMap.get(v.variableCollectionId) || 'Unknown',
        valuesByMode: v.valuesByMode,
      });

      if (i > 0 && i % CHUNK_SIZE === 0) {
        const now = Date.now();
        if (now - lastYieldTime > YIELD_MS) {
          await new Promise((resolve) => {
            setTimeout(resolve, 5);
          });
          lastYieldTime = Date.now();
        }
      }
    }

    // Append local text styles as a pseudo-collection
    if (localTextStyles.length > 0) {
      const TEXT_STYLE_COLLECTION_ID = 'mock-text-styles-collection';
      const TEXT_STYLE_MODE_ID = 'default';

      collectionsInfo.push({
        id: TEXT_STYLE_COLLECTION_ID,
        name: 'Text Styles',
        modes: [{ modeId: TEXT_STYLE_MODE_ID, name: 'Default' }],
      });

      for (let i = 0; i < localTextStyles.length; i += 1) {
        const style = localTextStyles[i];

        let displayValue: any = 'Mixed';
        if (typeof style.fontName !== 'symbol') {
          displayValue = {
            family: style.fontName.family,
            style: style.fontName.style,
            fontSize: style.fontSize,
            lineHeight: style.lineHeight,
            letterSpacing: style.letterSpacing
          };
        } else {
          // Fallback if the style has mixed font properties
          displayValue = 'Multiple fonts';
        }

        variablesJson.push({
          id: style.id,
          name: style.name,
          description: style.description,
          type: 'STRING',
          collectionId: TEXT_STYLE_COLLECTION_ID,
          collectionName: 'Text Styles',
          valuesByMode: {
            [TEXT_STYLE_MODE_ID]: displayValue,
          },
        });
      }
    }

    const outputJson = JSON.stringify(variablesJson, null, 2);

    return { jsonString: outputJson, collectionsInfo };
  } catch (error) {
    console.error('Error extracting variables to canvas', error);
    return { jsonString: '[]', collectionsInfo: [] };
  }
};
