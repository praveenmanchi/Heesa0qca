import { RootState } from '@/app/store';

export const changeLogSelector = (state: RootState) => state.changeLogState.logs;
