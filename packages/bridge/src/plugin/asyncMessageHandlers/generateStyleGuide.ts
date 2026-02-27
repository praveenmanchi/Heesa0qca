import { AsyncMessageChannelHandlers } from '@/AsyncMessageChannel';
import { AsyncMessageTypes } from '@/types/AsyncMessages';
import { generateStyleGuide as generateStyleGuideLogic } from '../utils/styleGuideGenerator';

export const generateStyleGuide: AsyncMessageChannelHandlers[AsyncMessageTypes.GENERATE_STYLE_GUIDE] = async (msg) => {
  const { themeData } = msg;
  await generateStyleGuideLogic(themeData);
};
