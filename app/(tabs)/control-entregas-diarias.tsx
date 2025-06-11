import Ionicons from '@expo/vector-icons/Ionicons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useEffect, useState } from 'react';
import { ActivityIndicator, FlatList, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { API_URL } from '../../config/constants';
import { useOfflineMode } from '../../hooks/useOfflineMode';

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
  const [userName, setUserName] = useState<string | null>(null);
  const [userRole, setUserRole] = useState<string | null>(null);
  const [fechaDesde, setFechaDesde] = useState('');
  const [fechaHasta, setFechaHasta] = useState('');
  const [showDateFilter, setShowDateFilter] = useState(false);
  const pageSize = 20;
  // Usar el hook de modo offline
  const { isConnected, serverReachable, isCheckingConnection, tryAction } = useOfflineMode();
  const fetchEntregas = async (showAlert = false) => {
    try {
      setLoading(true);
      
      if (showAlert) {
        // Usar tryAction solo cuando el usuario presiona refresh (mostrará alert si hay error)
        const result = await tryAction(async () => {
          const res = await fetch(`${API_URL}/control-access/controlEntregaDiaria`);
          const data = await res.json();
          return Array.isArray(data) ? data : [];
        }, true, "No se pudieron cargar las entregas. Verifique su conexión.");
        
        if (result !== null) {
          setData(result);
          setCurrentPage(1);
        } else {
          // Si no hay conexión, se mantienen los datos existentes o se muestran datos vacíos
          if (!data.length) setData([]);
        }
      } else {
        // Carga inicial sin mostrar alert
        try {
          const res = await fetch(`${API_URL}/control-access/controlEntregaDiaria`);
          if (res.ok) {
            const result = await res.json();
            setData(Array.isArray(result) ? result : []);
            setCurrentPage(1);
          } else {
            console.log('Error en la respuesta del servidor:', res.status);
            setData([]);
          }
        } catch (fetchError) {
          console.log('Error de conexión en carga inicial:', fetchError);
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
  // Obtener datos de usuario
  useEffect(() => {
    const getUserData = async () => {
      try {
        const userDataString = await AsyncStorage.getItem('userData');
        console.log('UserData:', userDataString);
        if (userDataString) {
          const userData = JSON.parse(userDataString);
          const userName = userData.nombre || userData.name;
          const userRole = userData.rol || userData.role;
          
          console.log('Nombre de usuario extraído:', userName);
          console.log('Rol de usuario extraído:', userRole);
          
          setUserName(userName);
          setUserRole(userRole);
        }      } catch (e) {
        console.error('Error al obtener userData:', e);
      }
    };
    
    getUserData();
  }, []);

  // Reiniciar paginación cuando cambien los filtros
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, fechaDesde, fechaHasta]);
  const filtrarPorRolYBusqueda = (entregas: Entrega[]) => {
    let resultado = [...entregas];

    // Filtrar por rol
    if ((userRole === 'comercial' || userRole === 'Comercial') && userName) {
      console.log('Filtrando por comercial:', userName);
      // Limpiar y normalizar los nombres para comparación (quitar espacios extra y convertir a minúsculas)
      const nombreUsuarioNormalizado = userName.toLowerCase().trim();
      resultado = resultado.filter(e => {
        const nombreComercialNormalizado = e.Comercial.toLowerCase().trim();
        const coincide = nombreComercialNormalizado === nombreUsuarioNormalizado;
        return coincide;
      });
      console.log('Entregas filtradas por comercial:', resultado.length);
    } else {
      console.log('No se aplica filtro por comercial. Rol:', userRole, 'Nombre:', userName);
    }

    // Filtrar por rango de fechas
    if (fechaDesde || fechaHasta) {
      resultado = resultado.filter(e => {
        const fechaEntrega = new Date(e.FechaEnvio);
        let cumpleFiltro = true;

        if (fechaDesde) {
          const fechaInicioFiltro = new Date(fechaDesde);
          fechaInicioFiltro.setHours(0, 0, 0, 0);
          cumpleFiltro = cumpleFiltro && fechaEntrega >= fechaInicioFiltro;
        }

        if (fechaHasta) {
          const fechaFinFiltro = new Date(fechaHasta);
          fechaFinFiltro.setHours(23, 59, 59, 999);
          cumpleFiltro = cumpleFiltro && fechaEntrega <= fechaFinFiltro;
        }

        return cumpleFiltro;
      });
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
    
    // Ordenar primero por Id_Entrega (de mayor a menor) y luego por fecha de envío
    resultado.sort((a, b) => {
      // Primero ordenar por Id_Entrega (de mayor a menor)
      if (a.Id_Entrega !== b.Id_Entrega) {
        return b.Id_Entrega - a.Id_Entrega; // Orden descendente por Id_Entrega
      }
      
      // Si los ID son iguales, ordenar por fecha (de más reciente a más antigua)
      const fechaA = new Date(a.FechaEnvio).getTime();
      const fechaB = new Date(b.FechaEnvio).getTime();
      return fechaB - fechaA;    });

    return resultado;
  };
  
  // Eliminado renderItem ya que no se usa - ahora usamos renderEntrega
  // Ya no necesitamos la función handleEntregaPress porque eliminamos el Modal

  const renderEntrega = ({ item }: { item: Entrega }) => {
    // Agrupar entregas solo por fecha, ya no por estado
    const group = data.filter(
      e => e.FechaEnvio === item.FechaEnvio
    );

    // Formatear la fecha para mostrarla como día, mes y año
    const formatearFecha = (fecha: string) => {
      try {
        const date = new Date(fecha);
        return date.toLocaleDateString('es-ES', {
          day: '2-digit',
          month: '2-digit',
          year: 'numeric'        });
      } catch (error) {
        return fecha || 'Fecha desconocida';
      }
    };
    
    const fechaFormateada = formatearFecha(item.FechaEnvio);

    return (
      <TouchableOpacity
        style={[
          styles.entregaItem,
          { backgroundColor: item.EntregaConfirmada ? '#e6ffe6' : '#fff' }
        ]}
      >
        <Text style={styles.pedidoNumero}>Nº Pedido: {item.NoPedido}</Text>
        <Text style={styles.entregaText}>ID Entrega: {item.Id_Entrega}</Text>
        <Text style={styles.entregaText}>Comercial: {item.Comercial}</Text>
        <Text style={styles.entregaText}>Cliente: {item.Cliente}</Text>
        <Text style={styles.entregaText}>Ref. Cliente: {item.RefCliente}</Text>
        <Text style={styles.entregaText}>Fecha de envío: {fechaFormateada}</Text>
      </TouchableOpacity>
    );
  };
  // Modificar la lista de datos para mostrar solo un elemento por grupo de fecha
  const groupedData = data
    .reduce((acc: Entrega[], current) => {      if (!current.FechaEnvio || !current.Id_Entrega) return acc;
      
      const exists = acc.find(
        item => 
          item.FechaEnvio === current.FechaEnvio
      );
      
      if (!exists) {
        acc.push(current);
      }
      return acc;
    }, [])
    .sort((a, b) => {
      // Primero ordenar por Id_Entrega (de mayor a menor)
      if (a.Id_Entrega !== b.Id_Entrega) {
        return b.Id_Entrega - a.Id_Entrega; // Orden descendente por Id_Entrega
      }
        // Si los ID son iguales, ordenar por fecha (de más reciente a más antigua)
      const fechaA = new Date(a.FechaEnvio).getTime();
      const fechaB = new Date(b.FechaEnvio).getTime();
      
      return fechaB - fechaA;
    });
  const datosFiltrados = filtrarPorRolYBusqueda(data);
  const datosPaginados = datosFiltrados.slice(0, currentPage * pageSize);
  
  // Función para generar keys únicos para el FlatList
  const generateKey = (item: Entrega, index: number) => {
    // Usamos el índice para garantizar claves únicas incluso si hay duplicados
    return `${item.Id_Entrega || ''}-${item.FechaEnvio || ''}-${index}`;
  };
  const handleRefresh = () => {
    fetchEntregas(true); // true para mostrar alert si hay error
  };

  // Función para formatear fecha a YYYY-MM-DD
  const formatDateToInput = (date: Date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  // Función para limpiar filtros de fecha
  const limpiarFiltrosFecha = () => {
    setFechaDesde('');
    setFechaHasta('');
  };
  // Función para establecer filtros rápidos
  const setFiltroRapido = (dias: number) => {
    const hoy = new Date();
    const fechaInicio = new Date();
    fechaInicio.setDate(hoy.getDate() - dias);
    
    setFechaDesde(formatDateToInput(fechaInicio));
    setFechaHasta(formatDateToInput(hoy));
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Entregas Diarias</Text>
        <TouchableOpacity
          onPress={handleRefresh}
          style={styles.refreshButton}
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
        </View>
      </View>
      
      <View style={styles.searchContainer}>
        <TextInput
          style={styles.searchInput}
          placeholder="Buscar entregas..."
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
      </View>

      {/* Filtro de fechas */}
      <View style={styles.filterContainer}>
        <TouchableOpacity
          style={styles.filterToggleButton}
          onPress={() => setShowDateFilter(!showDateFilter)}
        >
          <Ionicons 
            name={showDateFilter ? "calendar" : "calendar-outline"} 
            size={20} 
            color="#2e78b7" 
          />
          <Text style={styles.filterToggleText}>Filtrar por fecha</Text>
          <Ionicons 
            name={showDateFilter ? "chevron-up" : "chevron-down"} 
            size={16} 
            color="#2e78b7" 
          />
        </TouchableOpacity>

        {showDateFilter && (
          <View style={styles.dateFilterContainer}>
            <View style={styles.dateInputsContainer}>
              <View style={styles.dateInputGroup}>
                <Text style={styles.dateLabel}>Desde:</Text>
                <TextInput
                  style={styles.dateInput}
                  placeholder="YYYY-MM-DD"
                  value={fechaDesde}
                  onChangeText={setFechaDesde}
                />
              </View>
              <View style={styles.dateInputGroup}>
                <Text style={styles.dateLabel}>Hasta:</Text>
                <TextInput
                  style={styles.dateInput}
                  placeholder="YYYY-MM-DD"
                  value={fechaHasta}
                  onChangeText={setFechaHasta}
                />
              </View>
            </View>
            
            {/* Botones de filtros rápidos */}
            <View style={styles.quickFiltersContainer}>
              <TouchableOpacity
                style={styles.quickFilterButton}
                onPress={() => setFiltroRapido(7)}
              >
                <Text style={styles.quickFilterText}>7 días</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.quickFilterButton}
                onPress={() => setFiltroRapido(30)}
              >                <Text style={styles.quickFilterText}>30 días</Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={styles.quickFilterButton}
                onPress={() => setFiltroRapido(90)}
              >
                <Text style={styles.quickFilterText}>90 días</Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={[styles.quickFilterButton, styles.clearFilterButton]}
                onPress={limpiarFiltrosFecha}
              >
                <Text style={[styles.quickFilterText, styles.clearFilterText]}>Limpiar</Text>
              </TouchableOpacity>
            </View>
            
            {/* Mostrar rango actual */}
            {(fechaDesde || fechaHasta) && (
              <View style={styles.currentFilterInfo}>
                <Text style={styles.currentFilterText}>
                  Filtro activo: {fechaDesde || 'Sin inicio'} → {fechaHasta || 'Sin fin'}
                </Text>
              </View>
            )}
          </View>
        )}
      </View>

      {/* Información de resultados */}
      {!loading && (
        <View style={styles.resultsInfo}>
          <Text style={styles.resultsText}>
            {datosFiltrados.length} entrega{datosFiltrados.length !== 1 ? 's' : ''} encontrada{datosFiltrados.length !== 1 ? 's' : ''}
            {(fechaDesde || fechaHasta) && ' (filtradas por fecha)'}
          </Text>
        </View>
      )}

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
          data={datosFiltrados} // Usar los datos filtrados y ordenados por fecha
          renderItem={renderEntrega}
          keyExtractor={generateKey}
          removeClippedSubviews={true}
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
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({  container: {
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
  },  connectionIndicator: {
    padding: 8,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
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
    borderWidth: 1,    borderColor: '#e0e0e0',
    borderRadius: 8,
    paddingHorizontal: 16,
    backgroundColor: 'white',
  },
  // Estilos de filtros eliminados
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
  // Se eliminaron estilos relacionados con el modal que ya no utilizamos
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
  },  entregaText: {
    fontSize: 14,
    color: '#444',
  },
  // Estilos para filtros de fecha
  filterContainer: {
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  filterToggleButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 12,
    backgroundColor: '#f8f9fa',
    marginHorizontal: 16,
    marginVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  filterToggleText: {
    fontSize: 16,
    color: '#2e78b7',
    fontWeight: '600',
    marginHorizontal: 8,
  },
  dateFilterContainer: {
    padding: 16,
    backgroundColor: '#f8f9fa',
  },
  dateInputsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  dateInputGroup: {
    flex: 1,
    marginHorizontal: 4,
  },
  dateLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  dateInput: {
    height: 40,
    borderWidth: 1,
    borderColor: '#d0d0d0',
    borderRadius: 6,
    paddingHorizontal: 12,
    backgroundColor: 'white',
    fontSize: 14,
  },
  quickFiltersContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 12,
  },
  quickFilterButton: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: '#2e78b7',
    borderRadius: 6,
    minWidth: 60,
    alignItems: 'center',
  },
  clearFilterButton: {
    backgroundColor: '#dc3545',
  },
  quickFilterText: {
    color: 'white',
    fontSize: 12,
    fontWeight: '600',
  },
  clearFilterText: {
    color: 'white',
  },
  currentFilterInfo: {
    backgroundColor: '#e3f2fd',
    padding: 8,
    borderRadius: 6,
    borderLeftWidth: 3,
    borderLeftColor: '#2e78b7',
  },  currentFilterText: {
    fontSize: 12,
    color: '#1565c0',
    fontWeight: '500',
  },
  resultsInfo: {
    backgroundColor: 'white',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  resultsText: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    fontStyle: 'italic',
  },
});