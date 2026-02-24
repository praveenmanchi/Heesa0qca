import { AsyncMessageChannelHandlers } from '@/AsyncMessageChannel';
import { AsyncMessageTypes } from '@/types/AsyncMessages';

export type CollectionModeInfo = { modeId: string; name: string };
export type CollectionInfo = { id: string; name: string; modes: CollectionModeInfo[] };

export const extractVariablesToCanvas: AsyncMessageChannelHandlers[AsyncMessageTypes.EXTRACT_VARIABLES_TO_CANVAS] = async (_msg) => {
  try {
    const localVariables = await figma.variables.getLocalVariablesAsync();
    const localCollections = await figma.variables.getLocalVariableCollectionsAsync();

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

    const outputJson = JSON.stringify(variablesJson, null, 2);

    return { jsonString: outputJson, collectionsInfo };
  } catch (error) {
    console.error('Error extracting variables to canvas', error);
    return { jsonString: '[]', collectionsInfo: [] };
  }
};
