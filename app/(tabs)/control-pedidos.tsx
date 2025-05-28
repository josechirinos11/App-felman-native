import Ionicons from '@expo/vector-icons/Ionicons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useEffect, useState } from 'react';
import { FlatList, Modal, Pressable, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

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

export default function ControlUsuariosScreen() {
  const [data, setData] = useState<Pedido[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'TODOS' | 'ALUMINIO' | 'PVC'>('TODOS');
  const [modalVisible, setModalVisible] = useState(false);
  const [modalGroup, setModalGroup] = useState<Pedido[]>(
    []
  );
  const [userRole, setUserRole] = useState<string | null>(null);
  const pageSize = 20;

  // Nuevo fetchPedidos: trae todo, pero fragmenta para mostrar de 20 en 20 en el FlatList
  const fetchPedidos = async () => {
    try {
      setLoading(true);
      const apiUrl = process.env.EXPO_PUBLIC_API_URL;
      if (!apiUrl) throw new Error('EXPO_PUBLIC_API_URL no definida');
      const res = await fetch(`${apiUrl}/control-access/ConsultaControlPedidoInicio`);
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

  // Reiniciar paginación al buscar
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery]);

  // Obtener rol de usuario
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
  // Aplicar filtros
  if (filter !== 'TODOS') {
    grupos = grupos.filter(grupo => grupo.some(p => typeof p.Seccion === 'string' && p.Seccion.toUpperCase().includes(filter)));
  }
  if (searchQuery.trim() !== '') {
    const q = searchQuery.toLowerCase();
    grupos = grupos.filter(grupo =>
      grupo[0].NoPedido.toLowerCase().includes(q) ||
      (grupo[0].Cliente && grupo[0].Cliente.toLowerCase().includes(q)) ||
      (grupo[0].RefCliente && grupo[0].RefCliente.toLowerCase().includes(q))
    );
  }
  // Ordenar por NoPedido de mayor a menor
  grupos.sort((a, b) => {
    if (a[0].NoPedido > b[0].NoPedido) return -1;
    if (a[0].NoPedido < b[0].NoPedido) return 1;
    return 0;
  });
  // Fragmentar para mostrar solo 20 por página
  const pagedGrupos = grupos.slice(0, currentPage * pageSize);

  // handleEndReached para mostrar más (20 más)
  const handleEndReached = () => {
    if (!loading && pagedGrupos.length < grupos.length) {
      setCurrentPage(prev => prev + 1);
    }
  };

  // Nuevo PedidoItem agrupado
  const PedidoAgrupadoItem = ({ grupo }: { grupo: Pedido[] }) => {
    // Si algún Recibido === 0 => Falta Material, si todos === -1 => Material Completo
    const faltaMaterial = grupo.some(p => p.Recibido === 0);
    const materialCompleto = grupo.every(p => p.Recibido === -1);
    return (
      <TouchableOpacity onPress={() => { setModalGroup(grupo); setModalVisible(true); }}>
        <View style={styles.pedidoItem}>
          <Text style={styles.pedidoNumero}>NºPedido: {grupo[0].NoPedido}</Text>
          <Text style={styles.clienteText}>Sección: {grupo[0].Seccion}</Text>
          <Text style={styles.clienteText}>Cliente: {grupo[0].Cliente}</Text>
          <Text style={styles.clienteText}>RefCliente: {grupo[0].RefCliente}</Text>
          <Text style={styles.fechaText}>Compromiso: {grupo[0].Compromiso ? grupo[0].Compromiso.split('T')[0] : '-'}</Text>
          {/* Estado de material */}
          {faltaMaterial ? (
            <Text style={{ color: 'red', fontWeight: 'bold', marginTop: 6 }}>Falta Material</Text>
          ) : materialCompleto ? (
            <Text style={{ color: 'green', fontWeight: 'bold', marginTop: 6 }}>Material Completo</Text>
          ) : null}
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View style={{ flex: 1 }}>
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center' }}>
            <Text style={styles.title}>Control de Pedidos</Text>
            <TouchableOpacity
              onPress={fetchPedidos}
              style={{ marginLeft: 12, backgroundColor: '#2e78b7', borderRadius: 8, padding: 6 }}
              accessibilityLabel="Actualizar lista"
            >
              <Ionicons name="refresh" size={22} color="#fff" />
            </TouchableOpacity>
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
        {(userRole === 'administrador' || userRole === 'developer') ? (
          loading && currentPage === 1 ? (
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
                ) : pagedGrupos.length < grupos.length ? (
                  <Text style={{ textAlign: 'center', padding: 12, color: '#2e78b7' }}>Desliza para ver más...</Text>
                ) : (
                  <Text style={{ textAlign: 'center', padding: 12, color: '#888' }}>Fin del listado</Text>
                )
              }
            />
          )
        ) : (
          <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
            <Text style={{ color: '#e53e3e', fontSize: 18, fontWeight: 'bold', textAlign: 'center' }}>
              Necesitas permiso para ver esta paguina
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
});