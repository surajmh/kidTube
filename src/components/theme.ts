/** Shared palette for Phase 4 surfaces (mirrors the Phase 1-3 tokens). */
export const colors = {
  ink: '#243047',
  muted: '#718096',
  canvas: '#FFF9F2',
  card: '#FFFFFF',
  lavender: '#EEE8FF',
  purple: '#6654C7',
  purpleDark: '#5140A5',
  coral: '#FF8D79',
  peach: '#FFE5D7',
  mint: '#DDF5EA',
  mintDark: '#257A5A',
  yellow: '#FFD76A',
  line: '#EEE9E2',
  danger: '#B74754',
  sky: '#E3F0FF',
} as const;

export const cardTints = [colors.lavender, colors.peach, colors.mint, colors.sky];
