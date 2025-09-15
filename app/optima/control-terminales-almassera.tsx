// app/optima/control-terminales-almassera.tsx

import Ionicons from '@expo/vector-icons/Ionicons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import DateTimePicker, { DateTimePickerAndroid, DateTimePickerEvent } from '@react-native-community/datetimepicker';
import { useRouter } from 'expo-router';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  useWindowDimensions,
  View
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

// Componentes
import AppHeader from '../../components/AppHeader';
import ModalHeader from '../../components/ModalHeader';
import SQLModal from '../../components/SQLModal';

// Hooks y configuración
import { API_URL } from '../../config/constants';
import COLORS from '../../constants/Colors';
import { useAuth } from '../../hooks/useAuth';
import { useOfflineMode } from '../../hooks/useOfflineMode';

/** ===================== Tipos base ===================== */
type Row = {
  // claves lógicas previas
  pedido?: string;
  linea?: string | number;
  centro_trabajo?: string;
  username?: string;
  trabajo?: string;
  desc_trabajo?: string;

  // tiempos y fechas de backend
  eventdt?: string;
  fecha_inicio_op?: string;
  fecha_fin_op?: string;
  fecha_rotura?: string;
  fecha_pedido?: string;
  fecha_entrega_prog?: string;

  t_trabajo_seg?: number | string | null;
  t_espera_prev_maquina_seg?: number | string | null;
  t_entre_operaciones_seg?: number | string | null;
  t_desde_pedido_seg?: number | string | null;
  t_hasta_entrega_prog_seg?: number | string | null;
  t_ciclo_pieza_total_seg?: number | string | null;

  // campos que llegan con mayúsculas
  NOMBRE?: string;               // cliente
  ESTADO?: string;
  DATAHORA_COMPL?: string;
  DATA_COMPLETE?: string;
  USERNAME?: string;
  CENTRO_TRABAJO?: string;

  // extras (si algún día se añaden desde el backend)
  VIDRIO?: string;
  PRODUCTO?: string;
  N_VIDRIO?: string;
  MEDIDA_X?: string | number;
  MEDIDA_Y?: string | number;
  PROGR?: string | number;
  ID_ITEMS?: string | number;
  ID_ORDDETT?: string | number;
  RAZON_QUEBRA1?: string;
  RAZON_QUEBRA2?: string;
  RAZON_QUEBRA3?: string;
  TEXT1?: string;

  [key: string]: any;
};

type TimeAgg = {
  trabajo: number;
  esperaPrev: number;
  entreOps: number;
  desdePedido: number;
  hastaEntrega: number;
  cicloPieza: number;
};

// Operario dentro de un pedido
type PedidoOperario = {
  username: string;
  count: number;
  fechaUlt: string | null;
  centros: CentroTrabajo[];
  totals: TimeAgg;
  avg: TimeAgg;
};

// Centro de trabajo como "tarea" dentro de un pedido
type CentroTrabajo = {
  centro: string;
  count: number;
  fechaUlt: string | null;
  rows: Row[];
  totals: TimeAgg;
  avg: TimeAgg;
  estadoOperacion?: 'completo' | 'parcial' | 'sin_tiempo';
};

// Pedido principal (tarjeta principal)
type PedidoGroup = {
  kind: 'pedido';
  pedido: string;
  nombre: string;
  count: number;
  estado: string;
  fechaUlt: string | null;
  rows: Row[];
  centros: CentroTrabajo[];
  operarios: PedidoOperario[];
  totals: TimeAgg;
  avg: TimeAgg;
  estadoOperacion?: 'completo' | 'parcial' | 'sin_tiempo';
};

interface UserData {
  id: number;
  nombre?: string;
  rol?: string;
  name?: string;
  role?: string;
}

/** ===================== Helpers ===================== */
const norm = (v: any) => String(v ?? '').trim();
const upper = (v: any) => norm(v).toUpperCase();
const firstOf = (obj: any, ...keys: string[]) => {
  for (const k of keys) {
    const val = obj?.[k];
    if (val !== undefined && val !== null && String(val).trim() !== '') return val;
  }
  return undefined;
};

const numOf = (obj: any, ...keys: string[]) => {
  const raw = firstOf(obj, ...keys);
  const n = typeof raw === 'number' ? raw : raw == null ? NaN : Number(String(raw).replace(',', '.'));
  return Number.isFinite(n) ? n : 0;
};

const parseMillis = (s?: string | null) => {
  if (!s) return NaN;
  const t = Date.parse(s);
  return Number.isFinite(t) ? t : NaN;
};

