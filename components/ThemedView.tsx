import { View, type ViewProps } from 'react-native';

import { useAppColors } from '@/hooks/useThemeColor';

export type ThemedViewProps = ViewProps & {
  lightColor?: string;
  darkColor?: string;
};

export function ThemedView({ style, lightColor, darkColor, ...otherProps }: ThemedViewProps) {
  const appColors = useAppColors();
  // Usar tus colores fijos en lugar del tema del sistema
  const backgroundColor = lightColor || appColors.background;

  return <View style={[{ backgroundColor }, style]} {...otherProps} />;
}
