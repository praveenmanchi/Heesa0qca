import React, { useEffect, useState } from 'react';
import { Heading, Text, Badge, Spinner } from '@tokens-studio/ui';
import Box from './Box';
import Stack from './Stack';
import { AsyncMessageChannel } from '@/AsyncMessageChannel';
import {
  AsyncMessageTypes,
  type SelectionVisualizationNode,
} from '@/types/AsyncMessages';
import { FONT_SIZE } from '@/constants/UIConstants';

function VariableBadges({ variables }: { variables: SelectionVisualizationNode['variables'] }) {
  if (!variables.length) {
    return (
      <Text css={{ fontSize: FONT_SIZE.xs, color: '$fgSubtle' }}>
        No variables bound to this layer.
      </Text>
    );
  }

  return (
    <Stack direction="row" gap={1} css={{ flexWrap: 'wrap' }}>
      {variables.map((v) => (
        <Badge key={v.variableId} size="small" css={{ fontSize: FONT_SIZE.xxs }}>
          {v.variableName}
          {' · '}
          {v.totalCount}
          {' uses · '}
          {v.componentCount}
          {' components'}
        </Badge>
      ))}
    </Stack>
  );
}

function TreeNode({ node, depth }: { node: SelectionVisualizationNode; depth: number }) {
  const [expanded, setExpanded] = useState(depth < 2);

  return (
    <Box
      css={{
        padding: '$1 $2',
        paddingLeft: `$${2 + depth}`,
        borderBottom: '1px solid $borderSubtle',
        '&:hover': { backgroundColor: '$bgSubtle' },
      }}
    >
      <Stack
        direction="row"
        align="center"
        justify="between"
        css={{ cursor: 'pointer' }}
        onClick={() => setExpanded((e) => !e)}
      >
        <Stack direction="row" align="center" gap={2}>
          <Box css={{ fontSize: FONT_SIZE.sm, color: '$fgSubtle' }}>
            {expanded ? '▾' : '▸'}
          </Box>
          <Box css={{ fontSize: FONT_SIZE.sm, color: '$fgDefault' }}>
            {node.name || node.type}
          </Box>
          <Badge size="small" css={{ fontSize: FONT_SIZE.xxs }}>
            {node.type}
          </Badge>
        </Stack>
      </Stack>
      <Box css={{ marginTop: '$1', marginLeft: '$6' }}>
        <VariableBadges variables={node.variables} />
      </Box>
      {expanded && node.children.map((child) => (
        <TreeNode key={child.id} node={child} depth={depth + 1} />
      ))}
    </Box>
  );
}

export default function InspectorVisualization() {
  const [root, setRoot] = useState<SelectionVisualizationNode | null>(null);
  const [selectionName, setSelectionName] = useState<string | undefined>();
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setLoading(true);
    setRoot(null);
    AsyncMessageChannel.ReactInstance.message({
      type: AsyncMessageTypes.GET_SELECTION_VISUALIZATION,
    }).then((res: any) => {
      setRoot(res.root ?? null);
      setSelectionName(res.selectionName);
    }).catch(() => {
      setRoot(null);
    }).finally(() => {
      setLoading(false);
    });
  }, []);

  return (
    <Box
      css={{
        flexGrow: 1,
        overflowY: 'auto',
        borderTop: '1px solid $borderSubtle',
        backgroundColor: '$bgDefault',
      }}
    >
      <Box css={{ padding: '$3 $4' }}>
        <Heading size="small" css={{ marginBottom: '$1' }}>
          Visualization
        </Heading>
        <Text css={{ fontSize: FONT_SIZE.sm, color: '$fgMuted' }}>
          Explore the selected component&apos;s layer tree and see which variables each layer uses,
          plus how widely those variables are shared across components.
        </Text>
      </Box>

      {loading && (
        <Box css={{ padding: '$4', display: 'flex', alignItems: 'center', gap: '$2', color: '$fgSubtle' }}>
          <Spinner />
          <Text css={{ fontSize: FONT_SIZE.sm }}>Loading selection…</Text>
        </Box>
      )}

      {!loading && !root && (
        <Box css={{ padding: '$4', fontSize: FONT_SIZE.sm, color: '$fgSubtle' }}>
          Select a single component, instance, or frame to see its visualization.
        </Box>
      )}

      {!loading && root && (
        <Box css={{ paddingBottom: '$4' }}>
          <Box css={{ padding: '0 $4 $2', fontSize: FONT_SIZE.xs, color: '$fgSubtle' }}>
            Selection:
            {' '}
            <strong>{selectionName || root.name}</strong>
          </Box>
          <TreeNode node={root} depth={0} />
        </Box>
      )}
    </Box>
  );
}


