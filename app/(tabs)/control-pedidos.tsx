import Ionicons from '@expo/vector-icons/Ionicons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, FlatList, Modal, Pressable, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { API_URL } from '../../config/constants';
import { useOfflineMode } from '../../hooks/useOfflineMode';

// Definir tipo para los pedidos
interface Pedido {
  NoPedido: string;
  Seccion: string;
  Cliente: string;
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

// Función para convertir fecha a semana del año (1-52)
const formatearFechaASemana = (fechaString: string): string => {
  try {
    if (!fechaString || fechaString === null || fechaString === undefined) {
      return 'Sin fecha';
    }
    
    // Filtrar fechas que representan valores nulos (1970-01-01)
    if (fechaString.startsWith('1970-01-01')) {
      return 'Sin fecha';
    }
    
    const fecha = new Date(fechaString);
    
    // Verificar que la fecha es válida
    if (isNaN(fecha.getTime())) {
      return 'Fecha inválida';
    }
    
    // Verificar que no sea una fecha muy antigua (probablemente nula)
    if (fecha.getFullYear() < 2000) {
      return 'Sin fecha';
    }
    
    // Obtener el año
    const año = fecha.getFullYear();
    
    // Calcular el primer día del año
    const primerDiaDelAño = new Date(año, 0, 1);
    
    // Calcular la diferencia en días desde el primer día del año
    const diasTranscurridos = Math.floor((fecha.getTime() - primerDiaDelAño.getTime()) / (24 * 60 * 60 * 1000));
    
    // Calcular la semana del año (1-52/53)
    // Ajustamos según el día de la semana del primer día del año
    const primerDiaSemana = primerDiaDelAño.getDay(); // 0 = domingo, 1 = lunes, etc.
    const semanaDelAño = Math.ceil((diasTranscurridos + primerDiaSemana + 1) / 7);
    
    return `SEMANA ${semanaDelAño}`;
  } catch (error) {
    return 'Error en fecha';
  }
};

export default function ControlUsuariosScreen() {  const [data, setData] = useState<Pedido[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [loadingComplete, setLoadingComplete] = useState(false); // Para indicar si la carga completa terminó
  const [filter, setFilter] = useState<'TODOS' | 'ALUMINIO' | 'PVC'>('TODOS');
  const [modalVisible, setModalVisible] = useState(false);
  const [modalGroup, setModalGroup] = useState<Pedido[]>([]);
  const [userRole, setUserRole] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);
  const pageSize = 20;
  // Usar el hook de modo offline
  const { isConnected, serverReachable, isCheckingConnection, tryAction } = useOfflineMode();

  // Función para carga rápida inicial (40 registros)
  const fetchPedidosRapido = async () => {
    try {
      console.log('🚀 Iniciando carga rápida de pedidos (40 registros)...');
      const res = await fetch(`${API_URL}/control-access/ConsultaControlPedidoInicio40Registro`);
      
      if (res.ok) {
        const result = await res.json();
        const pedidosRapidos = Array.isArray(result) ? result : [];
        console.log('⚡ Carga rápida completada:', pedidosRapidos.length, 'registros');
        setData(pedidosRapidos);
        setLoading(false); // Quitar el loading para mostrar los datos rápidamente
        
        // Inmediatamente después, cargar todos los datos en segundo plano
        fetchPedidosCompleto();
      } else {
        console.log('❌ Error en carga rápida:', res.status);
        // Si falla la carga rápida, intentar carga completa directamente
        fetchPedidosCompleto();
      }
    } catch (error) {
      console.error('❌ Error en carga rápida:', error);
      // Si falla la carga rápida, intentar carga completa directamente
      fetchPedidosCompleto();
    }
  };

  // Función para carga completa (todos los registros)
  const fetchPedidosCompleto = async () => {
    try {
      console.log('📊 Iniciando carga completa de pedidos (todos los registros)...');
      const res = await fetch(`${API_URL}/control-access/ConsultaControlPedidoInicio`);
      
      if (res.ok) {
        const result = await res.json();
        const pedidosCompletos = Array.isArray(result) ? result : [];
        console.log('✅ Carga completa terminada:', pedidosCompletos.length, 'registros');
        setData(pedidosCompletos);
        setLoadingComplete(true);
      } else {
        console.log('❌ Error en carga completa:', res.status);
        setLoadingComplete(true);
      }
    } catch (error) {
      console.error('❌ Error en carga completa:', error);
      setLoadingComplete(true);
    }
  };

  // Función para refrescar (usada por el botón de refresh)
  const fetchPedidos = async (showAlert = false) => {
    try {
      setLoading(true);
      setLoadingComplete(false);
      
      if (showAlert) {
        const result = await tryAction(async () => {
          const res = await fetch(`${API_URL}/control-access/ConsultaControlPedidoInicio`);
          const data = await res.json();
          return Array.isArray(data) ? data : [];
        }, true, "No se pudieron cargar los pedidos. Verifique su conexión.");
        
        if (result !== null) {
          setData(result);
          setCurrentPage(1);
          setLoadingComplete(true);
        } else {
          if (!data.length) setData([]);
        }
      } else {
        // Para refresh manual, usar carga completa directa
        const res = await fetch(`${API_URL}/control-access/ConsultaControlPedidoInicio`);
        if (res.ok) {
          const result = await res.json();
          setData(Array.isArray(result) ? result : []);
          setCurrentPage(1);
          setLoadingComplete(true);
        } else {
          console.log('Error en la respuesta del servidor:', res.status);
        }
      }
    } catch (error) {
      console.error('Error al obtener pedidos:', error);
      setData([]);
      setCurrentPage(1);
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => {
    setMounted(true);
    // Usar carga rápida inicial en lugar de carga completa
    fetchPedidosRapido();
  }, []);

  // Reiniciar paginación al buscar
  useEffect(() => {
    if (mounted) {
      setCurrentPage(1);
    }
  }, [searchQuery, mounted]);

  // Obtener rol de usuario
  useEffect(() => {
    (async () => {
      try {
        const userDataString = await AsyncStorage.getItem('userData');        if (userDataString) {
          const userData = JSON.parse(userDataString);
          const rol = userData.rol || userData.role || null;
          console.log('👤 Usuario autenticado con rol:', rol); // Log esencial para testing
          setUserRole(rol);
        }
      } catch (e) {
        setUserRole(null);      }
    })();
  }, []);

  // Debug logs para monitorear el estado
  console.log('🔍 [PEDIDOS] Estado actual:', {
    dataLength: data?.length || 0,
    loading,
    loadingComplete,
    hasData: data && data.length > 0,
    loadingStatus: loading ? 'Cargando inicial' : loadingComplete ? 'Carga completa' : 'Carga rápida en progreso'
  });
  // Agrupar por NoPedido
  const pedidosAgrupados: { [noPedido: string]: Pedido[] } = {};
  data.forEach((pedido) => {
    const noPedido = pedido?.NoPedido || 'Sin número';
    if (!pedidosAgrupados[noPedido]) {
      pedidosAgrupados[noPedido] = [];    }
    pedidosAgrupados[noPedido].push(pedido);
  });

  // Estadísticas de fechas
  const todasLasFechas = data.map(p => p.Compromiso).filter(f => f);
  const fechasValidas = todasLasFechas.filter(f => !f.startsWith('1970-01-01'));
  const fechasNulas = todasLasFechas.filter(f => f.startsWith('1970-01-01'));
  const hoy = new Date('2025-06-10T00:00:00Z');  const fechasFuturas = fechasValidas.filter(f => new Date(f) >= hoy);
  const fechasPasadas = fechasValidas.filter(f => new Date(f) < hoy);
  
  // Convertir a array de grupos
  let grupos = Object.values(pedidosAgrupados);
  
  // Aplicar filtros por sección
  if (filter !== 'TODOS') {
    grupos = grupos.filter(grupo => 
      grupo && grupo.length > 0 && grupo.some(p => 
        p && typeof p.Seccion === 'string' && p.Seccion.toUpperCase().includes(filter)
      )
    );
  }

  // Aplicar filtros por búsqueda
  if (searchQuery.trim() !== '') {
    const q = searchQuery.toLowerCase();
    grupos = grupos.filter(grupo =>
      grupo && grupo.length > 0 && grupo[0] && (
        (grupo[0].NoPedido && grupo[0].NoPedido.toLowerCase().includes(q)) ||
        (grupo[0].Cliente && grupo[0].Cliente.toLowerCase().includes(q)) ||
        (grupo[0].RefCliente && grupo[0].RefCliente.toLowerCase().includes(q))
      )
    );
  } else {
    // Si NO hay búsqueda, filtrar solo fechas >= hoy
    const hoy = new Date('2025-06-10T00:00:00Z'); // Fecha actual
    grupos = grupos.filter(grupo => {
      if (!grupo || !grupo.length || !grupo[0] || !grupo[0].Compromiso) return false;
      
      // Excluir fechas nulas (1970-01-01)
      if (grupo[0].Compromiso.startsWith('1970-01-01')) return false;
      
      const fechaCompromiso = new Date(grupo[0].Compromiso);
      // Solo mostrar fechas >= hoy
      return fechaCompromiso >= hoy;
    });
  }
  
  // Ordenar por fecha de compromiso (ascendente - más próximas primero)
  grupos.sort((a, b) => {
    const fechaA = a && a.length > 0 && a[0] && a[0].Compromiso ? new Date(a[0].Compromiso) : new Date('1900-01-01');
    const fechaB = b && b.length > 0 && b[0] && b[0].Compromiso ? new Date(b[0].Compromiso) : new Date('1900-01-01');
    
    // Para fechas válidas, ordenar ascendente
    const fechaValidaA = fechaA.getFullYear() > 2000 ? fechaA : new Date('9999-12-31');
    const fechaValidaB = fechaB.getFullYear() > 2000 ? fechaB : new Date('9999-12-31');
      return fechaValidaA.getTime() - fechaValidaB.getTime();
  });

  // Fragmentar para mostrar solo 20 por página
  const pagedGrupos = grupos.slice(0, currentPage * pageSize);

  // handleEndReached para mostrar más
  const handleEndReached = () => {
    if (!loading && pagedGrupos.length < grupos.length) {
      setCurrentPage(prev => prev + 1);
    }
  };

  // Componente para cada pedido agrupado
  const PedidoAgrupadoItem = ({ grupo }: { grupo: Pedido[] }) => {
    if (!grupo || grupo.length === 0 || !grupo[0]) {
      return null;
    }

    const faltaMaterial = grupo.some(p => p && p.Recibido === 0);
    const materialCompleto = grupo.every(p => p && p.Recibido === -1);

    const noPedido = grupo[0]?.NoPedido || 'Sin número';
    const seccion = grupo[0]?.Seccion || 'Sin sección';
    const cliente = grupo[0]?.Cliente || 'Sin cliente';
    const refCliente = grupo[0]?.RefCliente || 'Sin referencia';
    const compromiso = grupo[0]?.Compromiso ? formatearFechaASemana(grupo[0].Compromiso) : 'Sin fecha';

    return (
      <TouchableOpacity onPress={() => { setModalGroup(grupo); setModalVisible(true); }}>
        <View style={styles.pedidoItem}>
          <Text style={styles.pedidoNumero}>
            {`NºPedido: ${noPedido}`}
          </Text>
          <Text style={styles.clienteText}>
            {`Sección: ${seccion}`}
          </Text>
          <Text style={styles.clienteText}>
            {`Cliente: ${cliente}`}
          </Text>
          <Text style={styles.clienteText}>
            {`RefCliente: ${refCliente}`}
          </Text>
          <Text style={styles.pedidoNumero}>
            {`Compromiso: ${compromiso}`}
          </Text>
          {faltaMaterial && (
            <Text style={styles.faltaMaterial}>
              Falta Material
            </Text>
          )}
          {materialCompleto && (
            <Text style={styles.materialCompleto}>
              Material Completo
            </Text>
          )}
        </View>
      </TouchableOpacity>
    );
  };

  const handleRefresh = () => {
    fetchPedidos(true);
  };

  // Evitar renderizado hasta que el componente esté completamente montado
  if (!mounted) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#2e78b7" />
        <Text style={styles.loadingText}>Cargando...</Text>
      </View>
    );
  }

