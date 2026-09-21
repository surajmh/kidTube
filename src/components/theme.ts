/**
 * Parent Mode palette.
 *
 * Shares Kid Mode's surfaces and accent (see `youtube/theme.ts`) so the two halves of the app read
 * as one product. The token names are kept from the original light theme so the ~90 call sites did
 * not have to change; only their values moved to dark.
 *
 * The accent is the one colour white text is placed on, so every existing white-on-accent label
 * stays legible without edits.
 */
export const colors = {
  /** Primary text. */
  ink: '#F1F1F1',
  /** Secondary text. */
  muted: '#AAAAAA',
  /** Page background. */
  canvas: '#0F0F0F',
  /** Cards and raised surfaces. */
  card: '#212121',
  /** Secondary surface: chips, icon wells, active pills. */
  lavender: '#272727',
  /**
   * Accent. Fills only -- buttons, badges, the brand mark -- and always with white text on it.
   *
   * It is deliberately not used for active labels or icons: one token serving both roles is what
   * made every active state render red. Active foreground is `ink`.
   */
  purple: '#FF0033',
  purpleDark: '#CC0029',
  /** Warm icon tint. */
  coral: '#FF8D79',
  /** Decorative card tints, dark so thumbnails and text stay dominant. */
  peach: '#2C1F1B',
  mint: '#14241D',
  sky: '#16202C',
  /** Success text. */
  mintDark: '#5FD068',
  yellow: '#FFD76A',
  line: '#303030',
  /** Readable red on a near-black surface, unlike the light theme's deep red. */
  danger: '#FF6E6E',
} as const;

export const cardTints = [colors.lavender, colors.peach, colors.mint, colors.sky];
