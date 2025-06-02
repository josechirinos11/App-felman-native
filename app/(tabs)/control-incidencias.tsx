import Ionicons from '@expo/vector-icons/Ionicons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useEffect, useState } from 'react';
import { ActivityIndicator, FlatList, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { API_URL } from '../../config/constants';
import { useOfflineMode } from '../../hooks/useOfflineMode';

// Definir tipo para los pedidos
interface PedidoApi {
  "NºPedido": string;
  EstadoPedido: string;
  Incidencia: boolean;
  Compromiso: string;
}

// Componente para mostrar cada pedido
const PedidoItem = ({ item }: { item: PedidoApi }) => (
  <View style={styles.pedidoItem}>
    <Text style={styles.pedidoNumero}>
      NºPedido: <Text style={{ color: 'red', fontWeight: 'bold' }}>{item["NºPedido"]}</Text>
    </Text>
    <Text style={styles.clienteText}>Estado: {item.EstadoPedido}</Text>
    <Text style={styles.clienteText}>Incidencia: {item.Incidencia ? 'Sí' : 'No'}</Text>
    <Text style={styles.fechaText}>Compromiso: {item.Compromiso ? item.Compromiso.split('T')[0] : '-'}</Text>
  </View>
);

export default function ControlUsuariosScreen() {
  const [data, setData] = useState<PedidoApi[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [fetchPedidosFn, setFetchPedidosFn] = useState<() => void>(() => () => {});
  const [userRole, setUserRole] = useState<string | null>(null);
  const pageSize = 20;

  // Usar el hook de modo offline
  const { isConnected, serverReachable, isCheckingConnection, tryAction } = useOfflineMode();

  useEffect(() => {    const fetchPedidos = async () => {
      try {
        setLoading(true);
        // Usamos la constante API_URL importada en la parte superior del archivo
        const res = await fetch(`${API_URL}/control-access/pedidos`);
        const result = await res.json();
        setData(Array.isArray(result) ? result : []);
        setCurrentPage(1);
      } catch (error) {
        console.error('Error al obtener pedidos:', error);
        setData([]);
        setCurrentPage(1);
      } finally {
        setLoading(false);
      }
    };
    // Hacemos fetchPedidos accesible para el botón de actualizar
    setFetchPedidosFn(() => fetchPedidos);
    fetchPedidos();
  }, []);

  useEffect(() => {
    (async () => {
      try {
        const userDataString = await AsyncStorage.getItem('userData');
        console.log('userDataString:', userDataString); // depuración
        if (userDataString) {
          const userData = JSON.parse(userDataString);
          const rol = userData.rol || userData.role || null;
          console.log('Rol extraído:', rol); // depuración
          setUserRole(rol);
        }
      } catch (e) {
        setUserRole(null);
      }
    })();
  }, []);

  // Filtrar por búsqueda y solo Incidencia true
  const filtered = data.filter(p =>
    p.Incidencia === true && (
      (typeof p["NºPedido"] === 'string' && p["NºPedido"].toLowerCase().includes(searchQuery.toLowerCase())) ||
      (typeof p.EstadoPedido === 'string' && p.EstadoPedido.toLowerCase().includes(searchQuery.toLowerCase()))
    )
  );
  // Ordenar de mayor a menor por NºPedido
  const sorted = [...filtered].sort((a, b) => {
    if (a["NºPedido"] > b["NºPedido"]) return -1;
    if (a["NºPedido"] < b["NºPedido"]) return 1;
    return 0;
  });
  // Fraccionar para mostrar solo 20 por página
  const pagedPedidos = sorted.slice(0, currentPage * pageSize);

  return (
    <View style={{ flex: 1 }}>
      <SafeAreaView style={styles.container}>        <View style={styles.header}>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center' }}>
            <Text style={styles.title}>Incidencia</Text>
            <TouchableOpacity
              onPress={() => fetchPedidosFn()}
              style={{ marginLeft: 12, backgroundColor: '#2e78b7', borderRadius: 8, padding: 6 }}
              accessibilityLabel="Actualizar lista"
              disabled={isCheckingConnection}
            >
              {isCheckingConnection ? 
                <ActivityIndicator size="small" color="#fff" /> :
                <Ionicons name="refresh" size={22} color="#fff" />
              }
            </TouchableOpacity>
          </View>
          {/* Indicador de estado de conexión */}
          <View style={styles.connectionIndicator}>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <Ionicons 
                name={serverReachable ? "wifi" : "wifi-outline"}
                size={14} 
                color={serverReachable ? "#4CAF50" : "#F44336"} 
              />
              <Text style={{ 
                fontSize: 12, 
                color: serverReachable ? "#4CAF50" : "#F44336",
                marginLeft: 4
              }}>
                {serverReachable ? "Conectado" : "Sin conexión"}
              </Text>
            </View>
          </View>
        </View>
        <View style={styles.searchContainer}>
          <Ionicons name="search-outline" size={20} color="#757575" style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder="Buscar por NºPedido, Estado o Incidencia..."
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
        </View>
        <Text style={{ textAlign: 'center', color: '#888', marginBottom: 4 }}>
          Página actual: {currentPage}
        </Text>
        {(userRole === 'administrador' || userRole === 'developer') ? (
          loading && currentPage === 1 ? (
            <Text style={{ textAlign: 'center', marginTop: 20 }}>Cargando...</Text>
          ) : (
            <FlatList
              data={pagedPedidos}
              renderItem={({ item }) => <PedidoItem item={item} />}
              keyExtractor={(item, idx) => item["NºPedido"] ? item["NºPedido"] + idx : `row-${idx}`}
              contentContainerStyle={styles.listContainer}
              keyboardShouldPersistTaps="handled"
              initialNumToRender={20}
              maxToRenderPerBatch={20}
              windowSize={21}
              onEndReached={() => {
                if (!loading && pagedPedidos.length < filtered.length) {
                  setCurrentPage(prev => prev + 1);
                }
              }}
              onEndReachedThreshold={0.2}
              ListFooterComponent={
                loading && currentPage === 1 ? (
                  <Text style={{ textAlign: 'center', padding: 12, color: '#2e78b7' }}>Cargando...</Text>
                ) : pagedPedidos.length < filtered.length ? (
                  <Text style={{ textAlign: 'center', padding: 12, color: '#2e78b7' }}>Desliza para ver más...</Text>
                ) : (
                  <Text style={{ textAlign: 'center', padding: 12, color: '#888' }}>Fin del listado</Text>
                )
              }            />
          )
        ) : (
          <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
            <Text style={{ color: '#e53e3e', fontSize: 18, fontWeight: 'bold', textAlign: 'center' }}>
              Necesitas permiso para ver esta página
            </Text>
          </View>
        )}
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f3f4f6',
  },  header: {
    padding: 16,
    backgroundColor: '#f3f4f6',
    alignItems: 'center',
    marginBottom: 10,
  },
  connectionIndicator: {
    marginTop: 5,
    flexDirection: 'row',
    justifyContent: 'center',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',    color: '#2e78b7',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f3f4f6',
    margin: 16,
    borderRadius: 12,
    paddingHorizontal: 15,
    paddingVertical: 5,
    elevation: 5,
    // Shadow for iOS
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    height: 50,
    color: '#2e78b7',
  },  listContainer: {
    padding: 16,
  },
  pedidoItem: {
    backgroundColor: '#f3f4f6',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    elevation: 3,
    // Shadow for iOS
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
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
    color: 'red',
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
  },  actionButton: {
    padding: 10,
    marginLeft: 8,
    backgroundColor: '#f3f4f6',
    borderRadius: 10,
    elevation: 2,
    // Shadow for iOS
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },  fab: {
    position: 'absolute',
    right: 20,
    bottom: 20,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#f3f4f6',
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 6,
    // Shadow for iOS
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.2,
    shadowRadius: 5,
  },
});






























