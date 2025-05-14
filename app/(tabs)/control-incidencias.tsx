import { useState } from 'react';
import { StyleSheet, Text, View, FlatList, TouchableOpacity, TextInput } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Ionicons from '@expo/vector-icons/Ionicons';

// Definir tipo para las incidencias
type Incidencia = {
  id: string;
  titulo: string;
  pedido: string;
  cliente: string;
  descripcion: string;
  fecha: string;
  prioridad: 'Alta' | 'Media' | 'Baja';
  estado: 'Abierta' | 'En proceso' | 'Resuelta';
};

// Datos de ejemplo
const INCIDENCIAS_EJEMPLO: Incidencia[] = [
  { 
    id: '1', 
    titulo: 'Producto dañado', 
    pedido: 'P001', 
    cliente: 'María López', 
    descripcion: 'El cliente reporta que el producto llegó con daños en el empaque.',
    fecha: '12/05/2023', 
    prioridad: 'Alta',
    estado: 'Abierta' 
  },
  { 
    id: '2', 
    titulo: 'Entrega incorrecta', 
    pedido: 'P002', 
    cliente: 'Juan Rodríguez', 
    descripcion: 'Se entregó un producto diferente al solicitado por el cliente.',
    fecha: '14/05/2023', 
    prioridad: 'Alta',
    estado: 'En proceso' 
  },
  { 
    id: '3', 
    titulo: 'Retraso en entrega', 
    pedido: 'P003', 
    cliente: 'Carlos Sánchez', 
    descripcion: 'El pedido se entregó con 2 días de retraso.',
    fecha: '16/05/2023', 
    prioridad: 'Media',
    estado: 'Resuelta' 
  },
  { 
    id: '4', 
    titulo: 'Falta documentación', 
    pedido: 'P004', 
    cliente: 'Ana Martínez', 
    descripcion: 'No se adjuntó la factura con el pedido.',
    fecha: '18/05/2023', 
    prioridad: 'Baja',
    estado: 'Abierta' 
  },
  { 
    id: '5', 
    titulo: 'Material incorrecto', 
    pedido: 'P005', 
    cliente: 'Pedro Gómez', 
    descripcion: 'El material del producto no corresponde con lo especificado.',
    fecha: '20/05/2023', 
    prioridad: 'Media',
    estado: 'En proceso' 
  },
];

// Componente para mostrar cada incidencia
const IncidenciaItem = ({ item }: { item: Incidencia }) => {
  // Color según la prioridad
  const getPriorityColor = (priority: Incidencia['prioridad']) => {
    switch (priority) {
      case 'Alta':
        return '#f44336';
      case 'Media':
        return '#ff9800';
      case 'Baja':
        return '#4caf50';
      default:
        return '#757575';
    }
  };

  // Color según el estado
  const getStatusColor = (status: Incidencia['estado']) => {
    switch (status) {
      case 'Abierta':
        return '#f44336';
      case 'En proceso':
        return '#2196f3';
      case 'Resuelta':
        return '#4caf50';
      default:
        return '#757575';
    }
  };

  return (
    <TouchableOpacity style={styles.incidenciaItem}>
      <View style={styles.incidenciaHeader}>
        <Text style={styles.incidenciaTitulo}>{item.titulo}</Text>
        <View style={[styles.statusBadge, { backgroundColor: getStatusColor(item.estado) }]}>
          <Text style={styles.statusText}>{item.estado}</Text>
        </View>
      </View>
      
      <View style={styles.incidenciaInfo}>
        <Text style={styles.pedidoText}>Pedido: #{item.pedido}</Text>
        <View style={[styles.prioridadBadge, { backgroundColor: getPriorityColor(item.prioridad) }]}>
          <Text style={styles.prioridadText}>{item.prioridad}</Text>
        </View>
      </View>
      
      <Text style={styles.clienteText}>{item.cliente}</Text>
      <Text style={styles.descripcionText} numberOfLines={2}>{item.descripcion}</Text>
      <Text style={styles.fechaText}>Reportada: {item.fecha}</Text>
      
      <View style={styles.actionsContainer}>
        <TouchableOpacity style={styles.actionButton}>
          <Ionicons name="chatbubble-outline" size={20} color="#2e78b7" />
        </TouchableOpacity>
        <TouchableOpacity style={styles.actionButton}>
          <Ionicons name="checkmark-circle-outline" size={20} color="#2e78b7" />
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  );
};

export default function ControlIncidenciasScreen() {
  const [searchQuery, setSearchQuery] = useState('');
  const [incidencias, setIncidencias] = useState<Incidencia[]>(INCIDENCIAS_EJEMPLO);

  // Filtrar incidencias basado en la búsqueda
  const filteredIncidencias = incidencias.filter(
    (incidencia) =>
      incidencia.titulo.toLowerCase().includes(searchQuery.toLowerCase()) ||
      incidencia.pedido.toLowerCase().includes(searchQuery.toLowerCase()) ||
      incidencia.cliente.toLowerCase().includes(searchQuery.toLowerCase()) ||
      incidencia.descripcion.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Control de Incidencias</Text>
      </View>

      <View style={styles.searchContainer}>
        <Ionicons name="search-outline" size={20} color="#757575" style={styles.searchIcon} />
        <TextInput
          style={styles.searchInput}
          placeholder="Buscar incidencia..."
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
      </View>

      <View style={styles.filterContainer}>
        <TouchableOpacity style={[styles.filterButton, styles.filterActive]}>
          <Text style={styles.filterActiveText}>Todas</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.filterButton}>
          <Text style={styles.filterText}>Abiertas</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.filterButton}>
          <Text style={styles.filterText}>En proceso</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.filterButton}>
          <Text style={styles.filterText}>Resueltas</Text>
        </TouchableOpacity>
      </View>

      <FlatList
        data={filteredIncidencias}
        renderItem={({ item }) => <IncidenciaItem item={item} />}
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
    marginBottom: 8,
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
  filterContainer: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    marginBottom: 16,
  },
  filterButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    marginRight: 8,
    borderRadius: 16,
    backgroundColor: '#e0e0e0',
  },
  filterActive: {
    backgroundColor: '#2e78b7',
  },
  filterText: {
    color: '#757575',
    fontSize: 14,
  },
  filterActiveText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '500',
  },
  listContainer: {
    padding: 16,
    paddingBottom: 80, // Para dar espacio al botón flotante
  },
  incidenciaItem: {
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
  incidenciaHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  incidenciaTitulo: {
    fontSize: 16,
    fontWeight: 'bold',
    flex: 1,
    marginRight: 8,
  },
  incidenciaInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  pedidoText: {
    fontSize: 14,
    fontWeight: '500',
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
  prioridadBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
  },
  prioridadText: {
    color: 'white',
    fontSize: 12,
    fontWeight: '500',
  },
  clienteText: {
    fontSize: 14,
    marginBottom: 4,
  },
  descripcionText: {
    fontSize: 14,
    color: '#616161',
    marginBottom: 8,
  },
  fechaText: {
    fontSize: 12,
    color: '#757575',
    marginBottom: 8,
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