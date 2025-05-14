import { StyleSheet, Text, View, ScrollView, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import Ionicons from '@expo/vector-icons/Ionicons';

export default function HomeScreen() {
  const router = useRouter();

  // Definir el tipo para los nombres de los iconos para evitar errores de tipado
  type IconName = React.ComponentProps<typeof Ionicons>['name'];

  const menuItems = [
    { id: 1, title: 'Control de Pedidos', icon: 'clipboard-outline' as IconName, route: 'control-pedidos' },
    { id: 2, title: 'Control de Pedidos Auxiliares', icon: 'copy-outline' as IconName, route: 'control-pedidos' },
    { id: 3, title: 'Control de Entregas', icon: 'cube-outline' as IconName, route: 'control-entregas' },
    { id: 4, title: 'Control de Incidencias', icon: 'alert-circle-outline' as IconName, route: 'control-incidencias' },
    { id: 5, title: 'Control de Producción', icon: 'build-outline' as IconName, route: 'control-pedidos' },
    { id: 6, title: 'Pedidos por Comercial', icon: 'person-outline' as IconName, route: 'control-pedidos' },
    { id: 7, title: 'Pedidos a Proveedores', icon: 'cart-outline' as IconName, route: 'control-pedidos' },
    { id: 8, title: 'Pedidos a Felman - Aluminio', icon: 'grid-outline' as IconName, route: 'control-pedidos' },
    { id: 9, title: 'Pedidos a Felman - Vidrio', icon: 'prism-outline' as IconName, route: 'control-pedidos' },
    { id: 10, title: 'Ensayos Calidad PVC', icon: 'checkmark-circle-outline' as IconName, route: 'control-pedidos' },
    { id: 11, title: 'Informe de Vidrios', icon: 'document-text-outline' as IconName, route: 'control-pedidos' },
    { id: 12, title: 'Clientes', icon: 'people-outline' as IconName, route: 'control-pedidos' },
  ];

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>App Felman</Text>
      </View>

      <ScrollView style={styles.scrollView}>
        <View style={styles.menuGrid}>
          {menuItems.map((item) => (
            <TouchableOpacity
              key={item.id}
              style={styles.menuItem}
              onPress={() => router.push(item.route)}>
              <Ionicons name={item.icon} size={32} color="#2e78b7" />
              <Text style={styles.menuText}>{item.title}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    padding: 16,
    backgroundColor: '#2e78b7',
    alignItems: 'center',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: 'white',
  },
  scrollView: {
    flex: 1,
  },
  menuGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    padding: 10,
    justifyContent: 'space-between',
  },
  menuItem: {
    width: '48%',
    backgroundColor: 'white',
    padding: 16,
    margin: 4,
    borderRadius: 8,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
    elevation: 2,
  },
  menuText: {
    marginTop: 8,
    textAlign: 'center',
    fontSize: 14,
    fontWeight: '500',
  },
});
