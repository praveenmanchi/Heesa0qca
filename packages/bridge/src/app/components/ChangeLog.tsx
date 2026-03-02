import React, { useCallback } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { Button, Heading } from '@tokens-studio/ui';
import { Dispatch } from '../store';
import Box from './Box';
import Text from './Text';
import Stack from './Stack';
import { changeLogSelector } from '@/selectors';
import { AsyncMessageChannel } from '@/AsyncMessageChannel';
import { AsyncMessageTypes } from '@/types/AsyncMessages';
import { TabRoot } from '@/app/components/ui';
import { FONT_SIZE } from '@/constants/UIConstants';

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
    <TabRoot>
      {/* Header */}
      <Box css={{
        padding: '$3 $4',
        borderBottom: '1px solid $borderMuted',
        flexShrink: 0,
      }}
      >
        <Stack direction="row" align="center" justify="between">
          <Heading size="small" css={{ margin: 0, fontWeight: 600, color: '$fgDefault' }}>Change Log</Heading>
          <Stack direction="row" gap={2}>
            <Button variant="secondary" size="small" onClick={handleClearLogs}>
              Clear
            </Button>
            <Button variant="primary" size="small" onClick={handleGenerateValues}>
              Generate
            </Button>
          </Stack>
        </Stack>
      </Box>

      {/* Content */}
      <Box css={{ flex: 1, padding: '$4', overflowY: 'auto' }}>
        <Stack direction="column" gap={3}>
          {logs.length === 0 ? (
            <Box css={{
              padding: '$5',
              textAlign: 'center',
              color: '$fgMuted',
              fontSize: FONT_SIZE.sm,
            }}
            >
              No changes recorded in this session.
            </Box>
          ) : (
            logs.map((log, index) => (
              <Box
                key={index}
                css={{
                  padding: '$3',
                  borderRadius: '$medium',
                  background: '$bgSubtle',
                  border: '1px solid $borderMuted',
                }}
              >
                <Stack direction="row" justify="between" align="center" css={{ marginBottom: '$1' }}>
                  <Text bold size="small" css={{ textTransform: 'uppercase', color: '$fgMuted', fontSize: FONT_SIZE.xxs }}>
                    {log.type}
                  </Text>
                  <Text size="xsmall" muted css={{ fontSize: FONT_SIZE.xxs }}>
                    {new Date(log.timestamp).toLocaleTimeString()}
                  </Text>
                </Stack>
                <Text size="small" css={{ wordBreak: 'break-word', fontSize: FONT_SIZE.sm }}>
                  {log.name}
                </Text>
                {log.details && (
                  <Text size="small" muted css={{ marginTop: '$1', fontSize: FONT_SIZE.xs }}>
                    {log.details}
                  </Text>
                )}
              </Box>
            ))
          )}
        </Stack>
      </Box>
    </TabRoot>
  );
}
