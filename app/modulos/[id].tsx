// app/modulos/[id].tsx
import Ionicons from '@expo/vector-icons/Ionicons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    RefreshControl,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

type IconName = React.ComponentProps<typeof Ionicons>['name'];

interface DBConfig {
  tipo: 'MySQL' | 'PostgreSQL' | 'SQL Server' | 'MongoDB';
  host: string;
  puerto: string;
  database: string;
  usuario: string;
  password: string;
}

interface ConfiguracionVista {
  columnasVisibles: string[];
  ordenColumnas: string[];
  registrosPorPagina: number;
}

interface QuerySQL {
  id: string;
  sql: string;
  params?: any[];
  stopOnEmpty?: boolean;
}

interface CustomModule {
  id: string;
  nombre: string;
  icono: IconName;
  consultaSQL: string; // Mantener por compatibilidad con módulos simples
  tipoConexion: 'api' | 'db';
  apiRestUrl: string;
  dbConfig?: DBConfig;
  rolesPermitidos: string[];
  configuracionVista?: ConfiguracionVista;
  fechaCreacion: string;
  // Nuevos campos para consultas múltiples
  usaConsultasMultiples?: boolean;
  consultasSQL?: QuerySQL[];
  queryIdPrincipal?: string; // ID de la query que se mostrará por defecto
}

interface DataRow {
  [key: string]: any;
}

