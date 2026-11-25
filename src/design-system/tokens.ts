/**
 * Palm Connect design tokens (TS mirror of CSS variables in src/index.css).
 * Import for typed access; runtime values still come from CSS custom properties.
 */

export const radius = {
  input: "0.5rem",
  card: "1rem",
  default: "0.75rem",
  pill: "9999px",
} as const;

export const spacing = {
  xs: "0.25rem",
  sm: "0.5rem",
  md: "1rem",
  lg: "1.5rem",
  xl: "2rem",
  "2xl": "3rem",
} as const;

export const motion = {
  micro: "150ms",
  ui: "250ms",
  page: "400ms",
  easing: "cubic-bezier(0.4, 0, 0.2, 1)",
} as const;

export const typography = {
  display: "'Sora', system-ui, sans-serif",
  body: "'Inter', system-ui, sans-serif",
} as const;

export const zIndex = {
  base: 0,
  dropdown: 20,
  sticky: 30,
  overlay: 40,
  modal: 50,
  toast: 60,
} as const;
