import React from 'react';
import { styled } from '@/stitches.config';
import Box from '../Box';

/** Section container - use for tab content areas */
export const Section = styled(Box, {
  padding: '$4',
  borderBottom: '1px solid $borderMuted',
  variants: {
    variant: {
      default: {},
      subtle: { backgroundColor: '$bgSubtle' },
      compact: { padding: '$3' },
    },
  },
  defaultVariants: {
    variant: 'default',
  },
});

/** Section header - consistent layout for title + actions */
export const SectionHeader = styled(Box, {
  display: 'flex',
  flexDirection: 'row',
  alignItems: 'center',
  justifyContent: 'space-between',
  marginBottom: '$3',
});
