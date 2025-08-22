// app/index.tsx
import Ionicons from '@expo/vector-icons/Ionicons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '../../hooks/useAuth';

import AppHeader from '../../components/AppHeader';
import ModalHeader from '../../components/ModalHeader';

type IconName = React.ComponentProps<typeof Ionicons>['name'];
type RouteNames = string;

interface MenuItem {
  id: number;
  title: string;
  icon: IconName;
  route: RouteNames;
}

const menuItems: MenuItem[] = [
   { id: 10, title: 'Atras', icon: 'arrow-back-outline', route: '/' },
  { id: 1, title: 'Asignación Vehículo–Chofer', icon: 'swap-horizontal-outline', route: '/logistica/asignacion-vehiculo' },
  { id: 2, title: 'Optimización de Carga', icon: 'cube-outline', route: '/logistica/optimizacion-carga' },
  { id: 3, title: 'Planificación de Rutas', icon: 'map-outline', route: '/logistica/planificacion-rutas' },
  { id: 4, title: 'Despacho y Salidas', icon: 'send-outline', route: '/logistica/despacho-salidas' },
  { id: 5, title: 'Seguimiento en Tiempo Real', icon: 'locate-outline', route: '/logistica/seguimiento' },
  { id: 6, title: 'Integración y Gestión', icon: 'list-outline', route: '/logistica/integracion-gestion' },
  { id: 7, title: 'Incidencias y Reentregas', icon: 'alert-circle-outline', route: '/logistica/incidencias' },
  { id: 8, title: 'Catálogo de Vehículos', icon: 'car-outline', route: '/logistica/vehiculos' },
  { id: 9, title: 'Conductores', icon: 'person-outline', route: '/logistica/conductores' },
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

  useEffect(() => {
    if (!authLoading && !authenticated) {
      router.replace('/login');
    }
  }, [authenticated, authLoading, router]);

  useEffect(() => {
    (async () => {
      try {
        const storedToken = await AsyncStorage.getItem('token');
        const rawUser = await AsyncStorage.getItem('userData');
        if (storedToken) setToken(storedToken);
        if (rawUser) {
          const parsedUser = JSON.parse(rawUser);
          if (parsedUser) {
            setUserData({
              id: parsedUser.id || 0,
              nombre: parsedUser.nombre || parsedUser.name || '',
              rol: parsedUser.rol || parsedUser.role || '',
            });
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
          titleOverride="Panel Logística"
          userNameProp={userData?.nombre || '—'}
          roleProp={userData?.rol || '—'}
          serverReachableOverride={!!authenticated}
          onUserPress={({ userName, role }) => {
            setModalUser({ userName, role });
            setModalVisible(true);
          }}
        />
        <ModalHeader
          visible={modalVisible}
          onClose={() => setModalVisible(false)}
          userName={userData?.nombre || '—'}
          role={userData?.rol || '—'}
        />
        <View style={styles.mainPanel}>
          <ScrollView style={styles.scrollView}>
            <View style={styles.menuGrid}>
              {Array.from({ length: Math.ceil(menuItems.length / 2) }).map((_, rowIndex) => (
                <View key={rowIndex} style={styles.menuRow}>
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
  loader: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  container: { flex: 1, backgroundColor: '#f3f4f6' },
  content: { flex: 1, flexDirection: 'column' },
  mainPanel: { flex: 1, backgroundColor: '#f3f4f6', paddingTop: 16 },
  scrollView: { flex: 1 },
  menuGrid: { padding: 10 },
  menuRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 10 },
  menuItem: {
    width: '48%',
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  menuText: { marginTop: 8, textAlign: 'center', fontSize: 14, fontWeight: '500', color: '#4a5568' },
});
