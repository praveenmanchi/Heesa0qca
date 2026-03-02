import React from 'react';
import { Heading } from '@tokens-studio/ui';
import { TokensIcon, ComponentInstanceIcon } from '@radix-ui/react-icons';
import { SingleToken } from '@/types/tokens';
import { ICON_SIZE } from '@/constants/UIConstants';
import Box from './Box';
import InspectorTokenSingle from './InspectorTokenSingle';
import { Properties } from '@/constants/Properties';
import { SelectionGroup } from '@/types';

export default function InspectorTokenGroup({
  group, resolvedTokens, selectedMode,
}: { group: [Properties, SelectionGroup[]], resolvedTokens: SingleToken[], selectedMode: string }) {
  const [groupKey, groupValue] = group;

  const totalNodes = groupValue.reduce((sum, t) => sum + t.nodes.length, 0);
  const uniqueCompCount = new Set(
    groupValue.flatMap((t) => t.nodes.map((n) => n.componentName ?? n.id)),
  ).size;

  return (
    <Box
      css={{
        display: 'flex',
        flexDirection: 'column',
        marginBottom: '$3',
        border: '1px solid $borderMuted',
        borderRadius: '$medium',
        overflow: 'hidden',
      }}
      key={`${groupKey}`}
    >
      <Box
        css={{
          display: 'flex',
          alignItems: 'center',
          gap: '$2',
          width: '100%',
          padding: '$2 $3',
          background: '$bgSubtle',
        }}
      >
        <Heading size="small" css={{ flex: 1, margin: 0 }}>{groupKey}</Heading>
        <Box css={{
          display: 'flex', alignItems: 'center', gap: '$2', fontSize: '$label', color: '$fgSubtle',
        }}
        >
          <Box css={{ display: 'flex', alignItems: 'center', gap: '3px' }}>
            <TokensIcon width={ICON_SIZE.xs} height={ICON_SIZE.xs} />
            <span>
              {groupValue.length}
              {' '}
              {groupValue.length === 1 ? 'var' : 'vars'}
            </span>
          </Box>
          {uniqueCompCount > 0 && (
            <>
              <Box css={{ color: '$borderMuted' }}>·</Box>
              <Box css={{ display: 'flex', alignItems: 'center', gap: '3px' }}>
                <ComponentInstanceIcon width={ICON_SIZE.xs} height={ICON_SIZE.xs} />
                <span>{uniqueCompCount}</span>
              </Box>
            </>
          )}
          <Box css={{ color: '$borderMuted' }}>·</Box>
          <span>
            {totalNodes}
            {' '}
            {totalNodes === 1 ? 'use' : 'uses'}
          </span>
        </Box>
      </Box>
      <Box css={{ padding: '$1 0' }}>
        {groupValue.map((uniqueToken) => <InspectorTokenSingle key={`${uniqueToken.category}-${uniqueToken.value}`} token={uniqueToken} resolvedTokens={resolvedTokens} selectedMode={selectedMode} />)}
      </Box>
    </Box>
  );
}
