// 1. Oculta el header de navegación para esta pantalla
export const options = {
  headerShown: false,
};
import Ionicons from '@expo/vector-icons/Ionicons';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { Image, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { useAuth } from '../hooks/useAuth';

export default function LoginScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const { login, authenticated, loading: authLoading } = useAuth();
  const router = useRouter();

  // Verificar si el usuario ya está autenticado y redirigir
  useEffect(() => {
    if (!authLoading && authenticated) {
      console.log('👤 Usuario ya autenticado, redirigiendo...');
      router.replace('/');
    }
  }, [authenticated, authLoading, router]);

  const handleLogin = async () => {
    if (!email || !password) {
      setError('Todos los campos son obligatorios');
      return;
    }

    setLoading(true);
    setError('');    try {
      const result = await login(email, password);
      if (!result.success) {
        if (result.error?.includes('Network Error') || result.error?.includes('ECONNREFUSED')) {
          setError('No se pudo conectar con el servidor. Verifica tu conexión a internet y que el servidor esté funcionando.');
        } else {
          setError(result.error || 'Error al iniciar sesión');
        }
      } else {
        // Solo redirigimos si el login fue exitoso
        console.log('✅ Login exitoso, redirigiendo a index...');
        router.push('/');
      }
    } catch (error) {
      console.error('Error en login:', error);
      setError('Error al conectar con el servidor. Por favor, intenta más tarde.');
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = () => {
    router.push('/register');
  };

  return (
    <View style={styles.container}>
      <View style={styles.logoContainer}>
        <Image source={require('../assets/images/logo.png')} style={styles.logo} />
      </View>
      <Text style={styles.title}>Iniciar Sesión</Text>
      {error ? <Text style={styles.errorText}>{error}</Text> : null}
      <View style={styles.inputContainer}>
        <TextInput
          style={styles.input}
          placeholder="Nombre"
          placeholderTextColor="#9ca3af"
          value={email}
          onChangeText={setEmail}
          autoCapitalize="none"
          selectionColor="#2e78b7"
        />
      </View>
      <View style={styles.inputContainer}>
        <TextInput
          style={styles.input}
          placeholder="Contraseña"
          placeholderTextColor="#9ca3af"
          value={password}
          onChangeText={setPassword}
          secureTextEntry={!showPassword}
          selectionColor="#2e78b7"
          autoCapitalize="none"
        />
        <TouchableOpacity
          style={{ position: 'absolute', right: 10, top: 12 }}
          onPress={() => setShowPassword((prev) => !prev)}
          accessibilityLabel={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
        >
          <Ionicons
            name={showPassword ? 'eye-off-outline' : 'eye-outline'}
            size={22}
            color="#2e78b7"
          />
        </TouchableOpacity>
      </View>
      <TouchableOpacity
        style={[styles.button, loading && styles.buttonDisabled]}
        onPress={handleLogin}
        disabled={loading}>
        <Text style={styles.buttonText}>
          {loading ? 'Entrando...' : 'Entrar'}
        </Text>
      </TouchableOpacity>

    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#f3f4f6',
  },  logoContainer: {
    backgroundColor: '#f3f4f6',
    padding: 20,
    borderRadius: 20,
    marginBottom: 30,
    elevation: 3,
    // Shadow for iOS
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  logo: {
    width: 120,
    height: 60,
    resizeMode: 'contain',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 20,
    color: '#2e78b7',
  },
  errorText: {
    color: '#ef4444',
    marginBottom: 10,
    textAlign: 'center',
  },  inputContainer: {
    width: '100%',
    marginBottom: 15,
    backgroundColor: '#f3f4f6',
    borderRadius: 12,
    paddingHorizontal: 15,
    paddingVertical: 5,
    elevation: 3,
    // Shadow for iOS
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  input: {
    height: 50,
    color: '#2e78b7',
    fontSize: 16,
  },  button: {
    width: '100%',
    backgroundColor: '#f3f4f6',
    padding: 15,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 10,
    elevation: 3,
    // Shadow for iOS
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  buttonDisabled: {
    opacity: 0.7,
  },
  buttonText: {
    color: '#2e78b7',
    fontSize: 16,
    fontWeight: '600',
  },
  registerButton: {
    backgroundColor: '#f3f4f6',
    marginTop: 10,
  },
});
