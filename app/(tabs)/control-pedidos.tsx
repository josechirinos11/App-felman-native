import { useState } from 'react';
import { StyleSheet, Text, View, FlatList, TextInput, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Ionicons from '@expo/vector-icons/Ionicons';

// Definir tipo para los pedidos
type Pedido = {
  id: string;
  numero: string;
  cliente: string;
  fecha: string;
  estado: 'Pendiente' | 'En proceso' | 'Completado';
};

// Datos de ejemplo para los pedidos
const PEDIDOS_EJEMPLO: Pedido[] = [
  { id: '1', numero: 'P001', cliente: 'María López', fecha: '10/05/2023', estado: 'Pendiente' },
  { id: '2', numero: 'P002', cliente: 'Juan Rodríguez', fecha: '12/05/2023', estado: 'En proceso' },
  { id: '3', numero: 'P003', cliente: 'Carlos Sánchez', fecha: '15/05/2023', estado: 'Completado' },
  { id: '4', numero: 'P004', cliente: 'Ana Martínez', fecha: '18/05/2023', estado: 'Pendiente' },
  { id: '5', numero: 'P005', cliente: 'Pedro Gómez', fecha: '20/05/2023', estado: 'En proceso' },
  { id: '6', numero: 'P006', cliente: 'Laura Díaz', fecha: '22/05/2023', estado: 'Completado' },
  { id: '7', numero: 'P007', cliente: 'Javier Pérez', fecha: '25/05/2023', estado: 'Pendiente' },
  { id: '8', numero: 'P008', cliente: 'Sofía Ruiz', fecha: '28/05/2023', estado: 'En proceso' },
];

// Componente para mostrar cada item de pedido
const PedidoItem = ({ item }: { item: Pedido }) => {
  // Color según el estado del pedido
  const getStatusColor = (status: Pedido['estado']) => {
    switch (status) {
      case 'Pendiente':
        return '#ffc107';
      case 'En proceso':
        return '#2196f3';
      case 'Completado':
        return '#4caf50';
      default:
        return '#757575';
    }
  };

  return (
    <View style={styles.pedidoItem}>
      <View style={styles.pedidoHeader}>
        <Text style={styles.pedidoNumero}>#{item.numero}</Text>
        <View style={[styles.statusBadge, { backgroundColor: getStatusColor(item.estado) }]}>
          <Text style={styles.statusText}>{item.estado}</Text>
        </View>
      </View>
      <Text style={styles.clienteText}>{item.cliente}</Text>
      <Text style={styles.fechaText}>Fecha: {item.fecha}</Text>
      <View style={styles.actionsContainer}>
        <TouchableOpacity style={styles.actionButton}>
          <Ionicons name="eye-outline" size={20} color="#2e78b7" />
        </TouchableOpacity>
        <TouchableOpacity style={styles.actionButton}>
          <Ionicons name="pencil-outline" size={20} color="#2e78b7" />
        </TouchableOpacity>
      </View>
    </View>
  );
};

export default function ControlPedidosScreen() {
  const [searchQuery, setSearchQuery] = useState('');
  const [pedidos, setPedidos] = useState<Pedido[]>(PEDIDOS_EJEMPLO);

  // Filtrar pedidos basado en la búsqueda
  const filteredPedidos = pedidos.filter(
    (pedido) =>
      pedido.numero.toLowerCase().includes(searchQuery.toLowerCase()) ||
      pedido.cliente.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Control de Pedidos</Text>
      </View>

      <View style={styles.searchContainer}>
        <Ionicons name="search-outline" size={20} color="#757575" style={styles.searchIcon} />
        <TextInput
          style={styles.searchInput}
          placeholder="Buscar por número o cliente..."
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
      </View>

      <FlatList
        data={filteredPedidos}
        renderItem={({ item }) => <PedidoItem item={item} />}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContainer}
      />

      <TouchableOpacity style={styles.fab}>
        <Ionicons name="add" size={24} color="white" />
      </TouchableOpacity>
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
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'white',
    margin: 16,
    borderRadius: 8,
    paddingHorizontal: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 1,
    elevation: 1,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    height: 50,
  },
  listContainer: {
    padding: 16,
  },
  pedidoItem: {
    backgroundColor: 'white',
    borderRadius: 8,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
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
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  statusText: {
    color: 'white',
    fontSize: 12,
    fontWeight: '500',
  },
  clienteText: {
    fontSize: 16,
    marginBottom: 4,
  },
  fechaText: {
    fontSize: 14,
    color: '#757575',
    marginBottom: 12,
  },
  actionsContainer: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
  },
  actionButton: {
    padding: 8,
    marginLeft: 8,
  },
  fab: {
    position: 'absolute',
    right: 20,
    bottom: 20,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#2e78b7',
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 3,
  },
}); 