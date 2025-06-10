import Ionicons from '@expo/vector-icons/Ionicons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useEffect, useState } from 'react';
import { ActivityIndicator, FlatList, Modal, Pressable, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { API_URL } from '../../config/constants';
import { useOfflineMode } from '../../hooks/useOfflineMode';

// Definir tipo para los pedidos
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

// Función para convertir fecha a semana del mes
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
    
    // Obtener el día del mes (1-31)
    const dia = fecha.getDate();
    
    // Calcular la semana del mes (1-4)
    const semana = Math.ceil(dia / 7);
    
    // Obtener el nombre del mes
    const meses = [
      'ENERO', 'FEBRERO', 'MARZO', 'ABRIL', 'MAYO', 'JUNIO',
      'JULIO', 'AGOSTO', 'SEPTIEMBRE', 'OCTUBRE', 'NOVIEMBRE', 'DICIEMBRE'
    ];
    
    const mes = meses[fecha.getMonth()];
    const año = fecha.getFullYear();
    
    return `SEMANA ${semana} DE ${mes} ${año}`;
  } catch (error) {
    return 'Error en fecha';
  }
};

export default function ControlComercialesScreen() {
  const [data, setData] = useState<Pedido[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'TODOS' | 'ALUMINIO' | 'PVC'>('TODOS');
  const [modalVisible, setModalVisible] = useState(false);
  const [modalGroup, setModalGroup] = useState<Pedido[]>([]);
  const [userName, setUserName] = useState<string | null>(null);
  const [userRole, setUserRole] = useState<string | null>(null);
  const pageSize = 20;

  // Usar el hook de modo offline
  const { isConnected, serverReachable, isCheckingConnection, tryAction } = useOfflineMode();

  // Nuevo fetchPedidos: trae todo, pero fragmenta para mostrar de 20 en 20 en el FlatList
  const fetchPedidos = async () => {
    try {
      setLoading(true);
      // Usamos la constante API_URL importada en la parte superior del archivo
      const res = await fetch(`${API_URL}/control-access/pedidosComerciales`);
      const result = await res.json();
      setData(Array.isArray(result) ? result : []);
      setCurrentPage(1); // Página 1 al cargar
    } catch (error) {
      console.error('Error al obtener pedidos:', error);
      setData([]);
      setCurrentPage(1);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPedidos();
  }, []);

  // Obtener nombre de usuario y rol de AsyncStorage
  useEffect(() => {
    const getUserData = async () => {
      try {
        const userDataString = await AsyncStorage.getItem('userData');
        if (userDataString) {
          const userData = JSON.parse(userDataString);
          const nombre = userData.nombre || userData.name || null;
          const rol = userData.rol || userData.role || null;
          setUserName(nombre);
          setUserRole(rol);
          console.log('nombre extraído:', nombre); // <-- depuración
          console.log('Rol extraído:', rol); // <-- depuración
        }
      } catch (e) {
        setUserName(null);
        setUserRole(null);
      }
    };
    getUserData();
  }, []);

  // Reiniciar paginación al buscar
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery]);

  // Agrupar por NoPedido
  const pedidosAgrupados: { [noPedido: string]: Pedido[] } = {};
  data.forEach((pedido) => {
    if (!pedidosAgrupados[pedido.NoPedido]) {
      pedidosAgrupados[pedido.NoPedido] = [];
    }
    pedidosAgrupados[pedido.NoPedido].push(pedido);
  });
  // Convertir a array de grupos
  let grupos = Object.values(pedidosAgrupados);

  // Debug: mostrar userName y grupos antes del filtro
  useEffect(() => {
    if (userName && data.length > 0) {
      const gruposFiltrados = grupos.filter(grupo => grupo[0].Comercial === userName);
      console.log('userName:', userName, 'Grupos filtrados:', gruposFiltrados.length);
    }
  }, [userName, data]);

  // Filtrar por rol y comercial (usuario) ANTES de ordenar y paginar
  let gruposFiltrados = grupos;
  if (userRole === 'admin' || userRole === 'developer') {
    // Mostrar todos los pedidos
    gruposFiltrados = grupos;
    console.log('Usuario con rol admin/developer, mostrando todos los pedidos');
  } else if (userRole === 'Comercial' && userName) {
    // Mostrar solo los pedidos donde Comercial === nombre extraído
    gruposFiltrados = grupos.filter(grupo => grupo[0].Comercial === userName);
    console.log('Usuario Comercial, mostrando solo pedidos de:', userName, 'Total:', gruposFiltrados.length);
  } else {
    // Otros roles: mostrar todos los pedidos
    gruposFiltrados = grupos;
    console.log('Usuario sin rol especial, mostrando todos los pedidos');  }

  // Aplicar filtros
  let gruposFiltradosYFiltrados = gruposFiltrados;
  if (filter !== 'TODOS') {
    gruposFiltradosYFiltrados = gruposFiltradosYFiltrados.filter(grupo => 
      grupo && grupo.length > 0 && grupo.some(p => 
        p && typeof p.Seccion === 'string' && p.Seccion.toUpperCase().includes(filter)
      )
    );
  }// Aplicar filtros por búsqueda
  if (searchQuery.trim() !== '') {
    const q = searchQuery.toLowerCase();
    gruposFiltradosYFiltrados = gruposFiltradosYFiltrados.filter(grupo =>
      grupo && grupo.length > 0 && grupo[0] && (
        (grupo[0].NoPedido && grupo[0].NoPedido.toLowerCase().includes(q)) ||
        (grupo[0].Cliente && grupo[0].Cliente.toLowerCase().includes(q)) ||
        (grupo[0].RefCliente && grupo[0].RefCliente.toLowerCase().includes(q))
      )
    );
  } else {
    // Si NO hay búsqueda, filtrar solo fechas >= hoy
    const hoy = new Date('2025-06-10T00:00:00Z'); // Fecha actual
    gruposFiltradosYFiltrados = gruposFiltradosYFiltrados.filter(grupo => {
      if (!grupo || !grupo.length || !grupo[0] || !grupo[0].Compromiso) return false;
      
      // Excluir fechas nulas (1970-01-01)
      if (grupo[0].Compromiso.startsWith('1970-01-01')) return false;
      
      const fechaCompromiso = new Date(grupo[0].Compromiso);
      // Solo mostrar fechas >= hoy
      return fechaCompromiso >= hoy;
    });
  }
  
  // Ordenar por fecha de compromiso (ascendente - más próximas primero)
  gruposFiltradosYFiltrados.sort((a, b) => {
    const fechaA = a && a.length > 0 && a[0] && a[0].Compromiso ? new Date(a[0].Compromiso) : new Date('1900-01-01');
    const fechaB = b && b.length > 0 && b[0] && b[0].Compromiso ? new Date(b[0].Compromiso) : new Date('1900-01-01');
    
    // Para fechas válidas, ordenar ascendente
    const fechaValidaA = fechaA.getFullYear() > 2000 ? fechaA : new Date('9999-12-31');
    const fechaValidaB = fechaB.getFullYear() > 2000 ? fechaB : new Date('9999-12-31');
    
    return fechaValidaA.getTime() - fechaValidaB.getTime();
  });
  // Fragmentar para mostrar solo 20 por página, excepto admin/developer
  const pagedGrupos = (userRole === 'admin' || userRole === 'developer')
    ? gruposFiltradosYFiltrados
    : gruposFiltradosYFiltrados.slice(0, currentPage * pageSize);

  // handleEndReached para mostrar más (20 más)
  const handleEndReached = () => {
    if (!loading && pagedGrupos.length < gruposFiltradosYFiltrados.length) {
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
    const comercial = grupo[0]?.Comercial || 'Sin comercial';
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
            {`Comercial: ${comercial}`}
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

  return (
    <View style={{ flex: 1 }}>
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center' }}>
            <Text style={styles.title}>Control Comerciales</Text>
            <TouchableOpacity
              onPress={fetchPedidos}
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
            placeholder="Buscar por NºPedido / Cliente / RefCliente..."
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
        </View>
        {/* Botones de filtro por sección */}
        <View style={{ flexDirection: 'row', justifyContent: 'center', marginBottom: 10 }}>
          <TouchableOpacity
            style={[styles.filterButton, filter === 'TODOS' && styles.filterButtonActive]}
            onPress={() => setFilter('TODOS')}
          >
            <Text style={filter === 'TODOS' ? [styles.filterButtonText, styles.filterButtonTextActive] : styles.filterButtonText}>Todos</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.filterButton, filter === 'ALUMINIO' && styles.filterButtonActive]}
            onPress={() => setFilter('ALUMINIO')}
          >
            <Text style={filter === 'ALUMINIO' ? [styles.filterButtonText, styles.filterButtonTextActive] : styles.filterButtonText}>Aluminio</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.filterButton, filter === 'PVC' && styles.filterButtonActive]}
            onPress={() => setFilter('PVC')}
          >
            <Text style={filter === 'PVC' ? [styles.filterButtonText, styles.filterButtonTextActive] : styles.filterButtonText}>PVC</Text>
          </TouchableOpacity>
        </View>
        <Text style={{ textAlign: 'center', color: '#888', marginBottom: 4 }}>
          Página actual: {currentPage}
        </Text>
        {loading && currentPage === 1 ? (
          <Text style={{ textAlign: 'center', marginTop: 20 }}>Cargando...</Text>
        ) : (
          <FlatList
            data={pagedGrupos}
            renderItem={({ item }) => <PedidoAgrupadoItem grupo={item} />}
            keyExtractor={(item, idx) => {
              const key = typeof item[0].NoPedido === 'string' && item[0].NoPedido.trim() !== '' ? item[0].NoPedido : `row-${idx}`;
              return key;
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
                <Text style={{ textAlign: 'center', padding: 12, color: '#2e78b7' }}>Cargando...</Text>
              ) : pagedGrupos.length < gruposFiltradosYFiltrados.length ? (
                <Text style={{ textAlign: 'center', padding: 12, color: '#2e78b7' }}>Desliza para ver más...</Text>
              ) : (
                <Text style={{ textAlign: 'center', padding: 12, color: '#888' }}>Fin del listado</Text>
              )
            }
          />
        )}
        {/* Modal para mostrar detalles del grupo */}
        <Modal
          visible={modalVisible}
          animationType="slide"
          transparent={true}
          onRequestClose={() => setModalVisible(false)}
        >
          <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.3)', justifyContent: 'center', alignItems: 'center' }}>
            <View style={{ backgroundColor: '#fff', borderRadius: 16, padding: 20, minWidth: 300, maxWidth: 350, maxHeight: 500 }}>
              <Text style={{ fontWeight: 'bold', fontSize: 18, marginBottom: 10, color: '#2e78b7' }}>Detalle de Materiales</Text>
              <ScrollView style={{ maxHeight: 350 }}>
                {modalGroup.map((p, idx) => {
                  let color = '#444';
                  if (p.Recibido === 0) color = 'red';
                  if (p.Recibido === -1) color = 'green';
                  return (
                    <View key={idx} style={{ marginBottom: 12, borderBottomWidth: 1, borderBottomColor: '#eee', paddingBottom: 8 }}>
                      <Text style={{ fontWeight: 'bold', color: '#222' }}>
                        Material: <Text style={{ fontWeight: 'normal', color }}>{p.Material}</Text>
                      </Text>
                      <Text style={{ fontWeight: 'bold', color: '#222' }}>
                        Proveedor: <Text style={{ fontWeight: 'normal', color }}>{p.Proveedor}</Text>
                      </Text>
                      <Text style={{ fontWeight: 'bold', color: '#222' }}>
                        Fecha Prevista: <Text style={{ fontWeight: 'normal', color }}>{p.FechaPrevista ? p.FechaPrevista.split('T')[0] : '-'}</Text>
                      </Text>
                      <Text style={{ fontWeight: 'bold', color: '#222' }}>
                        Recibido: <Text style={{ fontWeight: 'normal', color }}>{p.Recibido}</Text>
                      </Text>
                    </View>
                  );
                })}
              </ScrollView>
              <Pressable onPress={() => setModalVisible(false)} style={{ marginTop: 10, alignSelf: 'center', backgroundColor: '#2e78b7', borderRadius: 8, paddingHorizontal: 24, paddingVertical: 10 }}>
                <Text style={{ color: '#fff', fontWeight: 'bold' }}>Cerrar</Text>
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
  connectionIndicator: {
    marginTop: 5,
    flexDirection: 'row',
    justifyContent: 'center',
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
    color: '#222', // gris muy oscuro
  },
  statusText: {
    fontSize: 14,
    fontWeight: '600',
    // color dinámico según estado
    marginBottom: 4,
  },
  clienteText: {
    fontSize: 15,
    marginBottom: 2,
    color: '#444', // gris oscuro
  },
  fechaText: {
    fontSize: 14,
    color: '#555', // gris oscuro
    marginBottom: 0,
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
    elevation: 2,
    // Shadow for iOS
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
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
    // Shadow for iOS
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.2,
    shadowRadius: 5,
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
  },  filterButtonTextActive: {
    color: '#fff',
    fontWeight: 'bold',
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
});
