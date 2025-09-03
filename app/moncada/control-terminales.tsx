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
  [key: string]: string | number | null | undefined;
};

type Fabricacion = {
  Módulo: string;
  [key: string]: string | number | null | undefined;
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
    10: 'EMBALAJE'
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
    setLoadingModules(true);
    fetch(`${API_URL}/control-terminales/loteslineas?num_manual=${encodeURIComponent(num)}`)
      .then(res => {
        log('Respuesta de módulos:', res.status, res.ok);
        return res.json();
      })
      .then((rows: Linea[]) => {
        log('Módulos recibidos:', rows);
        setModules(rows);
        log('Módulos actualizados:', rows);
      })
      .catch(error => {
        log('Error al cargar módulos:', error);
        console.error(error);
      })
      .finally(() => setLoadingModules(false));
  };

  // Carga detalles de módulo
  const loadDetails = (mod: Linea) => {
    if (!selectedLote) return;
    setSelectedModule(mod.Módulo);
    setLoadingTiempos(true);
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
      })
      .catch(error => {
        log('Error al cargar tiempos:', error);
        console.error(error);
      })
      .finally(() => setLoadingTiempos(false));
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
            ]}>
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
                          // reutilizamos selectedLote para la consulta
                          setTareaModalVisible(true);
                          // cargar módulos y tiempos por módulo para la tarea
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
                  <ScrollView>
                    {tiemposAcumulados.map((item, idx) => (
                      <View key={idx} style={styles.detailCard}>
                        <Text style={styles.detailTextBold}>{item.NumeroTarea}</Text>
                        <Text style={styles.detailText}>{formatSeconds(item.TiempoAcumulado)}</Text>
                      </View>
                    ))}
                  </ScrollView>
                </View>
              )
            ) : (
              <View style={styles.modalContent}>
                <ScrollView style={{ maxHeight: '100%', maxWidth: '100%', }}>
                  {modules.map((mod, idx) => (
                    <TouchableOpacity
                      key={idx}
                      style={[
                        styles.cardSmall,
                        mod.Fabricada === 1 ? styles.moduleFabricado : styles.modulePendiente
                      ]}
                      onPress={() => loadDetails(mod)}
                    >
                      <Text style={styles.cardTitleSmall}>{mod.Módulo}</Text>
                    </TouchableOpacity>
                  ))}
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
            {loadingTareaModal ? (
              <ActivityIndicator />
            ) : (
              <View style={styles.modalContent}>
                <ScrollView>
                  {tareaModalModules.map((mod, idx) => (
                    <View key={idx} style={[styles.detailCard, { justifyContent: 'space-between' }]}>
                      <Text style={styles.detailTextBold}>{mod.Módulo}</Text>
                      <Text style={styles.detailText}>{mod.TiempoTarea != null ? formatSeconds(mod.TiempoTarea) : '-'}</Text>
                    </View>
                  ))}
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
  searchInput: { flex: 1, height: 40, marginLeft: 8 },
  filterContainer: {
    flexDirection: 'row',
    paddingHorizontal: 8,
    paddingVertical: 8,
    justifyContent: 'space-around',
    backgroundColor: COLORS.background,
  },
  filterButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#f0f0f0',
    marginHorizontal: 4,
    borderWidth: 1,
    borderColor: '#ddd',
  },
  filterButtonActive: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  filterText: {
    fontSize: 14,
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
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.3)', justifyContent: 'center', alignItems: 'center' },
  modalContent: { backgroundColor: '#fff', borderRadius: 12, padding: 16, width: '80%', maxHeight: '80%' },
  modalTitle: { fontSize: 20, fontWeight: 'bold', marginBottom: 12, color: COLORS.primary, textAlign: 'center' },
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
  cardSmall: { backgroundColor: '#eef6fb', padding: 12, borderRadius: 8, marginVertical: 4 },
  cardTitleSmall: { color: COLORS.primary, fontWeight: 'bold' },
  moduleFabricado: { backgroundColor: '#d4edda' },
  modulePendiente: { backgroundColor: '#ffd7d7' },
  closeButton: { marginTop: 12, backgroundColor: COLORS.primary, padding: 10, borderRadius: 8 },
  closeText: { color: '#fff', textAlign: 'center', fontWeight: 'bold' },
  detailCard: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#eee', alignItems: 'center' },
  detailText: { fontSize: 16 },
  detailTextBold: { fontSize: 16, fontWeight: 'bold' },
  refreshButton: { marginLeft: 8, padding: 4 }
});
