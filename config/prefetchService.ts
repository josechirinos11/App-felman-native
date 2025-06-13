import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_URL } from './constants';

// Tipos de datos para cada página
interface Entrega {
  Id_Entrega: number;
  FechaEnvio: string;
  EntregaConfirmada: number;
  EstadoCarga: string;
  ObservaGral: string | null;
  Id_LineaEntrega: number;
  Id_Pedido: number;
  Observaciones: string | null;
  NCaballetes: number;
  NBultos: number;
  Id_ResponsableEnvio: number;
  Id_EstadoEntrega: number;
  DocuAdjunta: number;
  Id_LugarEntrega: number;
  NSCaballetes: string | null;
  NoPedido: string;
  RefCliente: string;
  Cliente: string;
  Comercial: string;
}

interface Pedido {
  NoPedido: string;
  Seccion: string;
  Cliente: string;
  RefCliente: string;
  Compromiso: string;
  Id_ControlMat: number;
  Material: string;
  Proveedor: string;
  FechaPrevista: string;
  Recibido: number;
  EstadoPedido?: string;
  Incidencia?: string | null;
}

interface PedidoIncidencia {
  "NºPedido": string;
  EstadoPedido: string;
  Incidencia: boolean;
  Compromiso: string;
}

interface Comercial {
  Id_Comercial: number;
  Nombre: string;
  Email: string;
  Telefono: string;
  Activo: number;
}

// Configuración de cache
interface CacheConfig {
  key: string;
  endpoint: string;
  fastEndpoint?: string; // Endpoint rápido para carga inicial
  ttl: number; // Time to live en milliseconds
}

const CACHE_CONFIGS: Record<string, CacheConfig> = {
  entregas: {
    key: 'cache_entregas',
    endpoint: '/control-access/controlEntregaDiaria',
    ttl: 5 * 60 * 1000, // 5 minutos
  },
  pedidos: {
    key: 'cache_pedidos',
    endpoint: '/control-access/ConsultaControlPedidoInicio', // Endpoint completo (3k+ registros)
    fastEndpoint: '/control-access/ConsultaControlPedidoInicio40Registro', // Endpoint rápido (40 registros)
    ttl: 10 * 60 * 1000, // 10 minutos
  },
  incidencias: {
    key: 'cache_incidencias',
    endpoint: '/control-access/ConsultaControlPedidoInicio', // Cambiar para usar el mismo endpoint que pedidos
    fastEndpoint: '/control-access/ConsultaControlPedidoInicio40Registro',
    ttl: 10 * 60 * 1000, // 10 minutos
  },
  comerciales: {
    key: 'cache_comerciales',
    endpoint: '/control-access/comerciales',
    ttl: 60 * 60 * 1000, // 1 hora
  },
};

class PrefetchService {
  private static instance: PrefetchService;
  private prefetchInProgress = false;
  private cacheVersion = '1.0';

  private constructor() {}

  public static getInstance(): PrefetchService {
    if (!PrefetchService.instance) {
      PrefetchService.instance = new PrefetchService();
    }
    return PrefetchService.instance;
  }

  // Obtener datos desde cache
  public async getCachedData<T>(cacheKey: string): Promise<T[] | null> {
    try {
      const cacheData = await AsyncStorage.getItem(cacheKey);
      if (!cacheData) return null;

      const parsed = JSON.parse(cacheData);
      const now = Date.now();

      // Verificar si el cache ha expirado
      if (parsed.timestamp + parsed.ttl < now) {
        console.log(`🕐 Cache expirado para ${cacheKey}`);
        await AsyncStorage.removeItem(cacheKey);
        return null;
      }

      console.log(`📦 Datos obtenidos del cache para ${cacheKey}:`, parsed.data.length, 'registros');
      return parsed.data as T[];
    } catch (error) {
      console.error(`❌ Error al obtener datos del cache para ${cacheKey}:`, error);
      return null;
    }
  }

  // Guardar datos en cache
  private async setCachedData<T>(cacheKey: string, data: T[], ttl: number): Promise<void> {
    try {
      const cacheData = {
        data,
        timestamp: Date.now(),
        ttl,
        version: this.cacheVersion,
      };

      await AsyncStorage.setItem(cacheKey, JSON.stringify(cacheData));
      console.log(`💾 Datos guardados en cache para ${cacheKey}:`, data.length, 'registros');
    } catch (error) {
      console.error(`❌ Error al guardar datos en cache para ${cacheKey}:`, error);
    }
  }

  // Obtener datos de un endpoint específico
  private async fetchDataFromEndpoint<T>(endpoint: string): Promise<T[]> {
    try {
      console.log(`🔄 Obteniendo datos de: ${API_URL}${endpoint}`);
      const response = await fetch(`${API_URL}${endpoint}`);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      return Array.isArray(data) ? data : [];
    } catch (error) {
      console.error(`❌ Error al obtener datos de ${endpoint}:`, error);
      return [];
    }
  }

