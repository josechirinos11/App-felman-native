// app/index.tsx
import Ionicons from '@expo/vector-icons/Ionicons';
import { useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAuth } from '../../hooks/useAuth';


import AppHeader from '../../components/AppHeader';
import ModalHeader from '../../components/ModalHeader';



type IconName = React.ComponentProps<typeof Ionicons>['name'];
type RouteNames = '/gestion-articulos' | '/categorioa-Grupos' | '/ubicaciones' | '/entradas-almacen' | '/salida-pespacho' | '/tranferencias-internas' | '/ajustes-inventarios' | '/reportes-analitica' | string;

interface MenuItem {
  id: number;
  title: string;
  icon: IconName;
  route: RouteNames;
}


const menuItems: MenuItem[] = [
  { id: 1, title: 'Atrás',                 icon: 'arrow-back-outline',        route: '/' },
  { id: 2, title: 'Gestión de Artículos',  icon: 'clipboard-outline',         route: '/almacen/Articulos' },
  { id: 3, title: 'Categorías y Grupos',   icon: 'cube-outline',              route: '/almacen/Categorias' },
  { id: 4, title: 'Ubicaciones',           icon: 'barcode-outline',           route: '/almacen/Ubicaciones' },
  { id: 5, title: 'Entradas de Almacén',   icon: 'document-text-outline',     route: '/almacen/Entradas' },
  { id: 6, title: 'Salidas y Despacho',    icon: 'list-outline',              route: '/almacen/Salidas' },
  { id: 7, title: 'Transferencias Internas', icon: 'swap-horizontal-outline', route: '/almacen/Transferencias' },
  { id: 8, title: 'Ajustes de Inventario', icon: 'construct-outline',         route: '/almacen/Ajustes' },
  { id: 9, title: 'Reportes y Analítica',  icon: 'stats-chart-outline',       route: '/almacen/Reportes' },
   { id: 10, title: 'Configuraciones',  icon: 'construct-outline',       route: '/almacen/Configuracion' },
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
  const { authenticated, loading: authLoading } = useAuth();
  const router = useRouter();


  
    const [modalVisible, setModalVisible] = React.useState(false);
    const [modalUser, setModalUser] = React.useState({ userName: '', role: '' });

  // Verificar autenticación al cargar
  useEffect(() => {
    if (!authLoading && !authenticated) {
      console.log('🚫 Usuario no autenticado, redirigiendo a login...');
      router.replace('/login');
    }
  }, [authenticated, authLoading, router]);


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

        <AppHeader
        titleOverride="Panel Almacen"
          // ...otras props si aplican...
          userNameProp={userData?.nombre || userData?.name || '—'}
          roleProp={userData?.rol || userData?.role || '—'}
          serverReachableOverride={!!authenticated}   // o tu booleano real de salud del servidor
          onUserPress={({ userName, role }) => {
            setModalUser({ userName, role });
            setModalVisible(true);
          }}
        />

        <ModalHeader
          visible={modalVisible}
          onClose={() => setModalVisible(false)}
          userName={userData?.nombre || userData?.name || '—'}
          role={userData?.rol || userData?.role || '—'}
        />

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
                      <Text style={styles.menuText}>{item.title}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              ))}
            </View>
          </ScrollView>
        </View>

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
    // Shadow for iOS
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
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
    // Shadow for iOS
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
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
});
