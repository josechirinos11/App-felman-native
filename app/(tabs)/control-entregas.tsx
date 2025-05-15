import Ionicons from '@expo/vector-icons/Ionicons';
import { useState } from 'react';
import { FlatList, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

// Definir tipo para las entregas
type Entrega = {
  id: string;
  pedido: string;
  cliente: string;
  direccion: string;
  fecha: string;
  estado: 'Pendiente' | 'En ruta' | 'Entregado';
};

// Datos de ejemplo
const ENTREGAS_EJEMPLO: Entrega[] = [
  { id: '1', pedido: 'P001', cliente: 'María López', direccion: 'Calle Principal 123', fecha: '15/05/2023', estado: 'Pendiente' },
  { id: '2', pedido: 'P002', cliente: 'Juan Rodríguez', direccion: 'Avenida Central 456', fecha: '16/05/2023', estado: 'En ruta' },
  { id: '3', pedido: 'P003', cliente: 'Carlos Sánchez', direccion: 'Plaza Mayor 789', fecha: '18/05/2023', estado: 'Entregado' },
  { id: '4', pedido: 'P004', cliente: 'Ana Martínez', direccion: 'Calle Norte 234', fecha: '20/05/2023', estado: 'Pendiente' },
  { id: '5', pedido: 'P005', cliente: 'Pedro Gómez', direccion: 'Avenida Sur 567', fecha: '22/05/2023', estado: 'En ruta' },
  { id: '6', pedido: 'P006', cliente: 'Laura Díaz', direccion: 'Calle Oeste 890', fecha: '25/05/2023', estado: 'Entregado' },
];

// Componente para mostrar cada entrega
const EntregaItem = ({ item }: { item: Entrega }) => {
  // Color según el estado de la entrega
  const getStatusColor = (status: Entrega['estado']) => {
    switch (status) {
      case 'Pendiente':
        return '#ffc107';
      case 'En ruta':
        return '#2196f3';
      case 'Entregado':
        return '#4caf50';
      default:
        return '#757575';
    }
  };

  return (
    <View style={styles.entregaItem}>
      <View style={styles.entregaHeader}>
        <Text style={styles.pedidoNumero}>Pedido #{item.pedido}</Text>
        <View style={[styles.statusBadge, { backgroundColor: getStatusColor(item.estado) }]}>
          <Text style={styles.statusText}>{item.estado}</Text>
        </View>
      </View>
      <Text style={styles.clienteText}>{item.cliente}</Text>
      <Text style={styles.direccionText}>{item.direccion}</Text>
      <Text style={styles.fechaText}>Fecha programada: {item.fecha}</Text>
      <View style={styles.actionsContainer}>
        <TouchableOpacity style={styles.actionButton}>
          <Ionicons name="location-outline" size={20} color="#2e78b7" />
        </TouchableOpacity>
        <TouchableOpacity style={styles.actionButton}>
          <Ionicons name="checkmark-circle-outline" size={20} color="#2e78b7" />
        </TouchableOpacity>
      </View>
    </View>
  );
};

export default function ControlEntregasScreen() {
  const [searchQuery, setSearchQuery] = useState('');
  const [entregas, setEntregas] = useState<Entrega[]>(ENTREGAS_EJEMPLO);

  // Filtrar entregas basado en la búsqueda
  const filteredEntregas = entregas.filter(
    (entrega) =>
      entrega.pedido.toLowerCase().includes(searchQuery.toLowerCase()) ||
      entrega.cliente.toLowerCase().includes(searchQuery.toLowerCase()) ||
      entrega.direccion.toLowerCase().includes(searchQuery.toLowerCase())
  );

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
            placeholder="Buscar por pedido, cliente o dirección..."
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
        </View>

        <View style={styles.filterContainer}>
          <TouchableOpacity style={[styles.filterButton, styles.filterActive]}>
            <Text style={styles.filterActiveText}>Todos</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.filterButton}>
            <Text style={styles.filterText}>Pendientes</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.filterButton}>
            <Text style={styles.filterText}>En ruta</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.filterButton}>
            <Text style={styles.filterText}>Entregados</Text>
          </TouchableOpacity>
        </View>

        <FlatList
          data={filteredEntregas}
          renderItem={({ item }) => <EntregaItem item={item} />}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContainer}
        />
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
    marginBottom: 8,
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
  filterContainer: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    marginBottom: 16,
  },
  filterButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    marginRight: 8,
    borderRadius: 10,
    backgroundColor: '#f3f4f6',
    shadowColor: '#000',
    shadowOffset: { width: 3, height: 3 },
    shadowOpacity: 0.1,
    shadowRadius: 5,
    elevation: 3,
  },
  filterActive: {
    backgroundColor: '#2e78b7',
  },
  filterText: {
    color: '#718096',
    fontSize: 14,
    fontWeight: '500',
  },
  filterActiveText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
  },
  listContainer: {
    padding: 16,
  },
  entregaItem: {
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
  entregaHeader: {
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
  direccionText: {
    fontSize: 14,
    color: '#4a5568',
    marginBottom: 4,
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
});