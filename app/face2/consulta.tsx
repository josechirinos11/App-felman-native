import Ionicons from '@expo/vector-icons/Ionicons';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import {
    ActivityIndicator,
    FlatList,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { API_URL } from '../../config/constants';

// Definir tipo para los resultados de la consulta SQL
interface ConsultaResult {
  [key: string]: any; // Permite cualquier estructura de datos de la BD
}

// Constante para las instrucciones personalizadas
const INSTRUCCIONES_PERSONALIZADAS = "para fechas usar fpresupuestos.FechaCreacion TABLE fpresupuestos:SELECT Serie, Numero, ClienteNombre, FechaCreacion / TABLE fpresupuestoslineas:SELECT CodigoSerie, CodigoNumero, Serie1Desc. DEVOLVER SIEMPRE:TABLE fpresupuestos: SELECT Serie, Numero, ClienteNombre, FechaCreacion . TABLE presupuestoslineas: SELECT CodigoSerie, CodigoNumero, Serie1Desc";

export default function ConsultaScreen() {
  const [searchQuery, setSearchQuery] = useState('');
  const [data, setData] = useState<ConsultaResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const router = useRouter();
  const pageSize = 20;
  // Función para realizar la consulta
  const handleConsulta = async () => {
    if (!searchQuery.trim()) {
      alert('Por favor ingresa un término de búsqueda');
      return;
    }

    setLoading(true);
    try {
      // Petición POST a la API de AI21
      const response = await fetch(`${API_URL}/ai21/consulta-completa`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          textoUsuario: searchQuery,
          instruccionesPersonalizadas: INSTRUCCIONES_PERSONALIZADAS
        })      });
      
      if (response.ok) {
        const result = await response.json();
        console.log('📊 Respuesta de la API:', result);
        
        // Acceder a los resultados desde la estructura anidada
        let resultados = [];
        if (result && result.data && Array.isArray(result.data.resultados)) {
          resultados = result.data.resultados;
        } else if (Array.isArray(result)) {
          resultados = result;
        } else if (result && typeof result === 'object') {
          resultados = [result];
        }
        
        if (resultados.length > 0) {
          setData(resultados);
          setCurrentPage(1); // Reiniciar paginación
        } else {
          setData([]);
          alert('No se encontraron resultados');
        }
      } else {
        console.error('Error en la consulta:', response.status);
        const errorText = await response.text();
        console.error('Error details:', errorText);
        setData([]);
        alert(`Error al realizar la consulta: ${response.status}`);
      }
    } catch (error) {
      console.error('Error al realizar consulta:', error);
      setData([]);
      alert('Error de conexión. Verifica tu internet y el servidor.');
    } finally {
      setLoading(false);
    }
  };
  // Función para regresar a la página anterior
  const handleGoBack = () => {
    router.back();
  };

  // Fragmentar datos para mostrar solo 20 por página
  const pagedData = data.slice(0, currentPage * pageSize);

  // handleEndReached para mostrar más (20 más)
  const handleEndReached = () => {
    if (!loading && pagedData.length < data.length) {
      setCurrentPage(prev => prev + 1);
    }
  };// Función auxiliar para renderizar valores complejos
  const renderValue = (value: any): string => {
    if (value === null || value === undefined) {
      return 'N/A';
    }
    
    if (typeof value === 'object') {
      if (Array.isArray(value)) {
        return value.length > 0 ? `[${value.length} elementos]` : '[]';
      }
      return JSON.stringify(value, null, 2);
    }
    
    return String(value);
  };

  // Función para determinar si un valor es un objeto complejo
  const isComplexValue = (value: any): boolean => {
    return value !== null && 
           value !== undefined && 
           typeof value === 'object' && 
           !Array.isArray(value);
  };

  // Componente para renderizar cada item del FlatList de forma dinámica
  const renderItem = ({ item, index }: { item: ConsultaResult; index: number }) => (
    <View style={styles.resultItem}>
      <Text style={styles.itemHeader}>Resultado {index + 1}</Text>
      {Object.entries(item).map(([key, value]) => (
        <View key={key} style={styles.fieldContainer}>
          <Text style={styles.fieldLabel}>{key}:</Text>
          {isComplexValue(value) ? (
            <View style={styles.complexValueContainer}>
              <Text style={styles.complexValueLabel}>Objeto:</Text>
              <View style={styles.nestedObjectContainer}>
                {Object.entries(value).map(([nestedKey, nestedValue]) => (
                  <View key={nestedKey} style={styles.nestedFieldContainer}>
                    <Text style={styles.nestedFieldLabel}>• {nestedKey}:</Text>
                    <Text style={styles.nestedFieldValue}>
                      {renderValue(nestedValue)}
                    </Text>
                  </View>
                ))}
              </View>
            </View>
          ) : (
            <Text style={styles.fieldValue}>
              {renderValue(value)}
            </Text>
          )}
        </View>
      ))}
    </View>
  );

  return (
    <View style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>Consultas de Usuario</Text>
        </View>

        {/* Input de búsqueda */}
        <View style={styles.searchContainer}>
          <Ionicons name="search-outline" size={20} color="#757575" style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder="Ingresa tu consulta..."
            placeholderTextColor="#9ca3af"
            value={searchQuery}
            onChangeText={setSearchQuery}
            selectionColor="#2e78b7"
          />
        </View>

        {/* Botón de consulta */}
        <TouchableOpacity
          style={[styles.consultaButton, loading && styles.buttonDisabled]}
          onPress={handleConsulta}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <Text style={styles.consultaButtonText}>Mostrar Información</Text>          )}
        </TouchableOpacity>

        {/* FlatList con resultados */}
        <View style={styles.resultsContainer}>
          {/* Indicador de página actual */}
          {data.length > 0 && (
            <Text style={styles.pageIndicator}>
              Mostrando {pagedData.length} de {data.length} resultados (Página {currentPage})
            </Text>
          )}
          
          {pagedData.length > 0 ? (
            <FlatList
              data={pagedData}
              renderItem={renderItem}
              keyExtractor={(item, index) => index.toString()}
              contentContainerStyle={styles.listContainer}
              showsVerticalScrollIndicator={false}
              initialNumToRender={20}
              maxToRenderPerBatch={20}
              windowSize={21}
              onEndReached={handleEndReached}
              onEndReachedThreshold={0.2}
              ListFooterComponent={
                loading ? (
                  <Text style={styles.loadingText}>Cargando...</Text>
                ) : pagedData.length < data.length ? (
                  <Text style={styles.loadMoreText}>Desliza para ver más...</Text>
                ) : data.length > 0 ? (
                  <Text style={styles.endText}>Fin del listado</Text>
                ) : null
              }
            />
          ) : (
            !loading && (
              <View style={styles.emptyContainer}>
                <Ionicons name="document-outline" size={48} color="#9ca3af" />
                <Text style={styles.emptyText}>
                  {searchQuery ? 'No se encontraron resultados' : 'Realiza una consulta para ver los resultados'}
                </Text>
              </View>
            )
          )}
        </View>

        {/* Botón Atrás */}
        <TouchableOpacity style={styles.backButton} onPress={handleGoBack}>
          <Ionicons name="arrow-back" size={20} color="#2e78b7" />
          <Text style={styles.backButtonText}>Atrás</Text>
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
  safeArea: {
    flex: 1,
    padding: 16,
  },
  header: {
    alignItems: 'center',
    marginBottom: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#2e78b7',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 12,
    paddingHorizontal: 15,
    paddingVertical: 5,
    marginBottom: 16,
    elevation: 3,
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
    fontSize: 16,
  },
  consultaButton: {
    backgroundColor: '#2e78b7',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 20,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  buttonDisabled: {
    opacity: 0.7,
  },
  consultaButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  resultsContainer: {
    flex: 1,
    marginBottom: 16,
  },
  listContainer: {
    paddingBottom: 16,
  },  resultItem: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  itemHeader: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#2e78b7',
    marginBottom: 8,
    textAlign: 'center',
  },
  fieldContainer: {
    flexDirection: 'row',
    marginBottom: 4,
    flexWrap: 'wrap',
  },
  fieldLabel: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#4a5568',
    minWidth: 80,
    marginRight: 8,
  },
  fieldValue: {
    fontSize: 14,
    color: '#2d3748',
    flex: 1,
  },
  complexValueContainer: {
    flex: 1,
    marginLeft: 8,
  },
  complexValueLabel: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#4a5568',
    marginBottom: 4,
  },
  nestedObjectContainer: {
    backgroundColor: '#f7fafc',
    borderRadius: 8,
    padding: 12,
    borderLeftWidth: 3,
    borderLeftColor: '#2e78b7',
  },
  nestedFieldContainer: {
    flexDirection: 'row',
    marginBottom: 2,
    flexWrap: 'wrap',
  },
  nestedFieldLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#4a5568',
    minWidth: 60,
    marginRight: 8,
  },
  nestedFieldValue: {
    fontSize: 13,
    color: '#2d3748',
    flex: 1,
  },
  itemTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#2e78b7',
    marginBottom: 4,
  },
  itemDescription: {
    fontSize: 14,
    color: '#4a5568',
    marginBottom: 8,
  },
  itemDate: {
    fontSize: 12,
    color: '#718096',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 16,
    color: '#9ca3af',
    textAlign: 'center',
    marginTop: 12,
  },
  pageIndicator: {
    textAlign: 'center',
    color: '#2e78b7',
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
    paddingHorizontal: 16,
  },
  loadingText: {
    textAlign: 'center',
    padding: 12,
    color: '#2e78b7',
    fontStyle: 'italic',
  },
  loadMoreText: {
    textAlign: 'center',
    padding: 12,
    color: '#2e78b7',
    fontWeight: '600',
  },
  endText: {
    textAlign: 'center',
    padding: 12,
    color: '#888',
    fontStyle: 'italic',
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fff',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 12,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  backButtonText: {
    color: '#2e78b7',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
});
