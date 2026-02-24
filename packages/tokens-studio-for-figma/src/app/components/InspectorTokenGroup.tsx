import React from 'react';
import { Heading } from '@tokens-studio/ui';
import { ChevronDownIcon, ChevronRightIcon } from '@radix-ui/react-icons';
import { SingleToken } from '@/types/tokens';
import Box from './Box';
import InspectorTokenSingle from './InspectorTokenSingle';
import { Properties } from '@/constants/Properties';
import { SelectionGroup } from '@/types';

export default function InspectorTokenGroup({ group, resolvedTokens, selectedMode, defaultCollapsed = false }: { group: [Properties, SelectionGroup[]], resolvedTokens: SingleToken[], selectedMode: string, defaultCollapsed?: boolean }) {
  const [groupKey, groupValue] = group;
  const [isCollapsed, setIsCollapsed] = React.useState(defaultCollapsed);

  const totalNodes = groupValue.reduce((sum, t) => sum + t.nodes.length, 0);

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
        as="button"
        onClick={() => setIsCollapsed((c) => !c)}
        css={{
          display: 'flex',
          alignItems: 'center',
          gap: '$2',
          width: '100%',
          padding: '$2 $3',
          background: '$bgSubtle',
          border: 'none',
          cursor: 'pointer',
          textAlign: 'left',
          '&:hover': { background: '$bgCanvas' },
        }}
      >
        {isCollapsed ? <ChevronRightIcon width={14} height={14} /> : <ChevronDownIcon width={14} height={14} />}
        <Heading size="small" css={{ flex: 1, margin: 0 }}>{groupKey}</Heading>
        <Box css={{ fontSize: '$label', color: '$fgSubtle' }}>
          {groupValue.length}
          {' '}
          {groupValue.length === 1 ? 'variable' : 'variables'}
          {' · '}
          {totalNodes}
          {' '}
          {totalNodes === 1 ? 'use' : 'uses'}
        </Box>
      </Box>
      {!isCollapsed && (
        <Box css={{ padding: '$1 0' }}>
          {groupValue.map((uniqueToken) => <InspectorTokenSingle key={`${uniqueToken.category}-${uniqueToken.value}`} token={uniqueToken} resolvedTokens={resolvedTokens} selectedMode={selectedMode} />)}
        </Box>
      )}
    </Box>
  );
}
