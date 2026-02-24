/**
 * UI consistency constants for the Figma plugin.
 * Use these across all tabs for consistent buttons, icons, fonts, and controls.
 */

/** Icon sizes - use for all iconoir-react and SVG icons */
export const ICON_SIZE = {
  xs: 10,
  sm: 12,
  md: 14,
  lg: 16,
} as const;

/** Font sizes - align with design tokens ($xsmall=11px, $small=12px) */
export const FONT_SIZE = {
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

/** Monaco editor font size (matches $xsmall / 11px) */
export const MONACO_FONT_SIZE = 11;

/** JSON/code block font size */
export const CODE_FONT_SIZE = 11;
