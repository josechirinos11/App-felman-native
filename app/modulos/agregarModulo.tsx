// app/modulos/agregarModulo.tsx - VERSIÓN MEJORADA
import Ionicons from '@expo/vector-icons/Ionicons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

// ✅ Función auxiliar para mostrar alertas compatibles con Web y Mobile
const showAlert = (title: string, message?: string, onOk?: () => void) => {
  if (Platform.OS === 'web') {
    // En web, usar alert nativo del navegador
    const fullMessage = message ? `${title}\n\n${message}` : title;
    alert(fullMessage);
    if (onOk) onOk();
  } else {
    // En mobile, usar Alert.alert de React Native
    if (onOk) {
      Alert.alert(title, message, [{ text: 'OK', onPress: onOk }]);
    } else {
      Alert.alert(title, message);
    }
  }
};

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
  // Nuevos campos para conexión
  tipoConexion: 'api' | 'directa';
  dbConfig?: {
    tipo: 'mysql' | 'postgresql' | 'sqlserver' | 'oracle';
    host: string;
    port: number;
    database: string;
    usuario: string;
    password: string;
  };
  // Control de acceso por roles
  rolesPermitidos: string[];
  // Configuración de visualización
  configuracionVista?: {
    columnasVisibles?: string[];
    ordenColumnas?: string[];
    formatoColumnas?: { [key: string]: string };
  };
  // Campos para consultas múltiples
  usaConsultasMultiples?: boolean;
  consultasSQL?: QuerySQL[];
  queryIdPrincipal?: string;
  // ✅ Campo para submódulos
  tieneSubmodulos?: boolean;
  submodulos?: CustomModule[];
}

// Lista de iconos disponibles
const iconosDisponibles: { name: IconName; label: string }[] = [
  { name: 'apps-outline', label: 'Apps' },
  { name: 'bar-chart-outline', label: 'Gráficos' },
  { name: 'briefcase-outline', label: 'Maletín' },
  { name: 'calculator-outline', label: 'Calculadora' },
  { name: 'calendar-outline', label: 'Calendario' },
  { name: 'cart-outline', label: 'Carrito' },
  { name: 'clipboard-outline', label: 'Portapapeles' },
  { name: 'cloud-outline', label: 'Nube' },
  { name: 'construct-outline', label: 'Construcción' },
  { name: 'cube-outline', label: 'Cubo' },
  { name: 'document-text-outline', label: 'Documento' },
  { name: 'folder-outline', label: 'Carpeta' },
  { name: 'grid-outline', label: 'Cuadrícula' },
  { name: 'hammer-outline', label: 'Martillo' },
  { name: 'layers-outline', label: 'Capas' },
  { name: 'list-outline', label: 'Lista' },
  { name: 'map-outline', label: 'Mapa' },
  { name: 'pie-chart-outline', label: 'Gráfico circular' },
  { name: 'reader-outline', label: 'Lector' },
  { name: 'server-outline', label: 'Servidor' },
  { name: 'stats-chart-outline', label: 'Estadísticas' },
  { name: 'storefront-outline', label: 'Tienda' },
  { name: 'telescope-outline', label: 'Telescopio' },
  { name: 'terminal-outline', label: 'Terminal' },
  { name: 'trending-up-outline', label: 'Tendencia' },
];

// ✅ Función auxiliar para buscar un módulo de forma recursiva
const buscarModuloRecursivo = (modulos: CustomModule[], id: string): CustomModule | null => {
  for (const modulo of modulos) {
    if (modulo.id === id) {
      return modulo;
    }
    if (modulo.submodulos && modulo.submodulos.length > 0) {
      const encontrado = buscarModuloRecursivo(modulo.submodulos, id);
      if (encontrado) return encontrado;
    }
  }
  return null;
};

// ✅ Función auxiliar para agregar un submódulo de forma recursiva
const agregarSubmoduloRecursivo = (modulos: CustomModule[], parentId: string, nuevoModulo: CustomModule): boolean => {
  console.log('🔍 Buscando padre con ID:', parentId);
  console.log('📊 Analizando', modulos.length, 'módulos en este nivel');
  
  for (let i = 0; i < modulos.length; i++) {
    console.log('  🔎 Revisando módulo:', modulos[i].nombre, '(ID:', modulos[i].id, ')');
    
    if (modulos[i].id === parentId) {
      console.log('  ✅ ¡Padre encontrado!:', modulos[i].nombre);
      console.log('  🔹 tieneSubmodulos ANTES:', modulos[i].tieneSubmodulos);
      
      // ✅ Inicializar array si no existe
      if (!modulos[i].submodulos) {
        modulos[i].submodulos = [];
        console.log('  📁 Array de submódulos inicializado');
      }
      
      // ✅ Agregar el nuevo submódulo
      modulos[i].submodulos!.push(nuevoModulo);
      
      // ✅ ¡IMPORTANTE! Actualizar tieneSubmodulos a true
      modulos[i].tieneSubmodulos = true;
      
      console.log('  🔹 tieneSubmodulos DESPUÉS:', modulos[i].tieneSubmodulos);
      console.log('  ✅ Submódulo agregado. Total submódulos ahora:', modulos[i].submodulos!.length);
      return true;
    }
    
    if (modulos[i].submodulos && modulos[i].submodulos!.length > 0) {
      console.log('  📂 Módulo tiene', modulos[i].submodulos!.length, 'submódulos. Buscando recursivamente...');
      if (agregarSubmoduloRecursivo(modulos[i].submodulos!, parentId, nuevoModulo)) {
        return true;
      }
    }
  }
  
  console.log('❌ Padre NO encontrado en este nivel');
  return false;
};

