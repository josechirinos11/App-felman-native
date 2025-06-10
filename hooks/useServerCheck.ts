import { Platform } from 'react-native';
import { API_URL } from '../config/constants';

// Almacenamiento en caché de resultados previos
let lastCheckTime = 0;
let lastCheckResult = false;
let checkInProgress = false;

/**
 * Función para comprobar la disponibilidad del servidor probando múltiples endpoints
 * @param forceCheck Forzar comprobación ignorando caché
 * @returns Promise<boolean> que indica si el servidor está disponible
 */
export async function checkServerAvailability(forceCheck = false): Promise<boolean> {
  // Usar caché si la última verificación fue hace menos de 10 segundos
  const now = Date.now();
  if (!forceCheck && now - lastCheckTime < 10000 && lastCheckTime > 0) {
    console.log(`🕐 Usando resultado en caché: ${lastCheckResult ? 'Conectado' : 'Desconectado'} (hace ${(now - lastCheckTime) / 1000}s)`);
    return lastCheckResult;
  }
  
  // Si ya hay una verificación en curso, esperar un poco y usar el resultado
  if (checkInProgress) {
    console.log('⏳ Verificación en progreso, esperando...');
    await new Promise(resolve => setTimeout(resolve, 500));
    return lastCheckResult;
  }
  
  checkInProgress = true;
  
  try {
    console.log(`🔍 Verificando disponibilidad del servidor: ${API_URL} (${Platform.OS})`);
    
    // Lista de rutas a probar en orden
    const endpointsToTry = [
      '/',                        // Ruta principal
      '/control-access',          // Ruta de control de acceso
      '/auth',                    // Ruta de autenticación
      '/auth/check',              // Ruta de verificación de autenticación
      '/control-access/pedidos',  // Ruta de pedidos
    ];    
    // Intentar cada endpoint hasta encontrar uno que responda
    for (const endpoint of endpointsToTry) {
      try {
        console.log(`🔄 Intentando conectar a: ${API_URL}${endpoint}`);
        
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 3000);
        
        const response = await fetch(`${API_URL}${endpoint}`, {
          method: 'HEAD',
          headers: { 'Cache-Control': 'no-cache' },
          signal: controller.signal
        });
        
        clearTimeout(timeoutId);
        
        if (response.status < 400) {
          console.log(`✅ Conexión exitosa a ${endpoint} (status: ${response.status})`);
          lastCheckResult = true;
          lastCheckTime = Date.now();
          checkInProgress = false;
          return true;
        }
        
        console.log(`❌ Endpoint ${endpoint} respondió con código ${response.status}`);
      } catch (endpointError) {
        console.log(`⚠️ Error al intentar conectar a ${endpoint}: ${(endpointError as Error).message}`);
      }
    }
    
    console.error('❌ Ningún endpoint respondió correctamente');
    lastCheckResult = false;
    lastCheckTime = Date.now();
    checkInProgress = false;
    return false;
  } catch (error) {
    console.error('❌ Error general al verificar el servidor:', error);
    lastCheckResult = false;
    lastCheckTime = Date.now();
    checkInProgress = false;
    return false;
  }
}

/**
 * Obtiene información del diagnóstico de conexión
 */
export async function getDiagnosticInfo() {
  const isServerAvailable = await checkServerAvailability();
  
  return {
    serverAvailable: isServerAvailable,
    lastCheckTime,
    platform: Platform.OS,
    platformVersion: Platform.Version,
    timestamp: new Date().toISOString(),
  };
}
