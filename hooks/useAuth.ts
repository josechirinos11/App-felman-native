import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import { useEffect, useState } from 'react';

interface AuthState {
    token: string | null;
    usuario: any | null;
    authenticated: boolean;
    loading: boolean;
}

export function useAuth() {
    const [state, setState] = useState<AuthState>({
        token: null,
        usuario: null,
        authenticated: false,
        loading: true
    });

    useEffect(() => {
        checkAuth();
    }, []);

    const checkAuth = async () => {
        try {
            const token = await AsyncStorage.getItem('token');
            const userDataStr = await AsyncStorage.getItem('userData');

            if (token && userDataStr) {
                const userData = JSON.parse(userDataStr);
                setState({
                    token,
                    usuario: userData,
                    authenticated: true,
                    loading: false
                });
            } else {
                setState(prev => ({ ...prev, loading: false }));
            }
        } catch (error) {
            console.error('Error checking auth:', error);
            setState(prev => ({ ...prev, loading: false }));
        }
    }; 





       const login = async (nombre: string, password: string) => {
        try {
            const apiUrl = process.env.EXPO_PUBLIC_API_URL || '';
            if (!apiUrl) {
                throw new Error('La variable de entorno EXPO_PUBLIC_API_URL no está definida');
            }
            const url = `${apiUrl}/auth/login`;
            console.log('📡 Intentando login en:', url);
            const { data } = await axios.post(url, { nombre, password });

            if (!data) {
                throw new Error('No se recibió respuesta del servidor');
            }

            // La respuesta del servidor contiene el token y los datos del usuario
            const { token, ...userData } = data;
            // Si el backend responde con user: { ... }
            let usuarioPlano = userData.user || userData;
            // Normalizar a claves en español
            const usuarioNormalizado = {
                id: usuarioPlano.id || 0,
                nombre: usuarioPlano.nombre || usuarioPlano.name || '',
                rol: usuarioPlano.rol || usuarioPlano.role || '',
            };

            // Guardar token y datos de usuario normalizados
            await AsyncStorage.setItem('token', token);
            await AsyncStorage.setItem('userData', JSON.stringify(usuarioNormalizado));

            setState({
                token,
                usuario: usuarioNormalizado,
                authenticated: true,
                loading: false
            });
            console.log('✅ Estado actualizado en login:', {
                token,
                usuario: usuarioNormalizado,
                authenticated: true,
                loading: false
            });

            return { success: true };
        } catch (error: any) {
            console.error('❌ Error en login - Respuesta del servidor:', error.response?.data);
            if (error.response?.status) {
                console.error('Estado de la respuesta:', error.response.status);
            }
            
            let errorMessage = 'Error al iniciar sesión';
            
            if (error.response) {
                // El servidor respondió con un estado de error
                errorMessage = error.response.data?.mensaje || 'Error de autenticación';
            } else if (error.request) {
                // La solicitud fue hecha pero no se recibió respuesta
                errorMessage = 'No se pudo conectar con el servidor';
            } else {
                // Error al configurar la solicitud
                errorMessage = error.message;
            }

            return { success: false, error: errorMessage };
        }
    };

    const logout = async () => {
        try {
            await AsyncStorage.multiRemove(['token', 'userData', 'departamentos']);
            setState({
                token: null,
                usuario: null,
                authenticated: false,
                loading: false
            });
        } catch (error) {
            console.error('Logout error:', error);
        }
    };

    return {
        ...state,
        login,
        logout
    };
}