const toYmd = (d: Date) => {
  const yy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${yy}-${mm}-${dd}`;
};

const fmtYmdHm = (iso?: string | null) => {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return String(iso);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  const h = String(d.getHours()).padStart(2, '0');
  const min = String(d.getMinutes()).padStart(2, '0');
  return `${y}-${m}-${day} ${h}:${min}`;
};

const formatDateTime = (dateStr: string | null) => {
  if (!dateStr) return '-';
  const date = new Date(dateStr);
  return `${date.getDate().toString().padStart(2, '0')}/${(date.getMonth() + 1).toString().padStart(2, '0')}/${date.getFullYear()} ${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}:${date.getSeconds().toString().padStart(2, '0')}`;
};

const formatSeconds = (seconds: number) => {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;
  return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
};

const fmtDur = (sec: number) => {
  const s = Math.max(0, Math.round(sec || 0));
  const d = Math.floor(s / 86400);
  const h = Math.floor((s % 86400) / 3600);
  const m = Math.floor((s % 3600) / 60);
  const r = s % 60;
  if (d > 0) return `${d}d ${h}h`;
  if (h > 0) return `${h}h ${m}m`;
  if (m > 0) return `${m}m ${r}s`;
  return `${r}s`;
};

const validYmd = (s: string) => /^\d{4}-\d{2}-\d{2}$/.test(s) && !Number.isNaN(new Date(s + 'T00:00:00').getTime());

const zeroAgg = (): TimeAgg => ({
  trabajo: 0, esperaPrev: 0, entreOps: 0, desdePedido: 0, hastaEntrega: 0, cicloPieza: 0,
});

const sumTimes = (rows: Row[]): TimeAgg => {
  const out = zeroAgg();
  for (const r of rows) {
    out.trabajo += numOf(r, 't_trabajo_seg');
    out.esperaPrev += numOf(r, 't_espera_prev_maquina_seg');
    out.entreOps += numOf(r, 't_entre_operaciones_seg');
    out.desdePedido += numOf(r, 't_desde_pedido_seg');
    out.hastaEntrega += numOf(r, 't_hasta_entrega_prog_seg');
    out.cicloPieza += numOf(r, 't_ciclo_pieza_total_seg');
  }
  return out;
};

const aggAvg = (tot: TimeAgg, count: number): TimeAgg => ({
  trabajo: count ? tot.trabajo / count : 0,
  esperaPrev: count ? tot.esperaPrev / count : 0,
  entreOps: count ? tot.entreOps / count : 0,
  desdePedido: count ? tot.desdePedido / count : 0,
  hastaEntrega: count ? tot.hastaEntrega / count : 0,
  cicloPieza: count ? tot.cicloPieza / count : 0,
});

/** Agrupar por pedido con centros como tareas */
const groupByPedido = (rows: Row[]): PedidoGroup[] => {
  const map = new Map<string, Row[]>();
  for (const r of rows) {
    const pedido = norm(firstOf(r, 'pedido', 'PEDIDO'));
    if (!pedido) continue;
    if (!map.has(pedido)) map.set(pedido, []);
    map.get(pedido)!.push(r);
  }

  const out: PedidoGroup[] = [];
  for (const [pedido, arr] of map) {
    const nombre = norm(firstOf(arr[0], 'NOMBRE', 'nombre_cliente')) || '—';
    const estados = new Set(arr.map((x) => upper(firstOf(x, 'ESTADO'))).filter(Boolean));
    const estado = estados.size === 0 ? '' : (estados.size === 1 ? [...estados][0] : 'Mixto');
    const maxMs = Math.max(
      ...arr.map((r) => {
        const candidates = [
          parseMillis(firstOf(r, 'eventdt')),
          parseMillis(firstOf(r, 'fecha_fin_op')),
          parseMillis(firstOf(r, 'fecha_inicio_op')),
          parseMillis(firstOf(r, 'fecha_pedido')),
          parseMillis(firstOf(r, 'fecha_entrega_prog')),
          parseMillis(firstOf(r, 'DATAHORA_COMPL')),
          parseMillis(firstOf(r, 'DATA_COMPLETE')),
        ];
        return Math.max(...candidates.filter(Number.isFinite));
      })
    );
    const fechaUlt = Number.isFinite(maxMs) ? new Date(maxMs).toISOString() : null;

    // Agrupar centros de trabajo dentro del pedido
    const centroMap = new Map<string, Row[]>();
    for (const r of arr) {
      const centro = norm(firstOf(r, 'centro_trabajo', 'CENTRO_TRABAJO'));
      if (!centro) continue;
      if (!centroMap.has(centro)) centroMap.set(centro, []);
      centroMap.get(centro)!.push(r);
    }

    const centros: CentroTrabajo[] = [];
    for (const [centro, centroRows] of centroMap) {
      const centroCount = centroRows.length;
      const centroMaxMs = Math.max(...centroRows.map(r => {
        const candidates = [
          parseMillis(firstOf(r, 'eventdt')),
          parseMillis(firstOf(r, 'fecha_fin_op')),
          parseMillis(firstOf(r, 'fecha_inicio_op')),
        ];
        return Math.max(...candidates.filter(Number.isFinite));
      }));
      const centroFechaUlt = Number.isFinite(centroMaxMs) ? new Date(centroMaxMs).toISOString() : null;
      
      // Determinar estado del centro
      let estadoOperacion: 'completo' | 'parcial' | 'sin_tiempo' = 'sin_tiempo';
      const tiemposTotales = centroRows.map(r => numOf(r, 't_trabajo_seg')).filter(t => t > 0);
      if (tiemposTotales.length === 0) {
        estadoOperacion = 'sin_tiempo';
      } else if (tiemposTotales.length === centroRows.length) {
        estadoOperacion = 'completo';
      } else {
        estadoOperacion = 'parcial';
      }
      
      const centroTotals = sumTimes(centroRows);
      const centroAvg = aggAvg(centroTotals, centroCount);
      
      centros.push({
        centro,
        count: centroCount,
        fechaUlt: centroFechaUlt,
        rows: centroRows,
        totals: centroTotals,
        avg: centroAvg,
        estadoOperacion
      });
    }
    centros.sort((a, b) => (parseMillis(b.fechaUlt) || 0) - (parseMillis(a.fechaUlt) || 0));

    // Agrupar operarios dentro del pedido
    const byUser = new Map<string, Row[]>();
    for (const r of arr) {
      const user = norm(firstOf(r, 'username', 'USERNAME'));
      if (!user) continue;
      if (!byUser.has(user)) byUser.set(user, []);
      byUser.get(user)!.push(r);
    }
    
    const operarios: PedidoOperario[] = [];
    for (const [username, subarr] of byUser) {
      // Para cada operario, agrupar sus centros
      const operarioCentroMap = new Map<string, Row[]>();
      for (const r of subarr) {
        const centro = norm(firstOf(r, 'centro_trabajo', 'CENTRO_TRABAJO'));
        if (!centro) continue;
        if (!operarioCentroMap.has(centro)) operarioCentroMap.set(centro, []);
        operarioCentroMap.get(centro)!.push(r);
      }
      
      const operarioCentros: CentroTrabajo[] = [];
      for (const [centro, centroRows] of operarioCentroMap) {
        const centroCount = centroRows.length;
        const centroMaxMs = Math.max(...centroRows.map(r => parseMillis(firstOf(r, 'eventdt')) || 0));
        const centroFechaUlt = Number.isFinite(centroMaxMs) ? new Date(centroMaxMs).toISOString() : null;
        const centroTotals = sumTimes(centroRows);
        const centroAvg = aggAvg(centroTotals, centroCount);
        
        operarioCentros.push({
          centro,
          count: centroCount,
          fechaUlt: centroFechaUlt,
          rows: centroRows,
          totals: centroTotals,
          avg: centroAvg
        });
      }
      
      const count = subarr.length;
      const fechaUlt = operarioCentros.length ? operarioCentros[0].fechaUlt : null;
      const totals = sumTimes(subarr);
      const avg = aggAvg(totals, count);
      operarios.push({ username, count, fechaUlt, centros: operarioCentros, totals, avg });
    }
    operarios.sort((a, b) => (parseMillis(b.fechaUlt) || 0) - (parseMillis(a.fechaUlt) || 0));

    // Determinar estado del pedido
    let estadoOperacion: 'completo' | 'parcial' | 'sin_tiempo' = 'sin_tiempo';
    const tiemposTotales = arr.map(r => numOf(r, 't_trabajo_seg')).filter(t => t > 0);
    if (tiemposTotales.length === 0) {
      estadoOperacion = 'sin_tiempo';
    } else if (tiemposTotales.length === arr.length) {
      estadoOperacion = 'completo';
    } else {
      estadoOperacion = 'parcial';
    }

    const totals = sumTimes(arr);
    const avg = aggAvg(totals, arr.length);

    out.push({ 
      kind: 'pedido', 
      pedido, 
      nombre, 
      count: arr.length, 
      estado, 
      fechaUlt, 
      rows: arr, 
      centros,
      operarios,
      totals, 
      avg,
      estadoOperacion
    });
  }

  out.sort((a, b) => (parseMillis(b.fechaUlt) || 0) - (parseMillis(a.fechaUlt) || 0));
  return out;
};



/** ===================== Componente ===================== */
const ENDPOINT = `${API_URL}/control-optima/piezas-maquinas-total`;

// Función para obtener el último lunes (o el lunes anterior si hoy es lunes)
const getLastMonday = () => {
  const today = new Date();
  const dayOfWeek = today.getDay(); // 0 = domingo, 1 = lunes, 2 = martes, ..., 6 = sábado
  
  // Si hoy es lunes (1), queremos el lunes anterior (-7 días)
  // Si hoy es martes (2), queremos el lunes anterior (-1 día)
  // Si hoy es miércoles (3), queremos el lunes anterior (-2 días)
  // Si hoy es domingo (0), queremos el lunes anterior (-6 días)
  
  let daysToSubtract;
  if (dayOfWeek === 1) {
    // Si hoy es lunes, ir al lunes anterior (7 días atrás)
    daysToSubtract = 7;
  } else if (dayOfWeek === 0) {
    // Si hoy es domingo, ir al lunes anterior (6 días atrás)
    daysToSubtract = 6;
  } else {
    // Para martes (2) a sábado (6), ir al lunes de esta semana
    // pero como queremos el lunes anterior, agregamos 7 días más
    daysToSubtract = dayOfWeek - 1 + 7;
  }
  
  const lastMonday = new Date(today);
  lastMonday.setDate(today.getDate() - daysToSubtract);
  
  return toYmd(lastMonday);
};

// Desde el último lunes hasta fecha actual
const DEFAULT_FROM = getLastMonday();
const DEFAULT_TO = toYmd(new Date());

export default function ControlTerminalesAlmassera() {
  const { authenticated, loading: authLoading } = useAuth();
  const router = useRouter();
  const { serverReachable } = useOfflineMode();

  const debugLogs = true;
  const log = (...args: any[]) => {
    if (debugLogs) {
      console.log('[ControlTerminalesAlmassera]', ...args);
    }
  };

  // Estados de usuario y autenticación
  const [userData, setUserData] = useState<UserData | null>(null);
  const [userModalVisible, setUserModalVisible] = useState(false);
  const [modalUser, setModalUser] = useState<{ userName?: string; role?: string }>({});
  const [loading, setLoading] = useState(true);
  const [token, setToken] = useState<string | null>(null);

  // Estados de datos principales
  const [rows, setRows] = useState<Row[]>([]);
  const [totalRecords, setTotalRecords] = useState<number>(0);
  const [loadingData, setLoadingData] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  // Estados de búsqueda y filtros
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'Todo' | 'Completo' | 'En Proceso' | 'Pendiente'>('Todo');
  const [from, setFrom] = useState<string>(DEFAULT_FROM);
  const [to, setTo] = useState<string>(DEFAULT_TO);
  const [dateError, setDateError] = useState<string>('');

  // Estados para calendarios iOS
  const [showFromPicker, setShowFromPicker] = useState(false);
  const [showToPicker, setShowToPicker] = useState(false);

  // Estados de agrupación
  const [pedidos, setPedidos] = useState<PedidoGroup[]>([]);
  const [filteredPedidos, setFilteredPedidos] = useState<PedidoGroup[]>([]);

  // Estados de modales
  const [selectedPedido, setSelectedPedido] = useState<PedidoGroup | null>(null);
  const [pedidoModalVisible, setPedidoModalVisible] = useState(false);
  const [selectedOperario, setSelectedOperario] = useState<PedidoOperario | null>(null);
  const [operarioModalVisible, setOperarioModalVisible] = useState(false);
  const [sqlVisible, setSqlVisible] = useState(false);

  // Layout
  const { width } = useWindowDimensions();
  const isWeb = Platform.OS === 'web';
  const numColumns = isWeb ? 4 : 1;

  // Anti-bucle / anti-duplicados
  const inFlightAbort = useRef<AbortController | null>(null);
  const lastReqKeyRef = useRef<string>('');

  // Autorización
  const normalizedRole = ((userData?.rol ?? userData?.role) ?? '').toString().trim().toLowerCase();
  const allowed = ['admin', 'developer', 'administrador'].includes(normalizedRole);

  /** ===== validación fechas ===== */
  const validateDates = useCallback((): boolean => {
    log('🔍 Validando fechas - from:', from, 'to:', to);
    
    if (!validYmd(from) || !validYmd(to)) {
      log('❌ Formato de fechas inválido');
      setDateError('Fechas inválidas');
      return false;
    }
    const dFrom = new Date(from + 'T00:00:00').getTime();
    const dTo = new Date(to + 'T23:59:59').getTime();
    if (Number.isNaN(dFrom) || Number.isNaN(dTo)) {
      log('❌ Fechas no se pueden parsear');
      setDateError('Fechas inválidas');
      return false;
    }
    if (dFrom > dTo) {
      log('❌ Fecha inicial es mayor que la final');
      setDateError('Fecha inicial debe ser menor que la final');
      return false;
    }
    
    log('✅ Fechas válidas');
    setDateError('');
    return true;
  }, [from, to]);

  /** ===== construir clave de request para deduplicar ===== */
  const buildReqKey = () => {
    const key = JSON.stringify({ desde: from, hasta: to });
    log('🔑 Clave de request generada:', key);
    return key;
  };

  /** ===== funciones para manejo de fechas ===== */
  const parseSafeDate = (s: string) => {
    // si la cadena no es válida, usa hoy
    const d = new Date(`${s}T00:00:00`);
    return Number.isNaN(d.getTime()) ? new Date() : d;
  };

  const onChangeFrom = (_ev: DateTimePickerEvent, selected?: Date) => {
    if (Platform.OS === 'ios') setShowFromPicker(false);
    if (!selected) return;
    setFrom(toYmd(selected));
  };

  const onChangeTo = (_ev: DateTimePickerEvent, selected?: Date) => {
    if (Platform.OS === 'ios') setShowToPicker(false);
    if (!selected) return;
    setTo(toYmd(selected));
  };

  const openFrom = () => {
    const current = parseSafeDate(from);
    if (Platform.OS === 'android') {
      DateTimePickerAndroid.open({
        value: current,
        onChange: onChangeFrom,
        mode: 'date',
        is24Hour: true,
      });
    } else {
      setShowFromPicker(true);
    }
  };

  const openTo = () => {
    const current = parseSafeDate(to);
    if (Platform.OS === 'android') {
      DateTimePickerAndroid.open({
        value: current,
        onChange: onChangeTo,
        mode: 'date',
        is24Hour: true,
      });
    } else {
      setShowToPicker(true);
    }
  };

  /** ===== fetch datos ===== */
  const fetchData = useCallback(
    async (force: boolean = false) => {
      log('🚀 Iniciando fetchData - force:', force);
      log('📅 Estado actual - from:', from, 'to:', to);
      log('🔐 Usuario autenticado:', authenticated, 'Cargando:', loadingData);
      
      if (!validateDates()) {
        log('❌ Validación de fechas falló, cancelando fetch');
        return;
      }
      
      if (loadingData) {
        log('⏳ Ya hay una carga en progreso, cancelando');
        return;
      }

      const reqKey = buildReqKey();
      if (!force && reqKey === lastReqKeyRef.current) {
        log('🔄 Request duplicado detectado, saltando...');
        return;
      }

      log('🧹 Cancelando requests anteriores si existen');
      try {
        inFlightAbort.current?.abort();
      } catch (_) { }
      const controller = new AbortController();
      inFlightAbort.current = controller;

      log('⚡ Configurando estado de carga');
      setLoadingData(true);
      lastReqKeyRef.current = reqKey;

      // Limpiar datos al iniciar la búsqueda
      log('🗑️ Limpiando datos anteriores');
      setRows([]);
      setPedidos([]);
      setTotalRecords(0);

      try {
        const body = {
          desde: from,
          hasta: to
        };

        log('🚀 Enviando request al endpoint:', ENDPOINT);
        log('📅 Body de la request:', body);
        log('🔍 Fechas validadas - from:', from, 'to:', to);

        const res = await fetch(ENDPOINT, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
          signal: controller.signal,
        });

        log('📡 Respuesta del servidor - Status:', res.status, 'OK:', res.ok);

        if (!res.ok) {
          const errorText = await res.text();
          log('❌ Error del servidor:', errorText);
          throw new Error(`HTTP ${res.status}: ${errorText}`);
        }

        const data: Row[] = await res.json();
        log('✅ Datos recibidos correctamente - Total rows:', data.length);
        
        if (data.length > 0) {
          log('📊 Primer registro de ejemplo:', JSON.stringify(data[0], null, 2));
        }

        setRows(data);
        setTotalRecords(data.length);

        // Agrupar por pedidos
        const pedidosGrouped = groupByPedido(data);
        setPedidos(pedidosGrouped);
        log('📦 Pedidos agrupados:', pedidosGrouped.length);
        
        if (pedidosGrouped.length > 0) {
          log('� Primer pedido de ejemplo:', {
            pedido: pedidosGrouped[0].pedido,
            centros: pedidosGrouped[0].centros.length,
            operarios: pedidosGrouped[0].operarios.length
          });
        }

      } catch (e: any) {
        if (e.name !== 'AbortError') {
          console.error('❌ Error al cargar datos:', e);
          log('💥 Error completo:', {
            message: e.message,
            name: e.name,
            stack: e.stack,
            endpoint: ENDPOINT,
            body: { desde: from, hasta: to }
          });
        } else {
          log('🛑 Request abortado (normal si se cancela)');
        }
      } finally {
        log('🔄 Finalizando carga - estableciendo loadingData = false');
        setLoadingData(false);
        setRefreshing(false);
        inFlightAbort.current = null;
      }
    },
    [from, to, validateDates, loadingData]
  );

  /** ===== efectos de carga inicial ===== */
  useEffect(() => {
    if (!authLoading && !authenticated) {
      console.log('🚫 Usuario no autenticado, redirigiendo a login...');
      router.replace('/login');
    }
  }, [authenticated, authLoading, router]);

  useEffect(() => {
    (async () => {
      try {
        const storedToken = await AsyncStorage.getItem('token');
        const rawUser = await AsyncStorage.getItem('userData');

        if (storedToken) {
          setToken(storedToken);
        }
        if (rawUser) {
          let parsedUser = JSON.parse(rawUser);
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

  useEffect(() => {
    if (!loading && allowed) {
      fetchData();
    }
  }, [loading, allowed, fetchData]);

  /** ===== filtrado de pedidos ===== */
  useEffect(() => {
    if (!Array.isArray(pedidos)) {
      setFilteredPedidos([]);
      return;
    }

    let filtered = pedidos;

    // Filtrar por estado
    if (statusFilter !== 'Todo') {
      filtered = filtered.filter(pedido => {
        if (statusFilter === 'Completo') {
          return pedido.estado === 'COMPLETE';
        } else if (statusFilter === 'En Proceso') {
          return pedido.estado !== 'COMPLETE' && pedido.estado !== '';
        } else if (statusFilter === 'Pendiente') {
          return pedido.estado === '' || !pedido.estado;
        }
        return true;
      });
    }

    // Filtrar por búsqueda
    const q = searchQuery.trim().toLowerCase();
    if (q) {
      filtered = filtered.filter(pedido => {
        // Buscar por número de pedido
        if (pedido.pedido.toLowerCase().includes(q)) return true;
        // Buscar por nombre del cliente
        if (pedido.nombre.toLowerCase().includes(q)) return true;
        // Buscar en centros de trabajo
        if (pedido.centros.some(centro => centro.centro.toLowerCase().includes(q))) return true;
        // Buscar en operarios
        if (pedido.operarios.some(op => op.username.toLowerCase().includes(q))) return true;
        return false;
      });
    }

    setFilteredPedidos(filtered);
    log('Pedidos filtrados:', filtered.length);
  }, [pedidos, searchQuery, statusFilter]);

  /** ===== pull-to-refresh ===== */
  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchData(true);
  }, [fetchData]);

  /** ===== abrir modal de pedido ===== */
  const openPedidoModal = (pedido: PedidoGroup) => {
    setSelectedPedido(pedido);
    setPedidoModalVisible(true);
    setOperarioModalVisible(false);
    log('Abriendo modal para pedido:', pedido.pedido);
  };

  /** ===== abrir modal de operario ===== */
  const openOperarioModal = (operario: PedidoOperario) => {
    setSelectedOperario(operario);
    setOperarioModalVisible(true);
    log('Abriendo modal para operario:', operario.username);
  };

  /** ===== obtener centros relevantes para mostrar como "tareas" ===== */
  const getCentrosRelevantes = (pedido: PedidoGroup) => {
    return pedido.centros.filter(centro => centro.totals.trabajo > 0); // Solo mostrar centros con tiempo de trabajo
  };

  // Verificaciones de carga y autenticación
  if (authLoading || loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator />
      </View>
    );
  }

  if (!authenticated) return null;

  if (!allowed) {
    return (
      <View style={styles.center}>
        <Text style={styles.errorText}>No tiene credenciales para ver esta información</Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <AppHeader
        titleOverride="Terminales Almassera"
        count={filteredPedidos.length}
        userNameProp={userData?.nombre || userData?.name || '—'}
        roleProp={userData?.rol || userData?.role || '—'}
        serverReachableOverride={authenticated && (serverReachable ?? false)}
        onUserPress={({ userName, role }) => {
          setModalUser({ userName, role });
          setPedidoModalVisible(false);
          setOperarioModalVisible(false);
          setUserModalVisible(true);
        }}
      />

      <ModalHeader
        visible={userModalVisible}
        onClose={() => setUserModalVisible(false)}
        userName={userData?.nombre || userData?.name || '—'}
        role={userData?.rol || userData?.role || '—'}
      />

      {/* Filtros de fecha */}
      <View style={styles.filtersGrid}>
        <View style={[styles.filterRow, Platform.OS === 'web' ? { gap: 24 } : {}]}>
          <View style={[styles.inputGroup, styles.flex1, Platform.OS === 'web' ? { minWidth: 180, maxWidth: 220 } : {}]}>
            <Text style={styles.label}>Desde</Text>
            {Platform.OS === 'web' ? (
              // @ts-ignore
              <input
                type="date"
                value={from}
                onChange={(e: any) => setFrom(e.target.value)}
                style={{ 
                  borderWidth: 1, 
                  borderColor: dateError ? '#ef4444' : '#ddd', 
                  borderRadius: 8, 
                  padding: 6, 
                  height: 32, 
                  width: '100%',
                  fontSize: 14,
                  marginRight: Platform.OS === 'web' ? 0 : undefined
                }}
              />
            ) : (
              <Pressable
                onPress={openFrom}
                style={[
                  styles.input, 
                  { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
                  dateError ? styles.inputError : {}
                ]}
              >
                <Text style={{
                  fontSize: 16,
                  color: from ? '#111827' : '#888',
                  fontWeight: from ? 'bold' : 'normal',
                  flex: 1,
                  textAlign: 'left',
                }}>
                  {from && validYmd(from) ? from : 'Selecciona fecha'}
                </Text>
                <Ionicons name="calendar-outline" size={20} color="#2e78b7" />
              </Pressable>
            )}
          </View>
          
          <View style={[styles.inputGroup, styles.flex1, Platform.OS === 'web' ? { minWidth: 180, maxWidth: 220 } : {}]}>
            <Text style={styles.label}>Hasta</Text>
            {Platform.OS === 'web' ? (
              // @ts-ignore
              <input
                type="date"
                value={to}
                onChange={(e: any) => setTo(e.target.value)}
                style={{ 
                  borderWidth: 1, 
                  borderColor: dateError ? '#ef4444' : '#ddd', 
                  borderRadius: 8, 
                  padding: 6, 
                  height: 32, 
                  width: '100%',
                  fontSize: 14,
                  marginLeft: Platform.OS === 'web' ? 0 : undefined
                }}
              />
            ) : (
              <Pressable
                onPress={openTo}
                style={[
                  styles.input, 
                  { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
                  dateError ? styles.inputError : {}
                ]}
              >
                <Text style={{
                  fontSize: 16,
                  color: to ? '#111827' : '#888',
                  fontWeight: to ? 'bold' : 'normal',
                  flex: 1,
                  textAlign: 'left',
                }}>
                  {to && validYmd(to) ? to : 'Selecciona fecha'}
                </Text>
                <Ionicons name="calendar-outline" size={20} color="#2e78b7" />
              </Pressable>
            )}
          </View>
        </View>

        {/* Botón aplicar filtros y búsqueda en la misma fila en web */}
        {Platform.OS === 'web' ? (
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 16, marginTop: 12, marginBottom: 12 }}>
            <Pressable
              style={[
                styles.btn,
                (!validYmd(from) || !validYmd(to)) && styles.btnDisabled,
                { minWidth: 180, maxWidth: 220, height: 32, padding: 0 }
              ]}
              onPress={() => fetchData(true)}
              disabled={!validYmd(from) || !validYmd(to)}
            >
              <Ionicons name="refresh-outline" size={18} color="#fff" />
              <Text style={[styles.btnText, { fontSize: 14 }]}>Buscar datos</Text>
            </Pressable>
            <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center', backgroundColor: 'transparent' }}>
              <Ionicons name="search-outline" size={18} color="#757575" style={{ marginRight: 6 }} />
              <TextInput
                style={{
                  fontSize: 14,
                  height: 32,
                  padding: 4,
                  flex: 1,
                  minWidth: 220,
                  maxWidth: 320,
                  borderWidth: 1,
                  borderColor: '#e5e7eb',
                  borderRadius: 8,
                  backgroundColor: '#fff',
                }}
                placeholder="Buscar por pedido, cliente, centro de trabajo u operario"
                value={searchQuery}
                onChangeText={setSearchQuery}
              />
            </View>
          </View>
        ) : (
          <View style={styles.filterRow}>
            <Pressable
              style={[
                styles.btn,
                (!validYmd(from) || !validYmd(to)) && styles.btnDisabled,
                styles.flex1
              ]}
              onPress={() => fetchData(true)}
              disabled={!validYmd(from) || !validYmd(to)}
            >
              <Ionicons name="refresh-outline" size={20} color="#fff" />
              <Text style={styles.btnText}>Buscar datos</Text>
            </Pressable>
          </View>
        )}

        {/* Error de fechas */}
        {dateError ? (
          <View style={styles.filterRow}>
            <Text style={styles.errorText}>{dateError}</Text>
          </View>
        ) : null}
      </View>

      {/* Filtros de estado */}
      <View style={styles.filterContainer}>
        {(['Todo', 'Completo', 'En Proceso', 'Pendiente'] as const).map((filter) => (
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

      {/* Lista de pedidos */}
      {loadingData ? (
        <ActivityIndicator style={{ flex: 1 }} />
      ) : (
        <FlatList
          data={filteredPedidos}
          keyExtractor={(item) => item.pedido}
          style={isWeb ? styles.flatListWeb : styles.flatListMobile}
          contentContainerStyle={isWeb ? styles.flatListContentWeb : undefined}
          numColumns={isWeb ? 4 : 1}
          key={isWeb ? 'web-4-cols' : 'mobile-1-col'}
          onRefresh={onRefresh}
          refreshing={refreshing}
          renderItem={({ item: pedido }) => {
            // Determinar estilo de la tarjeta basado en el estado
            let cardStyle = styles.cardPendiente; // Por defecto pendiente (rojo)
            let statusText = 'PENDIENTE';
            
            if (pedido.estado === 'COMPLETE') {
              cardStyle = styles.cardCompleto; // Verde
              statusText = 'COMPLETO';
            } else if (pedido.estado && pedido.estado !== '') {
              cardStyle = styles.cardEnProceso; // Amarillo
              statusText = 'EN PROCESO';
            }

            return (
              <TouchableOpacity 
                style={[
                  cardStyle, 
                  isWeb ? styles.cardWeb : undefined
                ]} 
                onPress={() => openPedidoModal(pedido)}
              >
                {/* Contenedor principal */}
                <View style={styles.mainRowContainer}>
                  {/* Columna izquierda */}
                  <View style={styles.leftColumn}>
                    <Text style={styles.cardTitle}>📦 {pedido.pedido}</Text>
                    <Text style={styles.cardText}>Cliente: {pedido.nombre}</Text>
                    <Text style={styles.cardText}>Centros: {pedido.centros.length}</Text>
                    <Text style={styles.cardText}>Operarios: {pedido.operarios.length}</Text>
                    <Text style={styles.cardText}>Última actividad: {formatDateTime(pedido.fechaUlt)}</Text>
                  </View>
                  
                  {/* Columna derecha */}
                  <View style={styles.rightColumn}>
                    <View style={styles.cardTitleStatusButton}>
                      <Text style={styles.cardText}>{statusText}</Text>
                      <Text style={styles.cardText}>Tiempo: {fmtDur(pedido.totals.trabajo)}</Text>
                    </View>
                  </View>
                </View>

                {/* Centros como "tareas" debajo */}
                <View style={styles.tareasContainer}>
                  {getCentrosRelevantes(pedido).map((centro, idx) => (
                    <TouchableOpacity
                      key={idx}
                      style={[
                        styles.tareaCard,
                        centro.totals.trabajo > 0 ? styles.tareaCardFinalizada : styles.tareaCardPendiente,
                        isWeb 
                          ? { 
                              width: '15%', // Más centros, más angosto
                              marginRight: 4,
                              marginBottom: 8,
                              flexBasis: '15%'
                            }
                          : { 
                              width: '30%',
                              marginHorizontal: '1.5%',
                              marginBottom: 8,
                              flexBasis: '30%'
                            }
                      ]}
                    >
                      <Text style={styles.tareaText}>{centro.centro}</Text>
                      <Text style={styles.tareaTimeText}>{fmtDur(centro.totals.trabajo)}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </TouchableOpacity>
            );
          }}
        />
      )}

      {/* Modal de Pedido */}
      <Modal visible={pedidoModalVisible} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Pedido: {selectedPedido?.pedido}</Text>
            {selectedPedido && (
              <View style={styles.modalContent}>
                <ScrollView style={styles.modalScrollView}>
                  {/* Información general del pedido */}
                  <View style={styles.detailCard}>
                    <Text style={[styles.detailTextBold, styles.androidTextFix]}>
                      Cliente: {selectedPedido.nombre}
                    </Text>
                    <Text style={[styles.detailText, styles.androidTextFix]}>
                      Estado: {selectedPedido.estado || 'PENDIENTE'}
                    </Text>
                    <Text style={[styles.detailText, styles.androidTextFix]}>
                      Centros de trabajo: {selectedPedido.centros.length}
                    </Text>
                    <Text style={[styles.detailText, styles.androidTextFix]}>
                      Operarios: {selectedPedido.operarios.length}
                    </Text>
                  </View>

                  {/* Lista de centros de trabajo */}
                  <Text style={[styles.sectionTitle, styles.androidTextFix]}>Centros de trabajo:</Text>
                  {selectedPedido.centros.map((centro, idx) => (
                    <View key={idx} style={styles.detailCard}>
                      <View style={styles.tareaInfo}>
                        <Text style={[styles.detailTextBold, styles.androidTextFix]}>
                          🏭 {centro.centro}
                        </Text>
                        <Text style={[styles.operarioText, styles.androidTextFix]}>
                          Piezas: {centro.count} | Tiempo trabajo: {fmtDur(centro.totals.trabajo)}
                        </Text>
                      </View>
                      <Text style={[styles.detailText, styles.androidTextFix]}>
                        {formatDateTime(centro.fechaUlt)}
                      </Text>
                    </View>
                  ))}

                  {/* Lista de operarios */}
                  <Text style={[styles.sectionTitle, styles.androidTextFix]}>Operarios:</Text>
                  {selectedPedido.operarios.map((operario, idx) => (
                    <TouchableOpacity
                      key={idx}
                      style={styles.detailCard}
                      onPress={() => openOperarioModal(operario)}
                    >
                      <View style={styles.tareaInfo}>
                        <Text style={[styles.detailTextBold, styles.androidTextFix]}>
                          � {operario.username}
                        </Text>
                        <Text style={[styles.operarioText, styles.androidTextFix]}>
                          Centros: {operario.centros.length} | Tiempo trabajo: {fmtDur(operario.totals.trabajo)}
                        </Text>
                      </View>
                      <Text style={[styles.detailText, styles.androidTextFix]}>
                        {formatDateTime(operario.fechaUlt)}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>
            )}
            <Pressable 
              style={styles.closeButton} 
              onPress={() => setPedidoModalVisible(false)}
            >
              <Text style={styles.closeText}>Cerrar</Text>
            </Pressable>
          </View>
        </View>
      </Modal>

      {/* Modal de Operario */}
      <Modal visible={operarioModalVisible} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Operario: {selectedOperario?.username}</Text>
            {selectedOperario && (
              <View style={styles.modalContent}>
                <ScrollView style={styles.modalScrollView}>
                  {/* Información general del operario */}
                  <View style={styles.detailCard}>
                    <Text style={[styles.detailTextBold, styles.androidTextFix]}>
                      Total Piezas: {selectedOperario.count}
                    </Text>
                    <Text style={[styles.detailText, styles.androidTextFix]}>
                      Tiempo Total Trabajo: {fmtDur(selectedOperario.totals.trabajo)}
                    </Text>
                    <Text style={[styles.detailText, styles.androidTextFix]}>
                      Centros trabajados: {selectedOperario.centros.length}
                    </Text>
                  </View>

                  {/* Lista de centros trabajados por el operario */}
                  <Text style={[styles.sectionTitle, styles.androidTextFix]}>Centros trabajados:</Text>
                  {selectedOperario.centros.map((centro, idx) => (
                    <View key={idx} style={styles.detailCard}>
                      <View style={styles.tareaInfo}>
                        <Text style={[styles.detailTextBold, styles.androidTextFix]}>
                          🏭 {centro.centro}
                        </Text>
                        <Text style={[styles.operarioText, styles.androidTextFix]}>
                          Piezas: {centro.count} | Tiempo trabajo: {fmtDur(centro.totals.trabajo)}
                        </Text>
                      </View>
                      <Text style={[styles.detailText, styles.androidTextFix]}>
                        {formatDateTime(centro.fechaUlt)}
                      </Text>
                    </View>
                  ))}
                </ScrollView>
              </View>
            )}
            <Pressable 
              style={styles.closeButton} 
              onPress={() => setOperarioModalVisible(false)}
            >
              <Text style={styles.closeText}>Cerrar</Text>
            </Pressable>
          </View>
        </View>
      </Modal>

      {/* SQL Debug Modal */}
      {sqlVisible && <SQLModal visible={sqlVisible} onClose={() => setSqlVisible(false)} />}

      {/* Date Pickers para iOS */}
      {Platform.OS === 'ios' && showFromPicker && (
        <Modal transparent animationType="slide" onRequestClose={() => setShowFromPicker(false)}>
          <View style={{ flex: 1, justifyContent: 'flex-end', backgroundColor: '#00000055' }}>
            <View style={{ backgroundColor: '#fff', padding: 12, borderTopLeftRadius: 12, borderTopRightRadius: 12 }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 }}>
                <Text style={{ fontWeight: '700' }}>Selecciona fecha "Desde"</Text>
                <Pressable onPress={() => setShowFromPicker(false)}>
                  <Text style={{ color: '#2e78b7', fontWeight: '700' }}>OK</Text>
                </Pressable>
              </View>
              <DateTimePicker
                value={parseSafeDate(from)}
                mode="date"
                display="spinner"
                onChange={onChangeFrom}
              />
            </View>
          </View>
        </Modal>
      )}

      {Platform.OS === 'ios' && showToPicker && (
        <Modal transparent animationType="slide" onRequestClose={() => setShowToPicker(false)}>
          <View style={{ flex: 1, justifyContent: 'flex-end', backgroundColor: '#00000055' }}>
            <View style={{ backgroundColor: '#fff', padding: 12, borderTopLeftRadius: 12, borderTopRightRadius: 12 }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 }}>
                <Text style={{ fontWeight: '700' }}>Selecciona fecha "Hasta"</Text>
                <Pressable onPress={() => setShowToPicker(false)}>
                  <Text style={{ color: '#2e78b7', fontWeight: '700' }}>OK</Text>
                </Pressable>
              </View>
              <DateTimePicker
                value={parseSafeDate(to)}
                mode="date"
                display="spinner"
                onChange={onChangeTo}
              />
            </View>
          </View>
        </Modal>
      )}

    </SafeAreaView>
  );
}

/** ===================== Estilos ===================== */
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  errorText: { color: 'red', fontSize: 16 },

  // Búsqueda
  searchContainer: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    backgroundColor: COLORS.surface, 
    margin: 8, 
    paddingHorizontal: 12, 
    borderRadius: 8, 
    elevation: 2 
  },
  searchInput: { flex: 1, height: 40, marginLeft: 8 },

  // Filtros
  filterContainer: {
    flexDirection: 'row',
    paddingHorizontal: 4,
    paddingVertical: 8,
    justifyContent: 'space-between',
    backgroundColor: COLORS.background,
    flexWrap: 'wrap',
  },
  filterButton: {
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: '#f0f0f0',
    marginHorizontal: 2,
    marginVertical: 2,
    borderWidth: 1,
    borderColor: '#ddd',
    flex: 1,
    maxWidth: '24%',
    minWidth: 70,
  },
  filterButtonActive: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  filterText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#666',
    textAlign: 'center',
  },
  filterTextActive: {
    color: '#fff',
  },

  // Lista
  flatListWeb: {
    width: '100%',
    alignSelf: 'stretch',
    paddingHorizontal: 16,
  },
  flatListContentWeb: {
    paddingVertical: 16,
    paddingHorizontal: 8,
  },
  flatListMobile: {},

  // Tarjetas
  card: { margin: 8, padding: 16, borderRadius: 12, elevation: 3, backgroundColor: '#fff' },
  cardPendiente: { margin: 8, padding: 16, borderRadius: 12, elevation: 3, backgroundColor: '#ffd7d7' },
  cardEnProceso: { margin: 8, padding: 16, borderRadius: 12, elevation: 3, backgroundColor: '#fff9c4' },
  cardCompleto: { margin: 8, padding: 16, borderRadius: 12, elevation: 3, backgroundColor: '#d4edda' },
  cardWeb: {
    flex: 1,
    maxWidth: '25%',
    minWidth: 250,
    marginBottom: 16,
    marginHorizontal: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 6,
  },
  cardTitle: { fontSize: 18, fontWeight: 'bold', marginBottom: 4, color: '#000' },
  cardText: { color: '#000', fontSize: 14, marginBottom: 2 },

  // Layout de tarjetas
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

  // Tareas/Tiempos
  tareasContainer: { 
    flexDirection: 'row', 
    flexWrap: 'wrap', 
    justifyContent: Platform.OS === 'web' ? 'flex-start' : 'space-between',
    marginTop: 8,
    paddingHorizontal: Platform.OS === 'web' ? 4 : 2,
    gap: Platform.OS === 'web' ? 4 : 0,
  },
  tareaCard: {
    padding: 8,
    borderRadius: 8,
    minHeight: 50,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#ddd',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 2,
  },
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
    fontSize: 10, 
    fontWeight: 'bold', 
    textAlign: 'center',
    color: '#333',
    marginBottom: 2,
  },
  tareaTimeText: { 
    fontSize: 8, 
    fontWeight: '600', 
    textAlign: 'center',
    color: '#555',
  },

  // Modales
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
    elevation: 8,
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
  modalScrollView: {
    backgroundColor: '#fff',
    maxHeight: '100%',
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: COLORS.primary,
    marginTop: 16,
    marginBottom: 8,
  },
  detailCard: { 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    paddingVertical: 12, 
    borderBottomWidth: 1, 
    borderBottomColor: '#eee', 
    alignItems: 'center',
    backgroundColor: '#fff',
  },
  detailText: { 
    fontSize: 14, 
    color: '#1f2937',
    fontWeight: '500' 
  },
  detailTextBold: { 
    fontSize: 14, 
    fontWeight: 'bold', 
    color: '#1f2937'
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

  // Fix para Android
  androidTextFix: {
    textShadowColor: 'transparent',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 0,
  },

  // Estilos para filtros de fecha
  filtersGrid: {
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
    padding: 10,
    gap: 10,
  },
  filterRow: {
    flexDirection: 'row',
    gap: 8,
  },
  inputGroup: { 
    width: 150 
  },
  label: { 
    fontSize: 12, 
    color: '#6b7280', 
    marginBottom: 4 
  },
  input: {
    backgroundColor: '#f9fafb',
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 8,
    paddingHorizontal: 10,
    height: 38,
    color: '#111827',
  },
  inputError: {
    borderColor: '#ef4444',
    backgroundColor: '#fef2f2',
  },
  btn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#2e78b7',
    paddingHorizontal: 12,
    height: 38,
    borderRadius: 8,
  },
  btnDisabled: { 
    opacity: 0.6 
  },
  btnText: { 
    color: '#fff', 
    fontWeight: '700' 
  },
  flex1: { 
    flex: 1 
  },
});
