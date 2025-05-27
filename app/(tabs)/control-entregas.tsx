import Ionicons from '@expo/vector-icons/Ionicons';
import { useEffect, useState } from 'react';
import { FlatList, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

// Definir tipo para los pedidos
interface Pedido {
  NºPedido: string; // NºPedido
  EstadoPedido: string;
  Incidencia: string | null;
  Compromiso: string | null;
}

// Componente para mostrar cada pedido
const PedidoItem = ({ item }: { item: Pedido }) => {
  // Elegir color de estado según el valor, pero siempre gris oscuro
  let estadoColor = '#333';
  if (item.EstadoPedido) {
    if (item.EstadoPedido.toLowerCase().includes('pendiente')) estadoColor = '#6b7280'; // gris medio
    else if (item.EstadoPedido.toLowerCase().includes('entregado')) estadoColor = '#374151'; // gris oscuro
    else if (item.EstadoPedido.toLowerCase().includes('incidencia')) estadoColor = '#4b5563'; // gris
  }
  // Mostrar solo la fecha 2025-06-01 en Compromiso
  const compromisoSoloFecha = '2025-06-01';
  return (
    <View style={styles.pedidoItem}>
      <Text style={styles.pedidoNumero}>NºPedido: {item.NºPedido}</Text>
      <Text style={[styles.statusText, { color: estadoColor }]}>EstadoPedido: {item.EstadoPedido}</Text>
      <Text style={styles.fechaText}>Compromiso: 2025-06-01</Text>
      <Text style={styles.clienteText}>Incidencia: {item.Incidencia || '-'}</Text>
    </View>
  );
};

export default function ControlUsuariosScreen() {
  const [data, setData] = useState<Pedido[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(0);
  const [loading, setLoading] = useState(true);
  const pageSize = 50;

  useEffect(() => {
    const fetchPedidos = async () => {
      try {
        const apiUrl = process.env.EXPO_PUBLIC_API_URL;
        if (!apiUrl) throw new Error('EXPO_PUBLIC_API_URL no definida');
        const res = await fetch(`${apiUrl}/control-access/formularioControlPedido`);
        const result = await res.json();
        
        setData(Array.isArray(result) ? result : []);
        setCurrentPage(0);
      } catch (error) {
        console.error('Error al obtener pedidos:', error);
        setData([]);
        setCurrentPage(0);
      } finally {
        setLoading(false);
      }
    };
    fetchPedidos();
  }, []);

  // Filtrar, ordenar y paginar en el render, no en useEffect
  const filtered = searchQuery.trim() === ''
    ? data
    : data.filter(p =>
        typeof p.NºPedido === 'string' &&
        p.NºPedido.toLowerCase().includes(searchQuery.toLowerCase())
      );
  // Ordenar por Compromiso de mayor a menor (descendente)
  const sorted = [...filtered].sort((a, b) => {
    // Si ambos tienen compromiso, comparar como fechas
    if (a.Compromiso && b.Compromiso) {
      return new Date(b.Compromiso).getTime() - new Date(a.Compromiso).getTime();
    }
    // Si solo uno tiene compromiso, ese va primero
    if (a.Compromiso) return -1;
    if (b.Compromiso) return 1;
    return 0;
  });
  const displayedPedidos = sorted.slice(0, (currentPage + 1) * pageSize);

  const handleEndReached = () => {
    if (displayedPedidos.length < filtered.length) {
      setCurrentPage(prev => prev + 1);
    }
  };

  useEffect(() => {
    setCurrentPage(0);
  }, [searchQuery]);

  return (
    <View style={{ flex: 1 }}>
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>Control de Entregas</Text>
        </View>
        <View style={styles.searchContainer}>
          <Ionicons name="search-outline" size={20} color="#757575" style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder="Buscar por NºPedido..."
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
        </View>
        {loading ? (
          <Text style={{ textAlign: 'center', marginTop: 20 }}>Cargando...</Text>
        ) : (
          <FlatList
            data={displayedPedidos}
            renderItem={({ item, index }) => <PedidoItem item={item} />}
            keyExtractor={(item, idx) => {
              // Usar NPedido si existe y es string, si no, usar el índice
              const key = typeof item.NºPedido === 'string' && item.NºPedido.trim() !== '' ? item.NºPedido : `row-${idx}`;
              return key;
            }}
            contentContainerStyle={styles.listContainer}
            keyboardShouldPersistTaps="handled"
            initialNumToRender={20}
            maxToRenderPerBatch={20}
            windowSize={21}
            onEndReached={handleEndReached}
            onEndReachedThreshold={0.2}
            ListFooterComponent={
              displayedPedidos.length < filtered.length && !loading ? (
                <Text style={{ textAlign: 'center', padding: 12, color: '#2e78b7' }}>Cargando más...</Text>
              ) : null
            }
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
    color: '#222', // gris muy oscuro
  },
  statusText: {
    fontSize: 14,
    fontWeight: '600',
    // color dinámico según estado
    marginBottom: 4,
  },
  clienteText: {
    fontSize: 15,
    marginBottom: 2,
    color: '#444', // gris oscuro
  },
  fechaText: {
    fontSize: 14,
    color: '#555', // gris oscuro
    marginBottom: 0,
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