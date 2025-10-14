// app/modulos/configurarModulo.tsx
import Ionicons from '@expo/vector-icons/Ionicons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    ScrollView,
    StyleSheet,
    Switch,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

type IconName = React.ComponentProps<typeof Ionicons>['name'];

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
  consultaSQL: string;
  apiRestUrl: string;
  fechaCreacion: string;
  tipoConexion: 'api' | 'directa';
  dbConfig?: {
    tipo: 'mysql' | 'postgresql' | 'sqlserver' | 'oracle';
    host: string;
    port: number;
    database: string;
    usuario: string;
    password: string;
  };
  rolesPermitidos: string[];
  configuracionVista?: {
    columnasVisibles?: string[];
    ordenColumnas?: string[];
    formatoColumnas?: { [key: string]: string };
    mostrarNumeroRegistro?: boolean;
    registrosPorPagina?: number;
  };
  // Campos para consultas múltiples
  usaConsultasMultiples?: boolean;
  consultasSQL?: QuerySQL[];
  queryIdPrincipal?: string;
}

export default function ConfigurarModuloScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  
  const [modulo, setModulo] = useState<CustomModule | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  
  // Estados de configuración del módulo (datos editables)
  const [nombre, setNombre] = useState('');
  const [icono, setIcono] = useState<IconName>('apps-outline');
  const [consultaSQL, setConsultaSQL] = useState('');
  const [tipoConexion, setTipoConexion] = useState<'api' | 'directa'>('api');
  const [apiRestUrl, setApiRestUrl] = useState('');
  
  // Estados de configuración DB
  const [dbTipo, setDbTipo] = useState<'mysql' | 'postgresql' | 'sqlserver' | 'oracle'>('mysql');
  const [dbHost, setDbHost] = useState('');
  const [dbPort, setDbPort] = useState('');
  const [dbDatabase, setDbDatabase] = useState('');
  const [dbUsuario, setDbUsuario] = useState('');
  const [dbPassword, setDbPassword] = useState('');
  
  // Estados de roles
  const [rolesSeleccionados, setRolesSeleccionados] = useState<string[]>([]);
  
  // Estados de configuración de vista
  const [columnasDisponibles, setColumnasDisponibles] = useState<string[]>([]);
  const [columnasVisibles, setColumnasVisibles] = useState<string[]>([]);
  const [mostrarNumeroRegistro, setMostrarNumeroRegistro] = useState(true);
  const [registrosPorPagina, setRegistrosPorPagina] = useState('50');
  
  // Estados para consultas múltiples
  const [usaConsultasMultiples, setUsaConsultasMultiples] = useState(false);
  const [consultasSQL, setConsultasSQL] = useState<QuerySQL[]>([]);
  const [queryIdPrincipal, setQueryIdPrincipal] = useState('');
  
  // Estados de UI
  const [mostrarSelectorIcono, setMostrarSelectorIcono] = useState(false);
  const [mostrarSelectorRoles, setMostrarSelectorRoles] = useState(false);
  const [mostrarSelectorQueryPrincipal, setMostrarSelectorQueryPrincipal] = useState(false);

  useEffect(() => {
    cargarModulo();
  }, [id]);

  useEffect(() => {
    if (modulo) {
      cargarConfiguracion();
    }
  }, [modulo]);

  const cargarModulo = async () => {
    try {
      const modulosJSON = await AsyncStorage.getItem('customModules');
      if (modulosJSON) {
        const modulos: CustomModule[] = JSON.parse(modulosJSON);
        const moduloEncontrado = modulos.find(m => m.id === id);
        
        if (moduloEncontrado) {
          setModulo(moduloEncontrado);
          
          // Cargar todos los datos en los estados para edición
          setNombre(moduloEncontrado.nombre);
          setIcono(moduloEncontrado.icono);
          setConsultaSQL(moduloEncontrado.consultaSQL);
          setTipoConexion(moduloEncontrado.tipoConexion);
          setApiRestUrl(moduloEncontrado.apiRestUrl);
          
          // Cargar config DB si existe
          if (moduloEncontrado.dbConfig) {
            setDbTipo(moduloEncontrado.dbConfig.tipo);
            setDbHost(moduloEncontrado.dbConfig.host);
            setDbPort(String(moduloEncontrado.dbConfig.port));
            setDbDatabase(moduloEncontrado.dbConfig.database);
            setDbUsuario(moduloEncontrado.dbConfig.usuario);
            setDbPassword(moduloEncontrado.dbConfig.password);
          }
          
          // Cargar roles
          setRolesSeleccionados(moduloEncontrado.rolesPermitidos || []);
          
          // Cargar configuración de consultas múltiples
          setUsaConsultasMultiples(moduloEncontrado.usaConsultasMultiples || false);
          setConsultasSQL(moduloEncontrado.consultasSQL || []);
          setQueryIdPrincipal(moduloEncontrado.queryIdPrincipal || '');
        } else {
          Alert.alert('Error', 'Módulo no encontrado');
          router.back();
        }
      }
    } catch (error) {
      console.error('❌ Error al cargar módulo:', error);
      Alert.alert('Error', 'No se pudo cargar el módulo');
    } finally {
      setLoading(false);
    }
  };

  const cargarConfiguracion = async () => {
    if (!modulo) return;

    try {
      // Obtener una muestra de datos para detectar columnas
      const response = await fetch(modulo.apiRestUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          query: `${modulo.consultaSQL} LIMIT 1`,
        }),
      });

      if (response.ok) {
        const resultado = await response.json();
        let datos = [];
        
        if (Array.isArray(resultado)) {
          datos = resultado;
        } else if (resultado.data) {
          datos = resultado.data;
        } else if (resultado.rows) {
          datos = resultado.rows;
        }

        if (datos.length > 0) {
          const columnas = Object.keys(datos[0]);
          setColumnasDisponibles(columnas);
          
          // Cargar configuración existente o usar todas las columnas por defecto
          if (modulo.configuracionVista?.columnasVisibles) {
            setColumnasVisibles(modulo.configuracionVista.columnasVisibles);
          } else {
            setColumnasVisibles(columnas);
          }
        }
      }

      // Cargar configuración de vista existente
      if (modulo.configuracionVista) {
        setMostrarNumeroRegistro(modulo.configuracionVista.mostrarNumeroRegistro ?? true);
        setRegistrosPorPagina(String(modulo.configuracionVista.registrosPorPagina ?? 50));
      }
    } catch (error) {
      console.error('❌ Error al cargar configuración:', error);
    }
  };

  const toggleColumna = (columna: string) => {
    if (columnasVisibles.includes(columna)) {
      // No permitir ocultar todas las columnas
      if (columnasVisibles.length === 1) {
        Alert.alert('Atención', 'Debe haber al menos una columna visible');
        return;
      }
      setColumnasVisibles(columnasVisibles.filter(c => c !== columna));
    } else {
      setColumnasVisibles([...columnasVisibles, columna]);
    }
  };

  const moverColumna = (columna: string, direccion: 'arriba' | 'abajo') => {
    const index = columnasVisibles.indexOf(columna);
    if (index === -1) return;

    const nuevasColumnas = [...columnasVisibles];
    
    if (direccion === 'arriba' && index > 0) {
      [nuevasColumnas[index - 1], nuevasColumnas[index]] = 
      [nuevasColumnas[index], nuevasColumnas[index - 1]];
    } else if (direccion === 'abajo' && index < nuevasColumnas.length - 1) {
      [nuevasColumnas[index], nuevasColumnas[index + 1]] = 
      [nuevasColumnas[index + 1], nuevasColumnas[index]];
    }
    
    setColumnasVisibles(nuevasColumnas);
  };

  const guardarConfiguracion = async () => {
    console.log('🟡 ========================================');
    console.log('🟡 ACTUALIZANDO MÓDULO EXISTENTE');
    console.log('🟡 ========================================');
    console.log('🆔 ID del módulo:', id);
    
    if (!modulo) {
      console.error('❌ No hay módulo cargado');
      return;
    }

    console.log('📋 Datos originales del módulo:', modulo.nombre);

    // Validaciones
    if (!nombre.trim()) {
      console.warn('⚠️ Validación falló: Nombre vacío');
      Alert.alert('Error', 'El nombre del módulo es obligatorio');
      return;
    }

    if (!usaConsultasMultiples && !consultaSQL.trim()) {
      console.warn('⚠️ Validación falló: Consulta SQL vacía');
      Alert.alert('Error', 'La consulta SQL es obligatoria');
      return;
    }

    if (usaConsultasMultiples) {
      if (consultasSQL.length === 0) {
        console.warn('⚠️ Validación falló: No hay consultas múltiples');
        Alert.alert('Error', 'Debe agregar al menos una consulta');
        return;
      }

      // Validar que todas las consultas tengan ID y SQL
      for (let i = 0; i < consultasSQL.length; i++) {
        if (!consultasSQL[i].id.trim()) {
          console.warn(`⚠️ Validación falló: Consulta ${i + 1} sin ID`);
          Alert.alert('Error', `La consulta #${i + 1} debe tener un ID`);
          return;
        }
        if (!consultasSQL[i].sql.trim()) {
          console.warn(`⚠️ Validación falló: Consulta ${i + 1} sin SQL`);
          Alert.alert('Error', `La consulta #${i + 1} debe tener SQL`);
          return;
        }
      }

      // Validar IDs únicos
      const ids = consultasSQL.map(c => c.id);
      const idsUnicos = new Set(ids);
      if (ids.length !== idsUnicos.size) {
        console.warn('⚠️ Validación falló: IDs duplicados en consultas');
        Alert.alert('Error', 'Los IDs de las consultas deben ser únicos');
        return;
      }

      // Validar que se haya seleccionado un query principal
      if (!queryIdPrincipal) {
        console.warn('⚠️ Validación falló: No se seleccionó query principal');
        Alert.alert('Error', 'Debe seleccionar una consulta principal para mostrar');
        return;
      }
    }

    if (!apiRestUrl.trim()) {
      console.warn('⚠️ Validación falló: URL API vacía');
      Alert.alert('Error', 'La URL de la API es obligatoria');
      return;
    }

    if (tipoConexion === 'directa') {
      if (!dbHost.trim() || !dbPort.trim() || !dbDatabase.trim() || !dbUsuario.trim()) {
        console.warn('⚠️ Validación falló: Campos de BD incompletos');
        Alert.alert('Error', 'Todos los campos de configuración de BD son obligatorios');
        return;
      }
    }

    if (rolesSeleccionados.length === 0) {
      console.warn('⚠️ Validación falló: No hay roles seleccionados');
      Alert.alert('Error', 'Debe seleccionar al menos un rol con acceso al módulo');
      return;
    }

    console.log('✅ Todas las validaciones pasaron');

    setSaving(true);
    try {
      const modulosJSON = await AsyncStorage.getItem('customModules');
      if (!modulosJSON) {
        console.error('❌ No se encontraron módulos en AsyncStorage');
        return;
      }

      const modulos: CustomModule[] = JSON.parse(modulosJSON);
      console.log('💾 Total de módulos en storage:', modulos.length);
      
      const index = modulos.findIndex(m => m.id === id);
      
      if (index === -1) {
        console.error('❌ Módulo no encontrado en el array. ID buscado:', id);
        Alert.alert('Error', 'Módulo no encontrado');
        return;
      }

      console.log('📍 Módulo encontrado en índice:', index);
      console.log('📝 Cambios a aplicar:');
      console.log('   Nombre:', modulo.nombre, '→', nombre.trim());
      console.log('   Consulta SQL actualizada:', consultaSQL.trim().substring(0, 50) + '...');
      console.log('   Tipo Conexión:', tipoConexion);
      console.log('   URL API:', apiRestUrl.trim());
      console.log('   Roles:', rolesSeleccionados.join(', '));

      // Actualizar TODOS los datos del módulo
      modulos[index] = {
        ...modulos[index],
        nombre: nombre.trim(),
        icono,
        consultaSQL: consultaSQL.trim(),
        tipoConexion,
        apiRestUrl: apiRestUrl.trim(),
        dbConfig: tipoConexion === 'directa' ? {
          tipo: dbTipo,
          host: dbHost.trim(),
          port: parseInt(dbPort),
          database: dbDatabase.trim(),
          usuario: dbUsuario.trim(),
          password: dbPassword.trim(),
        } : undefined,
        rolesPermitidos: rolesSeleccionados,
        configuracionVista: {
          columnasVisibles,
          ordenColumnas: columnasVisibles,
          mostrarNumeroRegistro,
          registrosPorPagina: parseInt(registrosPorPagina) || 50,
        },
        // Guardar configuración de consultas múltiples
        usaConsultasMultiples,
        consultasSQL: usaConsultasMultiples ? consultasSQL : undefined,
        queryIdPrincipal: usaConsultasMultiples ? queryIdPrincipal : undefined,
      };

      if (tipoConexion === 'directa' && modulos[index].dbConfig) {
        console.log('💾 Configuración BD actualizada:');
        console.log('   Tipo:', modulos[index].dbConfig?.tipo);
        console.log('   Host:', modulos[index].dbConfig?.host);
        console.log('   Puerto:', modulos[index].dbConfig?.port);
        console.log('   Database:', modulos[index].dbConfig?.database);
        console.log('   Usuario:', modulos[index].dbConfig?.usuario);
      }

      console.log('👁️ Configuración de vista:');
      console.log('   Columnas visibles:', columnasVisibles.length);
      console.log('   Registros por página:', parseInt(registrosPorPagina) || 50);

      await AsyncStorage.setItem('customModules', JSON.stringify(modulos));

      console.log('✅ Módulo actualizado exitosamente en AsyncStorage');
      console.log('✅ ========================================\n');

      Alert.alert(
        'Éxito',
        'Módulo actualizado correctamente',
        [{ text: 'OK', onPress: () => router.back() }]
      );
    } catch (error: any) {
      console.error('❌ ========================================');
      console.error('❌ ERROR AL ACTUALIZAR MÓDULO');
      console.error('❌ ========================================');
      console.error('❌ Tipo de error:', error.constructor?.name);
      console.error('❌ Mensaje:', error.message);
      console.error('❌ Stack:', error.stack);
      console.error('❌ ========================================\n');
      Alert.alert('Error', 'No se pudo guardar el módulo: ' + error.message);
    } finally {
      setSaving(false);
    }
  };

  // Funciones auxiliares para selectores
  const toggleRol = (rol: string) => {
    if (rol === 'Todos') {
      setRolesSeleccionados(['Todos']);
    } else {
      const nuevosRoles = rolesSeleccionados.includes(rol)
        ? rolesSeleccionados.filter(r => r !== rol)
        : [...rolesSeleccionados.filter(r => r !== 'Todos'), rol];
      setRolesSeleccionados(nuevosRoles);
    }
  };

  // Funciones para manejar consultas múltiples
  const agregarConsulta = () => {
    const nuevaConsulta: QuerySQL = {
      id: `query${consultasSQL.length + 1}`,
      sql: '',
      params: [],
      stopOnEmpty: false,
    };
    setConsultasSQL([...consultasSQL, nuevaConsulta]);
  };

  const eliminarConsulta = (index: number) => {
    if (consultasSQL.length === 1) {
      Alert.alert('Atención', 'Debe haber al menos una consulta');
      return;
    }
    const nuevasConsultas = consultasSQL.filter((_, i) => i !== index);
    setConsultasSQL(nuevasConsultas);
    
    // Si se eliminó el query principal, seleccionar el primero
    if (consultasSQL[index].id === queryIdPrincipal && nuevasConsultas.length > 0) {
      setQueryIdPrincipal(nuevasConsultas[0].id);
    }
  };

  const actualizarConsulta = (index: number, campo: keyof QuerySQL, valor: any) => {
    const nuevasConsultas = [...consultasSQL];
    nuevasConsultas[index] = { ...nuevasConsultas[index], [campo]: valor };
    setConsultasSQL(nuevasConsultas);
  };

  const rolesDisponibles = [
    'Administrador',
    'Gerente',
    'Supervisor',
    'Operario',
    'Logística',
    'Almacén',
    'Ventas',
    'Comercial',
    'Todos',
  ];

  const iconosDisponibles: IconName[] = [
    'apps-outline',
    'briefcase-outline',
    'bar-chart-outline',
    'clipboard-outline',
    'cube-outline',
    'document-text-outline',
    'folder-outline',
    'grid-outline',
    'list-outline',
    'people-outline',
    'pie-chart-outline',
    'settings-outline',
    'stats-chart-outline',
    'file-tray-full-outline',
    'cart-outline',
    'calendar-outline',
    'cash-outline',
    'card-outline',
    'construct-outline',
    'hammer-outline',
    'analytics-outline',
    'calculator-outline',
    'layers-outline',
    'server-outline',
    'archive-outline',
  ];

  if (loading) {
    return (
      <View style={styles.loaderContainer}>
        <ActivityIndicator size="large" color="#2e78b7" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <SafeAreaView style={styles.content}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.headerButton}>
            <Ionicons name="arrow-back-outline" size={24} color="#2e78b7" />
          </TouchableOpacity>
          <View style={styles.headerCenter}>
            <Ionicons name="cog-outline" size={24} color="#2e78b7" />
            <Text style={styles.headerTitle}>Editar Módulo</Text>
          </View>
          <View style={styles.placeholder} />
        </View>

        {/* Contenido */}
        <ScrollView style={styles.scrollView}>
          <View style={styles.formContainer}>
            
            {/* SECCIÓN 1: Información Básica */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>📋 Información Básica</Text>

              <View style={styles.fieldContainer}>
                <Text style={styles.label}>Nombre del Módulo *</Text>
                <TextInput
                  style={styles.input}
                  value={nombre}
                  onChangeText={setNombre}
                  placeholder="Ej: Reporte de Ventas"
                  placeholderTextColor="#9ca3af"
                />
              </View>

              <View style={styles.fieldContainer}>
                <Text style={styles.label}>Icono *</Text>
                <TouchableOpacity
                  style={styles.selector}
                  onPress={() => setMostrarSelectorIcono(true)}
                >
                  <View style={styles.selectorContent}>
                    <Ionicons name={icono} size={24} color="#2e78b7" />
                    <Text style={styles.selectorText}>{icono}</Text>
                  </View>
                  <Ionicons name="chevron-down-outline" size={20} color="#9ca3af" />
                </TouchableOpacity>
              </View>
            </View>

            {/* SECCIÓN 2: Consulta SQL */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>💾 Consulta SQL</Text>

              {/* Toggle para consultas múltiples */}
              <View style={styles.switchRow}>
                <View style={styles.switchLabelContainer}>
                  <Text style={styles.switchLabel}>Usar Consultas Múltiples</Text>
                  <Text style={styles.helpText}>
                    Permite ejecutar varias consultas relacionadas (formato /consultaMAYOR)
                  </Text>
                </View>
                <Switch
                  value={usaConsultasMultiples}
                  onValueChange={(value) => {
                    setUsaConsultasMultiples(value);
                    if (value && consultasSQL.length === 0) {
                      // Inicializar con una consulta vacía
                      setConsultasSQL([{ id: 'query1', sql: '', params: [], stopOnEmpty: false }]);
                      setQueryIdPrincipal('query1');
                    }
                  }}
                  trackColor={{ false: '#d1d5db', true: '#93c5fd' }}
                  thumbColor={usaConsultasMultiples ? '#2e78b7' : '#f4f3f4'}
                />
              </View>

              {!usaConsultasMultiples ? (
                // Consulta SQL Simple
                <View style={styles.fieldContainer}>
                  <Text style={styles.label}>Consulta SQL *</Text>
                  <TextInput
                    style={[styles.input, styles.textArea]}
                    value={consultaSQL}
                    onChangeText={setConsultaSQL}
                    placeholder="SELECT * FROM tabla WHERE condicion"
                    placeholderTextColor="#9ca3af"
                    multiline
                    numberOfLines={6}
                  />
                  <Text style={styles.helpText}>
                    Escribe la consulta SQL que traerá los datos del módulo
                  </Text>
                </View>
              ) : (
                // Consultas Múltiples
                <View style={styles.fieldContainer}>
                  <View style={styles.multiQueryHeader}>
                    <Text style={styles.label}>Consultas SQL ({consultasSQL.length})</Text>
                    <TouchableOpacity
                      style={styles.addQueryButton}
                      onPress={agregarConsulta}
                    >
                      <Ionicons name="add-circle" size={24} color="#2e78b7" />
                      <Text style={styles.addQueryText}>Agregar Consulta</Text>
                    </TouchableOpacity>
                  </View>

                  {consultasSQL.map((consulta, index) => (
                    <View key={index} style={styles.queryCard}>
                      <View style={styles.queryCardHeader}>
                        <Text style={styles.queryCardTitle}>Consulta #{index + 1}</Text>
                        {consultasSQL.length > 1 && (
                          <TouchableOpacity onPress={() => eliminarConsulta(index)}>
                            <Ionicons name="trash-outline" size={20} color="#ef4444" />
                          </TouchableOpacity>
                        )}
                      </View>

                      <View style={styles.queryCardContent}>
                        <View style={styles.fieldContainer}>
                          <Text style={styles.label}>ID de Consulta *</Text>
                          <TextInput
                            style={styles.input}
                            value={consulta.id}
                            onChangeText={(value) => actualizarConsulta(index, 'id', value)}
                            placeholder="query1, query2, etc."
                            placeholderTextColor="#9ca3af"
                          />
                          <Text style={styles.helpText}>
                            Identificador único para referenciar esta consulta
                          </Text>
                        </View>

                        <View style={styles.fieldContainer}>
                          <Text style={styles.label}>SQL *</Text>
                          <TextInput
                            style={[styles.input, styles.textArea]}
                            value={consulta.sql}
                            onChangeText={(value) => actualizarConsulta(index, 'sql', value)}
                            placeholder="SELECT * FROM tabla WHERE id = {{query1[0].id}}"
                            placeholderTextColor="#9ca3af"
                            multiline
                            numberOfLines={4}
                          />
                          <Text style={styles.helpText}>
                            Usa {`{{queryId[index].campo}}`} para referenciar resultados de consultas anteriores
                          </Text>
                        </View>

                        <View style={styles.fieldContainer}>
                          <Text style={styles.label}>Parámetros (JSON opcional)</Text>
                          <TextInput
                            style={styles.input}
                            value={JSON.stringify(consulta.params || [])}
                            onChangeText={(value) => {
                              try {
                                const parsed = JSON.parse(value);
                                actualizarConsulta(index, 'params', parsed);
                              } catch (e) {
                                // Ignorar errores de parsing mientras escribe
                              }
                            }}
                            placeholder='["valor1", "valor2"]'
                            placeholderTextColor="#9ca3af"
                          />
                        </View>

                        <View style={styles.switchRow}>
                          <Text style={styles.switchLabel}>Detener si no hay resultados</Text>
                          <Switch
                            value={consulta.stopOnEmpty || false}
                            onValueChange={(value) => actualizarConsulta(index, 'stopOnEmpty', value)}
                            trackColor={{ false: '#d1d5db', true: '#93c5fd' }}
                            thumbColor={consulta.stopOnEmpty ? '#2e78b7' : '#f4f3f4'}
                          />
                        </View>
                      </View>
                    </View>
                  ))}

                  {/* Selector de Query Principal */}
                  {consultasSQL.length > 0 && (
                    <View style={styles.fieldContainer}>
                      <Text style={styles.label}>Consulta Principal para Mostrar *</Text>
                      <TouchableOpacity
                        style={styles.selector}
                        onPress={() => setMostrarSelectorQueryPrincipal(true)}
                      >
                        <Text style={styles.selectorText}>
                          {queryIdPrincipal || 'Seleccionar consulta'}
                        </Text>
                        <Ionicons name="chevron-down-outline" size={20} color="#9ca3af" />
                      </TouchableOpacity>
                      <Text style={styles.helpText}>
                        Los datos de esta consulta se mostrarán en la tabla del módulo
                      </Text>
                    </View>
                  )}
                </View>
              )}
            </View>

            {/* SECCIÓN 3: Configuración de Conexión */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>🔌 Configuración de Conexión</Text>

              <View style={styles.fieldContainer}>
                <Text style={styles.label}>Tipo de Conexión *</Text>
                <View style={styles.radioGroup}>
                  <TouchableOpacity
                    style={styles.radioOption}
                    onPress={() => setTipoConexion('api')}
                  >
                    <Ionicons
                      name={tipoConexion === 'api' ? 'radio-button-on' : 'radio-button-off'}
                      size={24}
                      color="#2e78b7"
                    />
                    <Text style={styles.radioText}>API REST</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.radioOption}
                    onPress={() => setTipoConexion('directa')}
                  >
                    <Ionicons
                      name={tipoConexion === 'directa' ? 'radio-button-on' : 'radio-button-off'}
                      size={24}
                      color="#2e78b7"
                    />
                    <Text style={styles.radioText}>Conexión Directa a BD</Text>
                  </TouchableOpacity>
                </View>
              </View>

              <View style={styles.fieldContainer}>
                <Text style={styles.label}>URL de la API *</Text>
                <TextInput
                  style={styles.input}
                  value={apiRestUrl}
                  onChangeText={setApiRestUrl}
                  placeholder="https://api.ejemplo.com/consulta"
                  placeholderTextColor="#9ca3af"
                  keyboardType="url"
                  autoCapitalize="none"
                />
              </View>

              {tipoConexion === 'directa' && (
                <>
                  <View style={styles.fieldContainer}>
                    <Text style={styles.label}>Tipo de Base de Datos *</Text>
                    <View style={styles.radioGroup}>
                      {(['mysql', 'postgresql', 'sqlserver', 'oracle'] as const).map((tipo) => (
                        <TouchableOpacity
                          key={tipo}
                          style={styles.radioOption}
                          onPress={() => setDbTipo(tipo)}
                        >
                          <Ionicons
                            name={dbTipo === tipo ? 'radio-button-on' : 'radio-button-off'}
                            size={20}
                            color="#2e78b7"
                          />
                          <Text style={styles.radioText}>{tipo.toUpperCase()}</Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  </View>

                  <View style={styles.fieldContainer}>
                    <Text style={styles.label}>Host *</Text>
                    <TextInput
                      style={styles.input}
                      value={dbHost}
                      onChangeText={setDbHost}
                      placeholder="localhost"
                      placeholderTextColor="#9ca3af"
                      autoCapitalize="none"
                    />
                  </View>

                  <View style={styles.fieldContainer}>
                    <Text style={styles.label}>Puerto *</Text>
                    <TextInput
                      style={styles.input}
                      value={dbPort}
                      onChangeText={setDbPort}
                      placeholder="3306"
                      placeholderTextColor="#9ca3af"
                      keyboardType="number-pad"
                    />
                  </View>

                  <View style={styles.fieldContainer}>
                    <Text style={styles.label}>Base de Datos *</Text>
                    <TextInput
                      style={styles.input}
                      value={dbDatabase}
                      onChangeText={setDbDatabase}
                      placeholder="nombre_bd"
                      placeholderTextColor="#9ca3af"
                      autoCapitalize="none"
                    />
                  </View>

                  <View style={styles.fieldContainer}>
                    <Text style={styles.label}>Usuario *</Text>
                    <TextInput
                      style={styles.input}
                      value={dbUsuario}
                      onChangeText={setDbUsuario}
                      placeholder="usuario"
                      placeholderTextColor="#9ca3af"
                      autoCapitalize="none"
                    />
                  </View>

                  <View style={styles.fieldContainer}>
                    <Text style={styles.label}>Contraseña *</Text>
                    <TextInput
                      style={styles.input}
                      value={dbPassword}
                      onChangeText={setDbPassword}
                      placeholder="••••••••"
                      placeholderTextColor="#9ca3af"
                      secureTextEntry
                      autoCapitalize="none"
                    />
                  </View>
                </>
              )}
            </View>

            {/* SECCIÓN 4: Roles con Acceso */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>👥 Roles con Acceso</Text>

              <View style={styles.fieldContainer}>
                <Text style={styles.label}>Roles Permitidos *</Text>
                <TouchableOpacity
                  style={styles.selector}
                  onPress={() => setMostrarSelectorRoles(true)}
                >
                  <Text style={styles.selectorText}>
                    {rolesSeleccionados.length > 0
                      ? `${rolesSeleccionados.length} roles seleccionados`
                      : 'Seleccionar roles'}
                  </Text>
                  <Ionicons name="chevron-down-outline" size={20} color="#9ca3af" />
                </TouchableOpacity>
                {rolesSeleccionados.length > 0 && (
                  <Text style={styles.helpText}>
                    Roles: {rolesSeleccionados.join(', ')}
                  </Text>
                )}
              </View>
            </View>

            {/* SECCIÓN 5: Configuración de Vista (Columnas) */}
            {columnasDisponibles.length > 0 && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>👁️ Columnas Visibles</Text>
                <Text style={styles.helpText}>
                  Selecciona las columnas que deseas mostrar y su orden
                </Text>

                {columnasDisponibles.map((columna) => (
                <View key={columna} style={styles.columnaItem}>
                  <TouchableOpacity
                    style={styles.checkbox}
                    onPress={() => toggleColumna(columna)}
                  >
                    <View style={[
                      styles.checkboxInner,
                      columnasVisibles.includes(columna) && styles.checkboxChecked
                    ]}>
                      {columnasVisibles.includes(columna) && (
                        <Ionicons name="checkmark" size={16} color="#fff" />
                      )}
                    </View>
                    <Text style={styles.columnaText}>{columna}</Text>
                  </TouchableOpacity>

                  {columnasVisibles.includes(columna) && (
                    <View style={styles.ordenControls}>
                      <TouchableOpacity
                        onPress={() => moverColumna(columna, 'arriba')}
                        disabled={columnasVisibles.indexOf(columna) === 0}
                        style={styles.ordenButton}
                      >
                        <Ionicons 
                          name="chevron-up" 
                          size={20} 
                          color={columnasVisibles.indexOf(columna) === 0 ? '#d1d5db' : '#2e78b7'} 
                        />
                      </TouchableOpacity>
                      <TouchableOpacity
                        onPress={() => moverColumna(columna, 'abajo')}
                        disabled={columnasVisibles.indexOf(columna) === columnasVisibles.length - 1}
                        style={styles.ordenButton}
                      >
                        <Ionicons 
                          name="chevron-down" 
                          size={20} 
                          color={columnasVisibles.indexOf(columna) === columnasVisibles.length - 1 ? '#d1d5db' : '#2e78b7'} 
                        />
                      </TouchableOpacity>
                    </View>
                  )}
                </View>
                ))}
              </View>
            )}

            {/* SECCIÓN 6: Opciones de visualización */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Opciones de Visualización</Text>

              <View style={styles.switchRow}>
                <Text style={styles.switchLabel}>Mostrar número de registro</Text>
                <Switch
                  value={mostrarNumeroRegistro}
                  onValueChange={setMostrarNumeroRegistro}
                  trackColor={{ false: '#d1d5db', true: '#93c5fd' }}
                  thumbColor={mostrarNumeroRegistro ? '#2e78b7' : '#f4f3f4'}
                />
              </View>

              <View style={styles.fieldContainer}>
                <Text style={styles.label}>Registros por página</Text>
                <TextInput
                  style={styles.input}
                  value={registrosPorPagina}
                  onChangeText={setRegistrosPorPagina}
                  keyboardType="number-pad"
                  placeholder="50"
                  placeholderTextColor="#9ca3af"
                />
                <Text style={styles.helpText}>
                  Cantidad de registros a mostrar a la vez
                </Text>
              </View>
            </View>

            {/* Botones */}
            <View style={styles.buttonContainer}>
              <TouchableOpacity
                style={[styles.button, styles.cancelButton]}
                onPress={() => router.back()}
                disabled={saving}
              >
                <Text style={styles.cancelButtonText}>Cancelar</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.button, styles.saveButton]}
                onPress={guardarConfiguracion}
                disabled={saving}
              >
                {saving ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.saveButtonText}>Guardar Cambios</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </ScrollView>

        {/* Modal: Selector de Iconos */}
        {mostrarSelectorIcono && (
          <View style={styles.modalOverlay}>
            <TouchableOpacity
              style={styles.modalBackground}
              activeOpacity={1}
              onPress={() => setMostrarSelectorIcono(false)}
            >
              <View style={styles.modalContent} onStartShouldSetResponder={() => true}>
                <View style={styles.modalHeader}>
                  <Text style={styles.modalTitle}>Seleccionar Icono</Text>
                  <TouchableOpacity onPress={() => setMostrarSelectorIcono(false)}>
                    <Ionicons name="close-outline" size={24} color="#4a5568" />
                  </TouchableOpacity>
                </View>

                <ScrollView style={styles.modalList}>
                  {iconosDisponibles.map((iconoItem) => (
                    <TouchableOpacity
                      key={iconoItem}
                      style={[
                        styles.modalOption,
                        icono === iconoItem && styles.modalOptionSelected,
                      ]}
                      onPress={() => {
                        setIcono(iconoItem);
                        setMostrarSelectorIcono(false);
                      }}
                    >
                      <Ionicons name={iconoItem} size={24} color="#2e78b7" />
                      <Text style={styles.modalOptionText}>{iconoItem}</Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>

                <View style={styles.modalFooter}>
                  <TouchableOpacity
                    style={styles.modalButton}
                    onPress={() => setMostrarSelectorIcono(false)}
                  >
                    <Text style={styles.modalButtonText}>Cerrar</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </TouchableOpacity>
          </View>
        )}

        {/* Modal: Selector de Roles */}
        {mostrarSelectorRoles && (
          <View style={styles.modalOverlay}>
            <TouchableOpacity
              style={styles.modalBackground}
              activeOpacity={1}
              onPress={() => setMostrarSelectorRoles(false)}
            >
              <View style={styles.modalContent} onStartShouldSetResponder={() => true}>
                <View style={styles.modalHeader}>
                  <Text style={styles.modalTitle}>Seleccionar Roles</Text>
                  <TouchableOpacity onPress={() => setMostrarSelectorRoles(false)}>
                    <Ionicons name="close-outline" size={24} color="#4a5568" />
                  </TouchableOpacity>
                </View>

                <ScrollView style={styles.modalList}>
                  {rolesDisponibles.map((rol) => (
                    <TouchableOpacity
                      key={rol}
                      style={[
                        styles.modalOption,
                        rolesSeleccionados.includes(rol) && styles.modalOptionSelected,
                      ]}
                      onPress={() => toggleRol(rol)}
                    >
                      <View style={styles.checkbox}>
                        {rolesSeleccionados.includes(rol) && (
                          <Ionicons name="checkmark" size={16} color="#fff" />
                        )}
                      </View>
                      <Text style={styles.modalOptionText}>{rol}</Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>

                <View style={styles.modalFooter}>
                  <TouchableOpacity
                    style={styles.modalButton}
                    onPress={() => setMostrarSelectorRoles(false)}
                  >
                    <Text style={styles.modalButtonText}>Listo</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </TouchableOpacity>
          </View>
        )}

        {/* Modal: Selector de Query Principal */}
        {mostrarSelectorQueryPrincipal && (
          <View style={styles.modalOverlay}>
            <TouchableOpacity
              style={styles.modalBackground}
              activeOpacity={1}
              onPress={() => setMostrarSelectorQueryPrincipal(false)}
            >
              <View style={styles.modalContent} onStartShouldSetResponder={() => true}>
                <View style={styles.modalHeader}>
                  <Text style={styles.modalTitle}>Seleccionar Consulta Principal</Text>
                  <TouchableOpacity onPress={() => setMostrarSelectorQueryPrincipal(false)}>
                    <Ionicons name="close-outline" size={24} color="#4a5568" />
                  </TouchableOpacity>
                </View>

                <ScrollView style={styles.modalList}>
                  {consultasSQL.map((consulta, index) => (
                    <TouchableOpacity
                      key={consulta.id}
                      style={[
                        styles.modalOption,
                        queryIdPrincipal === consulta.id && styles.modalOptionSelected,
                      ]}
                      onPress={() => {
                        setQueryIdPrincipal(consulta.id);
                        setMostrarSelectorQueryPrincipal(false);
                      }}
                    >
                      <View style={styles.checkbox}>
                        {queryIdPrincipal === consulta.id && (
                          <Ionicons name="checkmark" size={16} color="#fff" />
                        )}
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.modalOptionText}>{consulta.id}</Text>
                        <Text style={[styles.helpText, { marginTop: 4 }]}>
                          {consulta.sql.substring(0, 60)}{consulta.sql.length > 60 ? '...' : ''}
                        </Text>
                      </View>
                    </TouchableOpacity>
                  ))}
                </ScrollView>

                <View style={styles.modalFooter}>
                  <TouchableOpacity
                    style={styles.modalButton}
                    onPress={() => setMostrarSelectorQueryPrincipal(false)}
                  >
                    <Text style={styles.modalButtonText}>Listo</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </TouchableOpacity>
          </View>
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
  },
  loaderContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
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
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#2e78b7',
  },
  placeholder: {
    width: 40,
  },
  scrollView: {
    flex: 1,
  },
  formContainer: {
    padding: 16,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1f2937',
    marginBottom: 12,
  },
  helpText: {
    fontSize: 12,
    color: '#6b7280',
    marginBottom: 12,
    fontStyle: 'italic',
  },
  columnaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#fff',
    padding: 12,
    borderRadius: 8,
    marginBottom: 8,
  },
  checkbox: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: 12,
  },
  checkboxInner: {
    width: 24,
    height: 24,
    borderWidth: 2,
    borderColor: '#d1d5db',
    borderRadius: 4,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxChecked: {
    backgroundColor: '#2e78b7',
    borderColor: '#2e78b7',
  },
  columnaText: {
    fontSize: 14,
    color: '#1f2937',
  },
  ordenControls: {
    flexDirection: 'row',
    gap: 4,
  },
  ordenButton: {
    padding: 4,
  },
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 8,
    marginBottom: 16,
  },
  switchLabel: {
    fontSize: 14,
    color: '#1f2937',
  },
  fieldContainer: {
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#4a5568',
    marginBottom: 8,
  },
  input: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: '#1f2937',
  },
  buttonContainer: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 24,
  },
  button: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
  },
  cancelButton: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#d1d5db',
  },
  cancelButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#4a5568',
  },
  saveButton: {
    backgroundColor: '#2e78b7',
  },
  saveButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#fff',
  },
  // Estilos para selectores
  selector: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  selectorContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  selectorText: {
    fontSize: 14,
    color: '#1f2937',
  },
  // Estilos para radio buttons
  radioGroup: {
    gap: 12,
  },
  radioOption: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 8,
  },
  radioText: {
    fontSize: 14,
    color: '#1f2937',
  },
  // Estilos para text area
  textArea: {
    minHeight: 120,
    textAlignVertical: 'top',
  },
  // Estilos para modales
  modalOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalBackground: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1f2937',
  },
  modalList: {
    paddingHorizontal: 20,
    paddingVertical: 8,
  },
  modalOption: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: 8,
    marginVertical: 2,
  },
  modalOptionSelected: {
    backgroundColor: '#e3eafc',
  },
  modalOptionText: {
    flex: 1,
    fontSize: 14,
    color: '#1f2937',
  },
  modalFooter: {
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
  },
  modalButton: {
    backgroundColor: '#2e78b7',
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  modalButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  // Estilos para consultas múltiples
  switchLabelContainer: {
    flex: 1,
    marginRight: 12,
  },
  multiQueryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  addQueryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 6,
    paddingHorizontal: 12,
    backgroundColor: '#e3eafc',
    borderRadius: 6,
  },
  addQueryText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#2e78b7',
  },
  queryCard: {
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  queryCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  queryCardTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#1f2937',
  },
  queryCardContent: {
    gap: 4,
  },
});
