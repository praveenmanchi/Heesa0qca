import { AsyncMessageChannelHandlers } from '@/AsyncMessageChannel';
import { AsyncMessageTypes } from '@/types/AsyncMessages';
import { sendSelectionChange } from '../sendSelectionChange';
import { removePluginDataByMap } from '../removePluginDataByMap';
import { Properties } from '@/constants/Properties';

export const removeTokensByValue: AsyncMessageChannelHandlers[AsyncMessageTypes.REMOVE_TOKENS_BY_VALUE] = async (msg) => {
  const nodesToRemove: { node: BaseNode, key: Properties }[] = [];
  const promises: Set<Promise<void>> = new Set();

  msg.tokensToRemove.forEach((token) => {
    token.nodes.forEach(((node) => {
      promises.add((async () => {
        try {
          const figmaNode = await figma.getNodeByIdAsync(node.id);
          if (figmaNode) nodesToRemove.push({ node: figmaNode, key: token.property });
        } catch {
          // ignore missing nodes
        }
      })());
    }));
  });

  await Promise.all(promises);

  if (nodesToRemove.length) await removePluginDataByMap({ nodeKeyMap: nodesToRemove });

  sendSelectionChange();
};
