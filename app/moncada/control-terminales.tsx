import Ionicons from '@expo/vector-icons/Ionicons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Modal, Platform, Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity, useWindowDimensions, View
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';



import { useRouter } from 'expo-router';
import AppHeader from '../../components/AppHeader';
import ModalHeader from '../../components/ModalHeader';
import { useAuth } from '../../hooks/useAuth';

import SQLModal from '../../components/SQLModal';
import { API_URL } from '../../config/constants';
import COLORS from '../../constants/Colors';
import { useOfflineMode } from '../../hooks/useOfflineMode';

// Define los campos que devuelve el backend
type Lote = {
  NumeroManual: string;
  Fabricado: number | null;
  FabricadoFecha: string | null;
  FechaRealInicio: string | null;
  Descripcion: string | null;
  TotalTiempo: number | null;
  TotalUnidades: number | null;
} & {
  [key in `TareaInicio0${number}` | `TareaFinal0${number}`]: string | null;
};
type Linea = {
  Módulo: string;
  Fabricada: number | null;
  estadoTiempos?: 'completo' | 'parcial' | 'sin_tiempo';
  [key: string]: string | number | null | undefined;
};

type Fabricacion = {
  Módulo: string;
  [key: string]: string | number | null | undefined;
};

type OperarioLote = {
  OperarioNombre: string;
  CodigoOperario: string;
  Tarea: string;
  SegundosDedicados: number;
  HH_MM_SS: string;
};

interface UserData {
  id: number;
  nombre?: string;
  rol?: string;
  name?: string;
  role?: string;
}

