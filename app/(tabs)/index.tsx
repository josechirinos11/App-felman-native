import Ionicons from '@expo/vector-icons/Ionicons';
import { useRouter } from 'expo-router';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '../../hooks/useAuth';

export default function HomeScreen() {
  const router = useRouter();
  const { usuario } = useAuth();

  // Definir el tipo para los nombres de los iconos para evitar errores de tipado
  type IconName = React.ComponentProps<typeof Ionicons>['name'];
  
  type RouteNames = '/control-pedidos' | '/control-entregas' | '/control-incidencias';

  interface MenuItem {
    id: number;
    title: string;
    icon: IconName;
    route: RouteNames;
  }

  const menuItems: MenuItem[] = [
    { id: 1, title: 'Control de Pedidos', icon: 'clipboard-outline', route: '/control-pedidos' },
    { id: 2, title: 'Control de Entregas', icon: 'cube-outline', route: '/control-entregas' },
    { id: 3, title: 'Control de Incidencias', icon: 'alert-circle-outline', route: '/control-incidencias' },
    { id: 4, title: 'Control de Producción', icon: 'build-outline', route: '/control-pedidos' },
    { id: 5, title: 'Pedidos Comerciales', icon: 'person-outline', route: '/control-pedidos' },
    { id: 6, title: 'Pedidos Proveedores', icon: 'cart-outline', route: '/control-pedidos' },
  ];

  return (
    <View style={styles.container}>
      <SafeAreaView style={styles.content}>
        {/* Panel superior con información del usuario */}
        <View style={styles.sidePanel}>
          {usuario && (
            <View style={styles.userInfo}>
              <Text style={styles.welcomeText}>Bienvenido,</Text>
              <Text style={styles.userName}>{usuario.nombre}</Text>
              <Text style={styles.userRole}>{usuario.rol}</Text>
            </View>
          )}
        </View>

        {/* Panel principal con menú */}
        <View style={styles.mainPanel}>
          <ScrollView style={styles.scrollView}>
            {/* Grid de menú */}
            <View style={styles.menuGrid}>
              {Array.from({ length: Math.ceil(menuItems.length / 2) }).map((_, rowIndex) => (
                <View key={rowIndex} style={styles.menuRow}>
                  {menuItems.slice(rowIndex * 2, rowIndex * 2 + 2).map((item) => (
                    <TouchableOpacity
                      key={item.id}
                      style={styles.menuItem}
                      onPress={() => router.push(item.route)}>
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
  },
  userInfo: {
    backgroundColor: '#f3f4f6',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 4, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
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
  },
  menuItem: {
    width: '48%',
    backgroundColor: '#f3f4f6',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 5, height: 5 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 5,
  },
  menuText: {
    marginTop: 8,
    textAlign: 'center',
    fontSize: 14,
    fontWeight: '500',
    color: '#4a5568',
  },
});