export default function ModuloDetalleScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  
  const [modulo, setModulo] = useState<CustomModule | null>(null);
  const [datos, setDatos] = useState<DataRow[]>([]);
  const [columnas, setColumnas] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Cargar información del módulo
  useEffect(() => {
    cargarModulo();
  }, [id]);

  // Cargar datos cuando el módulo esté listo
  useEffect(() => {
    if (modulo) {
      cargarDatos();
    }
  }, [modulo]);

  const cargarModulo = async () => {
    try {
      console.log('🔍 Cargando módulo con ID:', id);
      const modulosJSON = await AsyncStorage.getItem('customModules');
      console.log('📦 Módulos en storage:', modulosJSON ? 'Encontrados' : 'No encontrados');
      
      if (modulosJSON) {
        const modulos: CustomModule[] = JSON.parse(modulosJSON);
        console.log('📊 Total de módulos:', modulos.length);
        
        const moduloEncontrado = modulos.find(m => m.id === id);
        
        if (moduloEncontrado) {
          console.log('✅ Módulo encontrado:', moduloEncontrado.nombre);
          console.log('🔹 usaConsultasMultiples:', moduloEncontrado.usaConsultasMultiples);
          console.log('🔹 consultasSQL:', moduloEncontrado.consultasSQL?.length || 0, 'consultas');
          console.log('🔹 queryIdPrincipal:', moduloEncontrado.queryIdPrincipal);
          setModulo(moduloEncontrado);
        } else {
          console.error('❌ Módulo no encontrado con ID:', id);
          setError('Módulo no encontrado');
        }
      } else {
        console.warn('⚠️ No hay módulos guardados en AsyncStorage');
        setError('No hay módulos guardados');
      }
    } catch (err) {
      console.error('❌ Error al cargar módulo:', err);
      setError('Error al cargar el módulo');
    }
  };

  const cargarDatos = async () => {
    if (!modulo) return;

    setLoading(true);
    setError(null);

    console.log('🔵 ========================================');
    console.log('🔵 INICIO DE CARGA DE DATOS DEL MÓDULO');
    console.log('🔵 ========================================');
    console.log('📋 Nombre del módulo:', modulo.nombre);
    console.log('🆔 ID del módulo:', modulo.id);
    console.log('🔌 Tipo de conexión:', modulo.tipoConexion);
    console.log('🌐 URL API:', modulo.apiRestUrl);
    console.log('📝 Consulta SQL:', modulo.consultaSQL);

    try {
      let response;
      let requestBody: any;

      // Determinar el tipo de conexión
      if (modulo.tipoConexion === 'api') {
        console.log('✅ Usando CONEXIÓN API REST');
        console.log('🔍 Verificando modo de consultas...');
        console.log('   - usaConsultasMultiples:', modulo.usaConsultasMultiples);
        console.log('   - consultasSQL existe:', !!modulo.consultasSQL);
        console.log('   - consultasSQL length:', modulo.consultasSQL?.length || 0);
        
        // Verificar si usa consultas múltiples
        if (modulo.usaConsultasMultiples === true && 
            modulo.consultasSQL && 
            Array.isArray(modulo.consultasSQL) && 
            modulo.consultasSQL.length > 0) {
          
          console.log('🔷 ========================================');
          console.log('🔷 MODO: CONSULTAS MÚLTIPLES (consultaMAYOR)');
          console.log('🔷 ========================================');
          console.log('🔷 Total de consultas:', modulo.consultasSQL.length);
          console.log('🔷 Query ID Principal:', modulo.queryIdPrincipal);
          
          // Formato para /consultaMAYOR
          requestBody = {
            queries: modulo.consultasSQL.map(q => ({
              id: q.id,
              sql: q.sql,
              params: q.params || [],
              stopOnEmpty: q.stopOnEmpty || false
            }))
          };
          
          console.log('📤 Request Body (Consultas Múltiples):');
          console.log(JSON.stringify(requestBody, null, 2));
          
          console.log('📋 Detalle de cada consulta:');
          requestBody.queries.forEach((q: any, idx: number) => {
            console.log(`   ▶️ Query ${idx + 1}:`);
            console.log(`      ID: ${q.id}`);
            console.log(`      SQL: ${q.sql.substring(0, 80)}${q.sql.length > 80 ? '...' : ''}`);
            console.log(`      Params: ${JSON.stringify(q.params)}`);
            console.log(`      stopOnEmpty: ${q.stopOnEmpty}`);
          });
          console.log('🔷 ========================================');
          
        } else {
          console.log('🔷 ========================================');
          console.log('🔷 MODO: CONSULTA SIMPLE');
          console.log('🔷 ========================================');
          console.log('🔷 Razones por las que se usa modo simple:');
          if (!modulo.usaConsultasMultiples) {
            console.log('   ❌ usaConsultasMultiples es false o undefined');
          }
          if (!modulo.consultasSQL) {
            console.log('   ❌ consultasSQL no existe');
          }
          if (modulo.consultasSQL && !Array.isArray(modulo.consultasSQL)) {
            console.log('   ❌ consultasSQL no es un array');
          }
          if (modulo.consultasSQL && modulo.consultasSQL.length === 0) {
            console.log('   ❌ consultasSQL está vacío');
          }
          
          // Formato simple para consulta única
          requestBody = {
            query: modulo.consultaSQL,
          };
          console.log('📤 Request Body (Consulta Simple):');
          console.log(JSON.stringify(requestBody, null, 2));
          console.log('🔷 ========================================');
        }
        
        // ✅ CONEXIÓN API REST - Formato correcto como en tus ejemplos
        response = await fetch(modulo.apiRestUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(requestBody),
        });
        
        console.log('📥 Response Status:', response.status);
        console.log('📥 Response OK:', response.ok);
        
      } else if (modulo.tipoConexion === 'db' && modulo.dbConfig) {
        console.log('✅ Usando CONEXIÓN DIRECTA A BASE DE DATOS');
        console.log('💾 Tipo de BD:', modulo.dbConfig.tipo);
        console.log('💾 Host:', modulo.dbConfig.host);
        console.log('💾 Puerto:', modulo.dbConfig.puerto);
        console.log('💾 Base de Datos:', modulo.dbConfig.database);
        console.log('💾 Usuario:', modulo.dbConfig.usuario);
        console.log('💾 Contraseña:', modulo.dbConfig.password ? '***oculta***' : 'NO CONFIGURADA');
        
        requestBody = {
          query: modulo.consultaSQL,
          dbConfig: {
            tipo: modulo.dbConfig.tipo,
            host: modulo.dbConfig.host,
            puerto: modulo.dbConfig.puerto,
            database: modulo.dbConfig.database,
            usuario: modulo.dbConfig.usuario,
            password: modulo.dbConfig.password,
          },
        };
        
        // Log del body sin la contraseña para seguridad
        const requestBodyLog = {
          ...requestBody,
          dbConfig: {
            ...requestBody.dbConfig,
            password: '***oculta***'
          }
        };
        console.log('📤 Request Body (BD Directa):', JSON.stringify(requestBodyLog, null, 2));
        
        // ✅ CONEXIÓN DIRECTA A BASE DE DATOS
        // Enviar configuración completa al backend para conexión directa
        response = await fetch(modulo.apiRestUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(requestBody),
        });
        
        console.log('📥 Response Status:', response.status);
        console.log('📥 Response OK:', response.ok);
        
      } else {
        console.error('❌ CONFIGURACIÓN DE CONEXIÓN INVÁLIDA');
        console.error('❌ tipoConexion:', modulo.tipoConexion);
        console.error('❌ dbConfig existe:', !!modulo.dbConfig);
        throw new Error('Configuración de conexión inválida');
      }

      if (!response.ok) {
        const errorText = await response.text();
        console.error('❌ ERROR HTTP');
        console.error('❌ Status Code:', response.status);
        console.error('❌ Status Text:', response.statusText);
        console.error('❌ Response Body:', errorText);
        throw new Error(`Error HTTP: ${response.status} - ${errorText}`);
      }

      const resultado = await response.json();
      console.log('📦 Respuesta recibida del servidor');
      console.log('📦 Tipo de respuesta:', typeof resultado);
      console.log('📦 Es array?:', Array.isArray(resultado));
      
      if (resultado && typeof resultado === 'object') {
        console.log('📦 Keys disponibles:', Object.keys(resultado));
        
        // Log de estructura detallada
        if (resultado.data) console.log('📦 resultado.data existe, tipo:', typeof resultado.data, 'es array?:', Array.isArray(resultado.data));
        if (resultado.rows) console.log('📦 resultado.rows existe, tipo:', typeof resultado.rows, 'es array?:', Array.isArray(resultado.rows));
        if (resultado.results) console.log('📦 resultado.results existe, tipo:', typeof resultado.results, 'es array?:', Array.isArray(resultado.results));
        
        // Log específico para consultas múltiples (consultaMAYOR)
        if (modulo.usaConsultasMultiples && resultado.results && typeof resultado.results === 'object') {
          console.log('📦 Respuesta de consultaMAYOR detectada');
          console.log('📦 Total de queries ejecutadas:', resultado.totalQueries);
          if (resultado.executionLog) {
            console.log('📦 Log de ejecución:');
            resultado.executionLog.forEach((log: any) => {
              console.log(`   ${log.id}: ${log.rowCount} registros en ${log.executionTime}`);
            });
          }
          
          // Log de cada resultado
          Object.keys(resultado.results).forEach(queryId => {
            const queryResult = resultado.results[queryId];
            console.log(`📦 Resultado de "${queryId}":`);
            console.log(`   rowCount: ${queryResult.rowCount}`);
            console.log(`   executionTime: ${queryResult.executionTime}`);
          });
        }
        
        // Log de posibles errores del servidor
        if (resultado.error) console.error('⚠️ Backend reportó error:', resultado.error);
        if (resultado.message) console.log('💬 Mensaje del backend:', resultado.message);
      }
      
      // Procesar los datos dependiendo de la estructura de respuesta
      let datosObtenidos: DataRow[] = [];
      
      if (Array.isArray(resultado)) {
        console.log('✅ Procesando respuesta: Array directo');
        datosObtenidos = resultado;
      } else if (modulo.usaConsultasMultiples && resultado.results) {
        // Formato consultaMAYOR: extraer la query principal
        const queryIdPrincipal = modulo.queryIdPrincipal || Object.keys(resultado.results)[0];
        console.log(`✅ Procesando respuesta: resultado.results["${queryIdPrincipal}"].data (consultaMAYOR)`);
        
        if (resultado.results[queryIdPrincipal]?.data) {
          datosObtenidos = resultado.results[queryIdPrincipal].data;
        } else {
          console.error(`❌ No se encontró la query principal "${queryIdPrincipal}" en los resultados`);
        }
      } else if (resultado.data && Array.isArray(resultado.data)) {
        console.log('✅ Procesando respuesta: resultado.data');
        datosObtenidos = resultado.data;
      } else if (resultado.rows && Array.isArray(resultado.rows)) {
        console.log('✅ Procesando respuesta: resultado.rows');
        datosObtenidos = resultado.rows;
      } else if (resultado.results && Array.isArray(resultado.results)) {
        console.log('✅ Procesando respuesta: resultado.results (array)');
        datosObtenidos = resultado.results;
      } else {
        console.warn('⚠️ No se encontró un array de datos en la respuesta');
        console.warn('⚠️ Estructura recibida:', JSON.stringify(resultado, null, 2));
      }

      console.log('📊 Total de registros obtenidos:', datosObtenidos.length);
      
      setDatos(datosObtenidos);

      // Extraer columnas del primer registro
      if (datosObtenidos.length > 0) {
        const primeraFila = datosObtenidos[0];
        const columnasExtraidas = Object.keys(primeraFila);
        console.log('📋 Columnas detectadas:', columnasExtraidas.join(', '));
        console.log('📋 Total de columnas:', columnasExtraidas.length);
        
        // Log de muestra de datos (primer registro)
        console.log('🔍 Muestra del primer registro:');
        columnasExtraidas.forEach(col => {
          console.log(`   ${col}:`, primeraFila[col]);
        });
        
        setColumnas(columnasExtraidas);
      } else {
        console.warn('⚠️ No se obtuvieron registros. La consulta no devolvió resultados.');
      }

      console.log('✅ ========================================');
      console.log('✅ CARGA COMPLETADA EXITOSAMENTE');
      console.log('✅ Registros cargados:', datosObtenidos.length);
      console.log('✅ ========================================');
      
    } catch (err: any) {
      console.error('❌ ========================================');
      console.error('❌ ERROR AL CARGAR DATOS');
      console.error('❌ ========================================');
      console.error('❌ Tipo de error:', err.constructor.name);
      console.error('❌ Mensaje:', err.message);
      console.error('❌ Stack trace:', err.stack);
      
      // Diagnóstico adicional
      if (err.message.includes('fetch')) {
        console.error('🔴 Error de conexión - posibles causas:');
        console.error('   1. URL incorrecta o inaccesible');
        console.error('   2. Backend no está corriendo');
        console.error('   3. Problema de CORS');
        console.error('   4. Red no disponible');
      }
      
      if (err.message.includes('JSON')) {
        console.error('🔴 Error al parsear JSON - posibles causas:');
        console.error('   1. Backend devolvió HTML en lugar de JSON');
        console.error('   2. Respuesta vacía del servidor');
        console.error('   3. Formato de respuesta incorrecto');
      }
      
      setError('Error al cargar los datos desde la API');
      Alert.alert(
        'Error de Conexión', 
        'No se pudieron cargar los datos. Revisa los logs de la consola para más detalles.\n\n' +
        `URL: ${modulo.apiRestUrl}\n` +
        `Error: ${err.message}`
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
      console.log('🔵 ========================================');
      console.log('🔵 FIN DEL PROCESO DE CARGA');
      console.log('🔵 ========================================\n');
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    cargarDatos();
  };

  const eliminarModulo = () => {
    Alert.alert(
      'Eliminar Módulo',
      `¿Estás seguro de que deseas eliminar el módulo "${modulo?.nombre}"?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Eliminar',
          style: 'destructive',
          onPress: async () => {
            try {
              const modulosJSON = await AsyncStorage.getItem('customModules');
              if (modulosJSON) {
                const modulos: CustomModule[] = JSON.parse(modulosJSON);
                const modulosFiltrados = modulos.filter(m => m.id !== id);
                await AsyncStorage.setItem('customModules', JSON.stringify(modulosFiltrados));
                console.log('✅ Módulo eliminado');
                router.back();
              }
            } catch (err) {
              console.error('❌ Error al eliminar módulo:', err);
              Alert.alert('Error', 'No se pudo eliminar el módulo');
            }
          },
        },
      ]
    );
  };

  if (loading && !modulo) {
    return (
      <View style={styles.loaderContainer}>
        <ActivityIndicator size="large" color="#2e78b7" />
      </View>
    );
  }

  if (error && !modulo) {
    return (
      <View style={styles.errorContainer}>
        <Ionicons name="alert-circle-outline" size={64} color="#e53e3e" />
        <Text style={styles.errorText}>{error}</Text>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <Text style={styles.backButtonText}>Volver</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <SafeAreaView style={styles.content}>
        {/* Encabezado */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.headerButton}>
            <Ionicons name="arrow-back-outline" size={24} color="#2e78b7" />
          </TouchableOpacity>
          <View style={styles.headerCenter}>
            <Ionicons name={modulo?.icono || 'apps-outline'} size={24} color="#2e78b7" />
            <Text style={styles.headerTitle}>{modulo?.nombre}</Text>
          </View>
          <View style={styles.headerActions}>
            <TouchableOpacity 
              onPress={() => router.push(`/modulos/configurarModulo?id=${id}`)} 
              style={styles.headerButton}
            >
              <Ionicons name="settings-outline" size={24} color="#2e78b7" />
            </TouchableOpacity>
            <TouchableOpacity onPress={eliminarModulo} style={styles.headerButton}>
              <Ionicons name="trash-outline" size={24} color="#e53e3e" />
            </TouchableOpacity>
          </View>
        </View>

        {/* Contenido */}
        {loading ? (
          <View style={styles.loaderContainer}>
            <ActivityIndicator size="large" color="#2e78b7" />
            <Text style={styles.loadingText}>Cargando datos...</Text>
          </View>
        ) : error ? (
          <View style={styles.errorContainer}>
            <Ionicons name="alert-circle-outline" size={64} color="#e53e3e" />
            <Text style={styles.errorText}>{error}</Text>
            <TouchableOpacity style={styles.retryButton} onPress={cargarDatos}>
              <Text style={styles.retryButtonText}>Reintentar</Text>
            </TouchableOpacity>
          </View>
        ) : datos.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Ionicons name="document-outline" size={64} color="#9ca3af" />
            <Text style={styles.emptyText}>No hay datos disponibles</Text>
          </View>
        ) : (
          <ScrollView
            style={styles.scrollView}
            refreshControl={
              <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#2e78b7']} />
            }
          >
            <View style={styles.dataContainer}>
              <Text style={styles.dataCount}>
                Total de registros: {datos.length}
              </Text>

              {/* Tabla de datos */}
              {datos.map((fila, index) => {
                // Determinar qué columnas mostrar según configuración
                const columnasAMostrar = modulo?.configuracionVista?.columnasVisibles && 
                                        modulo.configuracionVista.columnasVisibles.length > 0
                  ? modulo.configuracionVista.ordenColumnas || modulo.configuracionVista.columnasVisibles
                  : columnas;

                return (
                  <View key={index} style={styles.dataCard}>
                    <View style={styles.dataCardHeader}>
                      <Text style={styles.dataCardTitle}>Registro #{index + 1}</Text>
                    </View>
                    <View style={styles.dataCardBody}>
                      {columnasAMostrar.map((columna) => (
                        <View key={columna} style={styles.dataRow}>
                          <Text style={styles.dataLabel}>{columna}:</Text>
                          <Text style={styles.dataValue}>
                            {fila[columna] !== null && fila[columna] !== undefined
                              ? String(fila[columna])
                              : 'N/A'}
                          </Text>
                        </View>
                      ))}
                    </View>
                  </View>
                );
              })}
            </View>
          </ScrollView>
        )}
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f3f4f6',
  },
  content: {
    flex: 1,
    flexDirection: 'column',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#fff',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  headerButton: {
    padding: 8,
  },
  headerCenter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#2e78b7',
  },
  scrollView: {
    flex: 1,
  },
  loaderContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: '#6b7280',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  errorText: {
    marginTop: 16,
    fontSize: 16,
    color: '#e53e3e',
    textAlign: 'center',
  },
  backButton: {
    marginTop: 20,
    paddingHorizontal: 24,
    paddingVertical: 12,
    backgroundColor: '#2e78b7',
    borderRadius: 8,
  },
  backButtonText: {
    color: '#fff',
    fontWeight: '600',
  },
  retryButton: {
    marginTop: 20,
    paddingHorizontal: 24,
    paddingVertical: 12,
    backgroundColor: '#2e78b7',
    borderRadius: 8,
  },
  retryButtonText: {
    color: '#fff',
    fontWeight: '600',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  emptyText: {
    marginTop: 16,
    fontSize: 16,
    color: '#6b7280',
    textAlign: 'center',
  },
  dataContainer: {
    padding: 16,
  },
  dataCount: {
    fontSize: 14,
    fontWeight: '600',
    color: '#4a5568',
    marginBottom: 16,
  },
  dataCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    marginBottom: 12,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  dataCardHeader: {
    backgroundColor: '#e3eafc',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderTopLeftRadius: 12,
    borderTopRightRadius: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#d1d5db',
  },
  dataCardTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#2e78b7',
  },
  dataCardBody: {
    padding: 16,
  },
  dataRow: {
    flexDirection: 'row',
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  dataLabel: {
    flex: 1,
    fontSize: 13,
    fontWeight: '600',
    color: '#4a5568',
  },
  dataValue: {
    flex: 2,
    fontSize: 13,
    color: '#1f2937',
  },
});