// Lista de roles disponibles (esto debería venir del backend)
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

export default function AgregarModuloScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const parentId = params.parentId as string | undefined; // ID del módulo padre si es submódulo
  
  const [loading, setLoading] = useState(false);
  const [mostrarSelectorIcono, setMostrarSelectorIcono] = useState(false);
  const [mostrarSelectorRoles, setMostrarSelectorRoles] = useState(false);

  // ✅ Estado para el paso inicial: SIEMPRE pregunta si será módulo principal o con datos
  const [pasoInicial, setPasoInicial] = useState(true); // Siempre mostrar selección
  const [esModuloPrincipal, setEsModuloPrincipal] = useState<boolean | null>(null); // null = no ha seleccionado

  // Estados básicos del formulario
  const [nombreModulo, setNombreModulo] = useState('');
  const [iconoSeleccionado, setIconoSeleccionado] = useState<IconName>('apps-outline');
  const [consultaSQL, setConsultaSQL] = useState('');
  
  // Tipo de conexión
  const [tipoConexion, setTipoConexion] = useState<'api' | 'directa'>('api');
  
  // Configuración API
  const [apiRestUrl, setApiRestUrl] = useState('');
  
  // Configuración de BD directa
  const [tipoDB, setTipoDB] = useState<'mysql' | 'postgresql' | 'sqlserver' | 'oracle'>('mysql');
  const [hostDB, setHostDB] = useState('');
  const [portDB, setPortDB] = useState('3306');
  const [nombreDB, setNombreDB] = useState('');
  const [usuarioDB, setUsuarioDB] = useState('');
  const [passwordDB, setPasswordDB] = useState('');
  
  // Control de acceso
  const [rolesSeleccionados, setRolesSeleccionados] = useState<string[]>(['Todos']);
  const [rolPersonalizado, setRolPersonalizado] = useState('');
  
  // Estados para consultas múltiples
  const [usaConsultasMultiples, setUsaConsultasMultiples] = useState(false);
  const [consultasSQL, setConsultasSQL] = useState<QuerySQL[]>([]);
  const [queryIdPrincipal, setQueryIdPrincipal] = useState('');
  const [mostrarSelectorQueryPrincipal, setMostrarSelectorQueryPrincipal] = useState(false);

  // Cargar rol del usuario actual
  useEffect(() => {
    cargarRolUsuario();
  }, []);

  const cargarRolUsuario = async () => {
    try {
      const userData = await AsyncStorage.getItem('userData');
      if (userData) {
        const user = JSON.parse(userData);
        console.log('👤 Usuario actual:', user);
      }
    } catch (error) {
      console.error('Error al cargar usuario:', error);
    }
  };

  // Validar formulario
  const validarFormulario = (): boolean => {
    // ✅ SOLO EL NOMBRE ES OBLIGATORIO
    if (!nombreModulo.trim()) {
      showAlert('Error', 'El nombre del módulo es obligatorio');
      return false;
    }
    
    // ✅ Si es módulo principal (con submódulos), solo necesita nombre e ícono
    if (esModuloPrincipal === true) {
      return true;
    }
    
    // ✅ Si NO es módulo principal, validaciones opcionales
    if (esModuloPrincipal === false) {
      // ✅ SQL y API son OPCIONALES - se pueden configurar después
      
      // Si usa consultas múltiples, validar su estructura (si las agregó)
      if (usaConsultasMultiples && consultasSQL.length > 0) {
        // Validar que todas las consultas tengan ID
        for (let i = 0; i < consultasSQL.length; i++) {
          if (!consultasSQL[i].id.trim()) {
            showAlert('Error', `La consulta #${i + 1} debe tener un ID`);
            return false;
          }
        }

        // Validar IDs únicos
        const ids = consultasSQL.map(c => c.id);
        const idsUnicos = new Set(ids);
        if (ids.length !== idsUnicos.size) {
          showAlert('Error', 'Los IDs de las consultas deben ser únicos');
          return false;
        }

        // Validar que se haya seleccionado un query principal si hay consultas
        if (!queryIdPrincipal) {
          showAlert('Error', 'Debe seleccionar una consulta principal para mostrar');
          return false;
        }
      }
      
      // Validar formato de URL si se proporcionó
      if (tipoConexion === 'api' && apiRestUrl.trim()) {
        try {
          new URL(apiRestUrl);
        } catch (e) {
          showAlert('Error', 'La URL de la API REST no tiene un formato válido');
          return false;
        }
      }
      
      // Validar campos de BD solo si se llenó alguno (para evitar configuraciones parciales)
      if (tipoConexion === 'directa') {
        const camposLlenos = [hostDB.trim(), nombreDB.trim(), usuarioDB.trim()].filter(c => c).length;
        if (camposLlenos > 0 && camposLlenos < 3) {
          showAlert('Error', 'Si configuras conexión directa, debes llenar Host, Base de Datos y Usuario');
          return false;
        }
      }
    }
    
    return true;
  };

  // Guardar módulo
  const guardarModulo = async () => {
    console.log('🟢 ========================================');
    console.log('🟢 GUARDANDO NUEVO MÓDULO');
    console.log('🟢 ========================================');
    
    if (!validarFormulario()) {
      console.warn('⚠️ Validación del formulario falló');
      return;
    }

    setLoading(true);
    try {
      const moduleId = `module_${Date.now()}`;
      console.log('🆔 ID generado:', moduleId);
      
      const nuevoModulo: CustomModule = {
        id: moduleId,
        nombre: nombreModulo.trim(),
        icono: iconoSeleccionado,
        consultaSQL: esModuloPrincipal ? '' : consultaSQL.trim(),
        apiRestUrl: esModuloPrincipal ? '' : (tipoConexion === 'api' ? apiRestUrl.trim() : ''),
        fechaCreacion: new Date().toISOString(),
        tipoConexion,
        rolesPermitidos: rolesSeleccionados,
        // Incluir consultas múltiples si están habilitadas
        usaConsultasMultiples: esModuloPrincipal ? false : usaConsultasMultiples,
        consultasSQL: esModuloPrincipal ? undefined : (usaConsultasMultiples ? consultasSQL : undefined),
        queryIdPrincipal: esModuloPrincipal ? undefined : (usaConsultasMultiples ? queryIdPrincipal : undefined),
        // ✅ Incluir configuración de submódulos
        tieneSubmodulos: esModuloPrincipal || false,
        submodulos: esModuloPrincipal ? [] : undefined,
      };

      console.log('📋 Información Básica:');
      console.log('   Nombre:', nuevoModulo.nombre);
      console.log('   Icono:', nuevoModulo.icono);
      console.log('   Tipo Conexión:', nuevoModulo.tipoConexion);
      console.log('   Roles Permitidos:', nuevoModulo.rolesPermitidos.join(', '));
      
      console.log('📝 Consulta SQL:');
      console.log('   ' + nuevoModulo.consultaSQL);
      
      console.log('🌐 URL API:', nuevoModulo.apiRestUrl);

      // Agregar configuración de BD si es conexión directa
      if (tipoConexion === 'directa') {
        nuevoModulo.dbConfig = {
          tipo: tipoDB,
          host: hostDB.trim(),
          port: parseInt(portDB),
          database: nombreDB.trim(),
          usuario: usuarioDB.trim(),
          password: passwordDB, // En producción, esto debería estar encriptado
        };
        
        console.log('💾 Configuración de Base de Datos:');
        console.log('   Tipo:', nuevoModulo.dbConfig.tipo);
        console.log('   Host:', nuevoModulo.dbConfig.host);
        console.log('   Puerto:', nuevoModulo.dbConfig.port);
        console.log('   Base de Datos:', nuevoModulo.dbConfig.database);
        console.log('   Usuario:', nuevoModulo.dbConfig.usuario);
        console.log('   Contraseña:', nuevoModulo.dbConfig.password ? '***configurada***' : 'NO CONFIGURADA');
      }

      // Recuperar módulos existentes
      const modulosJSON = await AsyncStorage.getItem('customModules');
      let modulos: CustomModule[] = modulosJSON ? JSON.parse(modulosJSON) : [];
      
      console.log('💾 Módulos existentes:', modulos.length);
      console.log('📋 Estructura antes de agregar:');
      modulos.forEach((m, idx) => {
        console.log(`  ${idx + 1}. ${m.nombre} (ID: ${m.id}) - tieneSubmodulos: ${m.tieneSubmodulos} - Submódulos: ${m.submodulos?.length || 0}`);
        if (m.submodulos && m.submodulos.length > 0) {
          m.submodulos.forEach((sub, subIdx) => {
            console.log(`    ${subIdx + 1}. ${sub.nombre} (ID: ${sub.id}) - tieneSubmodulos: ${sub.tieneSubmodulos} - Submódulos: ${sub.submodulos?.length || 0}`);
          });
        }
      });
      
      // ✅ Si es un submódulo, agregarlo al módulo padre (búsqueda recursiva)
      if (parentId) {
        console.log('📁 Agregando como submódulo al módulo padre:', parentId);
        console.log('📝 Nombre del nuevo submódulo:', nuevoModulo.nombre);
        console.log('🆔 ID del nuevo submódulo:', nuevoModulo.id);
        const agregado = agregarSubmoduloRecursivo(modulos, parentId, nuevoModulo);
        
        if (agregado) {
          console.log('✅ Submódulo agregado al módulo padre de forma recursiva');
          console.log('📋 Estructura después de agregar:');
          modulos.forEach((m, idx) => {
            console.log(`  ${idx + 1}. ${m.nombre} (ID: ${m.id}) - tieneSubmodulos: ${m.tieneSubmodulos} - Submódulos: ${m.submodulos?.length || 0}`);
            if (m.submodulos && m.submodulos.length > 0) {
              m.submodulos.forEach((sub, subIdx) => {
                console.log(`    ${subIdx + 1}. ${sub.nombre} (ID: ${sub.id}) - tieneSubmodulos: ${sub.tieneSubmodulos} - Submódulos: ${sub.submodulos?.length || 0}`);
              });
            }
          });
        } else {
          console.error('❌ Módulo padre no encontrado en la estructura');
          showAlert('Error', 'No se encontró el módulo padre');
          return;
        }
      } else {
        // Si no es submódulo, agregarlo a la lista principal
        console.log('📁 Agregando módulo a la lista principal');
        modulos.push(nuevoModulo);
      }
      
      // ✅ Log del JSON completo antes de guardar
      console.log('💾 JSON que se guardará en AsyncStorage:');
      console.log(JSON.stringify(modulos, null, 2));
      
      await AsyncStorage.setItem('customModules', JSON.stringify(modulos));

      console.log('✅ Módulo guardado exitosamente en AsyncStorage');
      console.log('✅ Total de módulos ahora:', modulos.length);
      console.log('✅ ========================================\n');

      // ✅ Mensajes según el tipo de módulo
      if (parentId) {
        // Es un submódulo
        const tipoSubmodoulo = esModuloPrincipal ? 'contenedor' : 'con datos';
        // ✅ La ruta es la misma para web y mobile: /modulos/{id}
        const routeDestino = esModuloPrincipal 
          ? `/modulos/${moduleId}` 
          : `/modulos/${parentId}`;
        
        console.log(`🌐 Navegando a: ${routeDestino} (Platform: ${Platform.OS})`);
        
        if (Platform.OS === 'web') {
          // En web, navegar directamente sin Alert (Alert.alert no soporta botones en web)
          router.replace(routeDestino as any);
        } else {
          // En mobile, mostrar Alert con botón
          Alert.alert(
            '✅ Submódulo Creado',
            `El submódulo ${tipoSubmodoulo} "${nombreModulo}" ha sido agregado exitosamente.${
              esModuloPrincipal ? '\n\nPuedes seguir agregando más submódulos dentro de este.' : ''
            }`,
            [{ 
              text: 'OK', 
              onPress: () => {
                router.replace(routeDestino as any);
              }
            }]
          );
        }
      } else if (esModuloPrincipal) {
        // Es un módulo principal
        // ✅ La ruta es la misma para web y mobile: /modulos/{id}
        const routeDestino = `/modulos/${moduleId}`;
        
        console.log(`🌐 Navegando a módulo principal: ${routeDestino} (Platform: ${Platform.OS})`);
        
        if (Platform.OS === 'web') {
          // En web, navegar directamente sin Alert
          router.replace(routeDestino as any);
        } else {
          // En mobile, mostrar Alert con botón
          Alert.alert(
            '✅ Módulo Principal Creado',
            `El módulo "${nombreModulo}" ha sido creado exitosamente.\n\nAhora puedes agregar submódulos desde la vista del módulo.`,
            [{ 
              text: 'Ver Módulo', 
              onPress: () => {
                router.replace(routeDestino as any);
              }
            }]
          );
        }
      } else {
        // Es un módulo normal con datos
        // ✅ La ruta es la misma para web y mobile: /modulos/{id}
        const routeDestino = `/modulos/${moduleId}`;
        
        console.log(`🌐 Navegando a módulo con datos creado: ${routeDestino} (Platform: ${Platform.OS})`);
        console.log(`📋 ID del módulo creado: ${moduleId}`);
        
        if (Platform.OS === 'web') {
          // En web, navegar directamente sin Alert
          console.log('✅ Módulo con datos creado exitosamente (Web)');
          router.replace(routeDestino as any);
        } else {
          // En mobile, mostrar Alert con botón
          Alert.alert(
            '✅ Módulo Creado',
            `El módulo "${nombreModulo}" ha sido creado correctamente con su consulta SQL.`,
            [{ text: 'Ver Módulo', onPress: () => router.replace(routeDestino as any) }]
          );
        }
      }
    } catch (error: any) {
      console.error('❌ ========================================');
      console.error('❌ ERROR AL GUARDAR MÓDULO');
      console.error('❌ ========================================');
      console.error('❌ Tipo de error:', error.constructor?.name);
      console.error('❌ Mensaje:', error.message);
      console.error('❌ Stack:', error.stack);
      console.error('❌ ========================================\n');
      showAlert('Error', 'No se pudo guardar el módulo: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  // Agregar rol personalizado
  const agregarRolPersonalizado = () => {
    const rolTrimmed = rolPersonalizado.trim();
    
    if (!rolTrimmed) {
      showAlert('Error', 'Debes escribir un nombre de rol');
      return;
    }
    
    // Verificar que no exista ya
    if (rolesSeleccionados.includes(rolTrimmed)) {
      showAlert('Atención', 'Este rol ya está agregado');
      return;
    }
    
    // Agregar el rol personalizado
    let nuevosRoles = [...rolesSeleccionados];
    
    // Remover "Todos" si existe
    nuevosRoles = nuevosRoles.filter(r => r !== 'Todos');
    
    // Agregar el nuevo rol al inicio
    nuevosRoles.unshift(rolTrimmed);
    
    setRolesSeleccionados(nuevosRoles);
    setRolPersonalizado(''); // Limpiar el campo
    
    showAlert('Éxito', `Rol "${rolTrimmed}" agregado correctamente`);
  };

  // Toggle de rol
  const toggleRol = (rol: string) => {
    if (rol === 'Todos') {
      setRolesSeleccionados(['Todos']);
    } else {
      let nuevosRoles = [...rolesSeleccionados];
      
      // Remover "Todos" si se selecciona otro rol
      nuevosRoles = nuevosRoles.filter(r => r !== 'Todos');
      
      if (nuevosRoles.includes(rol)) {
        nuevosRoles = nuevosRoles.filter(r => r !== rol);
      } else {
        nuevosRoles.push(rol);
      }
      
      // Si no hay ninguno, poner "Todos"
      if (nuevosRoles.length === 0) {
        nuevosRoles = ['Todos'];
      }
      
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
      showAlert('Atención', 'Debe haber al menos una consulta');
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

  // ✅ Renderizar paso inicial si no ha seleccionado tipo de módulo
  if (pasoInicial && esModuloPrincipal === null) {
    return (
      <View style={styles.container}>
        <SafeAreaView style={styles.content}>
          {/* Header */}
          <View style={styles.header}>
            <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
              <Ionicons name="arrow-back-outline" size={24} color="#2e78b7" />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>
              {parentId ? 'Nuevo Submódulo' : 'Nuevo Módulo'}
            </Text>
            <View style={styles.placeholder} />
          </View>

          {/* Selección del tipo de módulo */}
          <View style={styles.selectionContainer}>
            <View style={styles.selectionHeader}>
              <Text style={styles.selectionTitle}>
                {parentId 
                  ? '¿Qué tipo de submódulo deseas crear?' 
                  : '¿Qué tipo de módulo deseas crear?'}
              </Text>
              <Text style={styles.selectionSubtitle}>
                {parentId
                  ? 'Un submódulo puede contener otros submódulos o mostrar datos'
                  : 'Selecciona el tipo de módulo según tus necesidades'}
              </Text>
            </View>

            <View style={styles.optionsContainer}>
              {/* Opción: Módulo Principal (con submódulos) */}
              <TouchableOpacity
                style={styles.optionCard}
                onPress={() => {
                  setEsModuloPrincipal(true);
                  setPasoInicial(false);
                }}
              >
                <View style={styles.optionIcon}>
                  <Ionicons name="folder-outline" size={32} color="#2e78b7" />
                </View>
                <Text style={styles.optionTitle}>
                  {parentId ? 'Submódulo Contenedor' : 'Módulo Principal'}
                </Text>
                <Text style={styles.optionDescription}>
                  {parentId
                    ? 'Submódulo que agrupa otros submódulos relacionados. Permite seguir anidando niveles.'
                    : 'Módulo contenedor que agrupa varios submódulos relacionados. Ideal para organizar módulos por categorías.'}
                </Text>
                <View style={styles.optionFeatures}>
                  <View style={styles.featureItem}>
                    <Ionicons name="checkmark-circle" size={16} color="#10b981" />
                    <Text style={styles.featureText}>
                      {parentId ? 'Contiene submódulos' : 'Contiene submódulos'}
                    </Text>
                  </View>
                  <View style={styles.featureItem}>
                    <Ionicons name="checkmark-circle" size={16} color="#10b981" />
                    <Text style={styles.featureText}>Solo requiere nombre</Text>
                  </View>
                  <View style={styles.featureItem}>
                    <Ionicons name="checkmark-circle" size={16} color="#10b981" />
                    <Text style={styles.featureText}>
                      {parentId ? 'Anidación ilimitada' : 'Vista de índice'}
                    </Text>
                  </View>
                </View>
              </TouchableOpacity>

              {/* Opción: Módulo con Datos (SQL) */}
              <TouchableOpacity
                style={styles.optionCard}
                onPress={() => {
                  setEsModuloPrincipal(false);
                  setPasoInicial(false);
                }}
              >
                <View style={styles.optionIcon}>
                  <Ionicons name="document-text-outline" size={32} color="#2e78b7" />
                </View>
                <Text style={styles.optionTitle}>
                  {parentId ? 'Submódulo con Datos' : 'Módulo con Datos'}
                </Text>
                <Text style={styles.optionDescription}>
                  {parentId
                    ? 'Submódulo que muestra datos desde una consulta SQL o API REST.'
                    : 'Módulo que muestra datos desde una consulta SQL.'}
                </Text>
                <View style={styles.optionFeatures}>
                  <View style={styles.featureItem}>
                    <Ionicons name="checkmark-circle" size={16} color="#10b981" />
                    <Text style={styles.featureText}>Consulta SQL</Text>
                  </View>
                  <View style={styles.featureItem}>
                    <Ionicons name="checkmark-circle" size={16} color="#10b981" />
                    <Text style={styles.featureText}>Conexión API/BD</Text>
                  </View>
                  <View style={styles.featureItem}>
                    <Ionicons name="checkmark-circle" size={16} color="#10b981" />
                    <Text style={styles.featureText}>Vista de tabla</Text>
                  </View>
                </View>
              </TouchableOpacity>
            </View>
          </View>
        </SafeAreaView>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <SafeAreaView style={styles.content}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity 
            onPress={() => {
              if (!parentId && esModuloPrincipal !== null && nombreModulo === '') {
                // Si no es submódulo y no ha llenado nada, volver al paso inicial
                setPasoInicial(true);
                setEsModuloPrincipal(null);
              } else {
                router.back();
              }
            }} 
            style={styles.backButton}
          >
            <Ionicons name="arrow-back-outline" size={24} color="#2e78b7" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>
            {parentId ? 'Agregar Submódulo' : (esModuloPrincipal ? 'Módulo Principal' : 'Módulo con Datos')}
          </Text>
          <View style={styles.placeholder} />
        </View>

        {/* Formulario */}
        <ScrollView style={styles.scrollView}>
          <View style={styles.formContainer}>
            
            {/* Nombre del Módulo */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Información Básica</Text>
              
              <View style={styles.fieldContainer}>
                <Text style={styles.label}>Nombre del Módulo *</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Ej: Control de Inventario"
                  value={nombreModulo}
                  onChangeText={setNombreModulo}
                  placeholderTextColor="#9ca3af"
                />
              </View>

              {/* Icono */}
              <View style={styles.fieldContainer}>
                <Text style={styles.label}>Icono *</Text>
                <TouchableOpacity
                  style={styles.selector}
                  onPress={() => setMostrarSelectorIcono(true)}
                >
                  <View style={styles.selectorContent}>
                    <Ionicons name={iconoSeleccionado} size={24} color="#2e78b7" />
                    <Text style={styles.selectorText}>
                      {iconosDisponibles.find(i => i.name === iconoSeleccionado)?.label}
                    </Text>
                  </View>
                  <Ionicons name="chevron-down-outline" size={20} color="#9ca3af" />
                </TouchableOpacity>
              </View>
            </View>

            {/* Control de Acceso */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Control de Acceso</Text>
              
              <View style={styles.fieldContainer}>
                <Text style={styles.label}>Roles con Acceso *</Text>
                <TouchableOpacity
                  style={styles.selector}
                  onPress={() => setMostrarSelectorRoles(true)}
                >
                  <Text style={styles.selectorText}>
                    {rolesSeleccionados.join(', ')}
                  </Text>
                  <Ionicons name="chevron-down-outline" size={20} color="#9ca3af" />
                </TouchableOpacity>
                <Text style={styles.helpText}>
                  Solo los usuarios con estos roles verán este módulo
                </Text>
              </View>
            </View>

            {/* Tipo de Conexión - Solo si NO es módulo principal */}
            {esModuloPrincipal === false && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Configuración de Conexión</Text>
              
              <View style={styles.fieldContainer}>
                <Text style={styles.label}>Tipo de Conexión *</Text>
                <View style={styles.radioGroup}>
                  <TouchableOpacity
                    style={styles.radioOption}
                    onPress={() => setTipoConexion('api')}
                  >
                    <Ionicons
                      name={tipoConexion === 'api' ? 'radio-button-on' : 'radio-button-off'}
                      size={20}
                      color="#2e78b7"
                    />
                    <Text style={styles.radioText}>API REST (Recomendado)</Text>
                  </TouchableOpacity>
                  
                  <TouchableOpacity
                    style={styles.radioOption}
                    onPress={() => setTipoConexion('directa')}
                  >
                    <Ionicons
                      name={tipoConexion === 'directa' ? 'radio-button-on' : 'radio-button-off'}
                      size={20}
                      color="#2e78b7"
                    />
                    <Text style={styles.radioText}>Conexión Directa a BD</Text>
                  </TouchableOpacity>
                </View>
              </View>

              {/* Configuración API */}
              {tipoConexion === 'api' && (
                <View style={styles.fieldContainer}>
                  <Text style={styles.label}>URL de la API REST (Opcional)</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="https://api.empresa.com/ejecutar-consulta"
                    value={apiRestUrl}
                    onChangeText={setApiRestUrl}
                    keyboardType="url"
                    autoCapitalize="none"
                    placeholderTextColor="#9ca3af"
                  />
                  <Text style={styles.helpText}>
                    Puedes configurar la URL después. Será el endpoint que ejecutará la consulta SQL.
                  </Text>
                </View>
              )}

              {/* Configuración BD Directa */}
              {tipoConexion === 'directa' && (
                <>
                  <View style={styles.fieldContainer}>
                    <Text style={styles.label}>Tipo de Base de Datos</Text>
                    <View style={styles.radioGroup}>
                      {['mysql', 'postgresql', 'sqlserver', 'oracle'].map((tipo) => (
                        <TouchableOpacity
                          key={tipo}
                          style={styles.radioOption}
                          onPress={() => setTipoDB(tipo as any)}
                        >
                          <Ionicons
                            name={tipoDB === tipo ? 'radio-button-on' : 'radio-button-off'}
                            size={20}
                            color="#2e78b7"
                          />
                          <Text style={styles.radioText}>{tipo.toUpperCase()}</Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  </View>

                  <View style={styles.fieldContainer}>
                    <Text style={styles.label}>Host / Servidor (Opcional)</Text>
                    <TextInput
                      style={styles.input}
                      placeholder="localhost o 192.168.1.100"
                      value={hostDB}
                      onChangeText={setHostDB}
                      autoCapitalize="none"
                      placeholderTextColor="#9ca3af"
                    />
                  </View>

                  <View style={styles.fieldContainer}>
                    <Text style={styles.label}>Puerto (Opcional)</Text>
                    <TextInput
                      style={styles.input}
                      placeholder="3306"
                      value={portDB}
                      onChangeText={setPortDB}
                      keyboardType="number-pad"
                      placeholderTextColor="#9ca3af"
                    />
                  </View>

                  <View style={styles.fieldContainer}>
                    <Text style={styles.label}>Nombre de la Base de Datos (Opcional)</Text>
                    <TextInput
                      style={styles.input}
                      placeholder="mi_base_datos"
                      value={nombreDB}
                      onChangeText={setNombreDB}
                      autoCapitalize="none"
                      placeholderTextColor="#9ca3af"
                    />
                  </View>

                  <View style={styles.fieldContainer}>
                    <Text style={styles.label}>Usuario (Opcional)</Text>
                    <TextInput
                      style={styles.input}
                      placeholder="usuario_bd"
                      value={usuarioDB}
                      onChangeText={setUsuarioDB}
                      autoCapitalize="none"
                      placeholderTextColor="#9ca3af"
                    />
                  </View>

                  <View style={styles.fieldContainer}>
                    <Text style={styles.label}>Contraseña (Opcional)</Text>
                    <TextInput
                      style={styles.input}
                      placeholder="••••••••"
                      value={passwordDB}
                      onChangeText={setPasswordDB}
                      secureTextEntry
                      placeholderTextColor="#9ca3af"
                    />
                    <Text style={styles.helpText}>
                      ⚠️ La contraseña se guardará de forma local. Puedes configurarla después.
                    </Text>
                  </View>
                </>
              )}
            </View>
            )}

            {/* Consulta SQL - Solo si NO es módulo principal */}
            {esModuloPrincipal === false && (
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
                  <Text style={styles.label}>Consulta SQL (Opcional)</Text>
                  <TextInput
                    style={[styles.input, styles.textArea]}
                    placeholder="SELECT * FROM tabla WHERE condicion"
                    value={consultaSQL}
                    onChangeText={setConsultaSQL}
                    multiline
                    numberOfLines={6}
                    placeholderTextColor="#9ca3af"
                  />
                  <Text style={styles.helpText}>
                    Puedes configurar la consulta SQL después desde el módulo. Solo se permiten consultas SELECT por seguridad.
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
            )}

            {/* Botones */}
            <View style={styles.buttonContainer}>
              <TouchableOpacity
                style={[styles.button, styles.cancelButton]}
                onPress={() => router.back()}
                disabled={loading}
              >
                <Text style={styles.cancelButtonText}>Cancelar</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.button, styles.saveButton]}
                onPress={guardarModulo}
                disabled={loading}
              >
                {loading ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.saveButtonText}>Guardar Módulo</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </ScrollView>

        {/* Modal: Selector de Iconos */}
        <Modal
          visible={mostrarSelectorIcono}
          transparent
          animationType="slide"
          onRequestClose={() => setMostrarSelectorIcono(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Seleccionar Icono</Text>
                <TouchableOpacity onPress={() => setMostrarSelectorIcono(false)}>
                  <Ionicons name="close-outline" size={24} color="#4a5568" />
                </TouchableOpacity>
              </View>

              <ScrollView style={styles.modalList}>
                {iconosDisponibles.map((icono) => (
                  <TouchableOpacity
                    key={icono.name}
                    style={[
                      styles.modalOption,
                      iconoSeleccionado === icono.name && styles.modalOptionSelected,
                    ]}
                    onPress={() => {
                      setIconoSeleccionado(icono.name);
                      setMostrarSelectorIcono(false);
                    }}
                  >
                    <Ionicons name={icono.name} size={24} color="#2e78b7" />
                    <Text style={styles.modalOptionText}>{icono.label}</Text>
                    {iconoSeleccionado === icono.name && (
                      <Ionicons name="checkmark-circle" size={20} color="#2e78b7" />
                    )}
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          </View>
        </Modal>

        {/* Modal: Selector de Roles */}
        <Modal
          visible={mostrarSelectorRoles}
          transparent
          animationType="slide"
          onRequestClose={() => setMostrarSelectorRoles(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Seleccionar Roles</Text>
                <TouchableOpacity onPress={() => setMostrarSelectorRoles(false)}>
                  <Ionicons name="close-outline" size={24} color="#4a5568" />
                </TouchableOpacity>
              </View>

              {/* Campo para agregar rol personalizado */}
              <View style={styles.rolPersonalizadoContainer}>
                <Text style={styles.rolPersonalizadoLabel}>Agregar Rol Personalizado:</Text>
                <View style={styles.rolPersonalizadoInput}>
                  <TextInput
                    style={styles.inputRol}
                    placeholder="Ej: Contador, Técnico, etc."
                    value={rolPersonalizado}
                    onChangeText={setRolPersonalizado}
                    placeholderTextColor="#9ca3af"
                  />
                  <TouchableOpacity 
                    style={styles.agregarRolButton}
                    onPress={agregarRolPersonalizado}
                  >
                    <Ionicons name="add-circle" size={28} color="#2e78b7" />
                  </TouchableOpacity>
                </View>
              </View>

              {/* Roles seleccionados personalizados */}
              {rolesSeleccionados.filter(r => !rolesDisponibles.includes(r)).length > 0 && (
                <View style={styles.rolesPersonalizadosSection}>
                  <Text style={styles.sectionSubtitle}>Roles Personalizados Agregados:</Text>
                  {rolesSeleccionados
                    .filter(r => !rolesDisponibles.includes(r))
                    .map((rol) => (
                      <TouchableOpacity
                        key={rol}
                        style={[styles.modalOption, styles.modalOptionSelected]}
                        onPress={() => toggleRol(rol)}
                      >
                        <View style={styles.checkbox}>
                          <Ionicons name="checkmark" size={16} color="#fff" />
                        </View>
                        <Text style={[styles.modalOptionText, styles.rolPersonalizadoText]}>
                          {rol} ⭐
                        </Text>
                      </TouchableOpacity>
                    ))}
                </View>
              )}

              <View style={styles.separadorRoles} />
              <Text style={styles.sectionSubtitle}>Roles Predefinidos:</Text>

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
          </View>
        </Modal>

        {/* Modal: Selector de Query Principal */}
        <Modal
          visible={mostrarSelectorQueryPrincipal}
          transparent
          animationType="slide"
          onRequestClose={() => setMostrarSelectorQueryPrincipal(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
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
                    <View style={styles.iconContainer}>
                      {queryIdPrincipal === consulta.id ? (
                        <Ionicons name="checkmark-circle" size={24} color="#2e78b7" />
                      ) : (
                        <View style={styles.iconPlaceholder} />
                      )}
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.modalOptionText}>{consulta.id}</Text>
                      <Text style={[styles.helpText, { marginTop: 4, marginBottom: 0 }]}>
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
          </View>
        </Modal>
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
  backButton: {
    padding: 8,
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
    marginBottom: 16,
    paddingBottom: 8,
    borderBottomWidth: 2,
    borderBottomColor: '#2e78b7',
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
  textArea: {
    minHeight: 120,
    textAlignVertical: 'top',
  },
  helpText: {
    fontSize: 12,
    color: '#6b7280',
    marginTop: 4,
    fontStyle: 'italic',
  },
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
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
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
  checkbox: {
    width: 20,
    height: 20,
    borderWidth: 2,
    borderColor: '#2e78b7',
    borderRadius: 4,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#2e78b7',
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
  rolPersonalizadoContainer: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: '#f9fafb',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  rolPersonalizadoLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#2e78b7',
    marginBottom: 8,
  },
  rolPersonalizadoInput: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  inputRol: {
    flex: 1,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 14,
    color: '#1f2937',
  },
  agregarRolButton: {
    padding: 4,
  },
  rolesPersonalizadosSection: {
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 8,
    backgroundColor: '#fffbeb',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  sectionSubtitle: {
    fontSize: 12,
    fontWeight: '700',
    color: '#6b7280',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 8,
    paddingHorizontal: 20,
    paddingTop: 8,
  },
  separadorRoles: {
    height: 1,
    backgroundColor: '#e5e7eb',
    marginVertical: 8,
  },
  rolPersonalizadoText: {
    fontWeight: '600',
    color: '#2e78b7',
  },
  // Estilos para consultas múltiples
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
  iconContainer: {
    width: 24,
    height: 24,
    marginRight: 12,
  },
  iconPlaceholder: {
    width: 24,
    height: 24,
  },
  // ✅ Estilos para la pantalla de selección inicial
  selectionContainer: {
    flex: 1,
    padding: 16,
    justifyContent: 'center',
  },
  selectionHeader: {
    alignItems: 'center',
    marginBottom: 24,
  },
  selectionTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1f2937',
    textAlign: 'center',
    marginBottom: 6,
  },
  selectionSubtitle: {
    fontSize: 13,
    color: '#6b7280',
    textAlign: 'center',
    lineHeight: 18,
  },
  optionsContainer: {
    gap: 12,
  },
  optionCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    borderWidth: 2,
    borderColor: '#e5e7eb',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  optionIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#e3eafc',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  optionTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#1f2937',
    marginBottom: 6,
  },
  optionDescription: {
    fontSize: 13,
    color: '#6b7280',
    lineHeight: 18,
    marginBottom: 12,
  },
  optionFeatures: {
    gap: 6,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  featureText: {
    fontSize: 12,
    color: '#4b5563',
  },
});
