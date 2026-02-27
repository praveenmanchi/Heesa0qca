/**
 * UI consistency constants for the Figma plugin.
 * Use these across all tabs for consistent buttons, icons, fonts, and controls.
 * Aligns with stitches theme type scale: caption(8), label(9), bodyXs(10), bodySm(11), body(12), bodyLg(13), subtitle(14), title(16).
 */

/** Icon sizes - use for all iconoir-react and SVG icons */
export const ICON_SIZE = {
  xs: 10,
  sm: 12,
  md: 14,
  lg: 16,
} as const;

/** Font sizes - maps to stitches type scale ($caption, $label, $bodySm, $body, etc.) */
export const FONT_SIZE = {
  caption: '8px',
  label: '9px',
  bodyXs: '10px',
  bodySm: '11px',
  body: '12px',
  bodyLg: '13px',
  subtitle: '14px',
  title: '16px',
  /** Legacy aliases */
  xxs: '8px',
  xs: '9px',
  sm: '10px',
  md: '11px',
  lg: '12px',
  xl: '13px',
} as const;

/** Input/control heights */
export const CONTROL_HEIGHT = {
  sm: 24,
  md: 28,
  lg: 32,
} as const;

/** Dropdown/content widths */
export const DROPDOWN_WIDTH = {
  xxs: 120,
  sm: 160,
  md: 200,
  lg: 240,
} as const;

/** Spacing scale - use $1-$9 from stitches, this is for inline styles */
export const SPACING = {
  xs: 2,
  sm: 4,
  md: 8,
  lg: 12,
  xl: 16,
} as const;

/** Monaco editor font size (matches $bodySm / 11px) */
export const MONACO_FONT_SIZE = 11;

/** JSON/code block font size */
export const CODE_FONT_SIZE = 11;
