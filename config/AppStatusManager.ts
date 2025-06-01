import AsyncStorage from '@react-native-async-storage/async-storage';
import NetInfo from '@react-native-community/netinfo';
import Constants from 'expo-constants';
import { Platform } from 'react-native';

/**
 * Clase para gestionar el estado y diagnóstico de la aplicación
 */
class AppStatusManager {
  private static instance: AppStatusManager;
  private apiUrl: string = '';
    private constructor() {
    // Obtener la URL de la API desde las variables de entorno, desde Constants.expoConfig.extra, o usar la URL por defecto
    this.apiUrl = process.env.EXPO_PUBLIC_API_URL || 
                 (Constants.expoConfig?.extra?.apiUrl as string) || 
                 'http://85.59.105.234:3000';
                 
    console.log('AppStatusManager: URL de API configurada a', this.apiUrl);
  }
  
  /**
   * Obtener la instancia singleton
   */
  public static getInstance(): AppStatusManager {
    if (!AppStatusManager.instance) {
      AppStatusManager.instance = new AppStatusManager();
    }
    return AppStatusManager.instance;
  }
    /**
   * Comprobar el estado inicial de la aplicación
   */
  public async checkInitialStatus(): Promise<{
    isConnected: boolean;
    serverReachable: boolean;
    apiUrl: string;
  }> {
    try {
      console.log('Comprobando estado inicial de la aplicación...');
      console.log(`Usando API URL: ${this.apiUrl}`);
      
      // Comprobar conexión a Internet
      const netInfo = await NetInfo.fetch();
      const isConnected = netInfo.isConnected || false;
      console.log(`Conexión a Internet: ${isConnected ? 'SÍ' : 'NO'}`);
      
      // Si no hay conexión a Internet, no seguimos comprobando
      if (!isConnected) {
        return {
          isConnected,
          serverReachable: false,
          apiUrl: this.apiUrl
        };
      }
        // Comprobar servidor
      let serverReachable = false;
      try {
        console.log(`Intentando conectar al servidor: ${this.apiUrl}`);
        
        // Intento 1: Ruta principal
        try {
          const response = await fetch(`${this.apiUrl}/`, {
            method: 'HEAD',
            headers: { 'Cache-Control': 'no-cache' },
            // Un timeout más corto para la comprobación inicial
            signal: AbortSignal.timeout(3000)
          });
          serverReachable = response.status < 400;
          console.log(`Servidor principal alcanzable: ${serverReachable ? 'SÍ' : 'NO'}, estado: ${response.status}`);
        } catch (primaryError) {
          console.log('Primer intento fallido, intentando ruta alternativa...');
          
          // Intento 2: Ruta alternativa
          try {
            const response = await fetch(`${this.apiUrl}/auth/check`, {
              method: 'HEAD',
              headers: { 'Cache-Control': 'no-cache' },
              signal: AbortSignal.timeout(3000)
            });
            serverReachable = response.status < 400;
            console.log(`Servidor alternativo alcanzable: ${serverReachable ? 'SÍ' : 'NO'}, estado: ${response.status}`);
          } catch (secondaryError) {
            console.log('Error en ambos intentos de conexión');
            serverReachable = false;
          }
        }
      } catch (error) {
        console.error('Error al conectar con el servidor:', error);
        serverReachable = false;
      }
      
      // Guardar estado para consultas futuras
      await this.saveStatus({ isConnected, serverReachable });
      
      return {
        isConnected,
        serverReachable,
        apiUrl: this.apiUrl
      };
    } catch (error) {
      console.error('Error al comprobar el estado inicial:', error);
      return {
        isConnected: false,
        serverReachable: false,
        apiUrl: this.apiUrl
      };
    }
  }
  
  /**
   * Guardar el estado actual en AsyncStorage
   */
  private async saveStatus(status: { 
    isConnected: boolean; 
    serverReachable: boolean 
  }): Promise<void> {
    try {
      await AsyncStorage.setItem('appStatus', JSON.stringify({
        ...status,
        lastChecked: new Date().toISOString(),
        version: Constants.expoConfig?.version || '1.0.0',
        platform: Platform.OS,
        platformVersion: Platform.Version,
      }));
    } catch (error) {
      console.error('Error al guardar el estado:', error);
    }
  }
  
  /**
   * Obtener URL del API
   */
  public getApiUrl(): string {
    return this.apiUrl;
  }
  
  /**
   * Obtener información del dispositivo
   */
  public getDeviceInfo() {
    return {
      platform: Platform.OS,
      version: Platform.Version,
      apiUrl: this.apiUrl,
      appVersion: Constants.expoConfig?.version || '1.0.0'
    };
  }
}

export default AppStatusManager;
