import React from 'react';
import { Heading } from '@tokens-studio/ui';
import { SingleToken } from '@/types/tokens';
import Box from './Box';
import InspectorTokenSingle from './InspectorTokenSingle';
import { Properties } from '@/constants/Properties';
import { SelectionGroup } from '@/types';

export default function InspectorTokenGroup({ group, resolvedTokens, selectedMode }: { group: [Properties, SelectionGroup[]], resolvedTokens: SingleToken[], selectedMode: string }) {
  const [groupKey, groupValue] = group;

  return (
    <Box
      css={{
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        marginBottom: '$3',
      }}
      key={`${groupKey}`}
    >
      <Heading size="small">{groupKey}</Heading>
      {groupValue.map((uniqueToken) => <InspectorTokenSingle key={`${uniqueToken.category}-${uniqueToken.value}`} token={uniqueToken} resolvedTokens={resolvedTokens} selectedMode={selectedMode} />)}
    </Box>
  );
}
