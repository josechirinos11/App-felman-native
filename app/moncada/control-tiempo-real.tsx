import Ionicons from '@expo/vector-icons/Ionicons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { useEffect, useState } from 'react';
import {
    ActivityIndicator,
    FlatList,
    Modal, Platform,
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
import useSocket from '../../hooks/useSocket';

import SQLModal from '../../components/SQLModal';
import { API_URL } from '../../config/constants';
import COLORS from '../../constants/Colors';
import { useOfflineMode } from '../../hooks/useOfflineMode';

// Define los campos que devuelve el backend

// Tipo para la consulta tiempo-real
type TiempoRealRecord = {
  Serie?: string;
  Numero?: number;
  Fecha: string;
  CodigoOperario: string;
  OperarioNombre?: string | null;
  Tipo?: number;
  Gastos1?: number;
  Gastos2?: number;
  Kms1?: number;
  Kms2?: number;
  CodigoSerie?: string;
  CodigoNumero?: number;
  Linea?: number;
  FechaInicio?: string | null;
  HoraInicio?: string | null;
  FechaFin?: string | null;
  HoraFin?: string | null;
  CodigoPuesto?: string | null;
  CodigoTarea?: string | null;
  ObraSerie?: string | null;
  ObraNumero?: number | null;
  FabricacionSerie?: string | null;
  FabricacionNumero?: number | null;
  FabricacionLinea?: number | null;
  NumeroManual?: string | null;
  CodigoLote?: string | null;
  LoteLinea?: number | null;
  Modulo?: string | null;
  TiempoDedicado?: number | null;
  Abierta?: number | null;
  TipoTarea?: number | null;
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
    12: 'REBARBA'
  };


  // Formatear fecha a YYYY-MM-DD (extrae la parte date si viene en ISO)
  const formatDateOnly = (dateStr?: string | null) => {
    if (!dateStr) return '-';
    const s = String(dateStr).trim();
    if (!s) return '-';
    if (s.includes('T')) return s.split('T')[0];
    try {
      const d = new Date(s);
      if (!isNaN(d.getTime())) return d.toISOString().slice(0, 10);
    } catch (e) {
      // fallthrough
    }
    // Fallback: first 10 chars
    return s.slice(0, 10);
  };

  // Formatear duración a una cadena legible.
  // Nota: el backend suele enviar el tiempo en segundos. Para compatibilidad,
  // asumimos que el número recibido representa segundos. Si el valor es
  // extremadamente grande (heurística), lo tratamos como milisegundos.
  const formatDuration = (value?: number | null) => {
    if (value == null) return '-';
    const n = Number(value);
    if (isNaN(n)) return '-';

    // Heurística mínima: si el número es muy grande (p.ej. > 1e9), probablemente
    // venga en milisegundos -> convertir a segundos. Esto evita dividir por 1000
    // cuando el backend ya envía segundos pequeños (p.ej. 660 = 11 minutos).
    let totalSeconds = n;
    if (n > 1e9) {
      totalSeconds = Math.floor(n / 1000);
    }

    totalSeconds = Math.floor(totalSeconds);

    const days = Math.floor(totalSeconds / 86400);
    let rem = totalSeconds % 86400;
    const hours = Math.floor(rem / 3600);
    rem = rem % 3600;
    const minutes = Math.floor(rem / 60);
    const seconds = rem % 60;

    if (days > 0) {
      return `${days} dia${days > 1 ? 's' : ''} - ${hours} horas - ${minutes} minutos`;
    }
    if (hours > 0) {
      return `${hours} horas - ${minutes} minutos`;
    }
    return `${minutes} minutos - ${seconds} segundos`;
  };


  // This screen now only uses tiempo-real endpoint; other endpoints/logic removed.
  // tiempo real
  const [tiempoRecords, setTiempoRecords] = useState<TiempoRealRecord[]>([]);
  const [loadingTiempo, setLoadingTiempo] = useState(false);
  const [filterMode, setFilterMode] = useState<'operador' | 'tarea' | 'pedido'>('operador');
  const [groupedList, setGroupedList] = useState<any[]>([]);
  const [detailModalVisible, setDetailModalVisible] = useState(false);
  const [detailList, setDetailList] = useState<TiempoRealRecord[]>([]);
  const [selectedGroupKey, setSelectedGroupKey] = useState<string | null>(null);
  const [modalContext, setModalContext] = useState<'operador' | 'tarea' | 'pedido' | null>(null);
  const [modalGroupBy, setModalGroupBy] = useState<'none' | 'operador' | 'tarea' | 'pedido'>('none');
  const [searchQuery, setSearchQuery] = useState('');
const [userData, setUserData] = useState<UserData | null>(null);
  


  const [userModalVisible, setUserModalVisible] = useState(false);     // ModalHeader (usuario/rol)




  // module/operarios/tarea related state removed — not needed for tiempo-real only view
  
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
  // Hook de socket (usa WS_URL de config por defecto)
  const { connected: socketConnected, lastMessage, send } = useSocket();
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

  // Carga inicial: sólo tiempo-real
  useEffect(() => {
    fetchTiempoReal();
  }, []);

  // Fetch de tiempo-real desde backend
  async function fetchTiempoReal() {
    try {
      setLoadingTiempo(true);
      const res = await fetch(`${API_URL}/control-terminales/tiempo-real`);
      if (!res.ok) {
        console.warn('[tiempo-real] respuesta no ok', res.status);
        setTiempoRecords([]);
        return;
      }
      const json = await res.json();
      if (!Array.isArray(json)) {
        setTiempoRecords([]);
        return;
      }
      setTiempoRecords(json as TiempoRealRecord[]);
    } catch (err) {
      console.error('[tiempo-real] error', err);
      setTiempoRecords([]);
    } finally {
      setLoadingTiempo(false);
    }
  }

  // Helper para obtener timestamp (Fecha + HoraInicio/HoraFin)
  const recordTimestamp = (r: TiempoRealRecord) => {
    try {
      const fecha = r.Fecha || r.FechaInicio || r.FechaFin;
      const hora = r.HoraInicio || r.HoraFin || '00:00:00';
      if (!fecha) return 0;
      // Crear ISO-like string
      const s = `${fecha}T${hora}`;
      const t = new Date(s).getTime();
      return isNaN(t) ? 0 : t;
    } catch (e) {
      return 0;
    }
  };

  // Helper para normalizar y extraer primer nombre (key) de OperarioNombre o CodigoOperario
  const operarioFirstNameKey = (val?: string | null) => {
    if (!val) return 'SIN_OPERARIO';
    const s = String(val).trim();
    if (!s) return 'SIN_OPERARIO';
    // separar por espacios o barras y tomar la primera parte
    const first = s.split(/[\s\/]+/)[0];
    return first.toUpperCase();
  };

  // Recalcula la lista agrupada según filterMode y tiempoRecords
  useEffect(() => {
    if (!Array.isArray(tiempoRecords)) {
      setGroupedList([]);
      return;
    }

    const map = new Map<string, TiempoRealRecord[]>();

    if (filterMode === 'operador') {
      for (const r of tiempoRecords) {
        const key = operarioFirstNameKey(r.OperarioNombre || r.CodigoOperario);
        const arr = map.get(key) || [];
        arr.push(r);
        map.set(key, arr);
      }
    } else if (filterMode === 'tarea') {
      for (const r of tiempoRecords) {
        const key = (r.CodigoTarea || 'SIN_TAREA').toString();
        const arr = map.get(key) || [];
        arr.push(r);
        map.set(key, arr);
      }
    } else {
      // pedido -> NumeroManual
      for (const r of tiempoRecords) {
        const key = (r.NumeroManual || 'SIN_PEDIDO').toString();
        const arr = map.get(key) || [];
        arr.push(r);
        map.set(key, arr);
      }
    }

    const groups: any[] = [];
    for (const [key, arr] of map.entries()) {
      // ordenar por timestamp y coger el último
      const last = arr.reduce((a, b) => (recordTimestamp(a) > recordTimestamp(b) ? a : b));
      groups.push({ key, last, count: arr.length });
    }

    // ordenar por key
    groups.sort((a, b) => String(a.key).localeCompare(String(b.key)));
    setGroupedList(groups);
  }, [tiempoRecords, filterMode]);
  // Removed other endpoint handlers (modules, operarios, tareas) — this screen only uses tiempo-real



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
          count={tiempoRecords.length}
          userNameProp={userData?.nombre || userData?.name || '—'}
          roleProp={userData?.rol || userData?.role || '—'}
          serverReachableOverride={!!authenticated}
          onRefresh={() => {
            // refrescar solo tiempo-real
            setLoadingTiempo(true);
            fetchTiempoReal();
          }}
          onUserPress={({ userName, role }) => {
            setModalUser({ userName, role });
            setUserModalVisible(true);
          }}
        />

        <ModalHeader
          visible={userModalVisible}
          onClose={() => setUserModalVisible(false)}
          userName={userData?.nombre || userData?.name || '—'}
          role={userData?.rol || userData?.role || '—'}
        />

  {/* Realtime status moved to AppHeader; debug block removed */}




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

      {/* Detail modal for selected group */}
      <Modal
        visible={detailModalVisible}
        animationType="slide"
        onRequestClose={() => setDetailModalVisible(false)}
      >
        <View style={[styles.modalContainer, { padding: 12 }]}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
            <Text style={{ fontSize: 18, fontWeight: '700' }}>{selectedGroupKey}</Text>
            <TouchableOpacity onPress={() => setDetailModalVisible(false)} style={{ padding: 8 }}>
              <Text style={{ color: '#ef4444' }}>Cerrar</Text>
            </TouchableOpacity>
          </View>

          {/* Modal grouping controls */}
          <View style={{ flexDirection: 'row', justifyContent: 'flex-start', marginVertical: 8, gap: 8 }}>
            {/* Decide which grouping options to show based on modalContext */}
            {modalContext !== 'operador' && (
              <TouchableOpacity style={[styles.filterButton, modalGroupBy === 'operador' && styles.filterButtonActive]} onPress={() => setModalGroupBy(modalGroupBy === 'operador' ? 'none' : 'operador')}>
                <Text style={[styles.filterText, modalGroupBy === 'operador' && styles.filterTextActive]}>Agrupar por Operario</Text>
              </TouchableOpacity>
            )}
            {modalContext !== 'tarea' && (
              <TouchableOpacity style={[styles.filterButton, modalGroupBy === 'tarea' && styles.filterButtonActive]} onPress={() => setModalGroupBy(modalGroupBy === 'tarea' ? 'none' : 'tarea')}>
                <Text style={[styles.filterText, modalGroupBy === 'tarea' && styles.filterTextActive]}>Agrupar por Tarea</Text>
              </TouchableOpacity>
            )}
            {modalContext !== 'pedido' && (
              <TouchableOpacity style={[styles.filterButton, modalGroupBy === 'pedido' && styles.filterButtonActive]} onPress={() => setModalGroupBy(modalGroupBy === 'pedido' ? 'none' : 'pedido')}>
                <Text style={[styles.filterText, modalGroupBy === 'pedido' && styles.filterTextActive]}>Agrupar por Pedido</Text>
              </TouchableOpacity>
            )}
          </View>

          {modalGroupBy === 'none' ? (
            <FlatList
              data={detailList}
              keyExtractor={(it, idx) => `${it.NumeroManual ?? 'nm'}-${idx}-${it.Fecha ?? ''}-${it.HoraInicio ?? ''}`}
              renderItem={({ item }) => (
                <View style={[styles.card, { padding: 8, marginVertical: 4 }]}>
                  {/* When modalContext matches, avoid repeating that field */}
                  {modalContext !== 'operador' && (
                    <Text style={{ fontWeight: '700' }}>{operarioFirstNameKey(item.OperarioNombre || item.CodigoOperario)}</Text>
                  )}
                  <Text style={{ color: '#374151', marginTop: 4 }}>{item.CodigoTarea} · {item.NumeroManual} · {item.Modulo} · {item.CodigoPuesto}</Text>
                  <Text style={{ color: '#6b7280', marginTop: 6 }}>Tiempo dedicado: {formatDuration(item.TiempoDedicado ?? null)}</Text>
                  <Text style={{ color: '#9ca3af', marginTop: 4 }}>Fecha: {formatDateOnly(item.Fecha)}</Text>
                  <Text style={{ color: '#9ca3af', marginTop: 2 }}>Hora inicio: {item.HoraInicio ?? '-'}</Text>
                  <Text style={{ color: '#9ca3af', marginTop: 2 }}>Hora final: {item.HoraFin ?? '-'}</Text>
                </View>
              )}
            />
          ) : (
            // grouped view inside modal
            (() => {
              const map = new Map<string, TiempoRealRecord[]>();
              for (const r of detailList) {
                let key = 'SIN';
                if (modalGroupBy === 'operador') key = operarioFirstNameKey(r.OperarioNombre || r.CodigoOperario);
                else if (modalGroupBy === 'tarea') key = (r.CodigoTarea || 'SIN_TAREA').toString();
                else if (modalGroupBy === 'pedido') key = (r.NumeroManual || 'SIN_PEDIDO').toString();
                const arr = map.get(key) || [];
                arr.push(r);
                map.set(key, arr);
              }

              const groups: Array<{ key: string; items: TiempoRealRecord[] }> = [];
              for (const [k, arr] of map.entries()) {
                groups.push({ key: k, items: arr.sort((a,b)=> recordTimestamp(b) - recordTimestamp(a)) });
              }
              groups.sort((a,b)=> String(a.key).localeCompare(String(b.key)));

              return (
                <FlatList
                  data={groups}
                  keyExtractor={(g) => String(g.key)}
                  renderItem={({ item: g }) => (
                    <View style={{ marginBottom: 8 }}>
                      <View style={[styles.card, { padding: 10 }] }>
                        <Text style={{ fontWeight: '700', color: COLORS.primary }}>{g.key} <Text style={{ color: '#6b7280' }}>· {g.items.length}</Text></Text>
                        {g.items.slice(0,3).map((it, idx) => {
                          const parts: string[] = [];
                          if (modalContext !== 'operador' && modalGroupBy !== 'operador') {
                            parts.push(operarioFirstNameKey(it.OperarioNombre || it.CodigoOperario));
                          }
                          if (modalContext !== 'tarea' && modalGroupBy !== 'tarea') {
                            parts.push(String(it.CodigoTarea ?? '-'));
                          }
                          if (modalContext !== 'pedido' && modalGroupBy !== 'pedido') {
                            parts.push(String(it.NumeroManual ?? '-'));
                          }
                          parts.push(formatDuration(it.TiempoDedicado ?? null));
                          return (
                            <Text key={idx} style={{ color: '#374151', marginTop: 6 }}>{parts.join(' · ')}</Text>
                          );
                        })}
                      </View>
                    </View>
                  )}
                />
              );
            })()
          )}
        </View>
      </Modal>

  {/* estado filters removed - only search remains */}

  {/* Lista agrupada tiempo-real */}
  <View style={{ flex: 1, paddingHorizontal: 12, paddingVertical: 8 }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 }}>
          <TouchableOpacity style={[styles.filterButton, filterMode === 'operador' && styles.filterButtonActive]} onPress={() => setFilterMode('operador')}>
            <Text style={[styles.filterText, filterMode === 'operador' && styles.filterTextActive]}>Operador</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.filterButton, filterMode === 'tarea' && styles.filterButtonActive]} onPress={() => setFilterMode('tarea')}>
            <Text style={[styles.filterText, filterMode === 'tarea' && styles.filterTextActive]}>Tarea</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.filterButton, filterMode === 'pedido' && styles.filterButtonActive]} onPress={() => setFilterMode('pedido')}>
            <Text style={[styles.filterText, filterMode === 'pedido' && styles.filterTextActive]}>Pedido</Text>
          </TouchableOpacity>
        </View>

        {loadingTiempo ? (
          <ActivityIndicator />
        ) : (
          <FlatList
            data={groupedList}
            keyExtractor={(item) => item.key}
            style={[isWeb ? styles.flatListWeb : styles.flatListMobile, { flex: 1 }]}
            contentContainerStyle={{ paddingBottom: 24 }}
            nestedScrollEnabled
            renderItem={({ item }) => {
              const last: TiempoRealRecord = item.last;
              // Mostrar campos según filterMode
              let title = item.key;
              let subtitle = '';

              if (filterMode === 'operador') {
                title = item.key; // Operario first-name key (already normalized)
                // Mostrar solo el primer nombre en la lista para evitar confusión
                subtitle = `${last.CodigoTarea || ''} · ${last.NumeroManual || ''} · ${last.Modulo || ''} · ${last.CodigoPuesto || ''} · ${formatDuration(last.TiempoDedicado ?? null)}`;
              } else if (filterMode === 'tarea') {
                title = item.key; // CodigoTarea
                subtitle = `${last.OperarioNombre || last.CodigoOperario || ''} · ${last.NumeroManual || ''} · ${last.Modulo || ''} · ${last.CodigoPuesto || ''} · ${formatDuration(last.TiempoDedicado ?? null)}`;
              } else {
                title = item.key; // NumeroManual
                subtitle = `${last.CodigoTarea || ''} · ${last.NumeroManual || ''} · ${last.Modulo || ''} · ${last.CodigoPuesto || ''} · ${formatDuration(last.TiempoDedicado ?? null)}`;
              }

              return (
                <TouchableOpacity key={item.key} style={styles.card} onPress={() => {
                  // abrir modal con todos los items del grupo
                  const all = tiempoRecords.filter((r) => {
                    if (filterMode === 'operador') return operarioFirstNameKey(r.OperarioNombre || r.CodigoOperario) === item.key;
                    if (filterMode === 'tarea') return (r.CodigoTarea || 'SIN_TAREA').toString() === item.key;
                    return (r.NumeroManual || 'SIN_PEDIDO').toString() === item.key;
                  });
                  setDetailList(all.sort((a,b)=> recordTimestamp(b) - recordTimestamp(a)));
                  setSelectedGroupKey(item.key);
                  setModalContext(filterMode);
                  // seleccionar automáticamente el primer botón visible en el modal
                  const order: Array<'operador'|'tarea'|'pedido'> = ['operador','tarea','pedido'];
                  let defaultGroup: 'none' | 'operador' | 'tarea' | 'pedido' = 'none';
                  for (const opt of order) {
                    if (filterMode !== opt) { defaultGroup = opt; break; }
                  }
                  setModalGroupBy(defaultGroup);
                  setDetailModalVisible(true);
                }}>
                      <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                        <Text style={{ fontWeight: '700', color: COLORS.primary }}>{title}</Text>
                        <Text style={{ color: '#6b7280' }}>{item.count}</Text>
                      </View>
                      <Text style={{ marginTop: 6, color: '#374151' }}>{subtitle}</Text>
                </TouchableOpacity>
              );
            }}
          />
        )}
      </View>

  {/* Other modals removed — this screen only shows grouped tiempo-real */}
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
  color: '#333333',      // texto gris oscuro
  borderWidth: 0,        // el borde existe
  borderColor: 'transparent', // pero no se ve
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
  card: { marginVertical: 4, marginHorizontal: 6, padding: 14, borderRadius: 10, backgroundColor: '#fff',
    // Shadow (iOS)
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.18,
    shadowRadius: 6,
    // Elevation (Android)
    elevation: 5,
  },
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
  modalContainer: {
    flex: 1,
    backgroundColor: COLORS.background,
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
