// app/index.tsx
import Ionicons from '@expo/vector-icons/Ionicons';
import { useFocusEffect } from '@react-navigation/native';
import { useRouter } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAuth } from '../../hooks/useAuth';

type IconName = React.ComponentProps<typeof Ionicons>['name'];
type RouteNames = '/control-pedidos' | '/control-comerciales' | '/control-incidencias' | '/control-entregas-diarias' | '/pagina-construccion' | string;

interface MenuItem {
  id: number | string;
  title: string;
  icon: IconName;
  route: RouteNames;
  isCustom?: boolean;
}

interface CustomModule {
  id: string;
  nombre: string;
  icono: IconName;
  consultaSQL: string;
  apiRestUrl: string;
  fechaCreacion: string;
}

const menuItemsBase: MenuItem[] = [
  { id: 1, title: 'Moncada', icon: 'construct-outline', route: '/moncada' },
  { id: 2, title: 'Almassera', icon: 'business-outline', route: '/optima' },
  { id: 3, title: 'Almacén', icon: 'cube-outline', route: '/almacen' },
  { id: 4, title: 'Logistica', icon: 'map-outline', route: '/logistica' },
];


interface UserData {
  id: number;
  nombre?: string;
  rol?: string;
  name?: string;
  role?: string;
}


export default function HomeScreen() {
  const [token, setToken] = useState<string | null>(null);
  const [userData, setUserData] = useState<UserData | null>(null);
  const [loading, setLoading] = useState(true);
  const [menuItems, setMenuItems] = useState<MenuItem[]>(menuItemsBase);
  const { authenticated, loading: authLoading } = useAuth();
  const router = useRouter();

  // Verificar autenticación al cargar
  useEffect(() => {
    console.log('🔍 Debug datos usuario:', userData);
    if (!authLoading && !authenticated) {
      console.log('🚫 Usuario no autenticado, redirigiendo a login...');
      router.replace('/login');
    }
  }, [authenticated, authLoading, router]);


  // Cargar módulos personalizados cuando la pantalla obtiene el foco
  useFocusEffect(
    useCallback(() => {
      cargarModulosPersonalizados();
    }, [])
  );

  useEffect(() => {
    (async () => {
      try {
        // 1. Recuperar el token
        const storedToken = await AsyncStorage.getItem('token');
        // 2. Recuperar los datos de usuario (JSON)
        const rawUser = await AsyncStorage.getItem('userData');

        console.log('🟢 AsyncStorage token:', storedToken);
        console.log('🟢 AsyncStorage userData:', rawUser);

        if (storedToken) {
          setToken(storedToken);
        }
        if (rawUser) {
          let parsedUser = JSON.parse(rawUser);
          console.log('🟢 parsedUser:', parsedUser);
          // Mapear si vienen como name/role
          if (parsedUser) {
            if (parsedUser.nombre && parsedUser.rol) {
              setUserData(parsedUser);
            } else if (parsedUser.name && parsedUser.role) {
              setUserData({
                id: parsedUser.id || 0,
                nombre: parsedUser.name,
                rol: parsedUser.role,
              });
            } else {
              setUserData(null);
            }
          } else {
            setUserData(null);
          }
        }
      } catch (error) {
        console.error('❌ Error al leer AsyncStorage:', error);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  // Función para cargar módulos personalizados
  const cargarModulosPersonalizados = async () => {
    try {
      const modulosJSON = await AsyncStorage.getItem('customModules');
      if (modulosJSON) {
        const modulosCustom: CustomModule[] = JSON.parse(modulosJSON);
        
        // Convertir módulos personalizados a MenuItem
        const menuItemsCustom: MenuItem[] = modulosCustom.map(modulo => ({
          id: modulo.id,
          title: modulo.nombre,
          icon: modulo.icono,
          route: `/modulos/${modulo.id}` as RouteNames,
          isCustom: true,
        }));

        // Combinar menús base con personalizados
        setMenuItems([...menuItemsBase, ...menuItemsCustom]);
        console.log('✅ Módulos personalizados cargados:', menuItemsCustom.length);
      } else {
        setMenuItems(menuItemsBase);
      }
    } catch (error) {
      console.error('❌ Error al cargar módulos personalizados:', error);
      setMenuItems(menuItemsBase);
    }
  };

  if (loading) {
    return (
      <View style={styles.loader}>
        <ActivityIndicator size="large" color="#2e78b7" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <SafeAreaView style={styles.content}>

        {/* Panel superior con información del usuario */}
        <View style={styles.sidePanel}>
          {userData && typeof userData === 'object' ? (
            <View style={styles.userInfo}>
              <Text style={styles.welcomeText}>Bienvenido a felman,</Text>
              <Text style={styles.userName}>
                {String(userData.nombre || userData.name || 'Sin nombre')}
              </Text>
              <Text style={styles.userRole}>
                {String(userData.rol || userData.role || 'Sin rol')}
              </Text>
            </View>
          ) : (
            <Text style={styles.notAuthText}>No hay datos de usuario.</Text>
          )}
        </View>

        {/* Panel principal con menú */}
        <View style={styles.mainPanel}>
          <ScrollView style={styles.scrollView}>
            <View style={styles.menuGrid}>
              {Array.from({ length: Math.ceil(menuItems.length / 2) }).map((_, rowIndex) => (                <View key={rowIndex} style={styles.menuRow}>
                  {menuItems.slice(rowIndex * 2, rowIndex * 2 + 2).map(item => (
                    <TouchableOpacity
                      key={item.id}
                      style={styles.menuItem}
                      onPress={() => router.push(item.route as any)}
                    >
                      <Ionicons name={item.icon} size={32} color="#2e78b7" />
                      <Text style={styles.menuText}>{String(item.title || '')}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              ))}
            </View>
          </ScrollView>
        </View>

        {/* Botón de agregar fijo arriba del botón de configuraciones */}
        <TouchableOpacity
          style={styles.addButton}
          onPress={() => router.push('/modulos/agregarModulo')}
        >
          <Ionicons name="add-outline" size={24} color="#1976d2" />
        </TouchableOpacity>

        {/* Botón de configuraciones fijo abajo a la derecha */}
        <TouchableOpacity
          style={styles.configButton}
          onPress={() => router.push('/(tabs)/configuracion')}
        >
          <Ionicons name="settings-outline" size={24} color="#1976d2" />
        </TouchableOpacity>

      </SafeAreaView>
    </View>
  );
}


const styles = StyleSheet.create({
    loader: {
    flex: 1, justifyContent: 'center', alignItems: 'center'
  },
  container: {
    flex: 1,
    backgroundColor: '#f3f4f6',
  },
  content: {
    flex: 1,
    flexDirection: 'column',
  },
  sidePanel: {
    backgroundColor: '#f3f4f6',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  mainPanel: {
    flex: 1,
    backgroundColor: '#f3f4f6',
    paddingTop: 16,
  },  userInfo: {
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    elevation: 3,
    // Shadow for iOS and Web
    boxShadow: '0 2px 4px rgba(0, 0, 0, 0.1)',
  },
  welcomeText: {
    fontSize: 14,
    color: '#718096',
    marginBottom: 4,
  },
  userName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#2e78b7',
    marginBottom: 2,
    textAlign: 'center',
  },
  userRole: {
    fontSize: 14,
    color: '#4a5568',
    fontWeight: '500',
  },
  scrollView: {
    flex: 1,
  },
  menuGrid: {
    padding: 10,
  },
  menuRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 10,
  },  menuItem: {
    width: '48%',
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    elevation: 3,
    // Shadow for iOS and Web
    boxShadow: '0 2px 4px rgba(0, 0, 0, 0.1)',
  },
  menuText: {
    marginTop: 8,
    textAlign: 'center',
    fontSize: 14,
    fontWeight: '500',
    color: '#4a5568',
  },
  notAuthText: {
    fontSize: 16,
    color: '#e53e3e',
    textAlign: 'center',
    marginVertical: 12,
    fontWeight: '500',
  },
  addButton: {
    position: 'absolute',
    bottom: 86,
    right: 20,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#e3eafc',
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
  },
  configButton: {
    position: 'absolute',
    bottom: 20,
    right: 20,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#e3eafc',
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
  },
});
