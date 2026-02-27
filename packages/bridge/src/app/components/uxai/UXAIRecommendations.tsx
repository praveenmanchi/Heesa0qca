/**
 * Recommendations panel for UXAI - design system best practices and tips.
 */
import React, { useState } from 'react';
import { Heading, Text, Stack } from '@tokens-studio/ui';
import { LightBulb, NavArrowDown, NavArrowUp } from 'iconoir-react';
import Box from '../Box';
import { FONT_SIZE, ICON_SIZE } from '@/constants/UIConstants';

const RECOMMENDATIONS = [
  {
    title: 'Use semantic variable naming',
    body: 'Create variables like Color/Keyboard/Border instead of raw primitives. This makes theming and multi-brand support easier.',
  },
  {
    title: 'Define values per mode',
    body: 'Always define variable values for each mode (Day, Dusk, Night, etc.) so components theme correctly across contexts.',
  },
  {
    title: 'Isolate brand-specific changes',
    body: 'When changing a variable used by multiple brands, consider creating a new semantic variable to avoid unintended side effects.',
  },
  {
    title: 'Alias primitives for flexibility',
    body: 'Semantic variables should alias primitive tokens. If the primitive changes, all semantic consumers update automatically.',
  },
  {
    title: 'Be specific in prompts',
    body: 'Include component name, property, and target mode in your request (e.g., "Button border color in Gap 2.0 only") for better analysis.',
  },
];

export default function UXAIRecommendations() {
  const [expanded, setExpanded] = useState(false);

  return (
    <Box
      css={{
        border: '1px solid $borderSubtle',
        borderRadius: '$medium',
        overflow: 'hidden',
        backgroundColor: '$bgSubtle',
      }}
    >
      <Box
        css={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '$3 $4',
          borderBottom: expanded ? '1px solid $borderSubtle' : 'none',
          cursor: 'pointer',
          '&:hover': { backgroundColor: '$bgDefault' },
        }}
        onClick={() => setExpanded((e) => !e)}
      >
        <Box css={{ display: 'flex', alignItems: 'center', gap: '$2' }}>
          <LightBulb width={ICON_SIZE.md} height={ICON_SIZE.md} strokeWidth={1.5} style={{ color: '#E6A800' }} />
          <Heading size="small" css={{ margin: 0, fontWeight: 600, color: '$fgDefault' }}>
            Recommendations
          </Heading>
        </Box>
        {expanded ? (
          <NavArrowUp width={ICON_SIZE.sm} height={ICON_SIZE.sm} />
        ) : (
          <NavArrowDown width={ICON_SIZE.sm} height={ICON_SIZE.sm} />
        )}
      </Box>
      {expanded && (
        <Box css={{ padding: '$3 $4', maxHeight: 200, overflowY: 'auto' }}>
          <Stack direction="column" gap={3}>
            {RECOMMENDATIONS.map((rec, i) => (
              <Box
                key={i}
                css={{
                  padding: '$2 $3',
                  backgroundColor: '$bgDefault',
                  borderRadius: '$small',
                  border: '1px solid $borderSubtle',
                }}
              >
                <Text css={{
                  fontWeight: 600, fontSize: FONT_SIZE.sm, color: '$fgDefault', display: 'block', marginBottom: '$1',
                }}
                >
                  {rec.title}
                </Text>
                <Text css={{ fontSize: FONT_SIZE.xs, color: '$fgMuted', lineHeight: 1.45 }}>
                  {rec.body}
                </Text>
              </Box>
            ))}
          </Stack>
        </Box>
      )}
    </Box>
  );
}
