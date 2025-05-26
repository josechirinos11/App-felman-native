import AsyncStorage from '@react-native-async-storage/async-storage';
import axios, { AxiosError } from 'axios';

// Obtener la URL de la API desde las variables de entorno
const API_URL = process.env.EXPO_PUBLIC_API_URL;

if (!API_URL) {
    throw new Error('EXPO_PUBLIC_API_URL no está definida en el archivo .env');
}

console.log('🔌 Conectando a API:', API_URL);

// Crear la instancia de axios con configuración inicial
const clienteAxios = axios.create({
    baseURL: API_URL, // Usar la URL de las variables de entorno
    timeout: 10000,
    headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
    }
});

// Verificar la conexión inicial
(async () => {
    try {
        const testUrl = `${API_URL}/test/test-connection`;
        console.log('🔄 Probando conexión desde axios:', testUrl);
        await axios.get(testUrl, { timeout: 2000 });
        console.log('✅ Conexión exitosa a:', API_URL);
    } catch (error) {
        const axiosError = error as AxiosError;
        console.error('❌ Error al conectar:', axiosError.message);
    }
})();

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
