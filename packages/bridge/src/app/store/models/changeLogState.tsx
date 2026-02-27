import { createModel } from '@rematch/core';
import { RootModel } from '@/types/RootModel';

import { LogEntry } from '@/types/LogEntry';

export interface ChangeLogState {
  logs: LogEntry[];
}

export const changeLogState = createModel<RootModel>()({
  state: {
    logs: [],
  } as ChangeLogState,
  reducers: {
    addLogs: (state, payload: Omit<LogEntry, 'timestamp'>[]) => ({
      ...state,
      logs: [
        ...state.logs,
        ...payload.map((entry) => ({ ...entry, timestamp: Date.now() })),
      ],
    }),
    clearLogs: (state) => ({
      ...state,
      logs: [],
    }),
  },
});
