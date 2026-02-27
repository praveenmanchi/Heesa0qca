// stitches.config.ts
import { createStitches } from '@stitches/react';
import { lightFigmaTheme as lightTheme, darkFigmaTheme as darkTheme, core } from '@tokens-studio/tokens';

/** Type scale: 8 → 9 → 10 → 11 → 12 → 13 → 14 → 16 (modular) */
const typeScale = {
  caption: '8px',
  label: '9px',
  bodyXs: '10px',
  bodySm: '11px',
  body: '12px',
  bodyLg: '13px',
  subtitle: '14px',
  title: '16px',
  headline: '18px',
} as const;

/** Line heights for readability */
const lineHeights = {
  tight: 1.2,
  normal: 1.4,
  relaxed: 1.5,
  loose: 1.6,
} as const;

/** Letter spacing */
const letterSpacings = {
  tighter: '-0.02em',
  tight: '-0.01em',
  normal: '0',
  wide: '0.02em',
  wider: '0.05em',
  widest: '0.08em',
} as const;

export const stitchesInstance = createStitches({
  theme: {
    colors: {
      ...lightTheme.colors,
      proBg: '#e1d8ec',
      proBorder: '#c2b2d8',
      proFg: '#694993',
    },
    shadows: lightTheme.shadows,
    ...core,
    fontWeights: {
      ...core.fontWeights,
      sansBold: 500,
    },
    fontSizes: {
      ...core.fontSizes,
      ...typeScale,
      xxsmall: '11px !important',
      xsmall: '11px !important',
      small: '12px !important',
      base: '13px !important',
      medium: '13px !important',
      large: '14px !important',
    },
    lineHeights,
    letterSpacings,
    radii: {
      ...core.radii,
      full: '999px',
    },
    sizes: {
      ...core.sizes,
      scrollbarWidth: '8px',
    },
  },
});

const {
  createTheme, styled, css, keyframes, theme, globalCss,
} = stitchesInstance;

const lightThemeMode = createTheme('figma-light', {
  colors: {
    ...lightTheme.colors,
    // TODO: We need to add these to the ui tokens.
    proBg: '#e1d8ec',
    proBorder: '#c2b2d8',
    proFg: '#694993',
  },
  shadows: lightTheme.shadows,
});

const darkThemeMode = createTheme('figma-dark', {
  colors: {
    ...darkTheme.colors,
    // TODO: We need to add these to the ui tokens.
    proBg: '#402d5a',
    proBorder: '#694993',
    proFg: '#c2b2d8',
  },
  shadows: darkTheme.shadows,
});

export {
  lightThemeMode, darkThemeMode, styled, css, keyframes, theme, globalCss,
};