export default function ControlTerminalesScreen() {

const { authenticated, loading: authLoading } = useAuth();


  const debugLogs = true;
  const log = (...args: any[]) => {
    if (debugLogs) {
      console.log('[ControlPedidos]', ...args);
    }
  };

  // Mapeo de tareas
  const tareaNombres = {
    1: 'CORTE',
    2: 'PRE-ARMADO',
    3: 'ARMADO',
    4: 'HERRAJE',
    6: 'MATRIMONIO',
    7: 'COMPACTO',
    9: 'ACRISTALADO',
    10: 'EMBALAJE',
    11: 'OPTIMIZACION',
  };

  // Formatear fecha y hora
  const formatDateTime = (dateStr: string | null) => {
    if (!dateStr) return '-';
    const date = new Date(dateStr);
    return `${date.getDate().toString().padStart(2, '0')}/${(date.getMonth() + 1).toString().padStart(2, '0')}/${date.getFullYear()} ${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}:${date.getSeconds().toString().padStart(2, '0')}`;
  };

  // Formatear segundos a HH:MM:SS
  const formatSeconds = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // Obtener tareas relevantes (ahora devuelve objetos con numero/nombre/inicio/fin)
  const getTareasRelevantes = (item: Lote) => {
    const tareas: Array<{ numero: number; nombre: string; inicio: string | null; fin: string | null; display: string }> = [];

    // Agregar tareas según el mapeo
    for (const [numero, nombre] of Object.entries(tareaNombres)) {
      const num = parseInt(numero);
      const inicio = item[`TareaInicio0${num}`] as string | null;
      const fin = item[`TareaFinal0${num}`] as string | null;
      tareas.push({
        numero: num,
        nombre,
        inicio,
        fin,
        display: `${nombre}: ${formatDateTime(inicio)} - ${formatDateTime(fin)}`,
      });
    }
    return tareas;
  };

  const [lotes, setLotes] = useState<Lote[]>([]);
  const [filteredLotes, setFilteredLotes] = useState<Lote[]>([]);
  const [loadingLotes, setLoadingLotes] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'Todo' | 'Fabricado' | 'En Fabricacion' | 'En Cola'>('Todo');
const [userData, setUserData] = useState<UserData | null>(null);
  


const [userModalVisible, setUserModalVisible] = useState(false);     // ModalHeader (usuario/rol)
const [modulesModalVisible, setModulesModalVisible] = useState(false); // Modal de módulos/tiempos




  const [selectedLote, setSelectedLote] = useState<string | null>(null);
  const [modules, setModules] = useState<Linea[]>([]);
  const [loadingModules, setLoadingModules] = useState(false);
  const [selectedModule, setSelectedModule] = useState<string | null>(null);
  const [tiemposAcumulados, setTiemposAcumulados] = useState<any[]>([]);
  const [loadingTiempos, setLoadingTiempos] = useState(false);
  // Modal para tarea específica (click en una tarea)
  const [tareaModalVisible, setTareaModalVisible] = useState(false);
  const [selectedTareaNumero, setSelectedTareaNumero] = useState<number | null>(null);
  const [selectedTareaNombre, setSelectedTareaNombre] = useState<string | null>(null);
  const [tareaModalModules, setTareaModalModules] = useState<Array<Linea & { TiempoTarea?: number | null }>>([]);
  const [loadingTareaModal, setLoadingTareaModal] = useState(false);
  
  // Estados para operarios del lote seleccionado
  const [operariosLote, setOperariosLote] = useState<OperarioLote[]>([]);
  const [loadingOperarios, setLoadingOperarios] = useState(false);
  
  //const [userRole, setUserRole] = useState<string | null>(null);

  const [sqlVisible, setSqlVisible] = useState(false);
  const [loading, setLoading] = useState(true);
   const [token, setToken] = useState<string | null>(null);
   const [modalUser, setModalUser] = React.useState({ userName: '', role: '' });
   const router = useRouter();

  // Detectar plataforma web para layout específico
  const isWeb = Platform.OS === 'web';
  const { width: windowWidth } = useWindowDimensions();
  const cols = isWeb ? 4 : 3;
  const gap = 8;
  // Calcular ancho específico para garantizar N columnas exactas
  const computedCardWidth = isWeb 
    ? Math.max(150, Math.floor((windowWidth - 40 - gap * (cols - 1)) / cols))
    : Math.floor((windowWidth - 32) / 3) - 4; // Para móvil: ancho exacto para 3 columnas




   // justo después de userData / authenticated:
const normalizedRole =
  ((userData?.rol ?? userData?.role) ?? '')
    .toString()
    .trim()
    .toLowerCase();

const allowed = ['admin', 'developer', 'administrador'].includes(normalizedRole);



  const { serverReachable } = useOfflineMode();
    // Verificar autenticación al cargar
    useEffect(() => {
      if (!authLoading && !authenticated) {
        console.log('🚫 Usuario no autenticado, redirigiendo a login...');
        router.replace('/login');
      }
    }, [authenticated, authLoading, router]);

  // Obtiene rol de usuario
  useEffect(() => {
    (async () => {
      try {
        // 1. Recuperar el token
        const storedToken = await AsyncStorage.getItem('token');
        // 2. Recuperar los datos de usuario (JSON)
        const rawUser = await AsyncStorage.getItem('userData');

        console.log('🟢 AsyncStorage token:', storedToken);
        console.log('🟢 AsyncStorage userData:', rawUser);

        if (storedToken) {
          setToken(storedToken);
        }
        if (rawUser) {
          let parsedUser = JSON.parse(rawUser);
          console.log('🟢 parsedUser:', parsedUser);
          // Mapear si vienen como name/role
          if (parsedUser) {
            if (parsedUser.nombre && parsedUser.rol) {
              setUserData(parsedUser);
            } else if (parsedUser.name && parsedUser.role) {
              setUserData({
                id: parsedUser.id || 0,
                nombre: parsedUser.name,
                rol: parsedUser.role,
              });
            } else {
              setUserData(null);
            }
          } else {
            setUserData(null);
          }
        }
      } catch (error) {
        console.error('❌ Error al leer AsyncStorage:', error);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  // Carga lotes desde el backend
  const refreshLotes = () => {
    log('Actualizando lotes manualmente...');
    setLoadingLotes(true);
    fetch(`${API_URL}/control-terminales/lotes`)
      .then(res => {
        log('Respuesta de lotes:', res.status, res.ok);
        return res.json();
      })
      .then((json: any) => {
        log('Datos recibidos de lotes:', json);
        const data = Array.isArray(json) ? json as Lote[] : [];
        setLotes(data);
        log('Lotes actualizados:', data.length);
      })
      .catch(error => {
        log('Error al cargar lotes:', error);
        console.error(error);
      })
      .finally(() => setLoadingLotes(false));
  };

  // Carga inicial de lotes
  useEffect(() => {
    refreshLotes();
  }, []);

  // Filtra lotes según búsqueda y estado
  useEffect(() => {
    if (!Array.isArray(lotes)) {
      setFilteredLotes([]);
      return;
    }
    
    let filtered = lotes;
    
    // Filtrar por estado
    if (statusFilter !== 'Todo') {
      filtered = filtered.filter(item => {
        if (statusFilter === 'Fabricado') {
          return item.Fabricado !== 0;
        } else if (statusFilter === 'En Fabricacion') {
          return item.Fabricado === 0 && item.FechaRealInicio;
        } else if (statusFilter === 'En Cola') {
          return item.Fabricado === 0 && !item.FechaRealInicio;
        }
        return true;
      });
    }
    
    // Filtrar por búsqueda
    const q = searchQuery.trim().toLowerCase();
    if (q) {
      filtered = filtered.filter(item => {
        // Buscar por número manual
        if (item.NumeroManual.toLowerCase().includes(q)) return true;
        // Buscar en descripción
        if (item.Descripcion?.toLowerCase().includes(q)) return true;
        // Filtrar por Fabricado con operadores >,< o exacto
        if (/^[<>]?\d+$/.test(q)) {
          const num = parseInt(q.replace(/[<>]/g, ''), 10);
          if (q.startsWith('>') && (item.Fabricado ?? 0) > num) return true;
          if (q.startsWith('<') && (item.Fabricado ?? 0) < num) return true;
          if (!q.startsWith('>') && !q.startsWith('<') && (item.Fabricado ?? 0) === num) return true;
        }
        return false;
      });
    }
    
    setFilteredLotes(filtered);
    log('Lotes filtrados:', filtered.length);
  }, [lotes, searchQuery, statusFilter]);

  // Abrir modal para módulos
  const openModal = (num: string) => {
    setSelectedLote(num);
    setUserModalVisible(false);      // por si acaso
    setModulesModalVisible(true);    // ✅ solo abre el de módulos
    setModules([]);
    setSelectedModule(null);
    setOperariosLote([]); // Limpiar operarios previos
    setLoadingModules(true);
    
    // 1. PRIMERO: Cargar módulos y calcular sus estados basado en tiempos de tareas
    fetch(`${API_URL}/control-terminales/loteslineas?num_manual=${encodeURIComponent(num)}`)
      .then(res => {
        log('Respuesta de módulos:', res.status, res.ok);
        return res.json();
      })
      .then(async (rows: Linea[]) => {
        log('Módulos recibidos:', rows);
        
        // Para cada módulo, obtener los tiempos de todas las tareas
        const modulesWithStatus = await Promise.all(rows.map(async (module) => {
          try {
            const tiemposRes = await fetch(`${API_URL}/control-terminales/tiempos-acumulados-modulo?num_manual=${encodeURIComponent(num)}&modulo=${encodeURIComponent(module.Módulo)}`);
            const tiemposData = await tiemposRes.json();
            
            if (Array.isArray(tiemposData)) {
              // Contar tareas con tiempo > 0
              const tareasConTiempo = tiemposData.filter(t => (t.TiempoAcumulado ?? 0) > 0).length;
              const totalTareas = Object.keys(tareaNombres).length; // Total de tareas definidas
              
              let estado: 'completo' | 'parcial' | 'sin_tiempo';
              if (tareasConTiempo === 0) {
                estado = 'sin_tiempo'; // Rojo
              } else if (tareasConTiempo === totalTareas) {
                estado = 'completo'; // Verde
              } else {
                estado = 'parcial'; // Amarillo
              }
              
              return { ...module, estadoTiempos: estado };
            }
            return { ...module, estadoTiempos: 'sin_tiempo' as const };
          } catch (error) {
            log('Error al cargar tiempos para módulo:', module.Módulo, error);
            return { ...module, estadoTiempos: 'sin_tiempo' as const };
          }
        }));
        
        setModules(modulesWithStatus);
        log('Módulos actualizados con estados:', modulesWithStatus);
      })
      .catch(error => {
        log('Error al cargar módulos:', error);
        console.error(error);
      })
      .finally(() => setLoadingModules(false));

    // 2. SEGUNDO: Cargar operarios en segundo plano (sin bloquear la UI)
    setTimeout(() => {
      loadOperarios(num);
    }, 100); // Pequeño delay para que primero se muestren los módulos
  };

  // Carga detalles de módulo
  const loadDetails = (mod: Linea) => {
    if (!selectedLote) return;
    setSelectedModule(mod.Módulo);
    setLoadingTiempos(true);
    
    // 1. PRIMERO: Cargar tiempos (prioridad)
    fetch(`${API_URL}/control-terminales/tiempos-acumulados-modulo?num_manual=${encodeURIComponent(selectedLote)}&modulo=${encodeURIComponent(mod.Módulo)}`)
      .then(res => {
        log('Respuesta de tiempos acumulados:', res.status, res.ok);
        return res.json();
      })
      .then((json: any[]) => {
        log('Tiempos recibidos:', json);
        const tiemposProcesados = json
          .map(item => ({
            ...item,
            NumeroTarea: tareaNombres[item.NumeroTarea as keyof typeof tareaNombres],
          }))
          .filter(item => item.NumeroTarea); // Filtra las tareas que no están en el mapeo

        setTiemposAcumulados(tiemposProcesados);
        log('Tiempos actualizados:', tiemposProcesados.length);
        
        // 2. SEGUNDO: Si no hay operarios cargados, cargarlos ahora
        if (operariosLote.length === 0 && selectedLote) {
          setTimeout(() => {
            loadOperarios(selectedLote);
          }, 100);
        }
      })
      .catch(error => {
        log('Error al cargar tiempos:', error);
        console.error(error);
      })
      .finally(() => setLoadingTiempos(false));
  };

  // Carga información de operarios para un lote específico
  const loadOperarios = (numeroManual: string) => {
    setLoadingOperarios(true);
    fetch(`${API_URL}/control-terminales/tiempos-operario-lote?num_manual=${encodeURIComponent(numeroManual)}`)
      .then(res => {
        log('Respuesta de operarios:', res.status, res.ok);
        return res.json();
      })
      .then((json: OperarioLote[]) => {
        log('Operarios recibidos:', json);
        setOperariosLote(Array.isArray(json) ? json : []);
      })
      .catch(error => {
        log('Error al cargar operarios:', error);
        console.error(error);
        setOperariosLote([]);
      })
      .finally(() => setLoadingOperarios(false));
  };

  // Función para obtener el operario que trabajó en una tarea específica
  const getOperarioPorTarea = (nombreTarea: string): OperarioLote | null => {
    if (!operariosLote.length) return null;
    
    // Mapeo de tareas para mejorar la coincidencia
    const mapeoTareas: { [key: string]: string[] } = {
      'CORTE': ['CORTE'],
      'PRE-ARMADO': ['PREARMADO', 'PRE-ARMADO', 'PRE_ARMADO'],
      'ARMADO': ['ARMADO'],
      'HERRAJE': ['HERRAJE', 'HERRAJEHOJA'],
      'MATRIMONIO': ['MATRIMONIO'],
      'COMPACTO': ['COMPACTO'],
      'ACRISTALADO': ['ACRISTALADO'],
      'EMBALAJE': ['EMBALAJE']
    };

    const tareaUpper = nombreTarea.toUpperCase();
    const variantes = mapeoTareas[tareaUpper] || [tareaUpper];
    
    // Buscar operario que coincida con alguna variante de la tarea
    for (const variante of variantes) {
      const operario = operariosLote.find(op => 
        op.Tarea.toUpperCase().includes(variante) || 
        variante.includes(op.Tarea.toUpperCase())
      );
      if (operario) return operario;
    }
    
    return null;
  };



  // mientras carga auth o storage, muestra spinner
if (authLoading || loading) {
  return (
    <View style={styles.center}>
      <ActivityIndicator />
    </View>
  );
}



// si no está autenticado, ya tienes un useEffect que redirige a /login
// aquí no renders nada para evitar parpadeos
if (!authenticated) return null;


// si está autenticado pero no tiene rol permitido:
if (!allowed) {
  return (
    <View style={styles.center}>
      <Text style={styles.errorText}>No tiene credenciales para ver esta información</Text>
    </View>
  );
}



  return (
    <SafeAreaView style={styles.container}>
     





 {/* Header 
      <AppHeader
        count={filteredLotes.length}
        titleOverride="Terminales"        // o filtered.length, items.length, etc.
        onRefresh={refreshLotes}          // opcional
      // serverReachableOverride={serverReachable} // sólo si NO usas useOfflineMode
      />
*/}

        <AppHeader
        titleOverride="Terminales Moncada"
        count={filteredLotes.length}
          // ...otras props si aplican...
          userNameProp={userData?.nombre || userData?.name || '—'}
          roleProp={userData?.rol || userData?.role || '—'}
          serverReachableOverride={!!authenticated}   // o tu booleano real de salud del servidor
onUserPress={({ userName, role }) => {
  setModalUser({ userName, role });
  setModulesModalVisible(false);   // por si acaso
  setUserModalVisible(true);       // ✅ solo abre el de usuario
}}
        />

        <ModalHeader
          visible={userModalVisible}
          onClose={() => setUserModalVisible(false)}
          userName={userData?.nombre || userData?.name || '—'}
          role={userData?.rol || userData?.role || '—'}
        />




      {/*
<Pressable
  style={styles.refreshButton}
  onPress={() => setSqlVisible(true)}
>
  <Ionicons name="code-slash-outline" size={24} color={COLORS.primary} />
</Pressable>
*/}




      {/* Búsqueda */}
      <View style={styles.searchContainer}>
        <Ionicons name="search-outline" size={20} color="#757575" />
        <TextInput
          style={styles.searchInput}
          placeholder="Buscar por Num. manual / Descripción / Fabricado"
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
      </View>

      {/* Filtros de estado */}
      <View style={styles.filterContainer}>
        {(['Todo', 'Fabricado', 'En Fabricacion', 'En Cola'] as const).map((filter) => (
          <TouchableOpacity
            key={filter}
            style={[
              styles.filterButton,
              statusFilter === filter && styles.filterButtonActive
            ]}
            onPress={() => setStatusFilter(filter)}
          >
            <Text style={[
              styles.filterText,
              statusFilter === filter && styles.filterTextActive
            ]} numberOfLines={1} adjustsFontSizeToFit>
              {filter}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Lista de lotes */}
      {loadingLotes ? (
        <ActivityIndicator style={{ flex: 1 }} />
      ) : (
        <FlatList
          data={filteredLotes}
          keyExtractor={(item, idx) => `${item.NumeroManual}-${idx}`}
          style={isWeb ? styles.flatListWeb : styles.flatListMobile}
          contentContainerStyle={isWeb ? styles.flatListContentWeb : undefined}
          numColumns={isWeb ? 4 : 1} // 4 columnas en web, 1 en móvil
          key={isWeb ? 'web-4-cols' : 'mobile-1-col'} // Key para forzar re-render cuando cambia numColumns
          renderItem={({ item }) => {
            const cardStyle = item.Fabricado === 0
              ? item.FechaRealInicio ? styles.cardEnFabricacion : styles.cardEnCola
              : styles.cardFinalizada;

            const fabricadoText = item.Fabricado === 0
              ? item.FechaRealInicio ? 'EN FABRICACIÓN' : 'EN COLA'
              : 'FINALIZADA LA FABRICACIÓN';

            return (
              <TouchableOpacity 
                style={[
                  cardStyle, 
                  isWeb ? styles.cardWeb : undefined
                ]} 
                onPress={() => openModal(item.NumeroManual)}
              >
                {/* Contenedor principal de dos columnas */}
                <View style={styles.mainRowContainer}>
                  {/* Columna izquierda */}
                  <View style={styles.leftColumn}>
                    <Text style={styles.cardTitle}>{item.NumeroManual}</Text>
                    <Text style={styles.cardText}>Fecha Fabricado: {formatDateTime(item.FabricadoFecha)}</Text>
                    <Text style={styles.cardText}>Inicio Real: {formatDateTime(item.FechaRealInicio)}</Text>
                    <Text style={styles.cardText}>Descripción: {item.Descripcion ?? '-'}</Text>
                  </View>
                  
                  {/* Columna derecha */}
                  <View style={styles.rightColumn}>
                    <View style={styles.cardTitleStatusButton}>
                      <Text style={styles.cardText}>{fabricadoText}</Text>
                      <Text style={styles.cardText}>Total Tiempo: {formatSeconds(item.TotalTiempo ?? 0)}</Text>
                    </View>
                  </View>
                </View>

                {/* Tareas debajo de las dos columnas */}
                <View style={styles.tareasContainer}>
                  {getTareasRelevantes(item).map((tarea, idx) => {
                    const nombre = tarea.nombre;
                    const display = tarea.display;
                    return (
                      <TouchableOpacity
                        key={idx}
                        onPress={() => {
                          // Abrir modal de tarea con módulos y tiempos por modulo para esta tarea
                          setSelectedTareaNumero(tarea.numero);
                          setSelectedTareaNombre(tarea.nombre);
                          setTareaModalVisible(true);
                          
                          // Cargar operarios solo si no están disponibles (no bloquear la carga de módulos)
                          if (operariosLote.length === 0) {
                            setTimeout(() => {
                              loadOperarios(item.NumeroManual);
                            }, 100);
                          }
                          
                          // PRIMERO: cargar módulos y tiempos por módulo para la tarea (prioridad)
                          (async () => {
                            if (!item.NumeroManual) return;
                            setLoadingTareaModal(true);
                            try {
                              const res = await fetch(`${API_URL}/control-terminales/loteslineas?num_manual=${encodeURIComponent(item.NumeroManual)}`);
                              const rows: Linea[] = await res.json();
                              // Para cada módulo, pedir el tiempo acumulado de la tarea específica
                              const rowsWithTiempo = await Promise.all(rows.map(async (r) => {
                                try {
                                  const q = `${API_URL}/control-terminales/tiempos-acumulados-modulo?num_manual=${encodeURIComponent(item.NumeroManual)}&modulo=${encodeURIComponent(r.Módulo)}`;
                                  const tres = await fetch(q);
                                  const j = await tres.json();
                                  // j es un array de objetos con NumeroTarea y TiempoAcumulado
                                  if (Array.isArray(j)) {
                                    const found = j.find((x: any) => Number(x.NumeroTarea) === Number(tarea.numero));
                                    const tiempo = found ? (found.TiempoAcumulado ?? found.Tiempo ?? 0) : null;
                                    return { ...r, TiempoTarea: tiempo };
                                  }
                                  return { ...r, TiempoTarea: null };
                                } catch (err) {
                                  return { ...r, TiempoTarea: null };
                                }
                              }));
                              setTareaModalModules(rowsWithTiempo);
                            } catch (err) {
                              console.error('Error al cargar módulos para tarea modal', err);
                              setTareaModalModules([]);
                            } finally {
                              setLoadingTareaModal(false);
                            }
                          })();
                        }}
                        style={[
                          styles.tareaCard,
                          display.includes(' - -') ? styles.tareaCardPendiente : styles.tareaCardFinalizada,
                          isWeb 
                            ? { 
                                width: '23%', // Ancho fijo para web - 4 tareas por fila
                                marginRight: 4,
                                marginBottom: gap,
                                flexBasis: '23%'
                              }
                            : { 
                                width: '30%', // Ancho para móvil - 3 columnas (30% + márgenes = ~33%)
                                marginHorizontal: '1.5%', // Separación entre columnas
                                marginBottom: 8,
                                flexBasis: '30%'
                              }
                        ]}
                      >
                        <Text style={styles.tareaText}>{nombre.trim()}</Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </TouchableOpacity>
            );
          }}
        />
      )}

      {/* Modal */}
      <Modal visible={modulesModalVisible} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Módulos {selectedLote}</Text>
            {loadingModules ? (
              <ActivityIndicator />
            ) : selectedModule ? (
              loadingTiempos ? (
                <ActivityIndicator />
              ) : (
                <View style={styles.modalContent}>
                  <Text style={styles.modalTitle}>Tiempos de: {selectedModule}</Text>
                  
                  {/* Mostrar indicador solo si se están cargando operarios Y ya se mostraron los tiempos */}
                  {loadingOperarios && tiemposAcumulados.length > 0 && (
                    <View style={styles.loadingOperarios}>
                      <ActivityIndicator size="small" color={COLORS.primary} />
                      <Text style={[styles.loadingText, styles.androidTextFix]}>Verificando operarios...</Text>
                    </View>
                  )}
                  
                  <ScrollView style={styles.modalScrollView}>
                    {tiemposAcumulados.map((item, idx) => {
                      const operario = getOperarioPorTarea(item.NumeroTarea);
                      const tienetiempo = item.TiempoAcumulado != null && item.TiempoAcumulado > 0;
                      return (
                        <View key={idx} style={styles.detailCard}>
                          <View style={styles.tareaInfo}>
                            <Text style={[styles.detailTextBold, styles.androidTextFix]}>{item.NumeroTarea}</Text>
                            {/* Solo mostrar info de operario si hay tiempo registrado */}
                            {tienetiempo && !loadingOperarios && operariosLote.length > 0 && (
                              operario ? (
                                <Text style={[styles.operarioText, styles.androidTextFix]}>
                                  👤 {operario.OperarioNombre}
                                </Text>
                              ) : (
                                <Text style={[styles.operarioText, styles.androidTextFix]}>
                                  ❓ Sin operario asignado
                                </Text>
                              )
                            )}
                          </View>
                          <Text style={[styles.detailText, styles.androidTextFix]}>{formatSeconds(item.TiempoAcumulado)}</Text>
                        </View>
                      );
                    })}
                  </ScrollView>
                </View>
              )
            ) : (
              <View style={styles.modalContent}>
                <ScrollView style={[styles.modalScrollView, { maxHeight: '100%', maxWidth: '100%' }]}>
                  {modules.map((mod, idx) => {
                    // Determinar el estilo basado en el estado de tiempos
                    let moduleStyle = styles.moduleSinTiempo; // Rojo por defecto
                    if (mod.estadoTiempos === 'completo') {
                      moduleStyle = styles.moduleTiempoCompleto; // Verde
                    } else if (mod.estadoTiempos === 'parcial') {
                      moduleStyle = styles.moduleTiempoParcial; // Amarillo
                    }
                    
                    return (
                      <TouchableOpacity
                        key={idx}
                        style={[styles.cardSmall, moduleStyle]}
                        onPress={() => loadDetails(mod)}
                      >
                        <Text style={[styles.cardTitleSmall, styles.androidTextFix]}>{mod.Módulo}</Text>
                      </TouchableOpacity>
                    );
                  })}
                </ScrollView>
              </View>
            )}
            <Pressable style={styles.closeButton} onPress={() => selectedModule ? setSelectedModule(null) : setModulesModalVisible(false)}>
              <Text style={styles.closeText}>{selectedModule ? 'Volver' : 'Cerrar'}</Text>
            </Pressable>
          </View>
        </View>
      </Modal>
      {/* Modal específico para una tarea (clic en tarea) */}
      <Modal visible={tareaModalVisible} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>{selectedTareaNombre ?? 'Tarea'}</Text>
            
            {/* Mostrar indicador solo si se están cargando operarios Y ya hay módulos */}
            {loadingOperarios && tareaModalModules.length > 0 && (
              <View style={styles.loadingOperarios}>
                <ActivityIndicator size="small" color={COLORS.primary} />
                <Text style={[styles.loadingText, styles.androidTextFix]}>Verificando operarios...</Text>
              </View>
            )}
            
            {loadingTareaModal ? (
              <ActivityIndicator />
            ) : (
              <View style={styles.modalContent}>
                <ScrollView style={styles.modalScrollView}>
                  {tareaModalModules.map((mod, idx) => {
                    const operario = getOperarioPorTarea(selectedTareaNombre || '');
                    const tienetiempo = mod.TiempoTarea != null && mod.TiempoTarea > 0;
                    return (
                      <View key={idx} style={[styles.detailCard, { justifyContent: 'space-between' }]}>
                        <View style={styles.tareaInfo}>
                          <Text style={[styles.detailTextBold, styles.androidTextFix]}>{mod.Módulo}</Text>
                          {/* Solo mostrar info de operario si hay tiempo registrado */}
                          {tienetiempo && !loadingOperarios && operariosLote.length > 0 && (
                            operario ? (
                              <Text style={[styles.operarioText, styles.androidTextFix]}>
                                👤 {operario.OperarioNombre}
                              </Text>
                            ) : (
                              <Text style={[styles.operarioText, styles.androidTextFix]}>
                                ❓ Sin operario asignado
                              </Text>
                            )
                          )}
                        </View>
                        <Text style={[styles.detailText, styles.androidTextFix]}>
                          {mod.TiempoTarea != null ? formatSeconds(mod.TiempoTarea) : '-'}
                        </Text>
                      </View>
                    );
                  })}
                </ScrollView>
              </View>
            )}
            <Pressable style={styles.closeButton} onPress={() => setTareaModalVisible(false)}>
              <Text style={styles.closeText}>Cerrar</Text>
            </Pressable>
          </View>
        </View>
      </Modal>
      {/* SQL Debug Modal */}
      {sqlVisible && <SQLModal visible={sqlVisible} onClose={() => setSqlVisible(false)} />}

    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  // Agregar estos estilos al StyleSheet
flatListWeb: {
  // Estilos específicos para web - usar máximo ancho
  width: '100%', // Usar todo el ancho disponible
  alignSelf: 'stretch', // Expandir a todo el ancho
  paddingHorizontal: 16,
},
flatListContentWeb: {
  paddingVertical: 16,
  paddingHorizontal: 8, // Padding horizontal para espacio
},
flatListMobile: {
  // Estilos para móvil si necesitas
},
cardWeb: {
  // Estilo específico para tarjetas en web - 4 columnas
  flex: 1, // Usar flex para dividir el espacio igualmente
  maxWidth: '25%', // Máximo 25% del ancho para 4 columnas
  minWidth: 250, // Ancho mínimo para que se vea bien
  marginBottom: 16,
  marginHorizontal: 8, // Margen horizontal entre columnas
  // Sombreado para web
  shadowColor: '#000',
  shadowOffset: { width: 0, height: 4 },
  shadowOpacity: 0.15,
  shadowRadius: 8,
  elevation: 6, // Para Android web
},

  container: { flex: 1, backgroundColor: COLORS.background },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  errorText: { color: 'red', fontSize: 16 },
  header: { flexDirection: 'row', alignItems: 'center', padding: 12, backgroundColor: COLORS.surface, justifyContent: 'center' },
  statusText: { marginHorizontal: 6, fontSize: 16, fontWeight: 'bold' },
  connected: { color: COLORS.success },
  disconnected: { color: COLORS.error },
  searchContainer: { flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.surface, margin: 8, paddingHorizontal: 12, borderRadius: 8, elevation: 2 },
searchInput: {
  flex: 1,
  height: 40,
  marginLeft: 8,
  color: '#333333', // gris oscuro
},
  filterContainer: {
    flexDirection: 'row',
    paddingHorizontal: 4, // Reducido de 8 a 4
    paddingVertical: 8,
    justifyContent: 'space-between', // Cambiado de space-around a space-between
    backgroundColor: COLORS.background,
    flexWrap: 'wrap', // Permitir que se envuelvan si es necesario
  },
  filterButton: {
    paddingHorizontal: 8, // Reducido de 16 a 8
    paddingVertical: 6, // Reducido de 8 a 6
    borderRadius: 16, // Reducido de 20 a 16
    backgroundColor: '#f0f0f0',
    marginHorizontal: 2, // Reducido de 4 a 2
    marginVertical: 2, // Agregado para separación vertical
    borderWidth: 1,
    borderColor: '#ddd',
    flex: 1, // Usar flex para distribuir el espacio igualmente
    maxWidth: '24%', // Máximo ancho del 24% para 4 botones
    minWidth: 70, // Ancho mínimo para legibilidad
  },
  filterButtonActive: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  filterText: {
    fontSize: 12, // Reducido de 14 a 12
    fontWeight: '600',
    color: '#666',
    textAlign: 'center',
  },
  filterTextActive: {
    color: '#fff',
  },
  card: { margin: 8, padding: 16, borderRadius: 12, elevation: 3, backgroundColor: '#fff' },
  cardEnCola: { margin: 8, padding: 16, borderRadius: 12, elevation: 3, backgroundColor: '#ffd7d7' },
  cardEnFabricacion: { margin: 8, padding: 16, borderRadius: 12, elevation: 3, backgroundColor: '#fff9c4' },
  cardFinalizada: { margin: 8, padding: 16, borderRadius: 12, elevation: 3, backgroundColor: '#d4edda' },
  cardTitle: { fontSize: 18, fontWeight: 'bold', marginBottom: 4, color: '#000' },
  mainRowContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  leftColumn: {
    flex: 1,
    paddingRight: 8,
  },
  rightColumn: {
    alignItems: 'flex-end',
    justifyContent: 'center',
  },
  buttonContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 8,
    alignItems: 'center',
  },
  cardTitleStatusButton: { 
    color: '#000', 
    fontSize: 14,
    backgroundColor: '#f0f0f0',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#ccc',
    textAlign: 'center',
    fontWeight: 'bold',
    alignSelf: 'flex-start',
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
  },
  cardText: { 
    color: '#000', 
    fontSize: 14, 
    marginBottom: 2 
  },
  cardTextButton: {
    color: '#000', 
    fontSize: 14,
    backgroundColor: '#e8f4f8',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#b3d9e8',
    alignSelf: 'flex-start',
    fontWeight: '600',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.15,
    shadowRadius: 3,
  },
  modalOverlay: { 
    flex: 1, 
    backgroundColor: 'rgba(0,0,0,0.5)', 
    justifyContent: 'center', 
    alignItems: 'center' 
  },
  modalContent: { 
    backgroundColor: '#fff', 
    borderRadius: 12, 
    padding: 16, 
    width: '80%', 
    maxHeight: '80%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8, // Mejorar elevación para Android
  },
  modalTitle: { 
    fontSize: 20, 
    fontWeight: 'bold', 
    marginBottom: 12, 
    color: COLORS.primary, 
    textAlign: 'center',
    textShadowColor: 'rgba(0, 0, 0, 0.1)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  tareasContainer: { 
    flexDirection: 'row', 
    flexWrap: 'wrap', 
    justifyContent: Platform.OS === 'web' ? 'flex-start' : 'space-between', // flex-start para web, space-between para móvil
    marginTop: 8,
    paddingHorizontal: Platform.OS === 'web' ? 4 : 2, // Menos padding en móvil
    gap: Platform.OS === 'web' ? 4 : 0, // Gap solo en web
  },
  tareaCard: {
    padding: 10,
    borderRadius: 8,
    minHeight: 40,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#ddd',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
  },
  // removemos tareaCardWeb ya que ahora se maneja dinámicamente
  tareaCardFinalizada: {
    backgroundColor: '#d4edda',
    borderColor: 'transparent',
    shadowColor: '#a3e635',
  },
  tareaCardPendiente: {
    backgroundColor: '#ffd7d7',
    borderColor: 'transparent',
    shadowColor: '#ef4444',
  },
  tareaText: { 
    fontSize: 12, 
    fontWeight: 'bold', 
    textAlign: 'center',
    color: '#333'
  },
  cardSmall: { 
    backgroundColor: '#eef6fb', 
    padding: 12, 
    borderRadius: 8, 
    marginVertical: 4,
    borderWidth: 1,
    borderColor: '#d1e7f0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  cardTitleSmall: { 
    color: COLORS.primary, 
    fontWeight: 'bold',
    fontSize: 14,
    textAlign: 'center',
  },
  moduleFabricado: { 
    backgroundColor: '#d4edda',
    borderColor: '#28a745',
    borderWidth: 2,
  },
  modulePendiente: { 
    backgroundColor: '#ffd7d7',
    borderColor: '#dc3545',
    borderWidth: 2,
  },
  // Nuevos estilos basados en estado de tiempos
  moduleTiempoCompleto: { 
    backgroundColor: '#d4edda', // Verde - todas las tareas tienen tiempo
    borderColor: '#28a745',
    borderWidth: 2,
  },
  moduleTiempoParcial: { 
    backgroundColor: '#fff3cd', // Amarillo - algunas tareas tienen tiempo
    borderColor: '#ffc107',
    borderWidth: 2,
  },
  moduleSinTiempo: { 
    backgroundColor: '#f8d7da', // Rojo - ninguna tarea tiene tiempo
    borderColor: '#dc3545',
    borderWidth: 2,
  },
  closeButton: { 
    marginTop: 12, 
    backgroundColor: COLORS.primary, 
    padding: 12, 
    borderRadius: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4,
  },
  closeText: { 
    color: '#fff', 
    textAlign: 'center', 
    fontWeight: 'bold',
    fontSize: 16,
    textShadowColor: 'rgba(0, 0, 0, 0.3)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  detailCard: { 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    paddingVertical: 12, 
    borderBottomWidth: 1, 
    borderBottomColor: '#eee', 
    alignItems: 'center',
    backgroundColor: '#fff', // Asegurar fondo blanco
  },
  detailText: { 
    fontSize: 16, 
    color: '#1f2937', // Color de texto explícito para buena visibilidad
    fontWeight: '500' 
  },
  detailTextBold: { 
    fontSize: 16, 
    fontWeight: 'bold', 
    color: '#1f2937' // Color de texto explícito para buena visibilidad
  },
  modalScrollView: {
    backgroundColor: '#fff',
    maxHeight: '100%',
  },
  // Estilos adicionales para garantizar visibilidad en Android release
  androidTextFix: {
    textShadowColor: 'transparent',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 0,
  },
  tareaInfo: {
    flex: 1,
    flexDirection: 'column',
  },
  operarioText: {
    fontSize: 12,
    color: '#666',
    fontStyle: 'italic',
    marginTop: 2,
  },
  loadingOperarios: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 8,
    backgroundColor: '#f8f9fa',
    borderRadius: 6,
    marginBottom: 8,
  },
  loadingText: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginLeft: 8,
  },
  refreshButton: { marginLeft: 8, padding: 4 }
});
