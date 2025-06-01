import { useState } from 'react';
import { Alert } from 'react-native';
import { useNetworkStatus } from './useNetworkStatus';

/**
 * Hook para manejar acciones en modo sin conexión
 * Proporciona funciones para verificar si hay conexión y mostrar alertas apropiadas
 */
export function useOfflineMode() {
  const { isConnected, serverReachable, checkConnectivity } = useNetworkStatus();
  const [isCheckingConnection, setIsCheckingConnection] = useState(false);

  /**
   * Verifica si la acción puede ser ejecutada en función del estado de conexión
   * @param requiresServer Si la acción requiere conexión al servidor
   * @returns true si se puede ejecutar la acción, false en caso contrario
   */
  const canPerformAction = (requiresServer: boolean = true): boolean => {
    // Si no requiere servidor, solo necesitamos conexión a internet
    if (!requiresServer) {
      return isConnected === true;
    }
    
    // Si requiere servidor, necesitamos conexión a internet y servidor disponible
    return isConnected === true && serverReachable === true;
  };

  /**
   * Intenta ejecutar una acción verificando primero el estado de conexión
   * @param action Función a ejecutar
   * @param requiresServer Si la acción requiere conexión al servidor
   * @param errorMessage Mensaje personalizado en caso de error de conexión
   */
  const tryAction = async (
    action: () => Promise<any>,
    requiresServer: boolean = true,
    errorMessage?: string
  ) => {
    setIsCheckingConnection(true);
    
    try {
      // Verificar conexión actual
      await checkConnectivity();
      
      if (canPerformAction(requiresServer)) {
        // Si hay conexión, ejecutar la acción
        return await action();
      } else {
        // Mostrar mensaje de error apropiado
        showConnectionAlert(requiresServer, errorMessage);
        return null;
      }
    } catch (error) {
      console.error("Error al ejecutar acción:", error);
      showConnectionAlert(requiresServer, "Error inesperado al verificar la conexión.");
      return null;
    } finally {
      setIsCheckingConnection(false);
    }
  };

  /**
   * Muestra una alerta con información sobre problemas de conexión
   */
  const showConnectionAlert = (requiresServer: boolean = true, customMessage?: string) => {
    // Determinar el mensaje adecuado según el tipo de error de conexión
    let title = "Problema de conexión";
    let message = customMessage || "";

    if (!isConnected) {
      message = message || "No hay conexión a Internet. Verifique su Wi-Fi o datos móviles.";
    } else if (requiresServer && !serverReachable) {
      message = message || "No se puede conectar al servidor. Intente nuevamente más tarde.";
    }

    Alert.alert(
      title,
      message,
      [{ text: "Entendido", style: "default" }]
    );
  };

  return {
    isConnected,
    serverReachable,
    isCheckingConnection,
    canPerformAction,
    tryAction,
    showConnectionAlert,
    checkConnectivity
  };
}
