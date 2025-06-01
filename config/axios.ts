import AsyncStorage from '@react-native-async-storage/async-storage';
import axios, { AxiosError, AxiosRequestConfig } from 'axios';
import { API_URL } from './constants';

// Constante para el máximo de reintentos
const MAX_RETRIES = 2;
const RETRY_DELAY_BASE = 1000;

console.log('🔌 Conectando a API:', API_URL);

// Crear la instancia de axios con configuración inicial
const clienteAxios = axios.create({
    baseURL: API_URL,
    timeout: 10000,
    headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
    }
});

// Interceptor para añadir el token a todas las peticiones
clienteAxios.interceptors.request.use(
    async (config) => {
        try {
            const token = await AsyncStorage.getItem('token');
            if (token) {
                config.headers.Authorization = `Bearer ${token}`;
            }
            console.log('🚀 Enviando solicitud a:', config.url);
        } catch (e) {
            console.error('Error al obtener token:', e);
        }
        return config;
    },
    (error) => {
        console.error('Error en interceptor de petición:', error);
        return Promise.reject(error);
    }
);

// Interceptor para manejar respuestas y errores con reintentos
clienteAxios.interceptors.response.use(
    (response) => {
        console.log('✅ Respuesta exitosa:', response.config.url);
        return response;
    },
    async (error: AxiosError) => {
        const config = error.config as AxiosRequestConfig & { _retryCount?: number };
        
        // Inicializar contador de reintentos si no existe
        if (!config || !config.url) {
            console.error('❌ Error sin configuración válida:', error.message);
            return Promise.reject(error);
        }
        
        config._retryCount = config._retryCount || 0;
        
        // Si hay un error de red, timeout, o error 5xx y no hemos excedido los reintentos
        const shouldRetry = (
            (error.code === 'ECONNABORTED' || 
            error.message.includes('timeout') ||
            error.message.includes('Network Error') ||
            !error.response || 
            error.response.status >= 500) && 
            config._retryCount < MAX_RETRIES
        );
        
        if (shouldRetry) {
            config._retryCount += 1;
            
            // Calcular delay con backoff exponencial
            const delay = RETRY_DELAY_BASE * Math.pow(2, config._retryCount - 1);
            console.log(`⏳ Reintentando solicitud (${config._retryCount}/${MAX_RETRIES}) a ${config.url} en ${delay}ms`);
            
            // Esperar antes de reintentar
            await new Promise(resolve => setTimeout(resolve, delay));
            
            // Reintentar la solicitud
            return clienteAxios(config);
        }
        
        // Si ya no debemos reintentar, registrar el error detallado
        if (config._retryCount > 0) {
            console.error(`❌ Fallaron todos los reintentos (${config._retryCount}) para: ${config.url}`);
        }
        
        if (error.response) {
            console.error('❌ Error de respuesta del servidor:', {
                status: error.response.status,
                data: error.response.data,
                url: config.url
            });
        } else if (error.request) {
            console.error('❌ Error de conexión:', {
                message: error.message,
                url: config.url
            });
        } else {
            console.error('❌ Error de configuración:', error.message);
        }
        
        return Promise.reject(error);
    }
);

// Verificar la conexión inicial al módulo
(async () => {
    try {
        const testUrl = `${API_URL}/test/test-connection`;
        console.log('🔄 Probando conexión inicial desde axios:', testUrl);
        const response = await axios.get(testUrl, { timeout: 5000 });
        console.log('✅ Conexión inicial exitosa:', response.data);
    } catch (error) {
        const axiosError = error as AxiosError;
        console.warn('⚠️  No se pudo conectar inicialmente:', axiosError.message);
        console.log('📱 La app funcionará en modo offline hasta establecer conexión');
    }
})();

export default clienteAxios;
