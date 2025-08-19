import Ionicons from '@expo/vector-icons/Ionicons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Modal,
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

  const [userName, setUserName] = useState<string | null>(null);
  const [userRole, setUserRole] = useState<string | null>(null);

  const [fechaDesde, setFechaDesde] = useState('');
  const [fechaHasta, setFechaHasta] = useState('');
  const [showDateFilter, setShowDateFilter] = useState(false);

  // MODALES
  const [detalleModalVisible, setDetalleModalVisible] = useState(false); // (antes modalVisible)
  const [selectedEntrega, setSelectedEntrega] = useState<Entrega | null>(null);

  const [infoModalVisible, setInfoModalVisible] = useState(false);
  const [selectedEntregaInfo, setSelectedEntregaInfo] = useState<Entrega | null>(null);

  // NUEVO: modal del AppHeader (usuario/rol)
  const [userModalVisible, setUserModalVisible] = useState(false);
  const [modalUser, setModalUser] = useState({ userName: '', role: '' });

  const [usingDefaultFilter, setUsingDefaultFilter] = useState(true);
  const [showFilters, setShowFilters] = useState(false);

  const pageSize = 20;

  const getYesterdayDate = () => {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    return yesterday.toISOString().split('T')[0];
  };

  const { serverReachable, isCheckingConnection, tryAction } = useOfflineMode();

  const fetchEntregas = async (showAlert = false) => {
    try {
      setLoading(true);
      if (showAlert) {
        const result = await tryAction(async () => {
          const res = await fetch(`${API_URL}/control-access/controlEntregaDiaria`);
          const data = await res.json();
          return Array.isArray(data) ? data : [];
        }, true, 'No se pudieron cargar las entregas. Verifique su conexión.');
        if (result !== null) {
          setData(result);
          setCurrentPage(1);
        } else {
          if (!data.length) setData([]);
        }
      } else {
        try {
          const res = await fetch(`${API_URL}/control-access/controlEntregaDiaria`);
          if (res.ok) {
            const result = await res.json();
            setData(Array.isArray(result) ? result : []);
            setCurrentPage(1);
          } else {
            setData([]);
          }
        } catch {
          setData([]);
        }
      }
    } catch (error) {
      console.error('Error al obtener entregas:', error);
      setData([]);
      setCurrentPage(1);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEntregas();
  }, []);

  useEffect(() => {
    const getUserData = async () => {
      try {
        const userDataString = await AsyncStorage.getItem('userData');
        if (userDataString) {
          const userData = JSON.parse(userDataString);
          const _name = userData.nombre || userData.name || null;
          const _role = userData.rol || userData.role || null;
          setUserName(_name);
          setUserRole(_role);
        }
      } catch (e) {
        console.error('Error al obtener userData:', e);
      }
    };
    getUserData();
  }, []);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, fechaDesde, fechaHasta]);

  useEffect(() => {
    if (fechaDesde || fechaHasta) setUsingDefaultFilter(false);
  }, [fechaDesde, fechaHasta]);

  const filtrarPorRolYBusqueda = (entregas: Entrega[]) => {
    let resultado = [...entregas];

    if ((userRole === 'comercial' || userRole === 'Comercial') && userName) {
      const nombreUsuarioNormalizado = userName.toLowerCase().trim();
      resultado = resultado.filter(e => e.Comercial.toLowerCase().trim() === nombreUsuarioNormalizado);
    }

    if (fechaDesde || fechaHasta) {
      resultado = resultado.filter(e => {
        const fechaEntrega = new Date(e.FechaEnvio);
        let ok = true;
        if (fechaDesde) {
          const ini = new Date(fechaDesde); ini.setHours(0, 0, 0, 0);
          ok = ok && fechaEntrega >= ini;
        }
        if (fechaHasta) {
          const fin = new Date(fechaHasta); fin.setHours(23, 59, 59, 999);
          ok = ok && fechaEntrega <= fin;
        }
        return ok;
      });
    } else if (usingDefaultFilter) {
      const yesterday = getYesterdayDate();
      resultado = resultado.filter(e => {
        const fechaStr = new Date(e.FechaEnvio).toISOString().split('T')[0];
        return fechaStr === yesterday;
      });
    }

    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      resultado = resultado.filter(e =>
        e.NoPedido.toLowerCase().includes(q) ||
        e.Cliente.toLowerCase().includes(q) ||
        e.RefCliente.toLowerCase().includes(q)
      );
    }

    // Orden: Id_Entrega desc, luego fecha
    resultado.sort((a, b) => {
      if (a.Id_Entrega !== b.Id_Entrega) return b.Id_Entrega - a.Id_Entrega;
      return new Date(b.FechaEnvio).getTime() - new Date(a.FechaEnvio).getTime();
    });

    return resultado;
  };

  const datosFiltrados = useMemo(() => filtrarPorRolYBusqueda(data), [data, userRole, userName, searchQuery, fechaDesde, fechaHasta, usingDefaultFilter]);
  const datosPaginados = datosFiltrados.slice(0, currentPage * pageSize);

  const renderEntrega = ({ item }: { item: Entrega }) => {
    const formatearFecha = (fecha: string) => {
      try {
        const date = new Date(fecha);
        return date.toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric' });
      } catch {
        return fecha || 'Fecha desconocida';
      }
    };
    const fechaFormateada = formatearFecha(item.FechaEnvio);

    return (
      <TouchableOpacity
        style={[styles.entregaItem, { backgroundColor: item.EntregaConfirmada ? '#e6ffe6' : '#fff' }]}
        onPress={() => { setSelectedEntrega(item); setDetalleModalVisible(true); }}
      >
        <Text style={styles.pedidoNumero}>Nº Pedido: {item.NoPedido}</Text>
        <Text style={styles.entregaText}>ID Entrega: {item.Id_Entrega}</Text>
        <Text style={styles.entregaText}>Comercial: {item.Comercial}</Text>
        <Text style={styles.entregaText}>Cliente: {item.Cliente}</Text>
        <Text style={styles.entregaText}>Ref. Cliente: {item.RefCliente}</Text>
        <Text style={styles.entregaText}>Fecha de envío: {fechaFormateada}</Text>

        {item.ObservaGral && (
          <View style={styles.observacionIndicador}>
            <Ionicons name="document-text-outline" size={16} color="#2e78b7" />
            <Text style={styles.observacionTexto}>Ver observaciones</Text>
          </View>
        )}
      </TouchableOpacity>
    );
  };

  const generateKey = (item: Entrega, index: number) => `${item.Id_Entrega || ''}-${item.FechaEnvio || ''}-${index}`;

  const handleRefresh = () => fetchEntregas(true);

  const formatDateToInput = (date: Date) => {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  };

  const limpiarFiltrosFecha = () => { setFechaDesde(''); setFechaHasta(''); setUsingDefaultFilter(false); };
  const activarFiltroDiaAnterior = () => { setFechaDesde(''); setFechaHasta(''); setUsingDefaultFilter(true); };

  const getFilterStatusText = () => (fechaDesde || fechaHasta) ? 'personalizado' : usingDefaultFilter ? '1d' : 'todas';

  const setFiltroRapido = (dias: number) => {
    const hoy = new Date();
    const ini = new Date(); ini.setDate(hoy.getDate() - dias);
    setFechaDesde(formatDateToInput(ini));
    setFechaHasta(formatDateToInput(hoy));
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* AppHeader (nuevo) */}
      <AppHeader
        titleOverride="Entregas Diarias Moncada"
        count={datosFiltrados.length}
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

      {/* Barra de búsqueda */}
      <View style={styles.compactSearchContainer}>
        <TextInput
          style={styles.compactSearchInput}
          placeholder="Buscar entregas..."
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
      </View>

      {/* Filtros */}
      <View style={styles.collapsibleFilters}>
        <View style={styles.compactFiltersContainer}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.horizontalFilters}>
            <TouchableOpacity
              style={[styles.compactFilterButton, usingDefaultFilter && !fechaDesde && !fechaHasta ? styles.activeCompactFilter : null]}
              onPress={activarFiltroDiaAnterior}
            >
              <Text style={[styles.compactFilterText, usingDefaultFilter && !fechaDesde && !fechaHasta ? styles.activeCompactText : null]}>1d</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.compactFilterButton} onPress={() => setFiltroRapido(7)}>
              <Text style={styles.compactFilterText}>7d</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.compactFilterButton} onPress={() => setFiltroRapido(30)}>
              <Text style={styles.compactFilterText}>30d</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.compactFilterButton} onPress={() => setFiltroRapido(90)}>
              <Text style={styles.compactFilterText}>90d</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.compactFilterButton, styles.customDateButton]} onPress={() => setShowDateFilter(!showDateFilter)}>
              <Ionicons name="calendar-outline" size={16} color="#2e78b7" />
              <Text style={styles.compactFilterText}>Personalizar</Text>
            </TouchableOpacity>
          </ScrollView>
        </View>

        {showDateFilter && (
          <View style={styles.customDateContainer}>
            <View style={styles.dateRow}>
              <TextInput
                style={styles.compactDateInput}
                placeholder="Desde (YYYY-MM-DD)"
                value={fechaDesde}
                onChangeText={setFechaDesde}
              />
              <TextInput
                style={styles.compactDateInput}
                placeholder="Hasta (YYYY-MM-DD)"
                value={fechaHasta}
                onChangeText={setFechaHasta}
              />
              <TouchableOpacity style={styles.closeDateButton} onPress={() => setShowDateFilter(false)}>
                <Ionicons name="close" size={20} color="#666" />
              </TouchableOpacity>
            </View>

            {(fechaDesde || fechaHasta) && (
              <View style={styles.compactFilterInfo}>
                <Text style={styles.compactFilterInfoText}>
                  Filtro: {fechaDesde || 'Sin inicio'} → {fechaHasta || 'Sin fin'}
                </Text>
              </View>
            )}
          </View>
        )}
      </View>

      {/* Lista */}
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
          data={datosPaginados}
          renderItem={renderEntrega}
          keyExtractor={generateKey}
          removeClippedSubviews
          maxToRenderPerBatch={10}
          windowSize={21}
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

      {/* Modal: Observaciones Generales */}
      <Modal visible={infoModalVisible} animationType="slide" transparent>
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Observaciones Generales</Text>

            {selectedEntregaInfo && selectedEntregaInfo.ObservaGral ? (
              <ScrollView style={styles.modalScrollView}>
                <View style={styles.observacionesContainer}>
                  <Text style={styles.observacionesTexto}>{selectedEntregaInfo.ObservaGral}</Text>
                </View>
              </ScrollView>
            ) : (
              <View style={styles.centerContainer}>
                <Text style={styles.noDataText}>No hay observaciones generales disponibles</Text>
              </View>
            )}

            <TouchableOpacity style={styles.cerrarModalButton} onPress={() => setInfoModalVisible(false)}>
              <Text style={styles.cerrarModalTexto}>Cerrar</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Modal: Detalle Entrega */}
      <Modal visible={detalleModalVisible} animationType="slide" transparent>
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Detalles de la Entrega</Text>

            {selectedEntrega && (
              <ScrollView style={styles.modalScrollView}>
                <View style={styles.detallesContainer}>
                  <Text style={styles.detalleTitulo}>Nº Pedido:</Text>
                  <Text style={styles.detalleTexto}>{selectedEntrega.NoPedido}</Text>

                  <Text style={styles.detalleTitulo}>ID Entrega:</Text>
                  <Text style={styles.detalleTexto}>{selectedEntrega.Id_Entrega}</Text>

                  <Text style={styles.detalleTitulo}>Comercial:</Text>
                  <Text style={styles.detalleTexto}>{selectedEntrega.Comercial}</Text>

                  <Text style={styles.detalleTitulo}>Cliente:</Text>
                  <Text style={styles.detalleTexto}>{selectedEntrega.Cliente}</Text>

                  <Text style={styles.detalleTitulo}>Ref. Cliente:</Text>
                  <Text style={styles.detalleTexto}>{selectedEntrega.RefCliente}</Text>

                  <Text style={styles.detalleTitulo}>Fecha de envío:</Text>
                  <Text style={styles.detalleTexto}>
                    {new Date(selectedEntrega.FechaEnvio).toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric' })}
                  </Text>

                  <Text style={styles.detalleTitulo}>Estado de Carga:</Text>
                  <Text style={styles.detalleTexto}>{selectedEntrega.EstadoCarga}</Text>

                  <Text style={styles.detalleTitulo}>Caballetes:</Text>
                  <Text style={styles.detalleTexto}>{selectedEntrega.NCaballetes}</Text>

                  <Text style={styles.detalleTitulo}>Bultos:</Text>
                  <Text style={styles.detalleTexto}>{selectedEntrega.NBultos}</Text>

                  {selectedEntrega.Observaciones && (
                    <>
                      <Text style={styles.detalleTitulo}>Observaciones Adicionales:</Text>
                      <View style={styles.observacionesContainer}>
                        <Text style={styles.observacionesTexto}>{selectedEntrega.Observaciones}</Text>
                      </View>
                    </>
                  )}
                </View>
              </ScrollView>
            )}

            <TouchableOpacity style={styles.cerrarModalButton} onPress={() => setDetalleModalVisible(false)}>
              <Text style={styles.cerrarModalTexto}>Cerrar</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      <TouchableOpacity style={styles.fab}>
        <Ionicons name="add" size={24} color="#2e78b7" />
      </TouchableOpacity>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5' },

  compactSearchContainer: {
    backgroundColor: '#fff',
    margin: 12,
    paddingHorizontal: 12,
    borderRadius: 12,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 2,
  },
  compactSearchInput: {
    height: 44, color: '#2e78b7',
  },

  collapsibleFilters: { paddingHorizontal: 12, marginBottom: 4 },
  compactFiltersContainer: { marginTop: 4 },
  horizontalFilters: { gap: 8, paddingVertical: 6 },
  compactFilterButton: { paddingVertical: 8, paddingHorizontal: 12, backgroundColor: '#eef2ff', borderRadius: 10 },
  activeCompactFilter: { backgroundColor: '#dbeafe' },
  compactFilterText: { color: '#2e78b7', fontWeight: '600' },
  activeCompactText: { color: '#1d4ed8' },

  customDateContainer: { marginTop: 8 },
  dateRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  compactDateInput: { flex: 1, height: 40, backgroundColor: '#fff', borderRadius: 10, paddingHorizontal: 10, borderWidth: 1, borderColor: '#e5e7eb' },
  closeDateButton: { paddingHorizontal: 8, paddingVertical: 6, backgroundColor: '#f3f4f6', borderRadius: 10 },
  compactFilterInfo: { marginTop: 8 },
  compactFilterInfoText: { color: '#4b5563' },

  listContainer: { paddingHorizontal: 12, paddingBottom: 20 },
  loadingMoreText: { textAlign: 'center', color: '#2e78b7', marginVertical: 10 },

  entregaItem: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 2,
    borderLeftWidth: 4,
    borderLeftColor: '#10b981',
  },
  pedidoNumero: { fontSize: 16, fontWeight: 'bold', color: '#2e78b7' },
  entregaText: { marginTop: 2, color: '#374151' },

  observacionIndicador: { flexDirection: 'row', alignItems: 'center', marginTop: 8, gap: 6 },
  observacionTexto: { color: '#2e78b7', fontWeight: '600' },

  centerContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  noDataText: { color: '#6b7280' },

  modalContainer: { flex: 1, backgroundColor: 'rgba(0,0,0,0.3)', justifyContent: 'center', alignItems: 'center' },
  modalContent: { backgroundColor: '#fff', borderRadius: 12, padding: 16, width: '86%', maxHeight: '80%' },
  modalTitle: { fontSize: 18, fontWeight: 'bold', color: '#2e78b7', marginBottom: 12 },
  modalScrollView: { maxHeight: '70%' },
  detallesContainer: { gap: 6 },
  detalleTitulo: { fontWeight: '700', color: '#1f2937', marginTop: 6 },
  detalleTexto: { color: '#374151' },
  observacionesContainer: { backgroundColor: '#f9fafb', borderRadius: 8, padding: 10, marginTop: 8 },
  observacionesTexto: { color: '#374151' },

  cerrarModalButton: {
    alignSelf: 'center', marginTop: 10, backgroundColor: '#e3eafc',
    paddingVertical: 8, paddingHorizontal: 14, borderRadius: 8,
  },
  cerrarModalTexto: { color: '#1976d2', fontWeight: '700' },

  fab: {
    position: 'absolute', right: 16, bottom: 22,
    backgroundColor: '#e3eafc', width: 48, height: 48, borderRadius: 24,
    justifyContent: 'center', alignItems: 'center', elevation: 2,
  },
  customDateButton: {
  flexDirection: 'row',
  alignItems: 'center',
  paddingHorizontal: 8,
},

});
