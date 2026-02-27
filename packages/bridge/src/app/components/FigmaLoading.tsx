import React, { PropsWithChildren } from 'react';
import { Box, Spinner, Stack } from '@tokens-studio/ui';
import { IconLogo } from '@/icons';
import { styled } from '@/stitches.config';

const StyledLoadingScreen = styled(Stack, {
  background: '$loadingScreenBg',
  height: '100vh',
  color: '$loadingScreenFg',
});

type Props = PropsWithChildren<{
  isLoading?: boolean
  label?: string
  onCancel?: () => void
}>;

export default function FigmaLoading({
  isLoading, label, onCancel, children,
}: Props) {
  if (!isLoading) {
    return <Box>{children}</Box>;
  }

  return (
    <StyledLoadingScreen data-testid="figmaloading" justify="center" direction="column" gap={4} className="content scroll-container">
      <Stack direction="column" gap={4} align="center">

        {/* Logo */}
        <Stack direction="column" gap={3} align="center">
          <IconLogo />
          <Stack direction="column" gap={1} align="center">
            <Box css={{
              fontSize: '$large', fontWeight: '$sansBold', color: '$loadingScreenFg', letterSpacing: '-0.01em',
            }}
            >
              The Bridge
            </Box>
            <Box css={{ fontSize: '$xsmall', color: '$loadingScreenFgMuted', fontStyle: 'italic' }}>
              Connecting gap between Design and dev handoff
            </Box>
          </Stack>
        </Stack>

        {/* Spinner + message */}
        <Stack direction="row" gap={4} justify="center" align="center">
          <Spinner onAccent />
          <Box css={{ color: '$loadingScreenFgMuted', fontSize: '$xsmall' }}>
            {label ?? 'Loading…'}
          </Box>
        </Stack>

        {/* Cancel — only shown if onCancel provided */}
        {onCancel && (
          <Box
            as="button"
            type="button"
            onClick={onCancel}
            css={{
              background: 'none',
              border: 'none',
              color: '$loadingScreenFgMuted',
              fontSize: '$xsmall',
              cursor: 'pointer',
              '&:hover': { color: '$loadingScreenFg' },
            }}
          >
            Cancel
          </Box>
        )}
      </Stack>
    </StyledLoadingScreen>
  );
}
