import React from 'react';
import { styled } from '@/stitches.config';
import Box from '../Box';

/** Root layout for tab content - consistent across all tabs */
export const TabRoot = styled(Box, {
  display: 'flex',
  flexDirection: 'column',
  height: '100%',
  overflowY: 'auto',
  backgroundColor: '$bgDefault',
  color: '$fgDefault',
});

/** Tab content area with padding */
export const TabContent = styled(Box, {
  flex: 1,
  display: 'flex',
  flexDirection: 'column',
  padding: '$5',
  overflowY: 'auto',
  variants: {
    compact: {
      true: { padding: '$4' },
      false: {},
    },
  },
  defaultVariants: {
    compact: false,
  },
});
