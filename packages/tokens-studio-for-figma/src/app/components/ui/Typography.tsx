import React from 'react';
import { styled } from '@/stitches.config';
import Box from '../Box';

/** Caption - smallest text (8px) */
export const Caption = styled(Box, {
  fontSize: '$caption',
  lineHeight: 1.4,
  letterSpacing: 0,
});

/** Label - labels, badges (9px) */
export const Label = styled(Box, {
  fontSize: '$label',
  lineHeight: 1.4,
  letterSpacing: 0,
});

/** Body - default body text */
export const Body = styled(Box, {
  fontSize: '$body',
  lineHeight: 1.4,
  letterSpacing: 0,
});

/** BodySmall - secondary text */
export const BodySmall = styled(Box, {
  fontSize: '$bodySm',
  lineHeight: 1.4,
  letterSpacing: 0,
});

/** Subtitle - section headers */
export const Subtitle = styled(Box, {
  fontSize: '$subtitle',
  lineHeight: 1.2,
  fontWeight: '$sansBold',
});

/** Title - card titles */
export const Title = styled(Box, {
  fontSize: '$title',
  lineHeight: 1.2,
  fontWeight: '$sansBold',
});
