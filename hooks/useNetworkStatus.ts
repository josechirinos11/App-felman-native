import NetInfo from '@react-native-community/netinfo';
import { useEffect, useState } from 'react';
import { Alert, Platform } from 'react-native';
import { API_URL } from '../config/constants';

/**
 * Hook personalizado para monitorear el estado de la red y la conectividad del servidor
 */
export function useNetworkStatus() {
  const [isConnected, setIsConnected] = useState<boolean | null>(null);
  const [serverReachable, setServerReachable] = useState<boolean | null>(null);
  const [isChecking, setIsChecking] = useState(false);
  // Usar la constante API_URL importada desde config/constants.ts
  const apiUrl = API_URL;
  // Comprobar la conexión a Internet
  const checkInternetConnection = async (): Promise<boolean> => {
    try {
      const state = await NetInfo.fetch();
      return state.isConnected || false;
    } catch (error) {
      console.error('Error al verificar la conexión a Internet:', error);
      return false;
    }
  };

  // Comprobar si el servidor está disponible
  const checkServerConnection = async (): Promise<boolean> => {
    try {
      console.log(`Verificando conexión al servidor: ${apiUrl}`);
      
      // Lista de rutas a probar en orden
      const endpointsToTry = [
        '/test/test-connection',    // Endpoint de test específico
        '/',                        // Ruta principal
        '/auth/check',              // Ruta de verificación de autenticación
        '/auth',                    // Ruta de autenticación
        '/control-access',          // Ruta de control de acceso
        '/control-access/pedidos',  // Ruta de pedidos
      ];
      
      // Intentar cada endpoint hasta encontrar uno que responda
      for (const endpoint of endpointsToTry) {
        try {
          console.log(`Intentando conectar a: ${apiUrl}${endpoint}`);
          
          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), 3000);
          
          const response = await fetch(`${apiUrl}${endpoint}`, {
            method: 'HEAD',
            headers: { 'Cache-Control': 'no-cache' },
            signal: controller.signal
          });
          
          clearTimeout(timeoutId);
          
          if (response.status < 400) {
            console.log(`✅ Conectado exitosamente a ${endpoint}`);
            return true;
          }
          
          console.log(`❌ Endpoint ${endpoint} respondió con código ${response.status}`);
        } catch (endpointError) {
          console.log(`⚠️ Error al intentar endpoint ${endpoint}:`, endpointError);
        }
      }
      
      console.error('❌ Ningún endpoint respondió correctamente');
      return false;
    } catch (fallbackError) {
      console.error('Error en verificación alternativa del servidor:', fallbackError);
      return false;
    }
  };

  // Comprobar tanto la conexión a Internet como la disponibilidad del servidor
  const checkConnectivity = async () => {
    try {
      setIsChecking(true);
      const internetConnected = await checkInternetConnection();
      setIsConnected(internetConnected);
      
      if (internetConnected) {
        const isServerAvailable = await checkServerConnection();
        setServerReachable(isServerAvailable);
        
        if (!isServerAvailable) {
          console.log('El servidor no está disponible');
        }
      } else {
        setServerReachable(false);
        console.log('No hay conexión a Internet');
      }
    } catch (error) {
      console.error('Error al comprobar la conectividad:', error);
      setIsConnected(false);
      setServerReachable(false);
    } finally {
      setIsChecking(false);
    }
  };

  // Mostrar información detallada sobre la conexión
  const showConnectionDetails = () => {
    Alert.alert(
      'Detalles de Conexión',
      `Estado de Internet: ${isConnected ? 'Conectado' : 'Desconectado'}\n` +
      `Servidor alcanzable: ${serverReachable ? 'Sí' : 'No'}\n` +
      `Plataforma: ${Platform.OS} ${Platform.Version}`,
      [{ text: 'Entendido' }]
    );
  };

  // Efecto para comprobar la conectividad al montar el componente
  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener(state => {
      setIsConnected(state.isConnected || false);
    });

    checkConnectivity();

    return () => {
      unsubscribe();
    };
  }, []);

  return {
    isConnected,
    serverReachable,
    isChecking,
    apiUrl,
    checkConnectivity,
    showConnectionDetails
  };
}
