// app/almacen/index.tsx
import Ionicons from '@expo/vector-icons/Ionicons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
    ActivityIndicator,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

type IconName = React.ComponentProps<typeof Ionicons>['name'];

interface MenuItem {
  id: number;
  title: string;
  icon: IconName;
  route: string;
}

const menuItems: MenuItem[] = [
  { id: 1, title: 'Inicio / Atras',               icon: 'home-outline',          route: '/'                        },
  { id: 2, title: 'Gestión de Artículos', icon: 'cube-outline',          route: '/almacen/Articulos'      },
  { id: 3, title: 'Categorías y Grupos',  icon: 'grid-outline',          route: '/almacen/Categorias'     },
  { id: 4, title: 'Ubicaciones',          icon: 'location-outline',      route: '/almacen/Ubicaciones'    },
  { id: 5, title: 'Entradas de Almacén',  icon: 'download-outline',      route: '/almacen/Entradas'       },
  { id: 6, title: 'Salidas y Despacho',   icon: 'exit-outline',          route: '/almacen/Salidas'        },
  { id: 7, title: 'Transferencias Internas', icon: 'swap-horizontal-outline', route: '/almacen/Transferencias' },
  { id: 8, title: 'Ajustes de Inventario',  icon: 'construct-outline',   route: '/almacen/Ajustes'        },
  { id: 9, title: 'Reportes y Analítica',   icon: 'stats-chart-outline', route: '/almacen/Reportes'       },
  { id: 10, title: 'Configuración',         icon: 'settings-outline',    route: '/almacen/Configuracion'  },
];

export default function Dashboard() {
  const router = useRouter();
  const [userRole, setUserRole] = useState<string | null>(null);
  const [userData, setUserData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // Leer userData y rol desde AsyncStorage
  useEffect(() => {
    AsyncStorage.getItem('userData')
      .then(raw => {
        if (raw) {
          const u = JSON.parse(raw);
          setUserData(u);
          setUserRole(u.rol || u.role || null);
        }
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <View style={styles.loader}>
        <ActivityIndicator size="large" color="#2e78b7" />
      </View>
    );
  }

  // Bloquea acceso si no es rol admin/developer/administrador
  if (!['admin','developer','administrador'].includes(userRole || '')) {
    return (
      <View style={styles.center}>
        <Text style={styles.errorText}>
          No tiene credenciales para ver esta sección
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <SafeAreaView style={styles.content}>
        {/* Panel superior con información del usuario */}
        <View style={styles.sidePanel}>
          {userData ? (
            <View style={styles.userInfo}>
              <Text style={styles.welcomeText}>Almacen</Text>
              <Text style={styles.userName}>
                {userData.nombre || userData.name || 'Sin nombre'}
              </Text>
              <Text style={styles.userRole}>
                {userData.rol || userData.role || 'Sin rol'}
              </Text>
            </View>
          ) : (
            <Text style={styles.notAuthText}>No hay datos de usuario.</Text>
          )}
        </View>

        {/* Grid de opciones */}
        <ScrollView style={styles.scrollView}>
          <View style={styles.menuGrid}>
            {Array.from({ length: Math.ceil(menuItems.length / 2) }).map((_, rowIndex) => (
              <View key={rowIndex} style={styles.menuRow}>
                {menuItems
                  .slice(rowIndex * 2, rowIndex * 2 + 2)
                  .map(item => (
                    <TouchableOpacity
                      key={item.id}
                      style={styles.menuItem}
                      onPress={() => router.push(item.route)}
                    >
                      <Ionicons name={item.icon} size={32} color="#2e78b7" />
                      <Text style={styles.menuText}>{item.title}</Text>
                    </TouchableOpacity>
                  ))}
              </View>
            ))}
          </View>
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  loader: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center'
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16
  },
  errorText: {
    fontSize: 16,
    color: '#e53e3e',
    textAlign: 'center',
    fontWeight: '500'
  },
  container: {
    flex: 1,
    backgroundColor: '#f3f4f6'
  },
  content: {
    flex: 1,
    paddingTop: 16
  },
  sidePanel: {
    backgroundColor: '#fff',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb'
  },
  userInfo: {
    alignItems: 'center'
  },
  welcomeText: {
    fontSize: 14,
    color: '#718096',
    marginBottom: 4
  },
  userName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#2e78b7',
    marginBottom: 2,
    textAlign: 'center'
  },
  userRole: {
    fontSize: 14,
    color: '#4a5568',
    fontWeight: '500'
  },
  notAuthText: {
    fontSize: 16,
    color: '#e53e3e',
    textAlign: 'center',
    marginVertical: 12,
    fontWeight: '500'
  },
  scrollView: {
    flex: 1
  },
  menuGrid: {
    paddingHorizontal: 10,
    paddingTop: 10
  },
  menuRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12
  },
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
    shadowRadius: 4
  },
  menuText: {
    marginTop: 8,
    textAlign: 'center',
    fontSize: 14,
    fontWeight: '500',
    color: '#4a5568'
  }
});
