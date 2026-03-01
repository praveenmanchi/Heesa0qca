import React from 'react';
import { Handle, Position } from 'reactflow';
import Box from '../Box';
import Stack from '../Stack';
import { Badge } from '@tokens-studio/ui';
import ColorIcon from '@/icons/figmaicons/Variable Color.svg';
import TextIcon from '@/icons/figmaicons/Variable Text.svg';
import NumberIcon from '@/icons/figmaicons/Variable number.svg';
import BooleanIcon from '@/icons/figmaicons/Variable.svg';

export function VariableNode({ data }: { data: any }) {
    const getIcon = () => {
        switch (data.resolvedType) {
            case 'COLOR': return <ColorIcon width={12} height={12} />;
            case 'STRING': return <TextIcon width={12} height={12} />;
            case 'FLOAT': return <NumberIcon width={12} height={12} />;
            case 'BOOLEAN': return <BooleanIcon width={12} height={12} />;
            default: return <BooleanIcon width={12} height={12} />;
        }
    };

    return (
        <Box
            css={{
                background: '$bgDefault',
                border: '1px solid $borderMuted',
                borderRadius: '$medium',
                padding: '0',
                minWidth: '200px',
                boxShadow: '0 2px 4px rgba(0,0,0,0.05)',
                cursor: 'pointer',
                '&:hover': {
                    borderColor: '$accentDefault',
                }
            }}
        >
            <Handle type="target" position={Position.Left} style={{ background: '#555' }} />
            <Box css={{ padding: '$2 $3', borderBottom: '1px solid $borderSubtle', display: 'flex', alignItems: 'center', gap: '$2' }}>
                <Box css={{ color: '#8b5cf6', display: 'flex' }}>
                    {getIcon()}
                </Box>
                <Box css={{
                    fontSize: '$bodySm',
                    fontWeight: '$sansBold',
                    color: '$fgDefault',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                    flexGrow: 1,
                }}>
                    {data.label}
                </Box>
            </Box>
            <Stack direction="row" align="center" justify="between" css={{ padding: '$2 $3', background: '$bgSubtle', borderBottomLeftRadius: '$medium', borderBottomRightRadius: '$medium' }}>
                <Box css={{ fontSize: '$bodyXs', color: '$fgSubtle' }}>
                    {data.collectionName}
                </Box>
                <Badge size="small">{data.totalCount} uses</Badge>
            </Stack>
            <Handle type="source" position={Position.Right} style={{ background: '#555' }} />
        </Box>
    );
}
