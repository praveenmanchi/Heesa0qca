import { AsyncMessageChannelHandlers } from '@/AsyncMessageChannel';
import { AsyncMessageTypes } from '@/types/AsyncMessages';
import { updateStyleGuide as updateStyleGuideLogic } from '../utils/styleGuideGenerator';

export const updateStyleGuide: AsyncMessageChannelHandlers[AsyncMessageTypes.UPDATE_STYLE_GUIDE] = async (msg) => {
  const { themeData } = msg;
  await updateStyleGuideLogic(themeData);
};