  // Prefetch de datos específicos
  public async prefetchData<T>(configKey: string): Promise<T[]> {
    const config = CACHE_CONFIGS[configKey];
    if (!config) {
      console.warn(`⚠️ Configuración no encontrada para: ${configKey}`);
      return [];
    }

    // Primero intentar obtener del cache
    const cachedData = await this.getCachedData<T>(config.key);
    if (cachedData) {
      return cachedData;
    }

    // Si no hay cache válido, obtener datos frescos
    const freshData = await this.fetchDataFromEndpoint<T>(config.endpoint);
    
    // Guardar en cache
    if (freshData.length > 0) {
      await this.setCachedData(config.key, freshData, config.ttl);
    }

    return freshData;
  }

  // Prefetch de todos los datos al iniciar la app
  public async prefetchAllData(): Promise<void> {
    if (this.prefetchInProgress) {
      console.log('🔄 Prefetch ya en progreso...');
      return;
    }

    this.prefetchInProgress = true;
    console.log('🚀 Iniciando prefetch de todos los datos...');

    try {
      const startTime = Date.now();

      // Prefetch de todas las páginas en paralelo
      const promises = Object.keys(CACHE_CONFIGS).map(async (configKey) => {
        try {
          await this.prefetchData(configKey);
          console.log(`✅ Prefetch completado para: ${configKey}`);
        } catch (error) {
          console.error(`❌ Error en prefetch para ${configKey}:`, error);
        }
      });

      await Promise.allSettled(promises);

      const endTime = Date.now();
      console.log(`🎉 Prefetch completado en ${endTime - startTime}ms`);

      // Marcar el tiempo del último prefetch
      await AsyncStorage.setItem('last_prefetch_time', Date.now().toString());
    } catch (error) {
      console.error('❌ Error durante el prefetch global:', error);
    } finally {
      this.prefetchInProgress = false;
    }
  }

  // Invalidar cache específico
  public async invalidateCache(configKey: string): Promise<void> {
    const config = CACHE_CONFIGS[configKey];
    if (config) {
      await AsyncStorage.removeItem(config.key);
      console.log(`🗑️ Cache invalidado para: ${configKey}`);
    }
  }

  // Limpiar todo el cache
  public async clearAllCache(): Promise<void> {
    const promises = Object.values(CACHE_CONFIGS).map(config => 
      AsyncStorage.removeItem(config.key)
    );
    
    await Promise.all(promises);
    await AsyncStorage.removeItem('last_prefetch_time');
    console.log('🧹 Todo el cache ha sido limpiado');
  }

  // Verificar si necesita prefetch (cada 30 minutos)
  public async shouldPrefetch(): Promise<boolean> {
    try {
      const lastPrefetchTime = await AsyncStorage.getItem('last_prefetch_time');
      if (!lastPrefetchTime) return true;

      const now = Date.now();
      const timeSinceLastPrefetch = now - parseInt(lastPrefetchTime);
      const shouldPrefetch = timeSinceLastPrefetch > 30 * 60 * 1000; // 30 minutos

      console.log(`🕐 Tiempo desde último prefetch: ${Math.round(timeSinceLastPrefetch / 1000 / 60)} minutos`);
      return shouldPrefetch;
    } catch (error) {
      console.error('❌ Error al verificar si debe hacer prefetch:', error);
      return true;
    }
  }

  // Obtener estadísticas del cache
  public async getCacheStats(): Promise<Record<string, any>> {
    const stats: Record<string, any> = {};
    
    for (const [key, config] of Object.entries(CACHE_CONFIGS)) {
      try {
        const cacheData = await AsyncStorage.getItem(config.key);
        if (cacheData) {
          const parsed = JSON.parse(cacheData);
          const now = Date.now();
          const isExpired = parsed.timestamp + parsed.ttl < now;
          
          stats[key] = {
            records: parsed.data.length,
            cached: new Date(parsed.timestamp).toLocaleString(),
            expired: isExpired,
            ttl: config.ttl / 1000 / 60, // TTL en minutos
          };
        } else {
          stats[key] = { records: 0, cached: 'N/A', expired: true };
        }
      } catch (error) {
        stats[key] = { error: error instanceof Error ? error.message : 'Error desconocido' };
      }
    }

    return stats;
  }

  // Refrescar datos específicos forzadamente
  public async refreshData<T>(configKey: string): Promise<T[]> {
    const config = CACHE_CONFIGS[configKey];
    if (!config) return [];

    // Invalidar cache existente
    await this.invalidateCache(configKey);
    
    // Obtener datos frescos
    return await this.prefetchData<T>(configKey);
  }
}

// Exportar instancia singleton
export const prefetchService = PrefetchService.getInstance();

// Exportar tipos para uso en otros archivos
export type { Comercial, Entrega, Pedido, PedidoIncidencia };

