import Ionicons from '@expo/vector-icons/Ionicons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useEffect, useState } from 'react';
import {
  FlatList,
  Modal,
  Pressable,
  ActivityIndicator as RNActivityIndicator,
  ScrollView,
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

interface Pedido {
  NoPedido: string;
  Seccion: string;
  Cliente: string;
  Comercial: string;
  RefCliente: string;
  Compromiso: string;
  Id_ControlMat: number;
  Material: string;
  Proveedor: string;
  FechaPrevista: string;
  Recibido: number;
  EstadoPedido?: string;
  Incidencia?: string | null;
}

// fecha → semana
const formatearFechaASemana = (fechaString: string): string => {
  try {
    if (!fechaString) return 'Sin fecha';
    if (fechaString.startsWith('1970-01-01')) return 'Sin fecha';
    const fecha = new Date(fechaString);
    if (isNaN(fecha.getTime()) || fecha.getFullYear() < 2000) return 'Sin fecha';
    const año = fecha.getFullYear();
    const primerDiaDelAño = new Date(año, 0, 1);
    const diasTranscurridos = Math.floor((fecha.getTime() - primerDiaDelAño.getTime()) / (24 * 60 * 60 * 1000));
    const primerDiaSemana = primerDiaDelAño.getDay();
    const semanaDelAño = Math.ceil((diasTranscurridos + primerDiaSemana + 1) / 7);
    return `SEMANA ${semanaDelAño}`;
  } catch { return 'Error en fecha'; }
};

export default function ControlComercialesScreen() {
  const [data, setData] = useState<Pedido[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [loadingComplete, setLoadingComplete] = useState(false);
  const [filter, setFilter] = useState<'TODOS' | 'ALUMINIO' | 'PVC'>('TODOS');

  // modal detalles
  const [modalVisible, setModalVisible] = useState(false);
  const [modalGroup, setModalGroup] = useState<Pedido[]>([]);

  // usuario
  const [userName, setUserName] = useState<string | null>(null);
  const [userRole, setUserRole] = useState<string | null>(null);
  const [loadingBoot, setLoadingBoot] = useState(true);

  // modal de usuario (AppHeader)
  const [userModalVisible, setUserModalVisible] = useState(false);
  const [modalUser, setModalUser] = useState({ userName: '', role: '' });

  const [mounted, setMounted] = useState(false);
  const pageSize = 20;
  const { serverReachable, isCheckingConnection, tryAction } = useOfflineMode();

  const fetchPedidosCompleto = async () => {
    try {
      const res = await fetch(`${API_URL}/control-access/pedidosComerciales`);
      if (res.ok) {
        const result = await res.json();
        console.log('📦 [BACKEND PEDIDOS COMPLETO - MONCADA]:', result);
        setData(Array.isArray(result) ? result : []);
        setLoadingComplete(true);
      } else {
        setLoadingComplete(true);
      }
    } catch {
      setLoadingComplete(true);
    }
  };

  const fetchPedidosRapido = async () => {
    try {
      let res = await fetch(`${API_URL}/control-access/pedidosComerciales?limit=40`);
      if (!res.ok) res = await fetch(`${API_URL}/control-access/pedidosComerciales`);
      if (res.ok) {
        const result = await res.json();
        console.log('📦 [BACKEND PEDIDOS RÁPIDO - MONCADA]:', result);
        let pedidosRapidos = Array.isArray(result) ? result : [];
        if (pedidosRapidos.length > 40) {
          const todos = pedidosRapidos;
          pedidosRapidos = pedidosRapidos.slice(0, 40);
          setData(pedidosRapidos);
          setLoading(false);
          setTimeout(() => { setData(todos); setLoadingComplete(true); }, 1000);
        } else {
          setData(pedidosRapidos);
          setLoading(false);
          setLoadingComplete(true);
        }
      } else {
        fetchPedidosCompleto();
      }
    } catch {
      fetchPedidosCompleto();
    }
  };

  const fetchPedidos = async (showAlert = false) => {
    try {
      setLoading(true);
      setLoadingComplete(false);
      if (showAlert) {
        const result = await tryAction(async () => {
          const res = await fetch(`${API_URL}/control-access/pedidosComerciales`);
          const data = await res.json();
          console.log('📦 [BACKEND REFRESH CON ALERTA - MONCADA]:', data);
          return Array.isArray(data) ? data : [];
        }, true, 'No se pudieron cargar los pedidos comerciales. Verifique su conexión.');
        if (result !== null) {
          setData(result);
          setCurrentPage(1);
          setLoadingComplete(true);
        } else {
          if (!data.length) setData([]);
        }
      } else {
        const res = await fetch(`${API_URL}/control-access/pedidosComerciales`);
        if (res.ok) {
          const result = await res.json();
          console.log('📦 [BACKEND REFRESH MANUAL - MONCADA]:', result);
          setData(Array.isArray(result) ? result : []);
          setCurrentPage(1);
          setLoadingComplete(true);
        }
      }
    } catch (error) {
      console.error('Error al obtener pedidos comerciales:', error);
      setData([]);
      setCurrentPage(1);
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = () => { fetchPedidos(true); };

  useEffect(() => {
    setMounted(true);
    fetchPedidosRapido();
  }, []);

  useEffect(() => {
    const getUserData = async () => {
      try {
        const userDataString = await AsyncStorage.getItem('userData');
        if (userDataString) {
          const userData = JSON.parse(userDataString);
          setUserName(userData.nombre || userData.name || null);
          setUserRole(userData.rol || userData.role || null);
        }
      } catch {
        setUserName(null);
        setUserRole(null);
      } finally {
        setLoadingBoot(false);
      }
    };
    getUserData();
  }, []);

  useEffect(() => {
    if (mounted) setCurrentPage(1);
  }, [searchQuery, mounted]);

  // agrupar
  const pedidosAgrupados: { [noPedido: string]: Pedido[] } = {};
  data.forEach(p => {
    if (!pedidosAgrupados[p.NoPedido]) pedidosAgrupados[p.NoPedido] = [];
    pedidosAgrupados[p.NoPedido].push(p);
  });
  let grupos = Object.values(pedidosAgrupados);

  // Normalizar rol y verificar acceso permitido
  const normalizedRole = (userRole ?? '').toString().trim().toLowerCase();
  const allowed = ['admin', 'developer', 'administrador', 'supervisor', 'comercial'].includes(normalizedRole);

  // filtrar por rol/nombre
  let gruposFiltrados = grupos;
  if (normalizedRole === 'admin' || normalizedRole === 'developer') {
    gruposFiltrados = grupos;
  } else if (normalizedRole === 'comercial' && userName) {
    gruposFiltrados = grupos.filter(grupo => grupo[0]?.Comercial === userName);
  } else {
    gruposFiltrados = grupos;
  }

  // filtros de sección
  let gruposFiltradosYFiltrados = gruposFiltrados;
  if (filter !== 'TODOS') {
    gruposFiltradosYFiltrados = gruposFiltradosYFiltrados.filter(grupo =>
      grupo?.some(p => typeof p.Seccion === 'string' && p.Seccion.toUpperCase().includes(filter))
    );
  }

  // búsqueda
  if (searchQuery.trim() !== '') {
    const q = searchQuery.toLowerCase();
    gruposFiltradosYFiltrados = gruposFiltradosYFiltrados.filter(grupo =>
      grupo?.[0] && (
        (grupo[0].NoPedido && grupo[0].NoPedido.toLowerCase().includes(q)) ||
        (grupo[0].Cliente && grupo[0].Cliente.toLowerCase().includes(q)) ||
        (grupo[0].RefCliente && grupo[0].RefCliente.toLowerCase().includes(q))
      )
    );
  }

  // orden por compromiso asc (válidas primero)
  gruposFiltradosYFiltrados.sort((a, b) => {
    const fechaA = a?.[0]?.Compromiso ? new Date(a[0].Compromiso) : new Date('9999-12-31');
    const fechaB = b?.[0]?.Compromiso ? new Date(b[0].Compromiso) : new Date('9999-12-31');
    return fechaA.getTime() - fechaB.getTime();
  });

  const pagedGrupos = (userRole === 'admin' || userRole === 'developer')
    ? gruposFiltradosYFiltrados
    : gruposFiltradosYFiltrados.slice(0, currentPage * pageSize);

  const handleEndReached = () => {
    if (!loading && pagedGrupos.length < gruposFiltradosYFiltrados.length) {
      setCurrentPage(prev => prev + 1);
    }
  };

  const PedidoAgrupadoItem = ({ grupo }: { grupo: Pedido[] }) => {
    if (!grupo?.length || !grupo[0]) return null;
    const faltaMaterial = grupo.some(p => p?.Recibido === 0);
    const materialCompleto = grupo.every(p => p?.Recibido === -1);

    const noPedido = grupo[0]?.NoPedido || 'Sin número';
    const seccion = grupo[0]?.Seccion || 'Sin sección';
    const cliente = grupo[0]?.Cliente || 'Sin cliente';
    const comercial = grupo[0]?.Comercial || 'Sin comercial';
    const refCliente = grupo[0]?.RefCliente || 'Sin referencia';
    const compromiso = grupo[0]?.Compromiso ? formatearFechaASemana(grupo[0].Compromiso) : 'Sin fecha';
    const estadoPedido = grupo[0]?.EstadoPedido || 'Sin estado';

    return (
      <TouchableOpacity onPress={() => { setModalGroup(grupo); setModalVisible(true); }}>
        <View style={styles.pedidoItem}>
          <Text style={styles.pedidoNumero}>{`NºPedido: ${noPedido}`}</Text>
          <Text style={styles.clienteText}>{`Sección: ${seccion}`}</Text>
          <Text style={styles.clienteText}>{`Cliente: ${cliente}`}</Text>
          <Text style={styles.clienteText}>{`Comercial: ${comercial}`}</Text>
          <Text style={styles.clienteText}>{`RefCliente: ${refCliente}`}</Text>
          <Text style={styles.pedidoNumero}>{`Compromiso: ${compromiso}`}</Text>
          <Text style={styles.clienteText}>{`Estado Pedido: ${estadoPedido}`}</Text>
          {faltaMaterial && <Text style={styles.faltaMaterial}>Falta Material</Text>}
          {materialCompleto && <Text style={styles.materialCompleto}>Material Completo</Text>}
        </View>
      </TouchableOpacity>
    );
  };

  if (!mounted || loadingBoot) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#f3f4f6' }}>
        <RNActivityIndicator size="large" color="#2e78b7" />
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
          titleOverride="Pedidos Moncada"
          count={gruposFiltradosYFiltrados.length}
          userNameProp={userName || '—'}
          roleProp={userRole || '—'}
          serverReachableOverride={!!serverReachable}
          onRefresh={handleRefresh}
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

        {/* Filtros y búsqueda */}
        <View style={styles.searchContainer}>
          <Ionicons name="search-outline" size={20} color="#757575" style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder="Buscar..."
            placeholderTextColor="#0f0f0fff"
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
          {/* Filtros rápidos */}
          <View style={{ flexDirection: 'row', gap: 8, marginLeft: 8 }}>
            <TouchableOpacity
              onPress={() => setFilter('TODOS')}
              style={[styles.filterChip, filter === 'TODOS' && styles.filterChipActive]}
            >
              <Text style={[styles.filterChipText, filter === 'TODOS' && styles.filterChipTextActive]}>Todos</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => setFilter('ALUMINIO')}
              style={[styles.filterChip, filter === 'ALUMINIO' && styles.filterChipActive]}
            >
              <Text style={[styles.filterChipText, filter === 'ALUMINIO' && styles.filterChipTextActive]}>Aluminio</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => setFilter('PVC')}
              style={[styles.filterChip, filter === 'PVC' && styles.filterChipActive]}
            >
              <Text style={[styles.filterChipText, filter === 'PVC' && styles.filterChipTextActive]}>PVC</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Lista */}
        {loading && currentPage === 1 ? (
          <Text style={{ textAlign: 'center', marginTop: 20 }}>Cargando...</Text>
        ) : (
          <FlatList
            data={pagedGrupos}
            renderItem={({ item }) => <PedidoAgrupadoItem grupo={item} />}
            keyExtractor={(grupo, idx) => (grupo?.[0]?.NoPedido ? `${grupo[0].NoPedido}-${idx}` : `row-${idx}`)}
            contentContainerStyle={styles.listContainer}
            keyboardShouldPersistTaps="handled"
            initialNumToRender={20}
            maxToRenderPerBatch={20}
            windowSize={21}
            onEndReached={handleEndReached}
            onEndReachedThreshold={0.2}
            ListFooterComponent={
              loading && currentPage > 1 ? (
                <Text style={{ textAlign: 'center', padding: 12, color: '#2e78b7' }}>Cargando...</Text>
              ) : pagedGrupos.length < gruposFiltradosYFiltrados.length ? (
                <Text style={{ textAlign: 'center', padding: 12, color: '#2e78b7' }}>Desliza para ver más...</Text>
              ) : (
                <Text style={{ textAlign: 'center', padding: 12, color: '#888' }}>Fin del listado</Text>
              )
            }
          />
        )}

        {/* Modal detalle del grupo */}
        <Modal visible={modalVisible} transparent animationType="fade" onRequestClose={() => setModalVisible(false)}>
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <Text style={[styles.modalTitle, styles.modalTitleColor]}>
                {modalGroup?.[0]?.NoPedido ? `Pedido ${modalGroup[0].NoPedido}` : 'Detalle'}
              </Text>
              <ScrollView style={{ maxHeight: '70%' }}>
                {modalGroup?.map((p, idx) => (
                  <View key={idx} style={[styles.card, { marginVertical: 6 }]}> 
                    <Text style={[{ fontWeight: 'bold' }, styles.modalTextColor]}>{p.Material}</Text>
                    <Text style={styles.modalTextColor}>Proveedor: {p.Proveedor}</Text>
                    <Text style={styles.modalTextColor}>Fecha Prevista: {p.FechaPrevista || '-'}</Text>
                    <Text style={styles.modalTextColor}>Recibido: {p.Recibido}</Text>
                    <Text style={styles.modalTextColor}>Estado Pedido: {p.EstadoPedido || '-'}</Text>
                  </View>
                ))}
              </ScrollView>
              <Pressable style={styles.closeButton} onPress={() => setModalVisible(false)}>
                <Text style={styles.closeText}>Cerrar</Text>
              </Pressable>
            </View>
          </View>
        </Modal>
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

  filterChip: { backgroundColor: '#eef2ff', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 10 },
  filterChipActive: { backgroundColor: '#dbeafe' },
  filterChipText: { color: '#2e78b7', fontWeight: '600' },
  filterChipTextActive: { color: '#1d4ed8' },

  listContainer: { padding: 16 },

  pedidoItem: {
    backgroundColor: '#fff',
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
  pedidoNumero: { fontSize: 16, fontWeight: 'bold', color: '#2e78b7' },
  clienteText: { color: '#374151', marginTop: 2 },
  faltaMaterial: { marginTop: 6, color: '#b45309', fontWeight: '700' },
  materialCompleto: { marginTop: 6, color: '#047857', fontWeight: '700' },

  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.3)', justifyContent: 'center', alignItems: 'center' },
  modalContent: { backgroundColor: '#fff', borderRadius: 12, padding: 16, width: '86%', maxHeight: '80%' },
  modalTitle: { fontSize: 18, fontWeight: 'bold', color: '#2e78b7', marginBottom: 12 },
  modalTitleColor: { color: '#1976d2' },
  modalTextColor: { color: '#374151' },
  card: { padding: 12, borderRadius: 10, backgroundColor: '#f9fafb' },
  closeButton: { alignSelf: 'center', marginTop: 10, backgroundColor: '#e3eafc', paddingVertical: 8, paddingHorizontal: 14, borderRadius: 8 },
  closeText: { color: '#1976d2', fontWeight: '700' },
});
