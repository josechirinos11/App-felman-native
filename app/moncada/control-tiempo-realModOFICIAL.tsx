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
  const [counts, setCounts] = useState<{ operador: number; tarea: number; pedido: number }>({ operador: 0, tarea: 0, pedido: 0 });
  // cache para polling incremental: key -> record
  const cacheRef = React.useRef<Map<string, TiempoRealRecord>>(new Map());
  // contador de consultas
  const fetchCountRef = React.useRef<number>(0);
  const [fetchCount, setFetchCount] = useState<number>(0);
  // keep latest filterMode in a ref for poll closure
  const filterModeRef = React.useRef(filterMode);
  useEffect(()=>{ filterModeRef.current = filterMode; }, [filterMode]);

  // Recompute groupedList immediately when filterMode changes using current cache
  useEffect(() => {
    try {
      const m = cacheRef.current || new Map<string, TiempoRealRecord>();
      const groups = computeGroupsFromMap(m, filterMode);
      setGroupedList(groups);
    } catch (e) {
      // ignore
    }
  }, [filterMode]);

  // Recompute counts from cache whenever cache changes
  useEffect(() => {
    const m = cacheRef.current || new Map<string, TiempoRealRecord>();
    const operadorSet = new Set<string>();
    const tareaSet = new Set<string>();
    const pedidoSet = new Set<string>();
    for (const r of m.values()) {
      operadorSet.add(operarioFirstNameKey(r.OperarioNombre || r.CodigoOperario));
      tareaSet.add(String(r.CodigoTarea ?? 'SIN_TAREA'));
      pedidoSet.add(String(r.NumeroManual ?? 'SIN_PEDIDO'));
    }
    setCounts({ operador: operadorSet.size, tarea: tareaSet.size, pedido: pedidoSet.size });
  }, [fetchCount]);
  // highlight groups that changed recently
  const [highlightedGroups, setHighlightedGroups] = useState<Record<string, boolean>>({});
  const highlightTimeoutsRef = React.useRef<number[]>([]);
  const [detailModalVisible, setDetailModalVisible] = useState(false);
  const [detailList, setDetailList] = useState<TiempoRealRecord[]>([]);
  const [modalCounts, setModalCounts] = useState<{ operador: number; tarea: number; pedido: number }>({ operador: 0, tarea: 0, pedido: 0 });
  // compute modal counts whenever detailList changes
  useEffect(() => {
    const op = new Set<string>();
    const ta = new Set<string>();
    const pe = new Set<string>();
    for (const r of detailList) {
      op.add(operarioFirstNameKey(r.OperarioNombre || r.CodigoOperario));
      ta.add(String(r.CodigoTarea ?? 'SIN_TAREA'));
      pe.add(String(r.NumeroManual ?? 'SIN_PEDIDO'));
    }
    setModalCounts({ operador: op.size, tarea: ta.size, pedido: pe.size });
  }, [detailList]);
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

  // polling control
  const [pollingEnabled, setPollingEnabled] = useState<boolean>(true);
  const pollingEnabledRef = React.useRef<boolean>(true);
  const intervalIdRef = React.useRef<any>(null);
  useEffect(()=>{ pollingEnabledRef.current = pollingEnabled; }, [pollingEnabled]);

  // nowTick fuerza rerender en intervalos para actualizar estadisticas en tiempo real
  const [nowTick, setNowTick] = useState<number>(Date.now());
  useEffect(() => {
    const id = setInterval(() => setNowTick(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  // Constante de jornada reutilizable
  const JORNADA_SECONDS = 7.5 * 3600; // 27000

  // Detectar plataforma web para layout específico
  const isWeb = Platform.OS === 'web';
  const { width: windowWidth } = useWindowDimensions();
  const isMobile = !isWeb && windowWidth < 600;
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

  // Fetch de tiempo-real desde backend - OPTIMIZADO: Acepta filtros del backend
  async function fetchTiempoReal() {
    try {
      setLoadingTiempo(true);
      
      // Construir query params opcionales (el backend filtra si se proporcionan)
      const params = new URLSearchParams();
      // Si en el futuro necesitas filtrar, puedes agregar:
      // params.append('operador', selectedOperador);
      // params.append('tarea', selectedTarea);
      // params.append('pedido', selectedPedido);
      
      const url = `${API_URL}/control-terminales/tiempo-real-nueva${params.toString() ? '?' + params.toString() : ''}`;
      const res = await fetch(url);
      
      if (!res.ok) {
        console.warn('[tiempo-real] respuesta no ok', res.status);
        setTiempoRecords([]);
        return;
      }
      const json = await res.json();
      
      // El backend ahora retorna { data, stats }
      const records = json.data || (Array.isArray(json) ? json : []);
      const stats = json.stats || null;
      
      setTiempoRecords(records as TiempoRealRecord[]);
      
      // Si el backend envió stats pre-calculadas, podrías usarlas aquí
      if (stats) {
        console.log('[tiempo-real] stats del backend:', stats);
      }
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
      // Preferir FechaInicio/HoraInicio cuando exista (más precisa para inicio de tarea)
      const fecha = r.FechaInicio || r.Fecha || r.FechaFin;
      let hora = r.HoraInicio || r.HoraFin || '00:00:00';
      if (!fecha) return 0;
      const normalizeHora = (h?: string | null) => {
        if (!h) return '00:00:00';
        const s = String(h).trim();
        if (!s) return '00:00:00';
        // si viene 'HH:MM' añadir segundos
        if (/^\d{1,2}:\d{2}$/.test(s)) return `${s}:00`;
        // si ya tiene segundos, devolver
        if (/^\d{1,2}:\d{2}:\d{2}$/.test(s)) return s;
        return s;
      };
      hora = normalizeHora(hora);
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
  // We'll compute groupedList from a Map cache to allow incremental updates
  const keyForRecord = (r: TiempoRealRecord) => `${r.CodigoSerie ?? ''}-${r.CodigoNumero ?? ''}-${r.Linea ?? ''}`;

  // Helper para calcular estadistica temporal sobre un array de registros
  const computeEstadisticaForArray = (arr: TiempoRealRecord[]) => {
    // Devuelve lo acumulado (activo/status/remaining). El cálculo dependiente del tiempo
    // transcurrido se hará en render usando `nowTick` para evitar recalcular en helper.
    let active = 0;
    let hasOpen = false;
    for (const it of arr) {
      const v = it.TiempoDedicado ?? 0;
      if (typeof v === 'number' && !isNaN(v)) active += v;
      if ((it as any).Abierta === 1 || !it.HoraFin || !it.FechaFin) {
        hasOpen = true;
      }
    }
    const jornadaSeconds = JORNADA_SECONDS || 7.5 * 3600;
    const remaining = Math.max(0, jornadaSeconds - active);
    const status: 'parcial' | 'total' = hasOpen ? 'parcial' : 'total';
    return {
      activeSeconds: Math.floor(active),
      status,
      remainingSeconds: Math.floor(remaining),
    };
  };

  // Formato abreviado para horas y minutos: 'H h MM'
  const formatHoursMinutes = (seconds?: number | null) => {
    if (seconds == null) return '-';
    const s = Math.max(0, Math.floor(Number(seconds)));
    const hours = Math.floor(s / 3600);
    const mins = Math.floor((s % 3600) / 60);
    return `${hours}h ${String(mins).padStart(2, '0')}m`;
  };

  // Calcular elapsed desde 06:30 hasta `now`, capear por jornada y excluir solapamiento con la pausa de comida 09:30-10:00 (30 minutos)
  const computeEffectiveElapsed = (nowDate?: Date) => {
    const now = nowDate ? new Date(nowDate) : new Date();
    const start = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 6, 30, 0);
    let total = Math.floor((now.getTime() - start.getTime()) / 1000);
    if (total < 0) total = 0;
    if (total > (JORNADA_SECONDS || 7.5 * 3600)) total = JORNADA_SECONDS || 7.5 * 3600;

    const breakStart = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 9, 30, 0);
  const breakEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 10, 0, 0);
    const overlapStart = Math.max(start.getTime(), breakStart.getTime());
    const overlapEnd = Math.min(now.getTime(), breakEnd.getTime());
    let breakOverlap = 0;
    if (overlapEnd > overlapStart) breakOverlap = Math.floor((overlapEnd - overlapStart) / 1000);
    if (breakOverlap > total) breakOverlap = total;

    const effective = Math.max(0, total - breakOverlap);
    return { total, breakOverlap, effective };
  };

  const computeGroupsFromMap = (m: Map<string, TiempoRealRecord>, mode: 'operador'|'tarea'|'pedido') => {
    const map = new Map<string, TiempoRealRecord[]>();
    for (const r of m.values()) {
      let key = 'SIN';
      if (mode === 'operador') key = operarioFirstNameKey(r.OperarioNombre || r.CodigoOperario);
      else if (mode === 'tarea') key = (r.CodigoTarea || 'SIN_TAREA').toString();
      else key = (r.NumeroManual || 'SIN_PEDIDO').toString();

      const arr = map.get(key) || [];
      arr.push(r);
      map.set(key, arr);
    }

    const groups: any[] = [];
    for (const [k, arr] of map.entries()) {
      const last = arr.reduce((a, b) => (recordTimestamp(a) > recordTimestamp(b) ? a : b));
      const estadistica = computeEstadisticaForArray(arr);
      groups.push({ key: k, last, count: arr.length, estadistica });
    }
    groups.sort((a,b)=> String(a.key).localeCompare(String(b.key)));
    return groups;
  };

  // Apply diffs between newMap and cacheRef.current; only update groupedList for changed groups
  const applyDiffs = (newMap: Map<string, TiempoRealRecord>) => {
    const oldMap = cacheRef.current;
    // Build groupings for old and new
    const oldGroups = computeGroupsFromMap(oldMap, filterModeRef.current);
    const newGroups = computeGroupsFromMap(newMap, filterModeRef.current);

    // Quick path: if group lengths and keys identical and last entries equal, avoid setGroupedList
    const same = oldGroups.length === newGroups.length && oldGroups.every((g,i)=> g.key === newGroups[i].key && JSON.stringify(g.last) === JSON.stringify(newGroups[i].last) && g.count === newGroups[i].count);
    if (same) return; // nothing changed at grouping level

    // Determine which group keys changed to highlight them briefly
    const changedGroupKeys = newGroups.filter((ng, idx) => {
      const og = oldGroups[idx];
      if (!og) return true;
      return og.key !== ng.key || og.count !== ng.count || JSON.stringify(og.last) !== JSON.stringify(ng.last);
    }).map(g=>g.key);

    // set groupedList to trigger render
    setGroupedList(newGroups);

    if (changedGroupKeys.length > 0) {
      setHighlightedGroups(prev => {
        const copy = { ...prev };
        for (const k of changedGroupKeys) copy[k] = true;
        return copy;
      });

      // schedule removal after 1s
      const tId = window.setTimeout(() => {
        setHighlightedGroups(prev => {
          const copy = { ...prev };
          for (const k of changedGroupKeys) delete copy[k];
          return copy;
        });
      }, 1000);
      highlightTimeoutsRef.current.push(tId);
    }
  };

  // Polling tick: fetch rows, diff against cacheRef, update cacheRef and groupedList incrementally
  // OPTIMIZADO: Backend ahora retorna { data, stats }
  async function tick() {
    try {
      fetchCountRef.current += 1;
      setFetchCount(fetchCountRef.current);
      console.log(`[tiempo-real] consulta #${fetchCountRef.current} iniciada`);

      // Construir query params opcionales
      const params = new URLSearchParams();
      // Si en el futuro necesitas filtrar, puedes agregar:
      // params.append('operador', selectedOperador);
      // params.append('tarea', selectedTarea);
      // params.append('pedido', selectedPedido);
      
      const url = `${API_URL}/control-terminales/tiempo-real-nueva${params.toString() ? '?' + params.toString() : ''}`;
      const res = await fetch(url);
      
      if (!res.ok) {
        console.warn('[tiempo-real] respuesta no ok', res.status);
        return;
      }
      const json = await res.json();
      
      // El backend ahora retorna { data, stats }
      const rows = json.data || (Array.isArray(json) ? json : []);
      const stats = json.stats || null;
      
      if (!Array.isArray(rows)) {
        console.warn('[tiempo-real] payload no es array');
        return;
      }

      const next = new Map<string, TiempoRealRecord>();
      // track whether any change ocurred
      let changed = false;

      for (const r of rows) {
        const key = keyForRecord(r);
        next.set(key, r);

        const prev = cacheRef.current.get(key);
        if (!prev || JSON.stringify(prev) !== JSON.stringify(r)) {
          changed = true;
        }
      }

      // detect deletes
      for (const key of cacheRef.current.keys()) {
        if (!next.has(key)) {
          changed = true;
          break;
        }
      }

      if (changed) {
        // commit new cache
        cacheRef.current = next;
        // update groupedList based on new cache
        applyDiffs(next);
        // update tiempoRecords state for compatibility with other parts
        setTiempoRecords(Array.from(next.values()));
        console.log(`[tiempo-real] consulta #${fetchCountRef.current} aplicó cambios, filas=${next.size}`);
        
        // Usar stats del backend si están disponibles
        if (stats) {
          console.log(`[tiempo-real] stats del backend: total=${stats.total}, abiertas=${stats.abiertas}`);
        }
      } else {
        console.log(`[tiempo-real] consulta #${fetchCountRef.current} no hubo cambios`);
      }
    } catch (err) {
      console.error('[tiempo-real] tick error', err);
    }
  }

  // start polling when component mounts
  useEffect(() => {
    // helper to compute current tick interval
    const getIntervalMs = () => (typeof document !== 'undefined' && (document as any).hidden) ? 15000 : 4000;

    // handler to (re)start interval
    const startInterval = () => {
      if (intervalIdRef.current) clearInterval(intervalIdRef.current);
      if (!pollingEnabledRef.current) return;
      intervalIdRef.current = setInterval(() => tick(), getIntervalMs());
      console.log('[tiempo-real] polling started');
    };

    const stopInterval = () => {
      if (intervalIdRef.current) {
        clearInterval(intervalIdRef.current);
        intervalIdRef.current = null;
        console.log('[tiempo-real] polling stopped');
      }
    };

    // visibility handler to restart interval when tab visibility changes
    const onVisibility = () => {
      stopInterval();
      startInterval();
    };

    // initial fetch to populate cache - OPTIMIZADO: Backend retorna { data, stats }
    (async () => {
      try {
        setLoadingTiempo(true);
        
        // Construir query params opcionales
        const params = new URLSearchParams();
        const url = `${API_URL}/control-terminales/tiempo-real-nueva${params.toString() ? '?' + params.toString() : ''}`;
        
        const res = await fetch(url);
        if (res.ok) {
          const json = await res.json();
          
          // El backend ahora retorna { data, stats }
          const rows = json.data || (Array.isArray(json) ? json : []);
          const stats = json.stats || null;
          
          if (Array.isArray(rows)) {
            const m = new Map<string, TiempoRealRecord>();
            for (const r of rows) m.set(keyForRecord(r), r);
            cacheRef.current = m;
            setTiempoRecords(Array.from(m.values()));
            setGroupedList(computeGroupsFromMap(m, filterModeRef.current));
            fetchCountRef.current += 1;
            setFetchCount(fetchCountRef.current);
            console.log(`[tiempo-real] consulta #${fetchCountRef.current} inicializada, filas=${m.size}`);
            
            // Usar stats del backend si están disponibles
            if (stats) {
              console.log(`[tiempo-real] stats iniciales: total=${stats.total}, abiertas=${stats.abiertas}`);
            }
          }
        } else {
          console.warn('[tiempo-real] respuesta no ok en inicial');
        }
      } catch (err) {
        console.error('[tiempo-real] error inicial', err);
      } finally {
        setLoadingTiempo(false);
      }
      // start interval after initial (respect pollingEnabled)
      if (pollingEnabledRef.current) startInterval();
      if (typeof document !== 'undefined') {
        document.addEventListener('visibilitychange', onVisibility);
      }
    })();

    return () => {
      if (intervalIdRef.current) clearInterval(intervalIdRef.current);
      if (typeof document !== 'undefined') {
        document.removeEventListener('visibilitychange', onVisibility);
      }
      // clear any pending highlight timeouts
      for (const t of highlightTimeoutsRef.current) clearTimeout(t);
    };
  }, []);

  // Effect to start/stop polling when pollingEnabled changes
  useEffect(()=>{
    if (pollingEnabled) {
      pollingEnabledRef.current = true;
      // immediate tick when enabling
      tick();
      if (intervalIdRef.current) clearInterval(intervalIdRef.current);
      const ms = (typeof document !== 'undefined' && (document as any).hidden) ? 15000 : 4000;
      intervalIdRef.current = setInterval(() => tick(), ms);
      console.log('[tiempo-real] polling enabled by toggle');
    } else {
      pollingEnabledRef.current = false;
      if (intervalIdRef.current) { clearInterval(intervalIdRef.current); intervalIdRef.current = null; }
      console.log('[tiempo-real] polling disabled by toggle');
    }
    return () => {};
  }, [pollingEnabled]);
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
        <TouchableOpacity onPress={() => { setPollingEnabled(p => !p); }} style={[styles.toggleButton, pollingEnabled ? styles.toggleOn : styles.toggleOff]}>
          <Text style={[styles.toggleText]}>{pollingEnabled ? 'ON' : 'OFF'}</Text>
        </TouchableOpacity>
      </View>

      {/* Detail modal for selected group */}
      <Modal
        visible={detailModalVisible}
        animationType="slide"
        onRequestClose={() => setDetailModalVisible(false)}
      >
        <View style={[styles.modalContainer, isMobile ? styles.modalContainerMobile : { padding: 12 }]}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
            <Text style={{ fontSize: 18, fontWeight: '700' }}>{selectedGroupKey}</Text>
            <TouchableOpacity onPress={() => setDetailModalVisible(false)} style={{ padding: 8 }}>
              <Text style={{ color: '#ef4444' }}>Cerrar</Text>
            </TouchableOpacity>
          </View>

          {/* Modal grouping controls */}
          <View style={[{ flexDirection: 'row', justifyContent: 'flex-start', marginVertical: 8, gap: 8 }, isMobile && styles.filterRowMobile]}>
            {/* Decide which grouping options to show based on modalContext */}
            {modalContext !== 'operador' && (
              <TouchableOpacity style={[styles.filterButton, modalGroupBy === 'operador' && styles.filterButtonActive, isMobile && styles.filterButtonMobile]} onPress={() => setModalGroupBy(modalGroupBy === 'operador' ? 'none' : 'operador')}>
                <Text style={[styles.filterText, modalGroupBy === 'operador' && styles.filterTextActive]}>Agrupar por Operario{modalCounts.operador ? ` · ${modalCounts.operador}` : ''}</Text>
              </TouchableOpacity>
            )}
            {modalContext !== 'tarea' && (
              <TouchableOpacity style={[styles.filterButton, modalGroupBy === 'tarea' && styles.filterButtonActive, isMobile && styles.filterButtonMobile]} onPress={() => setModalGroupBy(modalGroupBy === 'tarea' ? 'none' : 'tarea')}>
                <Text style={[styles.filterText, modalGroupBy === 'tarea' && styles.filterTextActive]}>Agrupar por Tarea{modalCounts.tarea ? ` · ${modalCounts.tarea}` : ''}</Text>
              </TouchableOpacity>
            )}
            {modalContext !== 'pedido' && (
              <TouchableOpacity style={[styles.filterButton, modalGroupBy === 'pedido' && styles.filterButtonActive, isMobile && styles.filterButtonMobile]} onPress={() => setModalGroupBy(modalGroupBy === 'pedido' ? 'none' : 'pedido')}>
                <Text style={[styles.filterText, modalGroupBy === 'pedido' && styles.filterTextActive]}>Agrupar por Pedido{modalCounts.pedido ? ` · ${modalCounts.pedido}` : ''}</Text>
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

              const groups: Array<{ key: string; items: TiempoRealRecord[]; estadistica?: { activeSeconds:number; status:'parcial'|'total'; remainingSeconds:number } }> = [];
              for (const [k, arr] of map.entries()) {
                const sorted = arr.sort((a,b)=> recordTimestamp(b) - recordTimestamp(a));
                // calcular estadistica (activo/inactivo/estado/restante/porcentaje)
                const estadistica = computeEstadisticaForArray(sorted);
                groups.push({ key: k, items: sorted, estadistica });
              }
              groups.sort((a,b)=> String(a.key).localeCompare(String(b.key)));

              return (
                <FlatList
                  data={groups}
                  keyExtractor={(g) => String(g.key)}
                  renderItem={({ item: g }) => (
                    <View style={{ marginBottom: 8 }}>
                      <View style={[styles.card, { padding: 10 }]}>
                        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                          <Text style={{ fontWeight: '700', color: COLORS.primary }}>{g.key} <Text style={{ color: '#6b7280' }}>· {g.items.length}</Text></Text>
                          {g.estadistica ? (() => {
                            const now = new Date(nowTick);
                            const { total, breakOverlap, effective } = computeEffectiveElapsed(now);
                            let elapsed = effective; // effective elapsed (excluye pausa comida)
                            if (elapsed > (JORNADA_SECONDS || 7.5 * 3600)) elapsed = JORNADA_SECONDS || 7.5 * 3600;
                            const inactive = Math.max(0, elapsed - (g.estadistica.activeSeconds || 0));
                            const percentActivity = elapsed > 0 ? Math.max(0, Math.min(100, Math.round(((g.estadistica.activeSeconds || 0) / elapsed) * 100))) : 0;
                            return (
                              <View style={styles.estadisticaContainer}>
                                <Text style={styles.estadisticaLabel}>Act</Text>
                                <Text style={styles.estadisticaValue}>{formatHoursMinutes(g.estadistica.activeSeconds)}</Text>
                                <Text style={styles.estadisticaLabel}>Inac</Text>
                                <Text style={styles.estadisticaValue}>{formatHoursMinutes(inactive)}</Text>
                                <Text style={g.estadistica.status === 'parcial' ? styles.estadisticaStatusParcial : styles.estadisticaStatus}>{g.estadistica.status.toUpperCase()}</Text>
                                <View style={styles.estadisticaBadges}>
                                  <View style={styles.valorBadge}>
                                    <Text style={styles.valorLabel}>Valor</Text>
                                    <Text style={styles.valorPercent}>{percentActivity}%</Text>
                                  </View>
                                </View>
                              </View>
                            );
                          })() : null}
                        </View>
                        <View style={{ marginTop: 8 }}>
                          {g.items.map((it, idx) => (
                            <View key={`${g.key}-${idx}`} style={styles.modalItemCard}>
                              <View style={styles.modalItemHeader}>
                                <Text style={styles.modalItemTitle}>{operarioFirstNameKey(it.OperarioNombre || it.CodigoOperario)}</Text>
                                <Text style={styles.modalItemDate}>{formatDateOnly(it.Fecha)}</Text>
                              </View>
                              <Text style={styles.modalItemLine}>{String(it.CodigoTarea ?? '-') }  ·  {String(it.NumeroManual ?? '-')}  ·  {it.Modulo ?? '-'}</Text>
                              <View style={styles.modalItemFooter}>
                                <Text style={styles.modalItemMeta}>Tiempo: {formatDuration(it.TiempoDedicado ?? null)}</Text>
                                <Text style={styles.modalItemMeta}>{it.HoraInicio ?? '-'} → {it.HoraFin ?? '-'}</Text>
                              </View>
                            </View>
                          ))}
                        </View>
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
          <TouchableOpacity style={[styles.filterButton, filterMode === 'operador' && styles.filterButtonActive, isMobile && styles.filterButtonMobile]} onPress={() => setFilterMode('operador')}>
            <Text style={[styles.filterText, filterMode === 'operador' && styles.filterTextActive]}>Operador{filterMode === 'operador' ? ` · ${counts.operador}` : ''}</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.filterButton, filterMode === 'tarea' && styles.filterButtonActive, isMobile && styles.filterButtonMobile]} onPress={() => setFilterMode('tarea')}>
            <Text style={[styles.filterText, filterMode === 'tarea' && styles.filterTextActive]}>Tarea{filterMode === 'tarea' ? ` · ${counts.tarea}` : ''}</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.filterButton, filterMode === 'pedido' && styles.filterButtonActive, isMobile && styles.filterButtonMobile]} onPress={() => setFilterMode('pedido')}>
            <Text style={[styles.filterText, filterMode === 'pedido' && styles.filterTextActive]}>Pedido{filterMode === 'pedido' ? ` · ${counts.pedido}` : ''}</Text>
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

              let badges: Array<{ key: string; label: string }> = [];
              if (filterMode === 'operador') {
                title = item.key; // Operario first-name key (already normalized)
                badges = [
                  { key: 'tarea', label: String(last.CodigoTarea ?? '-') },
                  { key: 'numero', label: String(last.NumeroManual ?? '-') },
                  { key: 'modulo', label: String(last.Modulo ?? '-') },
                  { key: 'dur', label: formatDuration(last.TiempoDedicado ?? null) },
                  { key: 'horas', label: `${last.HoraInicio ?? '-'}→${last.HoraFin ?? '-'}` },
                ];
              } else if (filterMode === 'tarea') {
                title = item.key; // CodigoTarea
                badges = [
                  { key: 'oper', label: operarioFirstNameKey(last.OperarioNombre || last.CodigoOperario) },
                  { key: 'numero', label: String(last.NumeroManual ?? '-') },
                  { key: 'modulo', label: String(last.Modulo ?? '-') },
                  { key: 'dur', label: formatDuration(last.TiempoDedicado ?? null) },
                ];
              } else {
                title = item.key; // NumeroManual
                badges = [
                  { key: 'tarea', label: String(last.CodigoTarea ?? '-') },
                  { key: 'modulo', label: String(last.Modulo ?? '-') },
                  { key: 'puesto', label: String(last.CodigoPuesto ?? '-') },
                  { key: 'dur', label: formatDuration(last.TiempoDedicado ?? null) },
                ];
              }

              const isHighlighted = highlightedGroups[item.key];
              return (
                <TouchableOpacity key={item.key} style={[styles.card, isHighlighted ? { backgroundColor: '#fff7e6' } : undefined]} onPress={() => {
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
                        <View style={{ alignItems: 'flex-end' }}>
                          <Text style={{ color: '#6b7280', fontWeight: '600' }}>{item.count}</Text>
                          {item.estadistica ? (() => {
                            const now = new Date(nowTick);
                            const { total, breakOverlap, effective } = computeEffectiveElapsed(now);
                            let elapsed = effective; // effective elapsed (excluye pausa comida)
                            if (elapsed > (JORNADA_SECONDS || 7.5 * 3600)) elapsed = JORNADA_SECONDS || 7.5 * 3600;

                            // detectar si esta tarjeta de tarea aplica a mas de un operario
                            let isTareaMultiOperator = false;
                            if (filterMode === 'tarea') {
                              const groupItems = (item as any).items ?? tiempoRecords.filter((r) => (r.CodigoTarea || 'SIN_TAREA').toString() === item.key);
                              const ops = new Set(groupItems.map((x:any) => operarioFirstNameKey(x.OperarioNombre || x.CodigoOperario)));
                              isTareaMultiOperator = ops.size > 1;
                            }

                            if (isTareaMultiOperator) {
                              // mostrar una flecha hacia abajo / mensaje indicando revisar la tabla individual
                              return (
                                <View style={styles.estadisticaContainerInline}>
                                  <Text style={{ fontWeight: '700', color: '#374151' }}>⬇ Mira desglose individual</Text>
                                </View>
                              );
                            }

                            // Caso normal: mostrar Act/Inac/Estado/Valor
                            const inactive = Math.max(0, elapsed - (item.estadistica.activeSeconds || 0));
                            const percentActivity = elapsed > 0 ? Math.max(0, Math.min(100, Math.round(((item.estadistica.activeSeconds || 0) / elapsed) * 100))) : 0;
                            return (
                              <View style={styles.estadisticaContainerInline}>
                                <View style={styles.estadisticaInlineBlock}>
                                  <Text style={styles.estadisticaLabel}>Act</Text>
                                  <Text style={styles.estadisticaValue}>{formatHoursMinutes(item.estadistica.activeSeconds)}</Text>
                                </View>
                                <View style={styles.estadisticaInlineBlock}>
                                  <Text style={styles.estadisticaLabel}>Inac</Text>
                                  <Text style={styles.estadisticaValue}>{formatHoursMinutes(inactive)}</Text>
                                </View>
                                <Text style={item.estadistica.status === 'parcial' ? styles.estadisticaStatusParcial : styles.estadisticaStatus}>{item.estadistica.status.toUpperCase()}</Text>
                                <View style={styles.estadisticaInlineBlock}>
                                  <View style={styles.valorBadgeInline}>
                                    <Text style={styles.valorLabel}>Valor</Text>
                                    <Text style={styles.valorPercent}>{percentActivity}%</Text>
                                  </View>
                                </View>
                              </View>
                            );
                          })() : null}
                        </View>
                      </View>
                      <View style={{ flexDirection: 'row', flexWrap: 'wrap', marginTop: 6, gap: 6 }}>
                        {badges.map(b => (
                          <View key={b.key} style={styles.badge}><Text style={styles.badgeText}>{b.label}</Text></View>
                        ))}
                      </View>

                      {/* Si estamos viendo por tarea, mostrar desglose por operario si hay >1 operario */}
                      {filterMode === 'tarea' && (() => {
                        // agrupar por operario dentro del grupo
                        const opMap = new Map<string, { active: number; count: number; anyOpen: boolean }>();
                        // item.items puede no existir (agrupamientos ligeros). Usar fallback desde tiempoRecords
                        const groupItems = (item as any).items ?? tiempoRecords.filter((r) => (r.CodigoTarea || 'SIN_TAREA').toString() === item.key);
                        for (const it of groupItems) {
                          const op = operarioFirstNameKey(it.OperarioNombre || it.CodigoOperario);
                          const s = opMap.get(op) || { active: 0, count: 0, anyOpen: false };
                          s.active += (it.TiempoDedicado ?? 0) as number;
                          s.count += 1;
                          if ((it as any).Abierta === 1 || !it.HoraFin || !it.FechaFin) s.anyOpen = true;
                          opMap.set(op, s);
                        }
                        if (opMap.size <= 1) return null;

                              const now = new Date(nowTick);
                              const { total, breakOverlap, effective } = computeEffectiveElapsed(now);
                              let elapsed = effective;
                        if (elapsed > JORNADA_SECONDS) elapsed = JORNADA_SECONDS;

                        let totalActive = 0;
                        const rows: Array<{ op: string; active: number; inactive: number; status: 'parcial'|'total'; percent: number }> = [];
                        for (const [op, v] of opMap.entries()) {
                          const active = Math.floor(v.active);
                          totalActive += active;
                          const inactive = Math.max(0, elapsed - active);
                          const status: 'parcial'|'total' = v.anyOpen ? 'parcial' : 'total';
                          const percent = elapsed > 0 ? Math.round((active / elapsed) * 100) : 0;
                          rows.push({ op, active, inactive, status, percent });
                        }

                        return (
                          <View style={{ marginTop: 8, padding: 8, backgroundColor: '#fbfbfe', borderRadius: 8 }}>
                            <Text style={{ fontWeight: '700', marginBottom: 6 }}>Desglose por operario</Text>
                            <View style={{ flexDirection: 'row', paddingVertical: 6, borderBottomWidth: 1, borderBottomColor: '#e6eef6' }}>
                              <Text style={{ flex: 2, fontWeight: '700' }}>Operario</Text>
                              <Text style={{ flex: 1, textAlign: 'right', fontWeight: '700' }}>Act</Text>
                              <Text style={{ flex: 1, textAlign: 'right', fontWeight: '700' }}>Inac</Text>
                              <Text style={{ width: 80, textAlign: 'right', fontWeight: '700' }}>Estado</Text>
                              <Text style={{ width: 72, textAlign: 'right', fontWeight: '700' }}>Valor</Text>
                            </View>

                            {rows.map(r => (
                              <View key={r.op} style={{ flexDirection: 'row', paddingVertical: 6, borderBottomWidth: 1, borderBottomColor: '#f1f5f9' }}>
                                <Text style={{ flex: 2 }}>{r.op}</Text>
                                <Text style={{ flex: 1, textAlign: 'right' }}>{formatHoursMinutes(r.active)}</Text>
                                <Text style={{ flex: 1, textAlign: 'right' }}>{formatHoursMinutes(r.inactive)}</Text>
                                <Text style={[{ width: 80, textAlign: 'right', fontWeight: '700' }, r.status === 'parcial' ? styles.estadisticaStatusParcial : styles.estadisticaStatus]}>{r.status.toUpperCase()}</Text>
                                <Text style={{ width: 72, textAlign: 'right' }}>{r.percent}%</Text>
                              </View>
                            ))}
                            <View style={{ flexDirection: 'row', paddingVertical: 8, marginTop: 6, borderTopWidth: 1, borderTopColor: '#e6eef6' }}>
                              <Text style={{ flex: 2, fontWeight: '800' }}>Total</Text>
                              <Text style={{ flex: 1, textAlign: 'right', fontWeight: '800' }}>{formatHoursMinutes(totalActive)}</Text>
                              <Text style={{ flex: 1, textAlign: 'right', fontWeight: '800' }}>{formatHoursMinutes(Math.max(0, elapsed - totalActive))}</Text>
                              <Text style={{ width: 80, textAlign: 'right', fontWeight: '800' }}>—</Text>
                            </View>
                          </View>
                        );
                      })()}

                      {/* Si estamos viendo por pedido, mostrar desglose por tarea dentro del pedido */}
                      {filterMode === 'pedido' && (() => {
                        // agrupar por CodigoTarea dentro del pedido
                        const tareaMap = new Map<string, { active: number; count: number; anyOpen: boolean }>();
                        const groupItemsPedido = (item as any).items ?? tiempoRecords.filter((r) => (r.NumeroManual || 'SIN_PEDIDO').toString() === item.key);
                        for (const it of groupItemsPedido) {
                          const tarea = (it.CodigoTarea || 'SIN_TAREA').toString();
                          const s = tareaMap.get(tarea) || { active: 0, count: 0, anyOpen: false };
                          s.active += (it.TiempoDedicado ?? 0) as number;
                          s.count += 1;
                          if ((it as any).Abierta === 1 || !it.HoraFin || !it.FechaFin) s.anyOpen = true;
                          tareaMap.set(tarea, s);
                        }
                        if (tareaMap.size <= 1) return null;

                        const now = new Date(nowTick);
                        const { total, breakOverlap, effective } = computeEffectiveElapsed(now);
                        let elapsed = effective;
                        if (elapsed > (JORNADA_SECONDS || 7.5 * 3600)) elapsed = JORNADA_SECONDS || 7.5 * 3600;

                        let totalActiveT = 0;
                        const rowsT: Array<{ tarea: string; active: number; inactive: number; status: 'parcial'|'total'; percent: number }> = [];
                        for (const [tarea, v] of tareaMap.entries()) {
                          const active = Math.floor(v.active);
                          totalActiveT += active;
                          const inactive = Math.max(0, elapsed - active);
                          const status: 'parcial'|'total' = v.anyOpen ? 'parcial' : 'total';
                          const percent = elapsed > 0 ? Math.round((active / elapsed) * 100) : 0;
                          rowsT.push({ tarea, active, inactive, status, percent });
                        }

                        return (
                          <View style={{ marginTop: 8, padding: 8, backgroundColor: '#f7fbf9', borderRadius: 8 }}>
                            <Text style={{ fontWeight: '700', marginBottom: 6 }}>Tareas en pedido</Text>
                            <View style={{ flexDirection: 'row', paddingVertical: 6, borderBottomWidth: 1, borderBottomColor: '#e6eef6' }}>
                              <Text style={{ flex: 2, fontWeight: '700' }}>Tarea</Text>
                              <Text style={{ flex: 1, textAlign: 'right', fontWeight: '700' }}>Act</Text>
                              <Text style={{ flex: 1, textAlign: 'right', fontWeight: '700' }}>Inac</Text>
                              <Text style={{ width: 80, textAlign: 'right', fontWeight: '700' }}>Estado</Text>
                              <Text style={{ width: 72, textAlign: 'right', fontWeight: '700' }}>Valor</Text>
                            </View>

                            {rowsT.map(r => (
                              <View key={r.tarea} style={{ flexDirection: 'row', paddingVertical: 6, borderBottomWidth: 1, borderBottomColor: '#f1f5f9' }}>
                                <Text style={{ flex: 2 }}>{r.tarea}</Text>
                                <Text style={{ flex: 1, textAlign: 'right' }}>{formatHoursMinutes(r.active)}</Text>
                                <Text style={{ flex: 1, textAlign: 'right' }}>{formatHoursMinutes(r.inactive)}</Text>
                                <Text style={[{ width: 80, textAlign: 'right', fontWeight: '700' }, r.status === 'parcial' ? styles.estadisticaStatusParcial : styles.estadisticaStatus]}>{r.status.toUpperCase()}</Text>
                                <Text style={{ width: 72, textAlign: 'right' }}>{r.percent}%</Text>
                              </View>
                            ))}

                            <View style={{ flexDirection: 'row', paddingVertical: 8, marginTop: 6, borderTopWidth: 1, borderTopColor: '#e6eef6' }}>
                              <Text style={{ flex: 2, fontWeight: '800' }}>Total</Text>
                              <Text style={{ flex: 1, textAlign: 'right', fontWeight: '800' }}>{formatHoursMinutes(totalActiveT)}</Text>
                              <Text style={{ flex: 1, textAlign: 'right', fontWeight: '800' }}>{formatHoursMinutes(Math.max(0, elapsed - totalActiveT))}</Text>
                              <Text style={{ width: 80, textAlign: 'right', fontWeight: '800' }}>—</Text>
                            </View>
                          </View>
                        );
                      })()}
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
  modalContainerMobile: {
    flex: 1,
    backgroundColor: COLORS.background,
    paddingTop: 12,
    paddingHorizontal: 12,
  },
  filterRowMobile: {
    flexDirection: 'column',
    alignItems: 'stretch',
    gap: 6,
  },
  filterButtonMobile: {
    flex: 1,
    maxWidth: '100%',
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: 10,
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
  ,
  // Toggle styles for polling ON/OFF
  toggleButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    marginLeft: 8,
  },
  toggleOn: {
    backgroundColor: '#10b981', // green-500
    borderColor: '#059669',
  },
  toggleOff: {
    backgroundColor: '#ef4444', // red-500
    borderColor: '#dc2626',
  },
  toggleText: {
    color: '#fff',
    fontWeight: '700',
  }
  ,
  badge: {
    backgroundColor: '#f1f5f9',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    marginRight: 6,
    marginBottom: 4,
  },
  badgeText: {
    fontSize: 12,
    color: '#0f172a',
    fontWeight: '600',
  }
  ,
  modalItemCard: {
    backgroundColor: '#ffffff',
    borderRadius: 8,
    padding: 10,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#e6eef6',
  },
  modalItemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  modalItemTitle: {
    fontWeight: '700',
    color: COLORS.primary,
  },
  modalItemDate: {
    color: '#6b7280',
    fontSize: 12,
  },
  modalItemLine: {
    marginTop: 6,
    color: '#374151',
  },
  modalItemFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 8,
  },
  modalItemMeta: {
    color: '#1f2937',
    fontWeight: '600',
    fontSize: 13,
  }
  ,
  estadisticaContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#f8fafc',
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e6eef6',
  },
  estadisticaLabel: {
    fontSize: 11,
    color: '#475569',
    fontWeight: '700',
    marginRight: 4,
  },
  estadisticaValue: {
    fontSize: 12,
    color: '#0f172a',
    fontWeight: '700',
    marginRight: 8,
  },
  estadisticaStatus: {
    fontSize: 11,
    fontWeight: '800',
    color: '#065f46',
    backgroundColor: '#d1fae5',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 999,
    marginLeft: 8,
  },
  estadisticaStatusParcial: {
    fontSize: 11,
    fontWeight: '800',
    color: '#78350f',
    backgroundColor: '#fff7cc',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 999,
    marginLeft: 8,
  },
  estadisticaBadges: {
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: 8,
  },
  estadisticaContainerInline: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 4,
  },
  estadisticaInlineBlock: {
    alignItems: 'center',
    marginLeft: 6,
  }
  ,
  valorBadge: {
    backgroundColor: '#fff7e6',
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#ffd7a1',
    alignItems: 'center',
  },
  valorBadgeInline: {
    backgroundColor: '#fff7e6',
    paddingHorizontal: 6,
    paddingVertical: 4,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#ffd7a1',
    alignItems: 'center',
  },
  valorLabel: {
    fontSize: 11,
    color: '#92400e',
    fontWeight: '800',
  },
  valorPercent: {
    fontSize: 13,
    color: '#92400e',
    fontWeight: '900',
    marginLeft: 6,
  }
});
