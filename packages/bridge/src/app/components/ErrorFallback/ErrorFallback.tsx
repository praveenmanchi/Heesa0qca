import React, { useEffect } from 'react';
import * as Sentry from '@sentry/react';
import { Heading } from '@tokens-studio/ui';
import Stack from '../Stack';
import Text from '../Text';
import { AsyncMessageChannel } from '@/AsyncMessageChannel';
import { AsyncMessageTypes } from '@/types/AsyncMessages';

export function ErrorFallback({ error }: { error: Error }) {
  useEffect(() => {
    // Log to Sentry for debugging
    Sentry.captureException(error);

    // Notify user via Figma toast (plugin context only – no-op in browser preview)
    try {
      AsyncMessageChannel.ReactInstance.message({
        type: AsyncMessageTypes.NOTIFY,
        msg: `An unexpected error occurred: ${error.message}`,
        opts: { error: true },
      });
    } catch {
      // Ignore if plugin not connected (e.g. browser preview)
    }
  }, [error]);

  return (
    <Stack direction="column" align="center" gap={4} justify="center" css={{ padding: '$4', height: '100%', textAlign: 'center' }}>
      <Heading>An unexpected error has occurred</Heading>
      <Stack direction="column" gap={3}>
        <Text size="xsmall" muted>{error.message}</Text>
      </Stack>
    </Stack>
  );
}