  return (
    <View style={styles.mainContainer}>
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <View style={styles.headerContent}>
            <Text style={styles.title}>Control de Pedidos</Text>
            <TouchableOpacity
              onPress={handleRefresh}
              style={styles.refreshButton}
              accessibilityLabel="Actualizar lista"
              disabled={isCheckingConnection}
            >
              {isCheckingConnection ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <Ionicons name="refresh" size={22} color="#fff" />
              )}
            </TouchableOpacity>
          </View>
            <View style={styles.connectionIndicator}>
            <View style={styles.connectionContent}>
              <Ionicons 
                name={serverReachable ? "wifi" : "wifi-outline"}
                size={14} 
                color={serverReachable ? "#4CAF50" : "#F44336"} 
              />
              <Text style={[
                styles.connectionText,
                { color: serverReachable ? "#4CAF50" : "#F44336" }
              ]}>
                {serverReachable ? "Conectado" : "Sin conexión"}
              </Text>
              
              {/* Indicador de estado de carga */}
              {!loadingComplete && data.length > 0 && (
                <>
                  <Ionicons name="sync" size={12} color="#2e78b7" style={{ marginLeft: 8 }} />
                  <Text style={[styles.connectionText, { color: "#2e78b7", marginLeft: 4 }]}>
                    Cargando todos...
                  </Text>
                </>
              )}
              
