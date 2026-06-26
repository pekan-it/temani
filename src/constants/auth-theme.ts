/**
 * Color tokens for the authentication flow.
 *
 * The global `Colors` palette in `theme.ts` is intentionally grayscale and
 * theme-aware. Auth screens use a fixed, branded green palette regardless of
 * the device color scheme to keep the first-run experience consistent.
 */
export const AuthColors = {
  primary: "#2D6A4F",
  primaryDark: "#1B4332",
  primarySoft: "#E7F1EC",
  background: "#F4F8F6",
  surface: "#F8FAF9",
  text: "#1B2D27",
  muted: "#6B8F7E",
  placeholder: "#A0B5AC",
  border: "#E2ECE7",
  danger: "#DC2626",
  white: "#FFFFFF",
} as const;
