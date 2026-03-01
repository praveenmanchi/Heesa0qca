import React from 'react';
import Box from '../Box';
import IconOpen from '@/icons/figmaicons/open.svg';

export function VariableGroupNode({ data }: { data: any }) {
    return (
        <Box
            css={{
                background: 'rgba(30, 30, 30, 0.4)',
                border: '1px solid $borderMuted',
                borderRadius: '$medium',
                padding: '0',
                minWidth: '220px',
                minHeight: '100px',
            }}
        >
            <Box
                css={{
                    padding: '$2 $3',
                    borderBottom: '1px solid $borderSubtle',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '$2',
                }}
                className="custom-drag-handle"
            >
                <Box css={{ color: '$fgSubtle', display: 'flex' }}><IconOpen width={14} height={14} /></Box>
                <Box css={{ fontSize: '$bodySm', fontWeight: '$sansMedium', color: '$fgDefault', flexGrow: 1 }}>
                    {data.label}
                </Box>
            </Box>
            <Box css={{ padding: '$3' }}>
                {/* Child nodes will be rendered here by React Flow */}
            </Box>
        </Box>
    );
}
