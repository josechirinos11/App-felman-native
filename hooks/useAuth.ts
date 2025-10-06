import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import { useEffect, useState } from 'react';
import { API_URL } from '../config/constants';

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
        // Simplificar checkAuth para diagnosticar
        checkAuth();
    }, []);

    const checkAuth = async () => {
        try {
            console.log('🔐 Verificando autenticación...');

            // Temporalmente simplificar para diagnosticar
            await new Promise(resolve => setTimeout(resolve, 1000)); // Esperar 1 segundo

            const token = await AsyncStorage.getItem('token');
            const userDataStr = await AsyncStorage.getItem('userData');

            console.log('🔐 Token encontrado:', !!token);
            console.log('🔐 UserData encontrado:', !!userDataStr);

            if (token && userDataStr) {
                try {
                    const userData = JSON.parse(userDataStr);
                    console.log('🔐 Usuario parseado correctamente');
                    setState({
                        token,
                        usuario: userData,
                        authenticated: true,
                        loading: false
                    });
                } catch (parseError) {
                    console.error('🔐 Error al parsear userData:', parseError);
                    setState(prev => ({ ...prev, loading: false }));
                }
            } else {
                console.log('🔐 No hay credenciales guardadas');
                setState(prev => ({ ...prev, loading: false }));
            }
        } catch (error) {
            console.error('🔐 Error en checkAuth:', error);
            setState(prev => ({ ...prev, loading: false }));
        }
    };





    const login = async (nombre: string, password: string) => {
        try {
            console.log('📡 Intentando login...');
            const url = `${API_URL}/auth/login`;
            const { data } = await axios.post(url, { nombre, password });

            if (!data) {
                throw new Error('No se recibió respuesta del servidor');
            }

            const { token, ...userData } = data;
            let usuarioPlano = userData.user || userData;
            const usuarioNormalizado = {
                id: usuarioPlano.id || 0,
                nombre: usuarioPlano.nombre || usuarioPlano.name || '',
                rol: usuarioPlano.rol || usuarioPlano.role || '',
            };

            await AsyncStorage.setItem('token', token);
            await AsyncStorage.setItem('userData', JSON.stringify(usuarioNormalizado));

            setState({
                token,
                usuario: usuarioNormalizado,
                authenticated: true,
                loading: false
            });

            return { success: true };
        } catch (error: any) {
            console.error('❌ Error en login local:', error);

            // Si el error es 401 o 404, intenta login en Lambda
            let errorMessage = 'Error al iniciar sesión';
            let status = error.response?.status;
            if (status === 404 || status === 401) {
                try {
                    // Endpoint Lambda
                    const lambdaUrl = 'https://ba2oohujh5.execute-api.eu-north-1.amazonaws.com/login';
                    const lambdaBody = {
                        email: nombre,
                        password: password
                    };
                    const lambdaRes = await axios.post(lambdaUrl, lambdaBody);
                    const lambdaData = lambdaRes.data;
                    if (lambdaData.success && lambdaData.usuario) {
                        // Normalizar usuario igual que login local
                        const usuarioPlano = lambdaData.usuario;
                        const usuarioNormalizado = {
                            id: usuarioPlano.id || usuarioPlano._id || 0,
                            nombre: usuarioPlano.nombre || usuarioPlano.name || '',
                            rol: usuarioPlano.rol || usuarioPlano.role || '',
                            email: usuarioPlano.email || ''
                        };
                        await AsyncStorage.setItem('token', 'lambda'); // Usar un token identificador
                        await AsyncStorage.setItem('userData', JSON.stringify(usuarioNormalizado));
                        setState({
                            token: 'lambda',
                            usuario: usuarioNormalizado,
                            authenticated: true,
                            loading: false
                        });
                        return { success: true };
                    } else {
                        errorMessage = lambdaData.error || 'Usuario no encontrado en Lambda';
                        return { success: false, error: errorMessage };
                    }
                } catch (lambdaError: any) {
                    console.error('❌ Error en login Lambda:', lambdaError);
                    errorMessage = lambdaError.response?.data?.error || 'Error al conectar con Lambda';
                    return { success: false, error: errorMessage };
                }
            }

            if (status === 403) {
                errorMessage = 'Acceso denegado';
            } else if (error.request) {
                errorMessage = 'No se pudo conectar con el servidor';
            } else {
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