              {loadingComplete && data.length > 0 && (
                <>
                  <Ionicons name="checkmark-circle" size={12} color="#4CAF50" style={{ marginLeft: 8 }} />
                  <Text style={[styles.connectionText, { color: "#4CAF50", marginLeft: 4 }]}>
                    {data.length} registros
                  </Text>
                </>
              )}
            </View>
          </View>
        </View>

        <View style={styles.searchContainer}>
          <Ionicons name="search-outline" size={20} color="#757575" style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder="Buscar por NºPedido / Cliente / RefCliente..."
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
        </View>

        <View style={styles.filtersContainer}>
          <TouchableOpacity
            style={[styles.filterButton, filter === 'TODOS' && styles.filterButtonActive]}
            onPress={() => setFilter('TODOS')}
          >
            <Text style={[
              styles.filterButtonText,
              filter === 'TODOS' && styles.filterButtonTextActive
            ]}>
              Todos
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.filterButton, filter === 'ALUMINIO' && styles.filterButtonActive]}
            onPress={() => setFilter('ALUMINIO')}
          >
            <Text style={[
              styles.filterButtonText,
              filter === 'ALUMINIO' && styles.filterButtonTextActive
            ]}>
              Aluminio
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.filterButton, filter === 'PVC' && styles.filterButtonActive]}
            onPress={() => setFilter('PVC')}
          >
            <Text style={[
              styles.filterButtonText,
              filter === 'PVC' && styles.filterButtonTextActive
            ]}>
              PVC
            </Text>
          </TouchableOpacity>
        </View>

        <Text style={styles.pageInfo}>
          {`Página actual: ${currentPage}`}
        </Text>

        {(userRole === 'administrador' || userRole === 'developer') ? (
          loading && currentPage === 1 ? (
            <Text style={styles.loadingMessage}>Cargando...</Text>
          ) : (
            <FlatList
              data={pagedGrupos}
              renderItem={({ item }) => <PedidoAgrupadoItem grupo={item} />}
              keyExtractor={(item, idx) => {
                if (!item || !item.length || !item[0]) return `empty-${idx}`;
                const noPedido = item[0].NoPedido;
                return (typeof noPedido === 'string' && noPedido.trim() !== '') ? noPedido : `row-${idx}`;
              }}
              contentContainerStyle={styles.listContainer}
              keyboardShouldPersistTaps="handled"
              initialNumToRender={20}
              maxToRenderPerBatch={20}
              windowSize={21}
              onEndReached={handleEndReached}
              onEndReachedThreshold={0.2}
              ListFooterComponent={
                loading && currentPage === 1 ? (
                  <Text style={styles.footerLoading}>Cargando...</Text>
                ) : pagedGrupos.length < grupos.length ? (
                  <Text style={styles.footerLoadMore}>Desliza para ver más...</Text>
                ) : (
                  <Text style={styles.footerEnd}>Fin del listado</Text>
                )
              }
            />
          )
        ) : (
          <View style={styles.noPermissionContainer}>
            <Text style={styles.noPermissionText}>
              Necesitas permiso para ver esta página
            </Text>
          </View>
        )}

        {/* Modal para mostrar detalles del grupo */}
        <Modal
          visible={modalVisible}
          animationType="slide"
          transparent={true}
          onRequestClose={() => setModalVisible(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <Text style={styles.modalTitle}>Detalle de Materiales</Text>
              
              <ScrollView style={styles.modalScrollView}>
                {modalGroup && modalGroup.length > 0 ? modalGroup.map((p, idx) => {
                  if (!p) return null;
                  
                  let color = '#444';
                  if (p.Recibido === 0) color = 'red';
                  if (p.Recibido === -1) color = 'green';
                  
                  const material = p?.Material || 'Sin material';
                  const proveedor = p?.Proveedor || 'Sin proveedor';
                  const fechaPrevista = p?.FechaPrevista ? p.FechaPrevista.split('T')[0] : '-';
                  
                  return (
                    <View key={idx} style={styles.modalItem}>
                      <Text style={styles.modalItemText}>
                        <Text style={styles.modalLabel}>Material: </Text>
                        <Text style={[styles.modalValue, { color }]}>{material}</Text>
                      </Text>
                      <Text style={styles.modalItemText}>
                        <Text style={styles.modalLabel}>Proveedor: </Text>
                        <Text style={[styles.modalValue, { color }]}>{proveedor}</Text>
                      </Text>
                      <Text style={styles.modalItemText}>
                        <Text style={styles.modalLabel}>Fecha Prevista: </Text>
                        <Text style={[styles.modalValue, { color }]}>{fechaPrevista}</Text>
                      </Text>
                    </View>
                  );
                }) : (
                  <Text style={styles.noDataText}>No hay datos disponibles</Text>
                )}
              </ScrollView>
              
              <Pressable 
                onPress={() => setModalVisible(false)} 
                style={styles.closeButton}
              >
                <Text style={styles.closeButtonText}>Cerrar</Text>
              </Pressable>
            </View>
          </View>
        </Modal>

        <TouchableOpacity style={styles.fab}>
          <Ionicons name="add" size={24} color="#2e78b7" />
        </TouchableOpacity>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  mainContainer: {
    flex: 1,
  },
  container: {
    flex: 1,
    backgroundColor: '#f3f4f6',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 10,
    color: '#2e78b7',
  },
  header: {
    padding: 16,
    backgroundColor: '#f3f4f6',
    alignItems: 'center',
    marginBottom: 10,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#2e78b7',
  },
  refreshButton: {
    marginLeft: 12,
    backgroundColor: '#2e78b7',
    borderRadius: 8,
    padding: 6,
  },
  connectionIndicator: {
    marginTop: 5,
    flexDirection: 'row',
    justifyContent: 'center',
  },
  connectionContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  connectionText: {
    fontSize: 12,
    marginLeft: 4,
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
  },
  filtersContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginBottom: 10,
  },
  filterButton: {
    backgroundColor: '#e5e7eb',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    marginHorizontal: 4,
  },
  filterButtonActive: {
    backgroundColor: '#2e78b7',
  },
  filterButtonText: {
    color: '#2e78b7',
    fontWeight: 'bold',
  },
  filterButtonTextActive: {
    color: '#fff',
    fontWeight: 'bold',
  },
  pageInfo: {
    textAlign: 'center',
    color: '#888',
    marginBottom: 4,
  },
  loadingMessage: {
    textAlign: 'center',
    marginTop: 20,
  },
  listContainer: {
    padding: 16,
  },
  pedidoItem: {
    backgroundColor: '#f3f4f6',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  pedidoNumero: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#222',
  },
  clienteText: {
    fontSize: 15,
    marginBottom: 2,
    color: '#444',
  },
  fechaText: {
    fontSize: 14,
    color: '#555',
    marginBottom: 0,
  },
  faltaMaterial: {
    color: 'red',
    fontWeight: 'bold',
    marginTop: 6,
  },
  materialCompleto: {
    color: 'green',
    fontWeight: 'bold',
    marginTop: 6,
  },
  footerLoading: {
    textAlign: 'center',
    padding: 12,
    color: '#2e78b7',
  },
  footerLoadMore: {
    textAlign: 'center',
    padding: 12,
    color: '#2e78b7',
  },
  footerEnd: {
    textAlign: 'center',
    padding: 12,
    color: '#888',
  },
  noPermissionContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  noPermissionText: {
    color: '#e53e3e',
    fontSize: 18,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.3)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
    minWidth: 300,
    maxWidth: 350,
    maxHeight: 500,
  },
  modalTitle: {
    fontWeight: 'bold',
    fontSize: 18,
    marginBottom: 10,
    color: '#2e78b7',
  },
  modalScrollView: {
    maxHeight: 350,
  },
  modalItem: {
    marginBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
    paddingBottom: 8,
  },
  modalItemText: {
    color: '#222',
    marginBottom: 4,
  },
  modalLabel: {
    fontWeight: 'bold',
  },
  modalValue: {
    fontWeight: 'normal',
  },
  noDataText: {
    textAlign: 'center',
    color: '#888',
  },
  closeButton: {
    marginTop: 10,
    alignSelf: 'center',
    backgroundColor: '#2e78b7',
    borderRadius: 8,
    paddingHorizontal: 24,
    paddingVertical: 10,
  },
  closeButtonText: {
    color: '#fff',
    fontWeight: 'bold',
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
    elevation: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.2,
    shadowRadius: 5,
  },
});
