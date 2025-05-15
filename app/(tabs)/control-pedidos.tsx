import Ionicons from '@expo/vector-icons/Ionicons';
import { useState } from 'react';
import { FlatList, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

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
    <View style={{ flex: 1 }}>
      
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