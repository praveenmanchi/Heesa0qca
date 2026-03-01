import React from 'react';
import { Handle, Position } from 'reactflow';
import Box from '../Box';
import Stack from '../Stack';
import ComponentIcon from '@/icons/figmaicons/component.svg';
import MultipleComponentIcon from '@/icons/figmaicons/multiple component.svg';

export function ComponentNode({ data }: { data: any }) {
    const isMultiple = data.count > 1;
    const Icon = isMultiple ? MultipleComponentIcon : ComponentIcon;

    return (
        <Box
            css={{
                background: '$bgDefault',
                border: '1px solid $borderMuted',
                borderRadius: '$small',
                padding: '$2 $3',
                minWidth: '150px',
                maxWidth: '250px',
                boxShadow: '0 2px 4px rgba(0,0,0,0.05)',
            }}
        >
            <Handle type="target" position={Position.Top} style={{ background: '#555' }} />
            <Stack direction="row" align="center" gap={2}>
                <Box css={{ color: '#8b5cf6', display: 'flex' }}><Icon width={16} height={16} /></Box>
                <Box css={{
                    fontSize: '$bodySm',
                    color: '$fgDefault',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                    flexGrow: 1,
                }}>
                    {data.label}
                </Box>
                {isMultiple && (
                    <Box css={{ fontSize: '$bodyXs', color: '$fgSubtle' }}>
                        {data.count}
                    </Box>
                )}
            </Stack>
            <Handle type="source" position={Position.Bottom} style={{ background: '#555' }} />
        </Box>
    );
}
