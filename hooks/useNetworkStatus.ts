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
      console.log(`🔍 Verificando conexión al servidor: ${apiUrl}`);
      
      // Usar un endpoint simple para health check con timeout más largo
      const endpoint = '/';
      
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 12000); // ✅ 12 segundos
      
      try {
        const response = await fetch(`${apiUrl}${endpoint}`, {
          method: 'GET',
          headers: { 
            'Content-Type': 'application/json',
            'Cache-Control': 'no-cache' 
          },
          signal: controller.signal
        });
        
        clearTimeout(timeoutId);
        
        // ✅ Considerar exitoso si el status es < 500 (incluye 200, 401, 403, 404, etc.)
        // Esto significa que el servidor está respondiendo, aunque requiera auth
        if (response.status < 500) {
          console.log(`✅ Servidor disponible (status: ${response.status})`);
          return true;
        }
        
        console.log(`⚠️ Servidor respondió con error ${response.status}`);
        return false;
      } catch (endpointError: any) {
        clearTimeout(timeoutId);
        
        if (endpointError.name === 'AbortError') {
          console.log(`⚠️ Timeout al conectar con el servidor (>12s)`);
        } else {
          console.log(`⚠️ Error de conexión: ${endpointError.message}`);
        }
        return false;
      }
    } catch (fallbackError) {
      console.error('❌ Error inesperado al verificar servidor:', fallbackError);
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
