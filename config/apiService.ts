import axios, { AxiosInstance } from 'axios';

// URLs de la API
const LOCAL_API_URL = 'http://128.0.0.253:3000';
const PROD_API_URL = 'https://2d30-85-59-105-234.ngrok-free.app'


class ApiService {
    private static instance: ApiService;
    private client: AxiosInstance;
    private currentUrl: string;

    private constructor() {
        this.currentUrl = LOCAL_API_URL; // Intentar primero con la URL local
        this.client = this.createAxiosClient(this.currentUrl);
    }

    private createAxiosClient(baseURL: string): AxiosInstance {
        return axios.create({
            baseURL,
            timeout: 5000, // 5 segundos de timeout
            headers: {
                'Content-Type': 'application/json',
            }
        });
    }

    public static getInstance(): ApiService {
        if (!ApiService.instance) {
            ApiService.instance = new ApiService();
        }
        return ApiService.instance;
    }

    private async switchToProdIfNeeded(error: any): Promise<boolean> {
        if (this.currentUrl === PROD_API_URL) {
            return false; // Ya estamos en producción, no hay fallback
        }

        console.log('❌ No se pudo conectar al servidor local, usando producción:', PROD_API_URL);
        this.currentUrl = PROD_API_URL;
        this.client = this.createAxiosClient(this.currentUrl);
        return true;
    }

    public async getUsers(): Promise<any[]> {
        try {
            const response = await this.client.get('/test');
            if (response.data && response.data.testResult) {
                return response.data.testResult;
            }
            return [];
        } catch (error: any) {
            if (await this.switchToProdIfNeeded(error)) {
                // Reintentar con la URL de producción
                try {
                    const response = await this.client.get('/test');
                    if (response.data && response.data.testResult) {
                        return response.data.testResult;
                    }
                } catch (prodError) {
                    if (prodError instanceof Error) {
                        console.error('Error de conexión:', prodError.message);
                    } else {
                        console.error('Error de conexión:', prodError);
                    }
                    throw prodError;
                }
            }
            throw error;
        }
    }
}

export const apiService = ApiService.getInstance();
