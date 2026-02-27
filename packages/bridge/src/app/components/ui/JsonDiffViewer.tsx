import React, { useMemo } from 'react';
import * as Diff from 'diff';
import { Box } from '@tokens-studio/ui';
import { styled } from '@/stitches.config';
import { FONT_SIZE } from '@/constants/UIConstants';

type Props = {
  oldValue: string;
  newValue: string;
};

const DiffContainer = styled(Box, {
  fontFamily: '$mono',
  fontSize: FONT_SIZE.xs,
  lineHeight: 1.5,
  whiteSpace: 'pre',
  overflowX: 'auto',
  overflowY: 'auto',
  height: '100%',
  width: '100%',
  padding: '$3 0',
  backgroundColor: '$bgDefault',
  color: '$fgDefault',
  '&::-webkit-scrollbar': { width: '8px', height: '8px' },
  '&::-webkit-scrollbar-track': { background: 'transparent' },
  '&::-webkit-scrollbar-thumb': { background: '$borderMuted', borderRadius: '4px' },
});

const DiffRow = styled(Box, {
  display: 'flex',
  minWidth: 'max-content',
  width: '100%',
});

const DiffLine = styled('span', {
  display: 'inline-block',
  width: '100%',
  padding: '0 $3',
  whiteSpace: 'pre',
});

const AddedLine = styled(DiffLine, {
  backgroundColor: 'rgba(129, 199, 132, 0.2)', // Light green
  color: '#2E7D32',
  '.figma-dark &': {
    color: '#81C784',
    backgroundColor: 'rgba(129, 199, 132, 0.15)',
  },
});

const RemovedLine = styled(DiffLine, {
  backgroundColor: 'rgba(239, 154, 154, 0.2)', // Light red
  color: '#C62828',
  '.figma-dark &': {
    color: '#EF9A9A',
    backgroundColor: 'rgba(239, 154, 154, 0.15)',
  },
});

const NormalLine = styled(DiffLine, {
  color: '$fgMuted',
});

export const JsonDiffViewer: React.FC<Props> = ({ oldValue, newValue }) => {
  const patch = useMemo(() => Diff.structuredPatch('old.json', 'new.json', oldValue || '', newValue || ''), [oldValue, newValue]);

  if (!patch.hunks || patch.hunks.length === 0) {
    return (
      <DiffContainer css={{
        padding: '$4', display: 'flex', justifyContent: 'center', alignItems: 'center', color: '$fgSubtle',
      }}
      >
        No differences found.
      </DiffContainer>
    );
  }

  return (
    <DiffContainer>
      {patch.hunks.map((hunk, hunkIndex) => (
        <React.Fragment key={hunkIndex}>
          <DiffRow>
            <DiffLine css={{
              backgroundColor: '$bgSubtle',
              color: '$fgSubtle',
              borderTop: '1px solid $borderSubtle',
              borderBottom: '1px solid $borderSubtle',
              marginTop: hunkIndex > 0 ? '$2' : 0,
              marginBottom: '$2',
              padding: '$1 $3',
            }}
            >
              @@ -
              {hunk.oldStart}
              ,
              {hunk.oldLines}
              {' '}
              +
              {hunk.newStart}
              ,
              {hunk.newLines}
              {' '}
              @@
            </DiffLine>
          </DiffRow>

          {hunk.lines.map((line, lineIndex) => {
            // Ignore the "No newline at end of file" text that `diff` sometimes inserts
            if (line.startsWith('\\ No newline')) return null;

            let Component = NormalLine;
            let prefix = '  ';
            const lineContent = line.substring(1);

            if (line.startsWith('+')) {
              Component = AddedLine;
              prefix = '+ ';
            } else if (line.startsWith('-')) {
              Component = RemovedLine;
              prefix = '- ';
            }

            return (
              <DiffRow key={`${hunkIndex}-${lineIndex}`}>
                <Component>
                  <span style={{
                    opacity: 0.5, userSelect: 'none', marginRight: '16px', display: 'inline-block', width: '16px',
                  }}
                  >
                    {prefix}
                  </span>
                  {lineContent}
                </Component>
              </DiffRow>
            );
          })}
        </React.Fragment>
      ))}
    </DiffContainer>
  );
};
