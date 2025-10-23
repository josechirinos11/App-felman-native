import Ionicons from '@expo/vector-icons/Ionicons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useEffect, useState } from 'react';
import {
  FlatList,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import AppHeader from '../../components/AppHeader';
import ModalHeader from '../../components/ModalHeader';
import { API_URL } from '../../config/constants';
import { useOfflineMode } from '../../hooks/useOfflineMode';

interface PedidoApi {
  "NºPedido": string;
  EstadoPedido: string;
  Incidencia: boolean;
  Compromiso: string;
}

const PedidoItem = ({ item }: { item: PedidoApi }) => (
  <View style={styles.pedidoItem}>
    <Text style={styles.pedidoNumero}>
      NºPedido: <Text style={{ color: 'red', fontWeight: 'bold' }}>{item['NºPedido']}</Text>
    </Text>
    <Text style={styles.clienteText}>Estado: {item.EstadoPedido}</Text>
    <Text style={styles.clienteText}>Incidencia: {item.Incidencia ? 'Sí' : 'No'}</Text>
    <Text style={styles.fechaText}>Compromiso: {item.Compromiso ? item.Compromiso.split('T')[0] : '-'}</Text>
  </View>
);

export default function ControlIncidenciasScreen() {
  const [data, setData] = useState<PedidoApi[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [loading, setLoading] = useState(true);

  const [userName, setUserName] = useState<string | null>(null);
  const [userRole, setUserRole] = useState<string | null>(null);
  const [loadingBoot, setLoadingBoot] = useState(true);

  // Modal de usuario (AppHeader)
  const [userModalVisible, setUserModalVisible] = useState(false);
  const [modalUser, setModalUser] = useState({ userName: '', role: '' });

  const pageSize = 20;
  const { serverReachable, isCheckingConnection } = useOfflineMode();

  useEffect(() => {
    const fetchPedidos = async () => {
      try {
        setLoading(true);
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
    fetchPedidos();
  }, []);

  useEffect(() => {
    (async () => {
      try {
        const userDataString = await AsyncStorage.getItem('userData');
        if (userDataString) {
          const userData = JSON.parse(userDataString);
          setUserRole(userData.rol || userData.role || null);
          setUserName(userData.nombre || userData.name || null);
        }
      } catch {
        setUserRole(null);
        setUserName(null);
      } finally {
        setLoadingBoot(false);
      }
    })();
  }, []);

  const filtered = data.filter(p =>
    p.Incidencia === true &&
    (
      (typeof p['NºPedido'] === 'string' && p['NºPedido'].toLowerCase().includes(searchQuery.toLowerCase())) ||
      (typeof p.EstadoPedido === 'string' && p.EstadoPedido.toLowerCase().includes(searchQuery.toLowerCase()))
    )
  );

  const sorted = [...filtered].sort((a, b) => {
    if (a['NºPedido'] > b['NºPedido']) return -1;
    if (a['NºPedido'] < b['NºPedido']) return 1;
    return 0;
  });

  const pagedPedidos = sorted.slice(0, currentPage * pageSize);

  // Normalizar rol y verificar acceso permitido
  const normalizedRole = (userRole ?? '').toString().trim().toLowerCase();
  const allowed = ['admin', 'developer', 'administrador', 'supervisor', 'comercial'].includes(normalizedRole);

  if (loadingBoot) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#f3f4f6' }}>
        <Text style={{ textAlign: 'center', marginTop: 20, color: '#2e78b7' }}>Cargando...</Text>
      </View>
    );
  }

  if (!allowed) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#f3f4f6' }}>
        <Text style={{ color: 'red', fontSize: 16, textAlign: 'center' }}>
          No tiene credenciales para ver esta información
        </Text>
      </View>
    );
  }

  return (
    <View style={{ flex: 1 }}>
      <SafeAreaView style={styles.container}>
        {/* AppHeader (nuevo) */}
        <AppHeader
          titleOverride="Incidencias Moncada"
          count={filtered.length}
          userNameProp={userName || '—'}
          roleProp={userRole || '—'}
          serverReachableOverride={!!serverReachable}
          onRefresh={() => {
            // refresco simple: volver a la página 1 y forzar nueva consulta
            setCurrentPage(1);
            (async () => {
              try {
                setLoading(true);
                const res = await fetch(`${API_URL}/control-access/pedidos`);
                const result = await res.json();
                setData(Array.isArray(result) ? result : []);
              } catch {
                setData([]);
              } finally {
                setLoading(false);
              }
            })();
          }}
          onUserPress={({ userName, role }) => {
            setModalUser({ userName, role });
            setUserModalVisible(true);
          }}
        />

        {/* Modal de usuario del header */}
        <ModalHeader
          visible={userModalVisible}
          onClose={() => setUserModalVisible(false)}
          userName={modalUser.userName || userName || '—'}
          role={modalUser.role || userRole || '—'}
        />

        {/* Buscador */}
        <View style={styles.searchContainer}>
          <Ionicons name="search-outline" size={20} color="#757575" style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder="Buscar por NºPedido o Estado..."
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
        </View>

        <Text style={{ textAlign: 'center', color: '#888', marginBottom: 4 }}>
          Página actual: {currentPage}
        </Text>

        {loading && currentPage === 1 ? (
          <Text style={{ textAlign: 'center', marginTop: 20 }}>Cargando...</Text>
        ) : (
          <FlatList
            data={pagedPedidos}
            renderItem={({ item }) => <PedidoItem item={item} />}
            keyExtractor={(item, idx) => (item['NºPedido'] ? item['NºPedido'] + idx : `row-${idx}`)}
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
              loading && currentPage > 1 ? (
                <Text style={{ textAlign: 'center', padding: 12, color: '#2e78b7' }}>Cargando...</Text>
              ) : pagedPedidos.length < filtered.length ? (
                <Text style={{ textAlign: 'center', padding: 12, color: '#2e78b7' }}>Desliza para ver más...</Text>
              ) : (
                <Text style={{ textAlign: 'center', padding: 12, color: '#888' }}>Fin del listado</Text>
              )
            }
          />
        )}

        {/* FAB opcional */}
        <TouchableOpacity style={styles.fab} disabled={isCheckingConnection}>
          <Ionicons name="add" size={24} color="#2e78b7" />
        </TouchableOpacity>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f3f4f6' },

  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f3f4f6',
    margin: 16,
    borderRadius: 12,
    paddingHorizontal: 15,
    paddingVertical: 5,
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  searchIcon: { marginRight: 8 },
  searchInput: { flex: 1, height: 50, color: '#2e78b7' },

  listContainer: { padding: 16 },

  pedidoItem: {
    backgroundColor: '#d1fae5',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    borderLeftWidth: 4,
    borderLeftColor: '#10b981',
  },
  pedidoNumero: { fontSize: 16, fontWeight: 'bold', color: 'red' },
  clienteText: { color: '#374151', marginTop: 2 },
  fechaText: { color: '#374151', marginTop: 2 },

  fab: {
    position: 'absolute', right: 16, bottom: 22,
    backgroundColor: '#e3eafc', width: 48, height: 48, borderRadius: 24,
    justifyContent: 'center', alignItems: 'center', elevation: 2,
  },
});
