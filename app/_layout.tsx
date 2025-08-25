import { DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { SplashScreen, Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, View } from 'react-native';

import { useColorScheme } from '@/hooks/useColorScheme';
import ConnectionModal from '../components/ConnectionModal';
import { dbService } from '../config/api';
import AppStatusManager from '../config/AppStatusManager';
import { useAuth } from '../hooks/useAuth';

export const unstable_settings = {
  // Inicializar siempre en login, el hook useAuth decidirá si redirigir o no
  initialRouteName: 'login',
};

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const colorScheme = useColorScheme();
  const { loading, authenticated } = useAuth();
  const [connectionStatus, setConnectionStatus] = useState({
    checked: false,
    isConnected: false,
    serverReachable: false,
    apiUrl: '',
  });
  const [showConnectionModal, setShowConnectionModal] = useState(false);

  // Log para debuggear el estado de autenticación
  useEffect(() => {
    console.log('🔐 Estado de autenticación:', { loading, authenticated });
  }, [loading, authenticated]);
  useEffect(() => {
    const checkAppStatus = async () => {
      try {
        console.log('Inicializando estado de la aplicación...');
        const appStatus = AppStatusManager.getInstance();
        const status = await appStatus.checkInitialStatus();
        
        setConnectionStatus({
          checked: true,
          isConnected: status.isConnected,
          serverReachable: status.serverReachable,
          apiUrl: status.apiUrl,
        });
        
        // Ahora probamos la conexión con el servicio de base de datos
        if (status.serverReachable) {
          try {
            await dbService.testConnection();
            console.log('✅ Conexión a BD exitosa');
          } catch (dbError) {
            console.error('❌ Error al probar la conexión a BD:', dbError);
          }
        }
      } catch (error) {
        console.error('❌ Error al inicializar estado de la app:', error);
        setConnectionStatus({
          checked: true,
          isConnected: false,
          serverReachable: false,
          apiUrl: '',
        });
      }

      // Mostrar modal de conexión si hay problemas con el servidor
      if (connectionStatus.checked && !connectionStatus.serverReachable) {
        console.warn('⚠️ El servidor no es alcanzable, mostrando modal de conexión...');
      }
    };

    // Solo ejecutar verificación de estado cuando la autenticación haya terminado de cargar
    if (!loading) {
      checkAppStatus();
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
  // Handlers para el modal de conexión
  const handleRetryConnection = () => {
    // Reiniciar la verificación de estado
    const checkStatus = async () => {
      try {
        console.log('Verificando conexión nuevamente...');
        const appStatus = AppStatusManager.getInstance();
        const status = await appStatus.checkInitialStatus();
        
        setConnectionStatus({
          checked: true,
          isConnected: status.isConnected,
          serverReachable: status.serverReachable,
          apiUrl: status.apiUrl,
        });
        
        // Si la conexión se restaura, cerrar el modal
        if (status.serverReachable) {
          setShowConnectionModal(false);
        }
      } catch (error) {
        console.error('Error al verificar conexión:', error);
      }
    };
    
    checkStatus();
  };
  
  const handleContinueOffline = () => {
    // Mostrar alerta indicando modo desconectado
    Alert.alert(
      "Modo sin conexión",
      "La aplicación funcionará con funcionalidad limitada hasta que se restaure la conexión.",
      [{ text: "Entendido", onPress: () => setShowConnectionModal(false) }]
    );
  };

  return (
    <ThemeProvider value={DefaultTheme}> {/* SIEMPRE usar tema claro */}
      <StatusBar style="dark" backgroundColor="#ffffff" /> {/* StatusBar fija */}
      <ConnectionModal 
        isVisible={showConnectionModal}
        onRetry={handleRetryConnection}
        onContinue={handleContinueOffline}
      />
        <Stack screenOptions={{ headerShown: false }}>
        {!authenticated ? (
          <>
            <Stack.Screen 
              name="login" 
              options={{ headerShown: false }}
            />
            <Stack.Screen 
              name="register" 
              options={{ headerShown: false }}
            />
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
