import Ionicons from '@expo/vector-icons/Ionicons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useEffect, useState } from 'react';
import { ActivityIndicator, FlatList, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
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
  Cliente: string;  Comercial: string;
}

export default function ControlEntregasDiariasScreen() {
  const [data, setData] = useState<Entrega[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [loading, setLoading] = useState(true);
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
          const userName = userData.nombre || userData.name;
          const userRole = userData.rol || userData.role;
          
          console.log('Nombre de usuario extraído:', userName);
          console.log('Rol de usuario extraído:', userRole);
          
          setUserName(userName);
          setUserRole(userRole);
        }
      } catch (e) {
        console.error('Error al obtener userData:', e);
      }
    };
    getUserData();
  }, []);const filtrarPorRolYBusqueda = (entregas: Entrega[]) => {
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

    // Filtrar por búsqueda
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      resultado = resultado.filter(e =>
        e.NoPedido.toLowerCase().includes(query) ||        e.Cliente.toLowerCase().includes(query) ||
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
      return fechaB - fechaA;
    });

    return resultado;
  };  // Eliminado renderItem ya que no se usa - ahora usamos renderEntrega
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
          year: 'numeric'
        });      } catch (error) {
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
    .reduce((acc: Entrega[], current) => {
      if (!current.FechaEnvio || !current.Id_Entrega) return acc;
      
      const exists = acc.find(
        item => 
          item.FechaEnvio === current.FechaEnvio
      );
      if (!exists) {
        acc.push(current);      }
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
    fetchEntregas(0);
  };
  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Entregas Diarias</Text>
        <TouchableOpacity
          onPress={handleRefresh}
          style={styles.refreshButton}        >
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
    borderColor: '#e0e0e0',    borderRadius: 8,
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
  loadingMoreText: {    textAlign: 'center',
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
  },
  entregaText: {
    fontSize: 14,
    color: '#444',
  },
});