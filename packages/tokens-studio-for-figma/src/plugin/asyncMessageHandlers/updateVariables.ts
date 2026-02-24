import { AsyncMessageChannelHandlers } from '@/AsyncMessageChannel';
import { AsyncMessageTypes } from '@/types/AsyncMessages';
import updateVariablesFromPlugin from '../updateVariablesFromPlugin';

export const updateVariables: AsyncMessageChannelHandlers[AsyncMessageTypes.UPDATE_VARIABLES] = (msg) => (
  updateVariablesFromPlugin(msg.payload)
);
