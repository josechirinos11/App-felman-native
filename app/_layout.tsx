import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { SplashScreen, Stack } from 'expo-router';
import { useEffect } from 'react';
import { ActivityIndicator, View } from 'react-native';

import { useColorScheme } from '@/hooks/useColorScheme';
import { dbService } from '../config/api';
import { useAuth } from '../hooks/useAuth';

export const unstable_settings = {
  initialRouteName: 'login',
};

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const colorScheme = useColorScheme();
  const { loading, authenticated } = useAuth();

  useEffect(() => {
    const testConnection = async () => {
      try {
        // Probar la conexión con el servidor
        await dbService.testConnection();
      } catch (error) {
        console.error('❌ Error al probar la conexión:', error);
      }
    };

    testConnection();

    if (!loading) {
      SplashScreen.hideAsync();
    }
  }, [loading]);

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#fff' }}>
        <ActivityIndicator size="large" color="#2e78b7" />
      </View>
    );
  }

  return (
    <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
      <Stack>
        {!authenticated ? (
          <>
            <Stack.Screen name="login" options={{ headerShown: false }} />
            <Stack.Screen name="register" options={{ headerShown: false }} />
          </>
        ) : (
          <Stack.Screen 
            name="(tabs)" 
            options={{ headerShown: false }} 
          />
        )}
      </Stack>
    </ThemeProvider>
  );
}
