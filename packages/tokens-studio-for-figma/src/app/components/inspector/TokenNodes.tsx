import React, { useCallback, useMemo } from 'react';
import { Crosshair2Icon } from '@radix-ui/react-icons';
import {
  DropdownMenu, Stack, Button, IconButton, Badge,
} from '@tokens-studio/ui';
import Box from '../Box';
import IconLayers from '@/icons/layers.svg';
import { selectNodes } from '@/utils/figma/selectNodes';
import { NodeInfo } from '@/types/NodeInfo';
import TokenNode from './TokenNode';
import { DROPDOWN_WIDTH } from '@/constants/UIConstants';

const NODE_HEIGHT = 22;
const VISIBLE_VIEWPORT_NODES = 10;
const CONTAINER_PADDING = 8;
const UNSTYLED_LABEL = '(Unstyled / Frame)';

function groupNodesByComponent(nodes: NodeInfo[]): Map<string, NodeInfo[]> {
  const map = new Map<string, NodeInfo[]>();
  for (const node of nodes) {
    const key = node.componentName ?? UNSTYLED_LABEL;
    const list = map.get(key) ?? [];
    list.push(node);
    map.set(key, list);
  }
  return map;
}

export default function TokenNodes({ nodes }: { nodes: NodeInfo[] }) {
  const selectAllNodes = useCallback(() => {
    const nodeIds = nodes.map(({ id }) => id);
    selectNodes(nodeIds);
  }, [nodes]);

  const componentGroups = useMemo(() => groupNodesByComponent(nodes), [nodes]);
  const componentCount = componentGroups.size;
  const hasComponentInfo = nodes.some((n) => n.componentName != null);

  const badgeLabel = useMemo(() => {
    if (hasComponentInfo && componentCount > 0) {
      return `${componentCount} component${componentCount === 1 ? '' : 's'}`;
    }
    return `${nodes.length} ${nodes.length === 1 ? 'node' : 'nodes'}`;
  }, [hasComponentInfo, componentCount, nodes.length]);

  const tooltipLabel = hasComponentInfo && componentCount > 0
    ? `Used by ${componentCount} component${componentCount === 1 ? '' : 's'}`
    : `${nodes.length} ${nodes.length === 1 ? 'node' : 'nodes'} using this variable`;

  const dropdownContent = (
    <DropdownMenu.Content
      css={{
        width: `${DROPDOWN_WIDTH.md}px`,
        background: '$contextMenuBg',
        borderRadius: '$medium',
        padding: '$2 0',
        fontSize: '$small',
        maxHeight: `${VISIBLE_VIEWPORT_NODES * NODE_HEIGHT + CONTAINER_PADDING}px`,
      }}
      sideOffset={4}
      className={`content content-dark ${nodes.length > VISIBLE_VIEWPORT_NODES ? 'scroll-container' : null}`}
    >
      {hasComponentInfo && componentCount > 0 && (
        <>
          {Array.from(componentGroups.entries()).map(([componentName, componentNodes]) => (
            <DropdownMenu.Item
              key={componentName}
              onSelect={() => selectNodes(componentNodes.map((n) => n.id))}
              css={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                color: '$contextMenuFg',
                padding: '$1 $4',
                gap: '$2',
              }}
            >
              <Box
                css={{
                  flexGrow: 1,
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                }}
                title={componentName}
              >
                {componentName}
              </Box>
              <Badge size="small">{componentNodes.length}</Badge>
            </DropdownMenu.Item>
          ))}
          <Box
            css={{
              height: '1px',
              backgroundColor: '$borderSubtle',
              margin: '$2 $4',
            }}
          />
        </>
      )}
      {nodes.map((node) => (
        <TokenNode key={node.id} {...node} />
      ))}
    </DropdownMenu.Content>
  );

  return (
    <Stack
      align="center"
      gap={1}
    >
      <DropdownMenu>
        <Box
          css={{
            display: 'flex',
            alignItems: 'center',
            gap: '$3',
            fontWeight: '$sansBold',
            fontSize: '$small',
          }}
        >
          <DropdownMenu.Trigger asChild>
            <Button variant="invisible" size="small" icon={<IconLayers />} title={tooltipLabel}>
              {badgeLabel}
            </Button>
          </DropdownMenu.Trigger>
          {dropdownContent}
        </Box>
      </DropdownMenu>
      <IconButton
        tooltip="Select all"
        tooltipSide="bottom"
        onClick={selectAllNodes}
        variant="invisible"
        size="small"
        icon={<Crosshair2Icon />}
      />
    </Stack>
  );
}
