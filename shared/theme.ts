/**
 * Raved design tokens, one source for the web app (CSS variables in src/app/globals.css follow these)
 * and the mobile app (mobile/src/ui/theme.ts). Change a colour here, then in globals.css.
 */
export const colors = {
  primary: "#0E6E5C",
  primaryHover: "#0A5446",
  primaryTint: "#E3F2EE",
  accent: "#F5A524",
  ink: "#12201D",
  muted: "#4B5B57",
  bg: "#F5F7F6",
  card: "#FFFFFF",
  border: "#E2E8E6",
  ai: "#6941C6",
  aiTint: "#F4EBFF",
  success: "#087443",
  successTint: "#E3F6EC",
  warning: "#8A5A00",
  warningTint: "#FFF4D6",
  error: "#B42318",
  errorTint: "#FEF3F2",
} as const;

export const radius = { sm: 8, md: 12, lg: 16, xl: 24, full: 999 } as const;
export const space = { xs: 4, sm: 8, md: 12, lg: 16, xl: 24, xxl: 32 } as const;
/** Minimum touch target (WCAG 2.2 AA). */
export const TOUCH = 44;
