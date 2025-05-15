import AsyncStorage from '@react-native-async-storage/async-storage';
import axios, { AxiosError } from 'axios';
import { Platform } from 'react-native';

// Configuración inicial con la URL de producción
const PROD_URL = 'https://app-felman-backend.vercel.app/felman';
const DEV_URL = Platform.select({
    android: 'http://10.0.2.2:4000/felman',
    ios: 'http://localhost:4000/felman',
    default: 'http://localhost:4000/felman'
});

// Crear la instancia de axios con configuración inicial
const clienteAxios = axios.create({
    baseURL: PROD_URL, // Comenzamos con la URL de producción
    timeout: 10000,
    headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
    }
});

// Si estamos en desarrollo, intentar conectar con el servidor local
if (__DEV__) {
    (async () => {
        try {
            // Intentar conectar al servidor local
            const testUrl = `${DEV_URL}/health`;
            console.log('Probando conexión local:', testUrl);
            await axios.get(testUrl, { timeout: 2000 });
            
            // Si la conexión es exitosa, cambiar a URL local
            clienteAxios.defaults.baseURL = DEV_URL;
            console.log('✅ Conectado al servidor local:', DEV_URL);
        } catch (error) {
            const axiosError = error as AxiosError;
            console.log('❌ No se pudo conectar al servidor local, usando producción:', PROD_URL);
            console.log('Error de conexión:', axiosError.message);
        }
    })();
} else {
    console.log('🌐 Modo producción:', PROD_URL);
}

// Interceptor para agregar el token al encabezado de cada solicitud
clienteAxios.interceptors.request.use(
    async (config) => {
        try {
            const token = await AsyncStorage.getItem('token');
            if (token) {
                config.headers.Authorization = `Bearer ${token}`;
            }
            console.log('🚀 Enviando solicitud a:', config.url);
            return config;
        } catch (error) {
            console.error('Error al obtener el token:', error);
            return config;
        }
    },
    (error: AxiosError) => {
        console.error('Error en interceptor de request:', error);
        return Promise.reject(error);
    }
);

// Interceptor para manejar respuestas y errores
clienteAxios.interceptors.response.use(
    (response) => {
        console.log('✅ Respuesta exitosa:', response.config.url);
        return response;
    },    (error: AxiosError) => {
        if (error.response) {
            console.error('❌ Error de respuesta del servidor:', {
                status: error.response.status,
                data: JSON.stringify(error.response.data, null, 2),
                url: error.config?.url
            });
        } else if (error.request) {
            console.error('❌ Error de conexión:', {
                message: error.message,
                url: error.config?.url
            });
        } else {
            console.error('❌ Error de configuración:', error.message);
        }
        return Promise.reject(error);
    }
);

export default clienteAxios;
