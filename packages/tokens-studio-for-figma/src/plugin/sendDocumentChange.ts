import { sendSelectionChange } from './sendSelectionChange';
import { AsyncMessageChannel } from '@/AsyncMessageChannel';
import { AsyncMessageTypes } from '@/types/AsyncMessages';

export async function sendDocumentChange(event: DocumentChangeEvent) {
  if (event.documentChanges.length > 0) {
    await sendSelectionChange();
  }

  const variableChanges = event.documentChanges.filter((change) => change.type === 'PROPERTY_CHANGE' && (change.properties as unknown as string[]).includes('boundVariables'));

  if (variableChanges.length > 0) {
    AsyncMessageChannel.PluginInstance.message({
      type: AsyncMessageTypes.SET_VARIABLES,
    });
  }
}
