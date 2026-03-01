import React from 'react';
import { Switch, Label } from '@tokens-studio/ui';
import Box from '../Box';
import Stack from '../Stack';

interface GraphSidebarProps {
    types: { id: string; label: string; active: boolean }[];
    onToggle: (id: string, active: boolean) => void;
}

export function GraphSidebar({ types, onToggle }: GraphSidebarProps) {
    return (
        <Box css={{
            width: '200px',
            borderRight: '1px solid $borderSubtle',
            background: '$bgDefault',
            display: 'flex',
            flexDirection: 'column',
            padding: '$4',
            overflowY: 'auto'
        }}>
            <Box css={{ fontSize: '$bodySm', fontWeight: '$sansBold', color: '$fgDefault', marginBottom: '$3' }}>
                Types
            </Box>
            <Stack direction="column" gap={3}>
                {types.map((type) => (
                    <Box key={type.id} css={{ display: 'flex', alignItems: 'center', gap: '$3' }}>
                        <Switch
                            id={`switch-${type.id}`}
                            checked={type.active}
                            onCheckedChange={(checked) => onToggle(type.id, checked)}
                        />
                        <Label htmlFor={`switch-${type.id}`} css={{ fontSize: '$bodySm', color: '$fgDefault', cursor: 'pointer' }}>
                            {type.label}
                        </Label>
                    </Box>
                ))}
            </Stack>
        </Box>
    );
}
