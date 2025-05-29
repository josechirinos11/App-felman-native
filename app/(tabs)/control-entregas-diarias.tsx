import Ionicons from '@expo/vector-icons/Ionicons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useEffect, useState } from 'react';
import { ActivityIndicator, FlatList, Modal, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

// Definir tipo para las entregas
interface Entrega {
  Id_Entrega: number;
  FechaEnvio: string;
  EntregaConfirmada: number;
  EstadoCarga: string;
  ObservaGral: string | null;
  Id_LineaEntrega: number;
  Id_Pedido: number;
  Observaciones: string | null;
  NCaballetes: number;
  NBultos: number;
  Id_ResponsableEnvio: number;
  Id_EstadoEntrega: number;
  DocuAdjunta: number;
  Id_LugarEntrega: number;
  NSCaballetes: string | null;
  NoPedido: string;
  RefCliente: string;
  Cliente: string;
  Comercial: string;
}

export default function ControlEntregasDiariasScreen() {
  const [data, setData] = useState<Entrega[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'TODOS' | 'PENDIENTE' | 'ENTREGADO'>('TODOS');
  const [modalVisible, setModalVisible] = useState(false);
  const [modalGroup, setModalGroup] = useState<Entrega[]>([]);
  const [userName, setUserName] = useState<string | null>(null);
  const [userRole, setUserRole] = useState<string | null>(null);
  const pageSize = 20;

  const MAX_RETRIES = 3;
  const RETRY_DELAY = 2000; // 2 segundos

  const fetchEntregas = async (retryCount = 0) => {
    try {
      setLoading(true);
      const apiUrl = process.env.EXPO_PUBLIC_API_URL;
      if (!apiUrl) throw new Error('EXPO_PUBLIC_API_URL no definida');

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 30000); // 30 segundos timeout

      const res = await fetch(`${apiUrl}/control-access/controlEntregaDiaria`, {
        signal: controller.signal,
        headers: {
          'Cache-Control': 'no-cache',
          'Pragma': 'no-cache'
        }
      });

      clearTimeout(timeoutId);

      if (!res.ok) {
        throw new Error(`HTTP error! status: ${res.status}`);
      }

      const result = await res.json();
      setData(Array.isArray(result) ? result : []);
      setCurrentPage(1);
    } catch (error) {
      console.error('Error al obtener pedidos:', error);
      
      // Reintentar si es un error de conexión y no hemos excedido los reintentos
      if (
        retryCount < MAX_RETRIES && 
        (error instanceof TypeError || 
         (error as any)?.code === 'ECONNRESET' ||
         (error as any)?.name === 'AbortError')
      ) {
        console.log(`Reintentando (${retryCount + 1}/${MAX_RETRIES})...`);
        setTimeout(() => fetchEntregas(retryCount + 1), RETRY_DELAY);
        return;
      }

      setData([]);
      setCurrentPage(1);
      // Aquí podrías mostrar un mensaje de error al usuario
    } finally {
      if (retryCount === 0) { // Solo actualizar loading en el primer intento
        setLoading(false);
      }
    }
  };
  useEffect(() => {
    fetchEntregas();
  }, []);

  // Obtener datos de usuario
  useEffect(() => {
    const getUserData = async () => {
      try {
        const userDataString = await AsyncStorage.getItem('userData');
        console.log('UserData:', userDataString);
        if (userDataString) {
          const userData = JSON.parse(userDataString);
          setUserName(userData.nombre || userData.name);
          setUserRole(userData.rol || userData.role);
        }
      } catch (e) {
        console.error('Error al obtener userData:', e);
      }
    };
    getUserData();
  }, []);

  const filtrarPorRolYBusqueda = (entregas: Entrega[]) => {
    let resultado = [...entregas];

    // Filtrar por rol
    if (userRole === 'comercial' && userName) {
      resultado = resultado.filter(e => e.Comercial.toLowerCase() === userName.toLowerCase());
    }

    // Filtrar por búsqueda
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      resultado = resultado.filter(e =>
        e.NoPedido.toLowerCase().includes(query) ||
        e.Cliente.toLowerCase().includes(query) ||
        e.RefCliente.toLowerCase().includes(query)
      );
    }

    // Filtrar por estado
    if (filter !== 'TODOS') {
      resultado = resultado.filter(e => {
        if (filter === 'ENTREGADO') return e.EntregaConfirmada === -1;
        if (filter === 'PENDIENTE') return e.EntregaConfirmada === 1;
        return true;
      });
    }

    return resultado;
  };

  const renderItem = ({ item }: { item: Entrega }) => (
    <TouchableOpacity style={styles.itemContainer}>
      <View style={styles.itemHeader}>
        <View>
          <Text style={styles.pedidoNumero}>Nº Pedido: {item.NoPedido}</Text>
          <Text style={styles.fechaText}>{new Date(item.FechaEnvio).toLocaleDateString()}</Text>
        </View>
        <View style={[
          styles.estadoBadge,
          { backgroundColor: item.EntregaConfirmada === -1 ? '#4CAF50' : 
                           item.EntregaConfirmada === 1 ? '#FFA500' : '#FF0000' }
        ]}>
          <Text style={styles.estadoText}>
            {item.EntregaConfirmada === -1 ? 'ENTREGADO' : 
             item.EntregaConfirmada === 1 ? 'PENDIENTE' : 'NO CONFIRMADO'}
          </Text>
        </View>
      </View>

      <View style={styles.itemContent}>
        <Text style={styles.contentText}>Cliente: {item.Cliente}</Text>
        <Text style={styles.contentText}>Ref. Cliente: {item.RefCliente}</Text>
        <Text style={styles.contentText}>Estado: {item.EstadoCarga}</Text>
        <View style={styles.detallesEntrega}>
          <Text style={styles.detalleText}>Caballetes: {item.NCaballetes}</Text>
          <Text style={styles.detalleText}>Bultos: {item.NBultos}</Text>
        </View>
        {item.ObservaGral && (
          <Text style={styles.observacionText}>Obs: {item.ObservaGral}</Text>
        )}
      </View>
    </TouchableOpacity>
  );

  const handleEntregaPress = (entregas: Entrega[]) => {
    setModalGroup(entregas);
    setModalVisible(true);
  };

  const renderEntrega = ({ item }: { item: Entrega }) => {
    // Agrupar entregas por fecha y estado
    const group = data.filter(
      e => e.FechaEnvio === item.FechaEnvio && e.EstadoCarga === item.EstadoCarga
    );

    return (
      <TouchableOpacity
        style={[
          styles.entregaItem,
          { backgroundColor: item.EntregaConfirmada ? '#e6ffe6' : '#fff' }
        ]}
        onPress={() => handleEntregaPress(group)}
      >
        <Text style={styles.entregaTitle}>Fecha: {item.FechaEnvio}</Text>
        <Text style={styles.entregaText}>Estado: {item.EstadoCarga}</Text>
        <Text style={styles.entregaText}>
          Entregas en grupo: {group.length}
        </Text>
      </TouchableOpacity>
    );
  };

  // Modificar la lista de datos para mostrar solo un elemento por grupo
  const groupedData = data.reduce((acc: Entrega[], current) => {
    if (!current.FechaEnvio || !current.EstadoCarga || !current.Id_Entrega) return acc;
    
    const exists = acc.find(
      item => 
        item.FechaEnvio === current.FechaEnvio && 
        item.EstadoCarga === current.EstadoCarga
    );
    if (!exists) {
      acc.push(current);
    }
    return acc;
  }, []);

  const datosFiltrados = filtrarPorRolYBusqueda(data);
  const datosPaginados = datosFiltrados.slice(0, currentPage * pageSize);

  // Función para generar keys únicos para el FlatList
  const generateKey = (item: Entrega) => {
    return `${item.Id_Entrega || ''}-${item.FechaEnvio || ''}-${item.EstadoCarga || ''}`;
  };

  const handleRefresh = () => {
    fetchEntregas(0);
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Entregas Diarias</Text>
        <TouchableOpacity
          onPress={handleRefresh}
          style={styles.refreshButton}
        >
          <Ionicons name="refresh" size={22} color="#fff" />
        </TouchableOpacity>
      </View>

      <View style={styles.searchContainer}>
        <TextInput
          style={styles.searchInput}
          placeholder="Buscar entregas..."
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
      </View>

      <View style={styles.filterContainer}>
        <TouchableOpacity
          style={[styles.filterButton, filter === 'TODOS' && styles.filterButtonActive]}
          onPress={() => setFilter('TODOS')}
        >
          <Text style={[styles.filterButtonText, filter === 'TODOS' && styles.filterButtonTextActive]}>
            TODOS
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.filterButton, filter === 'PENDIENTE' && styles.filterButtonActive]}
          onPress={() => setFilter('PENDIENTE')}
        >
          <Text style={[styles.filterButtonText, filter === 'PENDIENTE' && styles.filterButtonTextActive]}>
            PENDIENTES
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.filterButton, filter === 'ENTREGADO' && styles.filterButtonActive]}
          onPress={() => setFilter('ENTREGADO')}
        >
          <Text style={[styles.filterButtonText, filter === 'ENTREGADO' && styles.filterButtonTextActive]}>
            ENTREGADOS
          </Text>
        </TouchableOpacity>
      </View>

      {loading ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color="#007AFF" />
        </View>
      ) : datosFiltrados.length === 0 ? (
        <View style={styles.centerContainer}>
          <Text style={styles.noDataText}>No hay entregas para mostrar</Text>
        </View>
      ) : (
        <FlatList
          data={groupedData}
          renderItem={renderEntrega}
          keyExtractor={generateKey}
          contentContainerStyle={styles.listContainer}
          onEndReached={() => {
            if (currentPage * pageSize < datosFiltrados.length) {
              setCurrentPage(prev => prev + 1);
            }
          }}
          onEndReachedThreshold={0.5}
          ListFooterComponent={
            currentPage * pageSize < datosFiltrados.length ? (
              <Text style={styles.loadingMoreText}>Cargando más entregas...</Text>
            ) : null
          }
        />
      )}

      <Modal
        animationType="slide"
        transparent={true}
        visible={modalVisible}
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.centeredView}>
          <View style={styles.modalView}>
            <TouchableOpacity 
              style={styles.closeButton}
              onPress={() => setModalVisible(false)}
            >
              <Text style={styles.closeButtonText}>✕</Text>
            </TouchableOpacity>
            
            <FlatList
              data={modalGroup}
              keyExtractor={generateKey}
              renderItem={({ item }) => (
                <View style={styles.modalItem}>
                  <Text style={styles.modalItemTitle}>ID Entrega: {item.Id_Entrega}</Text>
                  <Text style={styles.modalItemText}>Fecha de Envío: {item.FechaEnvio}</Text>
                  <Text style={styles.modalItemText}>Estado: {item.EstadoCarga}</Text>
                  <Text style={styles.modalItemText}>Entrega Confirmada: {item.EntregaConfirmada ? 'Sí' : 'No'}</Text>
                  {/* Agregar más campos según necesidad */}
                </View>
              )}
            />
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#2e78b7',
  },
  refreshButton: {
    backgroundColor: '#2e78b7',
    padding: 8,
    borderRadius: 8,
  },
  searchContainer: {
    padding: 16,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  searchInput: {
    height: 40,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 8,
    paddingHorizontal: 16,
    backgroundColor: 'white',
  },
  filterContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    padding: 12,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  filterButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 16,
    backgroundColor: '#f0f0f0',
  },
  filterButtonActive: {
    backgroundColor: '#2e78b7',
  },
  filterButtonText: {
    fontSize: 14,
    color: '#666',
  },
  filterButtonTextActive: {
    color: 'white',
  },
  listContainer: {
    padding: 16,
  },
  itemContainer: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  itemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  pedidoNumero: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#2e78b7',
  },
  fechaText: {
    fontSize: 14,
    color: '#666',
    marginTop: 4,
  },
  estadoBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  estadoText: {
    color: 'white',
    fontSize: 12,
    fontWeight: 'bold',
  },
  itemContent: {
    gap: 8,
  },
  contentText: {
    fontSize: 14,
    color: '#444',
  },
  detallesEntrega: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: '#f8f8f8',
    padding: 8,
    borderRadius: 8,
    marginTop: 4,
  },
  detalleText: {
    fontSize: 13,
    color: '#666',
  },
  observacionText: {
    fontSize: 13,
    color: '#666',
    fontStyle: 'italic',
    marginTop: 4,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  noDataText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
  },
  loadingMoreText: {
    textAlign: 'center',
    padding: 16,
    color: '#666',
  },
  centeredView: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  modalView: {
    width: '90%',
    maxHeight: '80%',
    backgroundColor: 'white',
    borderRadius: 20,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  closeButton: {
    position: 'absolute',
    right: 10,
    top: 10,
    padding: 10,
    zIndex: 1,
  },
  closeButtonText: {
    fontSize: 20,
    color: '#666',
  },
  modalItem: {
    padding: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  modalItemTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 5,
  },
  modalItemText: {
    fontSize: 14,
    color: '#666',
    marginBottom: 3,
  },
  entregaItem: {
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  entregaTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#2e78b7',
  },
  entregaText: {
    fontSize: 14,
    color: '#444',
  },
});