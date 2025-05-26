import axios from 'axios';

const API_URL = process.env.EXPO_PUBLIC_API_URL;

if (!API_URL) {
    throw new Error('EXPO_PUBLIC_API_URL no está definida en el archivo .env');
}

console.log('🔌 Conectando a API:', API_URL);

// Cliente axios configurado
const apiClient = axios.create({
    baseURL: API_URL,
    timeout: 10000,
    headers: {
        'Content-Type': 'application/json',
    }
});

// Interceptor para manejar tokens de autenticación
apiClient.interceptors.request.use(
    (config) => {
        // Aquí podrías agregar el token de autenticación si lo tienes
        // const token = await SecureStore.getItemAsync('userToken');
        // if (token) {
        //     config.headers.Authorization = `Bearer ${token}`;
        // }
        return config;
    },
    (error) => {
        return Promise.reject(error);
    }
);

// Clase para manejar las operaciones de la base de datos
class DatabaseService {
    private static instance: DatabaseService;

    private constructor() {}

    public static getInstance(): DatabaseService {
        if (!DatabaseService.instance) {
            DatabaseService.instance = new DatabaseService();
        }
        return DatabaseService.instance;
    }

    public async testConnection(): Promise<boolean> {
        try {
            const response = await apiClient.get('/test/test-connection');
             console.log('✅ Prueba de conexión exitosa:', response.data);
            return true;
        } catch (error) {
            console.error('❌❌ Error al probar la conexión desde API:', error);
            return false;
        }
    }

    public async query<T>(endpoint: string, params?: any): Promise<T[]> {
        try {
            const response = await apiClient.post(`/${endpoint}`, params);
            return response.data as T[];
        } catch (error) {
            console.error(`❌ Error al ejecutar consulta en ${endpoint}:`, error);
            throw error;
        }
    }

    public async execute(endpoint: string, data: any): Promise<void> {
        try {
            await apiClient.post(`/${endpoint}`, data);
        } catch (error) {
            console.error(`❌ Error al ejecutar operación en ${endpoint}:`, error);
            throw error;
        }
    }
}

// Exportar una instancia singleton
export const dbService = DatabaseService.getInstance();
