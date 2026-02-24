import { AsyncMessageChannelHandlers } from '@/AsyncMessageChannel';
import { AsyncMessageTypes } from '@/types/AsyncMessages';
import type { UxaiHistoryEntry } from '@/types/AsyncMessages';

const UXAI_HISTORY_KEY = 'uxaiHistory';

export const getUxaiHistory: AsyncMessageChannelHandlers[AsyncMessageTypes.GET_UXAI_HISTORY] = async () => {
  const stored = await figma.clientStorage.getAsync(UXAI_HISTORY_KEY);
  const history: UxaiHistoryEntry[] = stored ? JSON.parse(stored) : [];
  return { history };
};

export const setUxaiHistory: AsyncMessageChannelHandlers[AsyncMessageTypes.SET_UXAI_HISTORY] = async (msg) => {
  await figma.clientStorage.setAsync(UXAI_HISTORY_KEY, JSON.stringify(msg.history));
};
