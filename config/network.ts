import NetInfo from '@react-native-community/netinfo';
import { Platform } from 'react-native';

// URL del servidor API
const API_URL = process.env.EXPO_PUBLIC_API_URL || 'http://85.59.105.234:3000';

// Función para verificar la conexión a Internet
export const checkInternetConnection = async (): Promise<boolean> => {
  try {
    const state = await NetInfo.fetch();
    return state.isConnected || false;
  } catch (error) {
    console.error('Error al verificar la conexión a Internet:', error);
    return false;
  }
};

// Función para verificar si el servidor está disponible
export const checkServerConnection = async (): Promise<boolean> => {
  try {
    console.log(`Verificando conexión al servidor: ${API_URL}`);
    const timeout = new Promise((_, reject) => {
      setTimeout(() => reject(new Error('Timeout')), 5000);
    });
    
    const fetchPromise = fetch(`${API_URL}/health-check`).then(response => {
      console.log(`Respuesta del servidor: ${response.status}`);
      return response.ok;
    });
    
    // La que termine primero, timeout o fetchPromise
    return await Promise.race([fetchPromise, timeout]) as boolean;
  } catch (error) {
    console.error('Error al verificar la conexión al servidor:', error);
    // Intento alternativo en caso de fallo
    try {
      console.log('Intento alternativo con ping simple...');
      const response = await fetch(API_URL);
      return response.status < 400;
    } catch (e) {
      console.error('Error en intento alternativo:', e);
      return false;
    }
  }
};

// Función para obtener información detallada del dispositivo
export const getDeviceInfo = () => {
  return {
    platform: Platform.OS,
    version: Platform.Version,
    apiUrl: API_URL,
  };
};

// Función para diagnosticar problemas de conexión
export const diagnoseConnectionIssues = async () => {
  const internet = await checkInternetConnection();
  const server = await checkServerConnection();
  const deviceInfo = getDeviceInfo();
  
  return {
    hasInternet: internet,
    serverReachable: server,
    deviceInfo,
    timestamp: new Date().toISOString(),
  };
};
