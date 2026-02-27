import store from './store';
import { defaultNodeManager } from './NodeManager';
import { SelectionContent, sendPluginValues } from './pluginData';
import { notifyNoSelection, postToUI } from './notifiers';
import { UpdateMode } from '@/constants/UpdateMode';
import { MessageFromPluginTypes } from '@/types/messages';
import { BackgroundJobs } from '@/constants/BackgroundJobs';

export async function sendSelectionChange(): Promise<SelectionContent | null> {
  const currentSelectionLength = figma.currentPage.selection.length;

  if (!currentSelectionLength) {
    notifyNoSelection();
    return null;
  }

  postToUI({
    type: MessageFromPluginTypes.START_JOB,
    job: { name: BackgroundJobs.INSPECTOR_SELECTION_UPDATE, isInfinite: true },
  });

  try {
    const nodes = store.shouldSendSelectionValues
      ? (
        await defaultNodeManager.findBaseNodesWithData({ updateMode: UpdateMode.SELECTION, nodesWithoutPluginData: true })
      )
      : await defaultNodeManager.findBaseNodesWithData({ nodes: figma.currentPage.selection, nodesWithoutPluginData: false });

    const result = await sendPluginValues({ nodes, shouldSendSelectionValues: store.shouldSendSelectionValues });
    return result;
  } catch (err: any) {
    figma.notify(`Failed to load selection: ${err?.message || 'Unknown error'}`, { error: true });
    notifyNoSelection();
    return null;
  } finally {
    postToUI({
      type: MessageFromPluginTypes.COMPLETE_JOB,
      name: BackgroundJobs.INSPECTOR_SELECTION_UPDATE,
    });
  }
}
