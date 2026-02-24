import { AsyncMessageChannelHandlers } from '@/AsyncMessageChannel';
import { AsyncMessageTypes } from '@/types/AsyncMessages';
import { store } from '../store';

export const setVariables: AsyncMessageChannelHandlers[AsyncMessageTypes.SET_VARIABLES] = async () => {
    store.dispatch.uiState.setVariableUsageReloadTrigger();
};
