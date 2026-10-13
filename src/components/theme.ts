import React, { createContext, useContext } from 'react';
import { useColorScheme } from 'react-native';
import type { PlaybackSettings } from '../types';

export const colors = {
  ink: '#F1F1F1', muted: '#AAAAAA', canvas: '#0F0F0F', card: '#212121', lavender: '#272727',
  purple: '#FF0033', purpleDark: '#CC0029', coral: '#FF8D79', peach: '#2C1F1B', mint: '#14241D',
  sky: '#16202C', mintDark: '#5FD068', yellow: '#FFD76A', line: '#303030', danger: '#FF6E6E',
};
export type Palette = typeof colors;
const lightColors: Palette = {
  ...colors, ink: '#171717', muted: '#606060', canvas: '#FFFFFF', card: '#F5F5F5', lavender: '#EBEBEB',
  coral: '#B43F2C', peach: '#FFF0E8', mint: '#E8F5EC', sky: '#EAF2FC', mintDark: '#19733D',
  yellow: '#806000', line: '#D9D9D9', danger: '#B3261E',
};
function videoPalette(palette: Palette) {
  return { bg: palette.canvas, surface: palette.card, surfaceAlt: palette.lavender,
    chipActive: palette.ink, chipActiveText: palette.canvas, text: palette.ink, textDim: palette.muted,
    accent: palette.purple, line: palette.line, badge: 'rgba(0,0,0,0.8)', onAccent: '#FFFFFF', onVideo: '#F1F1F1' };
}
export type VideoPalette = ReturnType<typeof videoPalette>;
function theme(palette: Palette, dark: boolean) {
  return { colors: palette, yt: videoPalette(palette), dark,
    cardTints: [palette.lavender, palette.peach, palette.mint, palette.sky],
    ICON: { ink: palette.ink, inkDim: palette.muted, accent: palette.purple, onAccent: '#FFFFFF' } };
}
export const themes = { dark: theme(colors, true), light: theme(lightColors, false) };
export const cardTints = themes.dark.cardTints;
const ThemeContext = createContext(themes.dark);
export const ThemeProvider = ThemeContext.Provider;
export function useTheme() { return useContext(ThemeContext); }
export function resolveTheme(mode: PlaybackSettings['themeMode'], system: 'light' | 'dark' | null | undefined) {
  return mode === 'light' || mode === 'dark' ? mode : system === 'dark' ? 'dark' : 'light';
}
export function useResolvedTheme(mode: PlaybackSettings['themeMode']) {
  return themes[resolveTheme(mode, useColorScheme())];
}
