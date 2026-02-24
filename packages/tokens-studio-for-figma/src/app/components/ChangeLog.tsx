import React, { useCallback } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { Button, Box, Heading } from '@tokens-studio/ui';
import { Dispatch, RootState } from '../store';
import Text from './Text';
import Stack from './Stack';
import { changeLogSelector } from '@/selectors';
import { AsyncMessageChannel } from '@/AsyncMessageChannel';
import { AsyncMessageTypes } from '@/types/AsyncMessages';

export default function ChangeLog() {
  const dispatch = useDispatch<Dispatch>();
  const logs = useSelector(changeLogSelector);

  const handleClearLogs = useCallback(() => {
    dispatch.changeLogState.clearLogs();
  }, [dispatch]);

  const handleGenerateValues = useCallback(() => {
    AsyncMessageChannel.ReactInstance.message({
      type: AsyncMessageTypes.CREATE_CHANGE_LOG_FRAME,
      logs,
    });
  }, [logs]);

  return (
    <Box css={{
      display: 'flex', flexDirection: 'column', flexGrow: 1, padding: '$4', height: '100%', overflowY: 'auto',
    }}
    >
      <Stack direction="row" align="center" justify="between" css={{ marginBottom: '$4' }}>
        <Heading size="small">Change Log</Heading>
        <Stack direction="row" gap={2}>
          <Button variant="secondary" onClick={handleClearLogs}>
            Clear
          </Button>
          <Button variant="primary" onClick={handleGenerateValues}>
            Generate
          </Button>
        </Stack>
      </Stack>

      <Stack direction="column" gap={3}>
        {logs.length === 0 ? (
          <Text muted>No changes recorded in this session.</Text>
        ) : (
          logs.map((log, index) => (
            <Box
              key={index}
              css={{
                padding: '$3', borderRadius: '$medium', background: '$bgSubtle', border: '1px solid $borderMuted',
              }}
            >
              <Stack direction="row" justify="between" align="center" css={{ marginBottom: '$1' }}>
                <Text bold size="small" css={{ textTransform: 'uppercase', color: '$textMuted' }}>
                  {log.type}
                </Text>
                <Text size="xsmall" muted>
                  {new Date(log.timestamp).toLocaleTimeString()}
                </Text>
              </Stack>
              <Text size="small" css={{ wordBreak: 'break-word' }}>
                {log.name}
              </Text>
              {log.details && (
                <Text size="small" muted css={{ marginTop: '$1' }}>
                  {log.details}
                </Text>
              )}
            </Box>
          ))
        )}
      </Stack>
    </Box>
  );
}
