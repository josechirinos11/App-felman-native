/**
 * Learn more about light and dark modes:
 * https://docs.expo.dev/guides/color-schemes/
 */

import { Colors, COLORS } from '@/constants/Colors';

export function useThemeColor(
  props: { light?: string; dark?: string },
  colorName: keyof typeof Colors.light & keyof typeof Colors.dark
) {
  // FORZAR SIEMPRE MODO CLARO - IGNORAR TEMA DEL SISTEMA
  const theme = 'light'; // Siempre usar modo claro
  const colorFromProps = props[theme];

  if (colorFromProps) {
    return colorFromProps;
  } else {
    return Colors[theme][colorName];
  }
}

// Hook alternativo para usar SIEMPRE tus colores personalizados
export function useAppColors() {
  return COLORS; // Siempre retorna tus colores fijos
}
