import Ionicons from '@expo/vector-icons/Ionicons';
import { useEffect, useState } from 'react';
import { FlatList, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

// Definir tipo para los presupuestos
interface Presupuesto {
  Presupuesto_No: string;
}

// Componente para mostrar cada presupuesto
const PresupuestoItem = ({ item }: { item: Presupuesto }) => (
  <View style={styles.pedidoItem}>
    <Text style={styles.pedidoNumero}>{item.Presupuesto_No}</Text>
  </View>
);

export default function ControlUsuariosScreen() {
  const [searchQuery, setSearchQuery] = useState('');
  const [presupuestos, setPresupuestos] = useState<Presupuesto[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchPresupuestos = async () => {
      try {
        const apiUrl = process.env.EXPO_PUBLIC_API_URL;
        if (!apiUrl) throw new Error('EXPO_PUBLIC_API_URL no definida');
        const res = await fetch(`${apiUrl}/control-pedido/inicio`);
        const data = await res.json();
        setPresupuestos(data);
      } catch (error) {
        console.error('Error al obtener presupuestos:', error);
        setPresupuestos([]);
      } finally {
        setLoading(false);
      }
    };
    fetchPresupuestos();
  }, []);

  // Filtrar presupuestos por búsqueda
  const filteredPresupuestos = presupuestos.filter(p =>
    typeof p.Presupuesto_No === 'string' &&
    p.Presupuesto_No.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <View style={{ flex: 1 }}>
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>Control de Pedidos</Text>
        </View>
        <View style={styles.searchContainer}>
          <Ionicons name="search-outline" size={20} color="#757575" style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder="Buscar por Presupuesto_No..."
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
        </View>
        {loading ? (
          <Text style={{ textAlign: 'center', marginTop: 20 }}>Cargando...</Text>
        ) : (
          <FlatList
            data={filteredPresupuestos}
            renderItem={({ item }) => <PresupuestoItem item={item} />}
            keyExtractor={(item, idx) => item.Presupuesto_No + idx}
            contentContainerStyle={styles.listContainer}
            keyboardShouldPersistTaps="handled"
            initialNumToRender={20}
            maxToRenderPerBatch={20}
            windowSize={21}
          />
        )}
        <TouchableOpacity style={styles.fab}>
          <Ionicons name="add" size={24} color="#2e78b7" />
        </TouchableOpacity>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f3f4f6',
  },
  header: {
    padding: 16,
    backgroundColor: '#f3f4f6',
    alignItems: 'center',
    marginBottom: 10,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#2e78b7',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f3f4f6',
    margin: 16,
    borderRadius: 12,
    paddingHorizontal: 15,
    paddingVertical: 5,
    shadowColor: '#000',
    shadowOffset: { width: 5, height: 5 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 5,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    height: 50,
    color: '#2e78b7',
  },
  listContainer: {
    padding: 16,
  },
  pedidoItem: {
    backgroundColor: '#f3f4f6',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 5, height: 5 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 5,
  },
  pedidoHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  pedidoNumero: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#2e78b7',
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
  },
  statusText: {
    color: 'white',
    fontSize: 12,
    fontWeight: '600',
  },
  clienteText: {
    fontSize: 16,
    marginBottom: 4,
    color: '#4a5568',
  },
  fechaText: {
    fontSize: 14,
    color: '#718096',
    marginBottom: 12,
  },
  actionsContainer: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
  },
  actionButton: {
    padding: 10,
    marginLeft: 8,
    backgroundColor: '#f3f4f6',
    borderRadius: 10,
    shadowColor: '#000',
    shadowOffset: { width: 3, height: 3 },
    shadowOpacity: 0.1,
    shadowRadius: 5,
    elevation: 3,
  },
  fab: {
    position: 'absolute',
    right: 20,
    bottom: 20,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#f3f4f6',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 5, height: 5 },
    shadowOpacity: 0.2,
    shadowRadius: 10,
    elevation: 8,
  },
});