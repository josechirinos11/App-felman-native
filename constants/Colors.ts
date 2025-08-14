// constants/colors.ts
// Paleta de colores global para la app

export const COLORS = {
  // Marca principal
  primary: '#2e78b7',
  onPrimary: '#ffffff',

  // Fondos y superficies
  background: '#f3f4f6',
  surface: '#ffffff',
  surfaceAlt: '#f8fafc',
  inputBackground: '#f9fafb',

  // Bordes y separadores
  border: '#e5e7eb',

  // Texto
  text: '#1f2937',
  textSecondary: '#6b7280',
  textEmphasis: '#374151',
  textMuted: '#9ca3af',
  textMutedAlt: '#888888',

  // Badges / etiquetas
  badgeBackground: '#eff6ff',
  badgeText: '#1d4ed8',

  // Estados
  success: '#4CAF50',
  successAlt: '#10b981',
  error: '#F44336',
  errorAlt: '#ef4444',
  warningBackground: '#fff9c4',
  errorBackground: '#ffd7d7',
  successBackground: '#d4edda',

  // Acentos informativos (incidencias)
  infoSoftBackground: '#d1fae5',
  infoSoftBorder: '#10b981',
};

export type AppColors = typeof COLORS;
export default COLORS;

/**
 * Below are the colors that are used in the app. The colors are defined in the light and dark mode.
 * There are many other ways to style your app. For example, [Nativewind](https://www.nativewind.dev/), [Tamagui](https://tamagui.dev/), [unistyles](https://reactnativeunistyles.vercel.app), etc.
 */

const tintColorLight = '#0a7ea4';
const tintColorDark = '#fff';

export const Colors = {
  light: {
    text: '#11181C',
    background: '#fff',
    tint: tintColorLight,
    icon: '#687076',
    tabIconDefault: '#687076',
    tabIconSelected: tintColorLight,
  },
  dark: {
    text: '#ECEDEE',
    background: '#151718',
    tint: tintColorDark,
    icon: '#9BA1A6',
    tabIconDefault: '#9BA1A6',
    tabIconSelected: tintColorDark,
  },
};
