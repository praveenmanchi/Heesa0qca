import { AsyncMessageChannelHandlers } from '@/AsyncMessageChannel';
import { AsyncMessageTypes } from '@/types/AsyncMessages';
import { generateStyleGuideFromVariables } from '../utils/styleGuideFromVariablesGenerator';

export const generateStyleGuideFromVariablesHandler: AsyncMessageChannelHandlers[AsyncMessageTypes.GENERATE_STYLE_GUIDE_FROM_VARIABLES] = async (msg) => {
  const {
    variables,
    collectionName,
    modeName,
    modeId,
    groupsConfig,
  } = msg;
  await generateStyleGuideFromVariables(variables, collectionName, modeName, modeId, groupsConfig);
};
