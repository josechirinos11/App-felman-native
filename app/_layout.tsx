import { DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { SplashScreen, Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Text, View } from 'react-native';

export const unstable_settings = {
  // Inicializar siempre en login
  initialRouteName: 'login',
};

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    // Simulamos carga pero sin useAuth por ahora
    const timer = setTimeout(() => {
      setIsReady(true);
      SplashScreen.hideAsync();
    }, 1000);
    
    return () => clearTimeout(timer);
  }, []);

  if (!isReady) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#fff' }}>
        <ActivityIndicator size="large" color="#2e78b7" />
        <Text style={{ marginTop: 10, color: '#666' }}>Cargando...</Text>
      </View>
    );
  }

  return (
    <ThemeProvider value={DefaultTheme}>
      <StatusBar style="dark" />
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen 
          name="login" 
          options={{ headerShown: false }}
        />
        <Stack.Screen 
          name="register" 
          options={{ headerShown: false }}
        />
        <Stack.Screen 
          name="(tabs)" 
          options={{ headerShown: false }} 
        />
      </Stack>
    </ThemeProvider>
  );
}
