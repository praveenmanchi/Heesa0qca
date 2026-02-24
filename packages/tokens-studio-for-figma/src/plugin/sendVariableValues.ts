import { AsyncMessageChannel } from '@/AsyncMessageChannel';
import { AsyncMessageTypes } from '@/types/AsyncMessages';

export async function sendVariableValues(variables: Variable[]) {
  AsyncMessageChannel.ReactInstance.message({
    type: AsyncMessageTypes.SET_VARIABLES,
    variables,
  });
}
