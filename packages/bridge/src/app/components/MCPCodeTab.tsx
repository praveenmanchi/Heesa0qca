import React from 'react';
import {
    Box, Stack, Heading, Text,
} from '@tokens-studio/ui';

export default function MCPCodeTab() {
    return (
        <Box
            css={{
                display: 'flex',
                flexDirection: 'column',
                height: '100%',
                alignItems: 'center',
                padding: '$5',
                justifyContent: 'center',
                textAlign: 'center',
            }}
        >
            <Stack direction="column" gap={4} align="center" css={{ maxWidth: '400px' }}>
                <Heading size="large">MCP + Code Sync</Heading>
                <Text css={{ color: '$fgMuted', lineHeight: 1.5 }}>
                    Bridge your design tokens and components directly to your codebase using the Model Context Protocol (MCP).
                </Text>
                <Stack
                    direction="column"
                    gap={2}
                    css={{
                        backgroundColor: '$bgSubtle',
                        padding: '$4',
                        borderRadius: '$medium',
                        border: '1px solid $borderSubtle',
                        textAlign: 'left',
                        width: '100%',
                    }}
                >
                    <Text css={{ fontWeight: '$bold' }}>What you can do:</Text>
                    <ul style={{ margin: 0, paddingLeft: '20px', color: 'var(--colors-fgMuted)', fontSize: '12px', lineHeight: 1.6 }}>
                        <li>Push real-time token additions to an AI Context Server.</li>
                        <li>Detect Component property remapping instantly via Webhooks.</li>
                        <li>Let the AI actively rewrite frontend code automatically when Figma changes.</li>
                    </ul>
                </Stack>
                <Box
                    css={{
                        backgroundColor: '$accentDefault',
                        color: 'white',
                        padding: '$2 $4',
                        borderRadius: '$full',
                        fontWeight: '$bold',
                        fontSize: '$small',
                        marginTop: '$4',
                    }}
                >
                    Coming Soon
                </Box>
            </Stack>
        </Box>
    );
}
