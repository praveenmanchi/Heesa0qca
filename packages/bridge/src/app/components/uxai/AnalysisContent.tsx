/**
 * Renders AI analysis markdown content with visual formatting.
 * Supports: **bold**, bullet lists (- item), numbered lists (1. item), paragraphs.
 */
import React from 'react';
import Box from '../Box';
import { FONT_SIZE } from '@/constants/UIConstants';

interface AnalysisContentProps {
  content: string;
  css?: Record<string, unknown>;
}

function parseInlineFormatting(text: string): React.ReactNode[] {
  const parts: React.ReactNode[] = [];
  let remaining = text;
  let key = 0;

  while (remaining.length > 0) {
    const boldMatch = remaining.match(/\*\*([^*]+)\*\*/);
    const italicMatch = remaining.match(/\*([^*]+)\*/);
    const codeMatch = remaining.match(/`([^`]+)`/);

    let match: RegExpMatchArray | null = null;
    let matchIndex = Infinity;
    let format: 'bold' | 'italic' | 'code' = 'bold';

    if (boldMatch && boldMatch.index !== undefined) {
      matchIndex = boldMatch.index;
      match = boldMatch;
      format = 'bold';
    }
    if (italicMatch && italicMatch.index !== undefined && italicMatch.index < matchIndex) {
      matchIndex = italicMatch.index;
      match = italicMatch;
      format = 'italic';
    }
    if (codeMatch && codeMatch.index !== undefined && codeMatch.index < matchIndex) {
      matchIndex = codeMatch.index;
      match = codeMatch;
      format = 'code';
    }

    if (match && match.index !== undefined) {
      if (match.index > 0) {
        parts.push(<React.Fragment key={key++}>{remaining.slice(0, match.index)}</React.Fragment>);
      }
      if (format === 'bold') {
        parts.push(
          <Box key={key++} as="strong" css={{ fontWeight: 600, color: '$fgDefault' }}>
            {match[1]}
          </Box>,
        );
      } else if (format === 'italic') {
        parts.push(
          <Box key={key++} as="em" css={{ fontStyle: 'italic', color: '$fgSubtle' }}>
            {match[1]}
          </Box>,
        );
      } else {
        parts.push(
          <Box
            key={key++}
            as="code"
            css={{
              fontFamily: 'monospace',
              fontSize: FONT_SIZE.xs,
              padding: '1px 4px',
              borderRadius: '4px',
              backgroundColor: '$bgDefault',
              border: '1px solid $borderMuted',
              color: '$accentDefault',
            }}
          >
            {match[1]}
          </Box>,
        );
      }
      remaining = remaining.slice(match.index + match[0].length);
    } else {
      parts.push(<React.Fragment key={key++}>{remaining}</React.Fragment>);
      break;
    }
  }

  return parts;
}

export default function AnalysisContent({ content, css }: AnalysisContentProps) {
  if (!content?.trim()) return null;

  // Strip leading ## header if present (we show section title in the card)
  const cleaned = content.replace(/^##\s+.+[\r\n]+/, '').trim();
  const lines = cleaned.split(/\r?\n/);
  const elements: React.ReactNode[] = [];
  let listItems: string[] = [];
  let listType: 'ul' | 'ol' | null = null;

  const flushList = () => {
    if (listItems.length === 0) return;
    const ListTag = listType === 'ol' ? 'ol' : 'ul';
    elements.push(
      <Box
        key={`list-${elements.length}`}
        as={ListTag}
        css={{
          margin: '0 0 $3 0',
          paddingLeft: listType === 'ol' ? '$5' : '$4',
          listStyle: listType === 'ol' ? 'decimal' : 'disc',
          listStylePosition: 'outside',
        }}
      >
        {listItems.map((item, i) => (
          <Box
            key={i}
            as="li"
            css={{
              marginBottom: '$1', lineHeight: 1.5, fontSize: FONT_SIZE.sm, color: '$fgDefault',
            }}
          >
            {parseInlineFormatting(item)}
          </Box>
        ))}
      </Box>,
    );
    listItems = [];
    listType = null;
  };

  lines.forEach((line, idx) => {
    const trimmed = line.trim();
    const bulletMatch = trimmed.match(/^[-*]\s+(.+)$/);
    const numMatch = trimmed.match(/^(\d+)\.\s+(.+)$/);

    if (bulletMatch) {
      if (listType !== 'ul') {
        flushList();
        listType = 'ul';
      }
      listItems.push(bulletMatch[1]);
    } else if (numMatch) {
      if (listType !== 'ol') {
        flushList();
        listType = 'ol';
      }
      listItems.push(numMatch[2]);
    } else {
      flushList();
      if (trimmed) {
        elements.push(
          <Box
            key={`p-${idx}`}
            css={{
              fontSize: FONT_SIZE.sm,
              color: '$fgDefault',
              lineHeight: 1.55,
              marginBottom: '$2',
              whiteSpace: 'pre-wrap',
            }}
          >
            {parseInlineFormatting(trimmed)}
          </Box>,
        );
      }
    }
  });

  flushList();

  return (
    <Box css={(css ?? {}) as any}>
      {elements}
    </Box>
  );
}
