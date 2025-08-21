// app/optima/piezas-maquina.tsx
import Ionicons from '@expo/vector-icons/Ionicons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Button,
  FlatList,
  Modal,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  useWindowDimensions,
} from 'react-native';
import AppHeader from '../../components/AppHeader';
import ModalHeader from '../../components/ModalHeader';
import { API_URL } from '../../config/constants';

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

// Pedido (grupo base)
type Group = {
  kind: 'pedido';
  pedido: string;
  nombre: string;
  count: number;
  estado: string;           // '', 'COMPLETE', 'Mixto', etc.
  fechaUlt: string | null;  // ISO
  rows: Row[];
  totals: TimeAgg;
  avg: TimeAgg;
};

// Cliente
type ClienteGroup = {
  kind: 'cliente';
  cliente: string;
  count: number;
  fechaUlt: string | null;
  pedidos: Group[];
  totals: TimeAgg;
  avg: TimeAgg;
};

// Operario dentro de un centro
type CentroOperario = {
  username: string;
  count: number;
  fechaUlt: string | null;
  pedidos: Group[];
  totals: TimeAgg;
  avg: TimeAgg;
};

// Centro de trabajo (máquina)
type CentroGroup = {
  kind: 'centro';
  centro: string;
  count: number;
  fechaUlt: string | null;
  pedidos: Group[];
  operarios: CentroOperario[];
  totals: TimeAgg;
  avg: TimeAgg;
};

// Operario (global)
type OperarioGroup = {
  kind: 'operario';
  username: string;
  count: number;
  fechaUlt: string | null;
  pedidos: Group[];
  totals: TimeAgg;
  avg: TimeAgg;
};

// Unión para la lista principal
type VisibleItem = Group | ClienteGroup | CentroGroup | OperarioGroup;

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

const validYmd = (s: string) => /^\d{4}-\d{2}-\d{2}$/.test(s) && !Number.isNaN(new Date(s + 'T00:00:00').getTime());

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
const fmtDurAvg = (totalSec: number, count: number) => fmtDur(count > 0 ? totalSec / count : 0);

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

/** Guards */
const isGroup = (x: VisibleItem): x is Group => (x as Group).kind === 'pedido';
const isClienteGroup = (x: VisibleItem): x is ClienteGroup => (x as ClienteGroup).kind === 'cliente';
const isCentroGroup = (x: VisibleItem): x is CentroGroup => (x as CentroGroup).kind === 'centro';
const isOperarioGroup = (x: VisibleItem): x is OperarioGroup => (x as OperarioGroup).kind === 'operario';

/** Agrupar por pedido */
const groupByPedido = (rows: Row[]): Group[] => {
  const map = new Map<string, Row[]>();
  for (const r of rows) {
    const pedido = norm(firstOf(r, 'pedido', 'PEDIDO'));
    if (!pedido) continue;
    if (!map.has(pedido)) map.set(pedido, []);
    map.get(pedido)!.push(r);
  }

  const out: Group[] = [];
  for (const [pedido, arr] of map) {
    const nombre = norm(firstOf(arr[0], 'NOMBRE', 'nombre_cliente')) || '—';
    const estados = new Set(arr.map((x) => upper(firstOf(x, 'ESTADO'))).filter(Boolean));
    const estado = estados.size === 0 ? '' : (estados.size === 1 ? [...estados][0] : 'Mixto');
    const maxMs = Math.max(
      ...arr.map((r) => {
        const a = parseMillis(norm(firstOf(r, 'DATAHORA_COMPL')));
        const b = parseMillis(norm(firstOf(r, 'DATA_COMPLETE')));
        const c = parseMillis(norm(firstOf(r, 'fecha_fin_op')));
        const d = parseMillis(norm(firstOf(r, 'eventdt')));
        const best = [a, b, c, d].filter(Number.isFinite);
        return best.length ? Math.max(...best) : -Infinity;
      })
    );
    const fechaUlt = Number.isFinite(maxMs) ? new Date(maxMs).toISOString() : null;

    const totals = sumTimes(arr);
    const avg = aggAvg(totals, arr.length);

    out.push({ kind: 'pedido', pedido, nombre, count: arr.length, estado, fechaUlt, rows: arr, totals, avg });
  }

  out.sort((a, b) => (parseMillis(b.fechaUlt) || 0) - (parseMillis(a.fechaUlt) || 0));
  return out;
};

/** Agrupar por cliente */
const groupByCliente = (rows: Row[]): ClienteGroup[] => {
  const map = new Map<string, Row[]>();
  for (const r of rows) {
    const cliente = norm(firstOf(r, 'NOMBRE', 'nombre_cliente'));
    if (!cliente) continue;
    if (!map.has(cliente)) map.set(cliente, []);
    map.get(cliente)!.push(r);
  }

  const out: ClienteGroup[] = [];
  for (const [cliente, arr] of map) {
    const pedidos = groupByPedido(arr);
    const count = arr.length;
    const fechaUlt = pedidos.length ? pedidos[0].fechaUlt : null;
    const totals = sumTimes(arr);
    const avg = aggAvg(totals, count);
    out.push({ kind: 'cliente', cliente, count, fechaUlt, pedidos, totals, avg });
  }
  out.sort((a, b) => (parseMillis(b.fechaUlt) || 0) - (parseMillis(a.fechaUlt) || 0));
  return out;
};

/** Agrupar por operario (global) */
const groupByOperario = (rows: Row[]): OperarioGroup[] => {
  const map = new Map<string, Row[]>();
  for (const r of rows) {
    const user = norm(firstOf(r, 'username', 'USERNAME'));
    if (!user) continue;
    if (!map.has(user)) map.set(user, []);
    map.get(user)!.push(r);
  }
  const out: OperarioGroup[] = [];
  for (const [username, arr] of map) {
    const pedidos = groupByPedido(arr);
    const count = arr.length;
    const fechaUlt = pedidos.length ? pedidos[0].fechaUlt : null;
    const totals = sumTimes(arr);
    const avg = aggAvg(totals, count);
    out.push({ kind: 'operario', username, count, fechaUlt, pedidos, totals, avg });
  }
  out.sort((a, b) => (parseMillis(b.fechaUlt) || 0) - (parseMillis(a.fechaUlt) || 0));
  return out;
};

/** Agrupar por centro (máquina) */
const groupByCentro = (rows: Row[]): CentroGroup[] => {
  const map = new Map<string, Row[]>();
  for (const r of rows) {
    const centro = norm(firstOf(r, 'centro_trabajo', 'CENTRO_TRABAJO'));
    if (!centro) continue;
    if (!map.has(centro)) map.set(centro, []);
    map.get(centro)!.push(r);
  }

  const out: CentroGroup[] = [];
  for (const [centro, arr] of map) {
    const pedidos = groupByPedido(arr);
    // operarios dentro del centro
    const byUser = new Map<string, Row[]>();
    for (const r of arr) {
      const u = norm(firstOf(r, 'username', 'USERNAME'));
      if (!u) continue;
      if (!byUser.has(u)) byUser.set(u, []);
      byUser.get(u)!.push(r);
    }
    const operarios: CentroOperario[] = [];
    for (const [username, subarr] of byUser) {
      const peds = groupByPedido(subarr);
      const fechaUlt = peds.length ? peds[0].fechaUlt : null;
      const totals = sumTimes(subarr);
      const avg = aggAvg(totals, subarr.length);
      operarios.push({ username, count: subarr.length, fechaUlt, pedidos: peds, totals, avg });
    }
    operarios.sort((a, b) => (parseMillis(b.fechaUlt) || 0) - (parseMillis(a.fechaUlt) || 0));

    const count = arr.length;
    const fechaUlt = pedidos.length ? pedidos[0].fechaUlt : null;
    const totals = sumTimes(arr);
    const avg = aggAvg(totals, count);

    out.push({ kind: 'centro', centro, count, fechaUlt, pedidos, operarios, totals, avg });
  }
  out.sort((a, b) => (parseMillis(b.fechaUlt) || 0) - (parseMillis(a.fechaUlt) || 0));
  return out;
};

/** ===================== Componente ===================== */
const ENDPOINT = `${API_URL}/control-optima/piezas-maquina`;
const DEFAULT_FROM = '2025-08-08';
const DEFAULT_TO = toYmd(new Date());

export default function PiezasMaquina() {
  // ---- encabezado global
  // usuario/rol header + modal
  const [userName, setUserName] = useState('—');
  const [userRole, setUserRole] = useState('—');
  const [serverReachable, setServerReachable] = useState<boolean>(true);
  const [userModalVisible, setUserModalVisible] = useState(false);
  const [modalUser, setModalUser] = useState<{ userName?: string; role?: string }>({});

  const { width } = useWindowDimensions();
  const numColumns = width >= 1024 ? 3 : width >= 700 ? 2 : 1;

  // Fechas por defecto
  const [from, setFrom] = useState<string>(DEFAULT_FROM);
  const [to, setTo] = useState<string>(DEFAULT_TO);
  const [dateError, setDateError] = useState<string>('');

  // Estado de consulta
  const [rows, setRows] = useState<Row[]>([]);
  const [totalRecords, setTotalRecords] = useState<number>(0);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [query, setQuery] = useState('');

  // Anti-bucle / anti-duplicados
  const inFlightAbort = useRef<AbortController | null>(null);
  const lastReqKeyRef = useRef<string>('');

  // Agrupaciones
  const [groupMode, setGroupMode] = useState<'pedido' | 'cliente' | 'centro' | 'operario'>('pedido');
  const [groupsPedido, setGroupsPedido] = useState<Group[]>([]);
  const [groupsCliente, setGroupsCliente] = useState<ClienteGroup[]>([]);
  const [groupsCentro, setGroupsCentro] = useState<CentroGroup[]>([]);
  const [groupsOperario, setGroupsOperario] = useState<OperarioGroup[]>([]);

  // Modales (pedido)
  const [selectedGroup, setSelectedGroup] = useState<Group | null>(null);
  const [pedidoModalVisible, setPedidoModalVisible] = useState(false);
  const [pedidoModalQuery, setPedidoModalQuery] = useState('');

  // Modales (cliente)
  const [selectedCliente, setSelectedCliente] = useState<ClienteGroup | null>(null);
  const [clientModalVisible, setClientModalVisible] = useState(false);
  const [clientModalQuery, setClientModalQuery] = useState('');

  // Modales (operario global)
  const [selectedOperario, setSelectedOperario] = useState<OperarioGroup | null>(null);
  const [operarioModalVisible, setOperarioModalVisible] = useState(false);
  const [operarioModalQuery, setOperarioModalQuery] = useState('');

  // Modales (centro)
  const [selectedCentro, setSelectedCentro] = useState<CentroGroup | null>(null);
  const [centroModalVisible, setCentroModalVisible] = useState(false);
  const [centroListMode, setCentroListMode] = useState<'operario' | 'pedido'>('operario');
  const [centroModalQuery, setCentroModalQuery] = useState('');

  // Centro → Operario
  const [centroOperarioSel, setCentroOperarioSel] = useState<(CentroOperario & { centro: string }) | null>(null);
  const [centroOperarioModalVisible, setCentroOperarioModalVisible] = useState(false);
  const [centroOperarioModalQuery, setCentroOperarioModalQuery] = useState('');

  // Modo de visualización por fecha:
  // 'inRange' => solo eventos dentro del rango
  // 'wholeOrder' => incluir el pedido completo si toca el rango
  const [showMode, setShowMode] = useState<'inRange' | 'wholeOrder'>('wholeOrder');


  /** ===== validación fechas ===== */
  const validateDates = useCallback((): boolean => {
    if (!validYmd(from) || !validYmd(to)) {
      setDateError('Formato inválido. Usa YYYY-MM-DD.');
      return false;
    }
    const dFrom = new Date(from + 'T00:00:00').getTime();
    const dTo = new Date(to + 'T23:59:59').getTime();
    if (Number.isNaN(dFrom) || Number.isNaN(dTo)) {
      setDateError('Fecha inválida.');
      return false;
    }
    if (dFrom > dTo) {
      setDateError('“Desde” no puede ser mayor a “Hasta”.');
      return false;
    }
    setDateError('');
    return true;
  }, [from, to]);

  /** ===== construir clave de request para deduplicar ===== */
  const buildReqKey = () => JSON.stringify({ from, to, showMode });

  /** ===== reset con filtros ===== */
  const applyFilters = useCallback(() => {
    if (!validateDates()) return;
    setRefreshing(true);
    fetchData();
  }, [validateDates]);

  /** ===== efecto: reagrupar al cambiar el modo de agrupación ===== */
  // useEffect para detectar cambios en showMode
  useEffect(() => {
    console.log('🎛️ useEffect showMode disparado:', showMode);
    if (rows.length > 0) {
      console.log('📊 Reagrupando datos existentes');
      const filteredData = filterClientSide(rows);
      regroup(filteredData);
    }
  }, [showMode]); // Solo escucha cambios en showMode


  /** ===== carga de usuarios ===== */
  useEffect(() => {
    (async () => {
      try {
        const s = await AsyncStorage.getItem('userData');
        const u = s ? JSON.parse(s) : null;
        setUserName(u?.nombre || u?.name || '—');
        setUserRole(u?.rol || u?.role || '—');
      } catch { }
    })();
  }, []);

  /** ===== carga inicial ===== */
  useEffect(() => {
    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /** ===== debounce de búsqueda (cliente) ===== */
  useEffect(() => {
    const t = setTimeout(() => {
      console.log('⏰ Debounce disparado - query/groupMode/showMode cambiaron');
      regroup(filterClientSide(rows));
    }, 300);
    return () => clearTimeout(t);
  }, [query, groupMode, rows, showMode]); // IMPORTANTE: Incluir showMode aquí

  /** ===== fetch (POST JSON, sin paginación) ===== */
  const fetchData = useCallback(
    async () => {
      if (!validateDates()) return;
      if (loading) return;

      const reqKey = buildReqKey();
      if (reqKey === lastReqKeyRef.current) {
        setRefreshing(false);
        return;
      }

      try { inFlightAbort.current?.abort(); } catch (_) { }
      const controller = new AbortController();
      inFlightAbort.current = controller;

      setLoading(true);

      // NUEVO: Limpiar datos al iniciar la búsqueda
      setRows([]);
      setGroupsPedido([]);
      setGroupsCliente([]);
      setGroupsCentro([]);
      setGroupsOperario([]);
      setTotalRecords(0);

      try {
        lastReqKeyRef.current = reqKey;

        const res = await fetch(ENDPOINT, {
          method: 'POST',
          signal: controller.signal,
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ desde: from, hasta: to }),
        });

        setServerReachable(res.ok);

        const data = await res.json();

        if (!res.ok) {
          const msg = data?.message || `HTTP ${res.status}`;
          throw new Error(msg);
        }

        const newRows: Row[] = Array.isArray(data) ? data : [];
        setRows(newRows);
        setTotalRecords(newRows.length);

        // Aplicar filtro inmediatamente
        const filteredData = filterClientSide(newRows);
        console.log('🔍 Datos después de filtrar:', filteredData.length);
        regroup(filteredData);

      } catch (e: any) {
        if (e?.name !== 'AbortError') {
          console.error('[piezas-maquina] fetchData error:', e);
          setServerReachable(false);
          setRows([]);
          setGroupsPedido([]);
          setGroupsCliente([]);
          setGroupsCentro([]);
          setGroupsOperario([]);
          setTotalRecords(0);
        }
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [from, to, showMode, validateDates, loading]
  );

  /** ===== filtrado cliente (según groupMode + rango de fechas) ===== */

  /** ===== filtrado cliente (según showMode + groupMode) ===== */
  const filterClientSide = (input: Row[]): Row[] => {
    console.log('🔍 filterClientSide iniciado');
    console.log('📊 Input rows:', input.length);
    console.log('🎛️ showMode:', showMode);
    console.log('📅 Rango:', from, 'a', to);
    // helper: timestamp del “evento” del row
    const eventMillisOf = (r: any) => {
      const iso = firstOf(r,
        'eventdt',          // si backend ya lo manda
        'DATAHORA_COMPL',   // vistas DASHBOARD_*
        'DATA_COMPLETE',    // backup fecha “completa”
        'fecha_fin_op',     // payload /piezas-maquina (si viene)
        'ServerDateTime',   // TV
        'DATE_COMPL'        // TV
      );
      return parseMillis(norm(iso));
    };

    // ventana de fechas [from 00:00, to 24:00) — to exclusivo
    const startMs = Date.parse(`${from}T00:00:00`);
    const endMs = Date.parse(`${to}T00:00:00`) + 24 * 60 * 60 * 1000;

    let base = input;

    // 1) Filtrado por fecha según 'showMode'
    if (Number.isFinite(startMs) && Number.isFinite(endMs)) {
      if (showMode === 'inRange') {
        // Sólo eventos dentro del rango
        base = base.filter(r => {
          const em = eventMillisOf(r);
          return Number.isFinite(em) && em >= startMs && em < endMs;
        });
      } else {
        // 'wholeOrder': si un pedido toca el rango, mostramos TODO su contenido
        const pedidosQueTocan = new Set(
          input.filter(r => {
            const em = eventMillisOf(r);
            return Number.isFinite(em) && em >= startMs && em < endMs;
          }).map(r => norm(firstOf(r, 'pedido', 'PEDIDO')))
            .filter(Boolean)
        );
        base = input.filter(r => pedidosQueTocan.has(norm(firstOf(r, 'pedido', 'PEDIDO'))));
      }
    }

    // 2) Filtro de búsqueda (igual que antes, pero sobre la base ya filtrada por fecha)
    const q = upper(query);
    if (!q) return base;

    if (groupMode === 'pedido') {
      return base.filter(r =>
        upper(firstOf(r, 'pedido', 'PEDIDO')).includes(q) ||
        upper(firstOf(r, 'NOMBRE', 'nombre_cliente')).includes(q) ||
        upper(firstOf(r, 'ESTADO')).includes(q)
      );
    } else if (groupMode === 'cliente') {
      return base.filter(r =>
        upper(firstOf(r, 'NOMBRE', 'nombre_cliente')).includes(q)
      );
    } else if (groupMode === 'centro') {
      return base.filter(r =>
        upper(firstOf(r, 'centro_trabajo', 'CENTRO_TRABAJO')).includes(q)
      );
    } else { // operario
      return base.filter(r =>
        upper(firstOf(r, 'username', 'USERNAME')).includes(q)
      );
    }
  };






  /** ===== base visible actual (para reagrupar) ===== */
  const currentVisibleBase = () => filterClientSide(rows);

  /** ===== reagrupar util ===== */
  const regroup = (base: Row[]) => {
    const gPedidos = groupByPedido(base);
    const gClientes = groupByCliente(base);
    const gCentros = groupByCentro(base);
    const gOperarios = groupByOperario(base);
    setGroupsPedido(gPedidos);
    setGroupsCliente(gClientes);
    setGroupsCentro(gCentros);
    setGroupsOperario(gOperarios);
  };

  /** ===== pull-to-refresh ===== */
  const onRefresh = useCallback(() => {
    applyFilters();
  }, [applyFilters]);

  /** ===== lista visible ===== */
  const visibleData: VisibleItem[] = useMemo(() => {
    return groupMode === 'pedido'
      ? groupsPedido
      : groupMode === 'cliente'
        ? groupsCliente
        : groupMode === 'centro'
          ? groupsCentro
          : groupsOperario;
  }, [groupMode, groupsPedido, groupsCliente, groupsCentro, groupsOperario]);

  const headerCount = totalRecords;

  // Totales globales sobre lo cargado (no filtrado)
  const globalTotals = useMemo(() => sumTimes(rows), [rows]);

  // Key extractor
  const getKey = (item: VisibleItem) => {
    if (isGroup(item)) return `ped-${item.pedido}`;
    if (isClienteGroup(item)) return `cli-${item.cliente}`;
    if (isCentroGroup(item)) return `ctr-${item.centro}`;
    if (isOperarioGroup(item)) return `opr-${item.username}`;
    return Math.random().toString(36).slice(2);
  };

  /** ====== Chips de tiempo (total + promedio) ====== */
  const TimeChips = ({ totals, avg }: { totals: TimeAgg; avg: TimeAgg }) => (
    <View style={styles.timeChipsWrap}>
      <View style={styles.timeChip}><Text style={styles.timeKey}>Trabajo</Text><Text style={styles.timeVal}>{fmtDur(totals.trabajo)} · prom {fmtDur(avg.trabajo)}</Text></View>
      <View style={styles.timeChip}><Text style={styles.timeKey}>Espera prev.</Text><Text style={styles.timeVal}>{fmtDur(totals.esperaPrev)} · prom {fmtDur(avg.esperaPrev)}</Text></View>
      <View style={styles.timeChip}><Text style={styles.timeKey}>Entre ops</Text><Text style={styles.timeVal}>{fmtDur(totals.entreOps)} · prom {fmtDur(avg.entreOps)}</Text></View>
      <View style={styles.timeChip}><Text style={styles.timeKey}>Desde pedido</Text><Text style={styles.timeVal}>{fmtDur(totals.desdePedido)} · prom {fmtDur(avg.desdePedido)}</Text></View>
      <View style={styles.timeChip}><Text style={styles.timeKey}>Hasta entrega</Text><Text style={styles.timeVal}>{fmtDur(totals.hastaEntrega)} · prom {fmtDur(avg.hastaEntrega)}</Text></View>
      <View style={styles.timeChip}><Text style={styles.timeKey}>Ciclo pieza</Text><Text style={styles.timeVal}>{fmtDur(totals.cicloPieza)} · prom {fmtDur(avg.cicloPieza)}</Text></View>
    </View>
  );

  /** ====== Comprobar si una fecha está fuera del rango ====== */

  const isDateOutOfRange = (dateStr: string | null | undefined): boolean => {
    if (!dateStr) return false;

    const eventMs = parseMillis(dateStr);
    if (!Number.isFinite(eventMs)) return false;

    const startMs = Date.parse(`${from}T00:00:00`);
    const endMs = Date.parse(`${to}T00:00:00`) + 24 * 60 * 60 * 1000;

    return eventMs < startMs || eventMs >= endMs;
  };






  /** ===================== Render ===================== */
  return (
    <SafeAreaView style={styles.container}>
      {/* ======= App Header ======= */}
      <AppHeader
        titleOverride="Terminales"
        count={headerCount}
        userNameProp={userName}
        roleProp={userRole}
        serverReachableOverride={!!serverReachable}
        onRefresh={applyFilters}
        onUserPress={({ userName, role }) => {
          setModalUser({ userName, role });
          setUserModalVisible(true);
        }}
      />
      <ModalHeader
        visible={userModalVisible}
        onClose={() => setUserModalVisible(false)}
        userName={modalUser.userName || userName}
        role={modalUser.role || userRole}
      />

      {/* ======= FILTROS ======= */}
      <View style={styles.filters}>
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Desde</Text>
          <TextInput
            value={from}
            onChangeText={setFrom}
            placeholder="YYYY-MM-DD"
            style={[styles.input, !validYmd(from) && styles.inputError]}
            autoCapitalize="none"
          />
        </View>
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Hasta</Text>
          <TextInput
            value={to}
            onChangeText={setTo}
            placeholder="YYYY-MM-DD"
            style={[styles.input, !validYmd(to) && styles.inputError]}
            autoCapitalize="none"
          />
        </View>

        <View style={[styles.inputGroup, { flex: 1.2 }]}>
          <Text style={styles.label}>
            Buscar por {groupMode === 'pedido' ? 'pedido o cliente'
              : groupMode === 'cliente' ? 'cliente'
                : groupMode === 'centro' ? 'centro'
                  : 'operario'}
          </Text>
          <TextInput
            value={query}
            onChangeText={setQuery}
            placeholder="Buscar (cliente): pedido, cliente, centro, operario…"
            style={styles.input}
            autoCapitalize="characters"
          />
        </View>

        {/* Agrupar por */}
        <View style={[styles.inputGroup, { width: 420 }]}>
          <Text style={styles.label}>Agrupar por</Text>
          <View style={styles.segment}>
            {(['pedido', 'cliente', 'centro', 'operario'] as const).map((m) => (
              <Pressable
                key={m}
                onPress={() => { setGroupMode(m); }}
                style={[styles.segmentBtn, groupMode === m && styles.segmentBtnActive]}
              >
                <Text style={[styles.segmentText, groupMode === m && styles.segmentTextActive]}>
                  {m === 'pedido' ? 'Pedido' : m === 'cliente' ? 'Cliente' : m === 'centro' ? 'Centro Maquina' : 'Operario'}
                </Text>
              </Pressable>
            ))}
          </View>
        </View>


        {/* ======= Interruptor de modo de fechas 
        <View style={[styles.inputGroup, { width: 420, marginLeft: 10 }]}>
          <Text style={styles.label}>Modo fecha</Text>
          <View style={styles.segment}>
            {([
              { key: 'inRange', label: 'Dentro del rango' },
              { key: 'wholeOrder', label: 'Pedido completo si toca' }
            ] as const).map(opt => (
              <Pressable
                key={opt.key}
                onPress={() => setShowMode(opt.key)}
                style={[styles.segmentBtn, showMode === opt.key && styles.segmentBtnActive]}
              >
                <Text style={[styles.segmentText, showMode === opt.key && styles.segmentTextActive]}>
                  {opt.label}
                </Text>
              </Pressable>
            ))}
          </View>
        </View>
======= */}


        <Pressable
          style={[styles.btn, (!validYmd(from) || !validYmd(to)) && styles.btnDisabled]}
          onPress={applyFilters}
          disabled={!validYmd(from) || !validYmd(to)}
        >
          <Ionicons name="checkmark-done-outline" size={20} color="#fff" />
          <Text style={styles.btnText}>Aplicar cambios</Text>
        </Pressable>
        {/* ======= INTERRUPTOR: modo de visualización ======= */}

        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 8 }}>
          <Ionicons name="options-outline" size={18} color="#555" />
          <Text style={[styles.label, { marginRight: 8 }]}>Mostrar</Text>

          <Pressable
            onPress={() => {
              // Debug logs
              console.log('🔄 Interruptor clickeado');
              console.log('📊 showMode actual:', showMode);
              console.log('📈 Rows disponibles:', rows.length);

              // Cambiar el modo
              const newMode = showMode === 'inRange' ? 'wholeOrder' : 'inRange';
              console.log('🎯 Nuevo showMode:', newMode);
              setShowMode(newMode);

              // Forzar reagrupación inmediata con los datos existentes
              setTimeout(() => {
                console.log('🔄 Reagrupando con nuevo modo:', newMode);
                const filteredData = filterClientSide(rows);
                console.log('📊 Datos filtrados:', filteredData.length);
                regroup(filteredData);
              }, 50);
            }}
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              paddingVertical: 8,
              paddingHorizontal: 12,
              borderRadius: 20,
              backgroundColor: showMode === 'inRange' ? '#e8f5e8' : '#e3f2fd', // Fondo cambia según modo
              borderWidth: 1,
              borderColor: showMode === 'inRange' ? '#2e7d32' : '#1565c0', // Borde cambia según modo
            }}
          >
            <View style={{
              width: 16,
              height: 16,
              borderRadius: 8,
              marginRight: 8,
              backgroundColor: showMode === 'inRange' ? '#2e7d32' : '#1565c0'
            }} />
            <Text style={{
              fontWeight: '600',
              color: showMode === 'inRange' ? '#2e7d32' : '#1565c0' // Texto cambia según modo
            }}>
              {showMode === 'inRange'
                ? 'Solo fechas en rango'
                : 'Pedidos completos'}
            </Text>
          </Pressable>
        </View>



      </View>
      {!!dateError && <Text style={styles.errorText}>{dateError}</Text>}

      {/* ======= PANEL GLOBAL DE TIEMPOS (sobre lo cargado) ======= */}
      <View style={styles.globalPanel}>
        <Text style={styles.globalTitle}>Tiempos globales (cargado)</Text>
        <TimeChips totals={globalTotals} avg={aggAvg(globalTotals, rows.length || 0)} />
      </View>

      {/* ======= LISTA PRINCIPAL ======= */}
      <FlatList<VisibleItem>
        numColumns={numColumns}
        key={numColumns}
        data={visibleData}
        keyExtractor={getKey}
        columnWrapperStyle={numColumns > 1 ? styles.columnWrap : undefined}
        ListHeaderComponent={
          <View style={styles.listHeader}>
            <Text style={styles.listHeaderText}>
              Cargados <Text style={styles.bold}>{rows.length}</Text> de <Text style={styles.bold}>{totalRecords}</Text>
            </Text>
          </View>
        }
        renderItem={({ item }) => {
          if (isGroup(item)) {
            const g = item;
            const hasOutOfRangeDates = g.rows.some(r => {
              const eventDate = firstOf(r, 'eventdt', 'DATAHORA_COMPL', 'DATA_COMPLETE', 'fecha_fin_op');
              return isDateOutOfRange(eventDate);
            });
            return (
              <TouchableOpacity
                onPress={() => { setSelectedGroup(g); setPedidoModalVisible(true); setPedidoModalQuery(''); }}
                style={[styles.card, styles.cardShadow, { flex: 1 }, hasOutOfRangeDates && styles.cardOutOfRange]}
              >
                <View style={styles.cardHead}>
                  <Text style={styles.title}>{g.pedido} · {g.nombre}</Text>
                  <Text style={styles.badge}>{g.estado || '—'}</Text>
                </View>
                <Text style={styles.sub}>{g.count} registros · {fmtYmdHm(g.fechaUlt)}</Text>
                <TimeChips totals={g.totals} avg={g.avg} />
              </TouchableOpacity>
            );
          } else if (isClienteGroup(item)) {
            const c = item;
            const hasOutOfRangeDates = c.pedidos.some(p =>
              p.rows.some(r => {
                const eventDate = firstOf(r, 'eventdt', 'DATAHORA_COMPL', 'DATA_COMPLETE', 'fecha_fin_op');
                return isDateOutOfRange(eventDate);
              })
            );
            return (
              <TouchableOpacity
                onPress={() => { setSelectedCliente(c); setClientModalVisible(true); setClientModalQuery(''); }}
                style={[styles.card, styles.cardShadow, { flex: 1 }, hasOutOfRangeDates && styles.cardOutOfRange]}
              >
                <View style={styles.cardHead}>
                  <Text style={styles.title}>{c.cliente}</Text>
                </View>
                <Text style={styles.sub}>{c.pedidos.length} pedidos · {c.count} registros · {fmtYmdHm(c.fechaUlt)}</Text>
                <TimeChips totals={c.totals} avg={c.avg} />
              </TouchableOpacity>
            );
          } else if (isCentroGroup(item)) {
            const c = item;
            const hasOutOfRangeDates = c.pedidos.some(p =>
              p.rows.some(r => {
                const eventDate = firstOf(r, 'eventdt', 'DATAHORA_COMPL', 'DATA_COMPLETE', 'fecha_fin_op');
                return isDateOutOfRange(eventDate);
              })
            );
            return (
              <TouchableOpacity
                onPress={() => { setSelectedCentro(c); setCentroListMode('operario'); setCentroModalVisible(true); setCentroModalQuery(''); }}
                style={[styles.card, styles.cardShadow, { flex: 1 }, hasOutOfRangeDates && styles.cardOutOfRange]}
              >
                <View style={styles.cardHead}>
                  <Text style={styles.title}>{c.centro}</Text>
                </View>
                <Text style={styles.sub}>
                  {c.pedidos.length} pedidos · {c.operarios.length} operarios · {c.count} registros · {fmtYmdHm(c.fechaUlt)}
                </Text>
                <TimeChips totals={c.totals} avg={c.avg} />
              </TouchableOpacity>
            );
          } else {
            const o = item;
            const hasOutOfRangeDates = o.pedidos.some(p =>
              p.rows.some(r => {
                const eventDate = firstOf(r, 'eventdt', 'DATAHORA_COMPL', 'DATA_COMPLETE', 'fecha_fin_op');
                return isDateOutOfRange(eventDate);
              })
            );
            return (
              <TouchableOpacity
                onPress={() => { setSelectedOperario(o); setOperarioModalVisible(true); setOperarioModalQuery(''); }}
                style={[styles.card, styles.cardShadow, { flex: 1 }, hasOutOfRangeDates && styles.cardOutOfRange]}
              >
                <View style={styles.cardHead}>
                  <Text style={styles.title}>{o.username}</Text>
                </View>
                <Text style={styles.sub}>{o.pedidos.length} pedidos · {o.count} registros · {fmtYmdHm(o.fechaUlt)}</Text>
                <TimeChips totals={o.totals} avg={o.avg} />
              </TouchableOpacity>
            );
          }
        }}
        contentContainerStyle={{ paddingBottom: 24, paddingHorizontal: 10 }}
        refreshing={refreshing}
        onRefresh={onRefresh}
        ListFooterComponent={
          loading ? <ActivityIndicator style={{ paddingVertical: 12 }} /> :
            <Text style={styles.endText}>Fin de resultados</Text>
        }
        ListEmptyComponent={
          !loading ? <Text style={styles.empty}>Sin resultados en el rango seleccionado.</Text> : null
        }
      />

      {/* ======= MODALES ======= */}
      {/* Cliente */}
      <Modal visible={clientModalVisible} animationType="slide" onRequestClose={() => setClientModalVisible(false)}>
        <View style={styles.modalWrap}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Cliente: {selectedCliente?.cliente || '—'}</Text>
            <Button title="Cerrar" onPress={() => setClientModalVisible(false)} />
          </View>

          {/* Totales del cliente */}
          {selectedCliente && (
            <View style={styles.modalTotals}>
              <Text style={styles.modalTotalsTitle}>Totales del cliente</Text>
              <TimeChips totals={selectedCliente.totals} avg={selectedCliente.avg} />
            </View>
          )}

          <View style={styles.modalFilterRow}>
            <Text style={styles.modalCount}>Pedidos: {((selectedCliente?.pedidos ?? []).filter(p => {
              const q = upper(clientModalQuery);
              return !q || upper(p.pedido).includes(q) || upper(p.estado).includes(q) || upper(p.nombre).includes(q);
            })).length}</Text>
            <View style={[styles.inputGroup, { flex: 1 }]}>
              <Text style={styles.label}>Buscar</Text>
              <TextInput
                value={clientModalQuery}
                onChangeText={setClientModalQuery}
                placeholder="pedido / estado / cliente..."
                style={styles.input}
              />
            </View>
          </View>

          <ScrollView contentContainerStyle={{ padding: 12, gap: 12 }}>
            {(selectedCliente?.pedidos ?? []).filter(p => {
              const q = upper(clientModalQuery);
              return !q || upper(p.pedido).includes(q) || upper(p.estado).includes(q) || upper(p.nombre).includes(q);
            }).map((p, idx) => (
              <TouchableOpacity
                key={`${p.pedido}-${idx}`}
                style={[styles.rowCard, styles.cardShadow]}
                onPress={() => { setSelectedGroup(p); setPedidoModalVisible(true); setPedidoModalQuery(''); }}
              >
                <Text style={styles.rowLine}>PEDIDO: {p.pedido}</Text>
                <Text style={styles.rowLine}>Registros: {p.count} · Estado: {p.estado || '—'}</Text>
                <Text style={styles.rowLine}>Última fecha: {fmtYmdHm(p.fechaUlt) || '—'}</Text>
                <TimeChips totals={p.totals} avg={p.avg} />
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      </Modal>

      {/* Operario (global) */}
      <Modal visible={operarioModalVisible} animationType="slide" onRequestClose={() => setOperarioModalVisible(false)}>
        <View style={styles.modalWrap}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Operario: {selectedOperario?.username || '—'}</Text>
            <Button title="Cerrar" onPress={() => setOperarioModalVisible(false)} />
          </View>

          {selectedOperario && (
            <View style={styles.modalTotals}>
              <Text style={styles.modalTotalsTitle}>Totales del operario</Text>
              <TimeChips totals={selectedOperario.totals} avg={selectedOperario.avg} />
            </View>
          )}

          <View style={styles.modalFilterRow}>
            <Text style={styles.modalCount}>Pedidos: {((selectedOperario?.pedidos ?? []).filter(p => {
              const q = upper(operarioModalQuery);
              return !q || upper(p.pedido).includes(q) || upper(p.nombre).includes(q) || upper(p.estado).includes(q);
            })).length}</Text>
            <View style={[styles.inputGroup, { flex: 1 }]}>
              <Text style={styles.label}>Buscar</Text>
              <TextInput
                value={operarioModalQuery}
                onChangeText={setOperarioModalQuery}
                placeholder="pedido / cliente / estado..."
                style={styles.input}
              />
            </View>
          </View>

          <ScrollView contentContainerStyle={{ padding: 12, gap: 12 }}>
            {(selectedOperario?.pedidos ?? []).filter(p => {
              const q = upper(operarioModalQuery);
              return !q || upper(p.pedido).includes(q) || upper(p.nombre).includes(q) || upper(p.estado).includes(q);
            }).map((p, idx) => (
              <TouchableOpacity
                key={`${p.pedido}-${idx}`}
                style={[styles.rowCard, styles.cardShadow]}
                onPress={() => { setSelectedGroup(p); setPedidoModalVisible(true); setPedidoModalQuery(''); }}
              >
                <Text style={styles.rowLine}>PEDIDO: {p.pedido}</Text>
                <Text style={styles.rowLine}>Registros: {p.count} · Estado: {p.estado || '—'}</Text>
                <Text style={styles.rowLine}>Última fecha: {fmtYmdHm(p.fechaUlt) || '—'}</Text>
                <TimeChips totals={p.totals} avg={p.avg} />
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      </Modal>

      {/* Centro (máquina) */}
      <Modal visible={centroModalVisible} animationType="slide" onRequestClose={() => setCentroModalVisible(false)}>
        <View style={styles.modalWrap}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Centro Maquina: {selectedCentro?.centro || '—'}</Text>
            <Button title="Cerrar" onPress={() => setCentroModalVisible(false)} />
          </View>

          {/* Totales del centro */}
          {selectedCentro && (
            <View style={styles.modalTotals}>
              <Text style={styles.modalTotalsTitle}>Totales del centro Maquina</Text>
              <TimeChips totals={selectedCentro.totals} avg={selectedCentro.avg} />
            </View>
          )}

          {/* Selector Operario | Pedido */}
          <View style={styles.modalInnerBar}>
            <Text style={styles.label}>Listar por</Text>
            <View style={styles.segment}>
              {(['operario', 'pedido'] as const).map((m) => (
                <Pressable
                  key={m}
                  onPress={() => { setCentroListMode(m); setCentroModalQuery(''); }}
                  style={[styles.segmentBtn, centroListMode === m && styles.segmentBtnActive]}
                >
                  <Text style={[styles.segmentText, centroListMode === m && styles.segmentTextActive]}>
                    {m === 'operario' ? 'Operario' : 'Pedido'}
                  </Text>
                </Pressable>
              ))}
            </View>
          </View>

          <View style={styles.modalFilterRow}>
            <Text style={styles.modalCount}>
              {centroListMode === 'operario'
                ? `Operarios: ${((selectedCentro?.operarios ?? []).filter(o => {
                  const q = upper(centroModalQuery);
                  return !q || upper(o.username).includes(q);
                })).length}`
                : `Pedidos: ${((selectedCentro?.pedidos ?? []).filter(p => {
                  const q = upper(centroModalQuery);
                  return !q || upper(p.pedido).includes(q) || upper(p.nombre).includes(q);
                })).length}`}
            </Text>
            <View style={[styles.inputGroup, { flex: 1 }]}>
              <Text style={styles.label}>Buscar</Text>
              <TextInput
                value={centroModalQuery}
                onChangeText={setCentroModalQuery}
                placeholder={centroListMode === 'operario' ? 'operario...' : 'pedido / cliente...'}
                style={styles.input}
              />
            </View>
          </View>

          <ScrollView contentContainerStyle={{ padding: 12, gap: 12 }}>
            {centroListMode === 'operario'
              ? (selectedCentro?.operarios ?? []).filter(o => {
                const q = upper(centroModalQuery);
                return !q || upper(o.username).includes(q);
              }).map((o, idx) => (
                <TouchableOpacity
                  key={`${o.username ?? '—'}-${idx}`}
                  style={[styles.rowCard, styles.cardShadow]}
                  onPress={() => {
                    setCentroOperarioSel({ centro: selectedCentro?.centro ?? '—', ...o });
                    setCentroOperarioModalVisible(true);
                    setCentroOperarioModalQuery('');
                  }}
                >
                  <Text style={styles.rowLine}>OPERARIO: {o.username ?? '—'}</Text>
                  <Text style={styles.rowLine}>Pedidos: {o.pedidos?.length ?? 0} · Registros: {o.count ?? 0}</Text>
                  <Text style={styles.rowLine}>Última fecha: {fmtYmdHm(o.fechaUlt) || '—'}</Text>
                  <TimeChips totals={o.totals} avg={o.avg} />
                </TouchableOpacity>
              ))
              : (selectedCentro?.pedidos ?? []).filter(p => {
                const q = upper(centroModalQuery);
                return !q || upper(p.pedido).includes(q) || upper(p.nombre).includes(q);
              }).map((p, idx) => (
                <TouchableOpacity
                  key={`${p.pedido}-${idx}`}
                  style={[styles.rowCard, styles.cardShadow]}
                  onPress={() => { setSelectedGroup(p); setPedidoModalVisible(true); setPedidoModalQuery(''); }}
                >
                  <Text style={styles.rowLine}>PEDIDO: {p.pedido}</Text>
                  <Text style={styles.rowLine}>Registros: {p.count} · Estado: {p.estado || '—'}</Text>
                  <Text style={styles.rowLine}>Última fecha: {fmtYmdHm(p.fechaUlt) || '—'}</Text>
                  <TimeChips totals={p.totals} avg={p.avg} />
                </TouchableOpacity>
              ))}
          </ScrollView>
        </View>
      </Modal>

      {/* Centro → Operario */}
      <Modal
        visible={centroOperarioModalVisible}
        animationType="slide"
        onRequestClose={() => setCentroOperarioModalVisible(false)}
      >
        <View style={styles.modalWrap}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>
              Centro: {centroOperarioSel?.centro || '—'} · Operario: {centroOperarioSel?.username || '—'}
            </Text>
            <Button title="Cerrar" onPress={() => setCentroOperarioModalVisible(false)} />
          </View>

          {centroOperarioSel && (
            <View style={styles.modalTotals}>
              <Text style={styles.modalTotalsTitle}>Totales (centro Maquina → operario)</Text>
              <TimeChips totals={centroOperarioSel.totals} avg={centroOperarioSel.avg} />
            </View>
          )}

          <View style={styles.modalFilterRow}>
            <Text style={styles.modalCount}>Pedidos: {(centroOperarioSel?.pedidos ?? []).filter(p => {
              const q = upper(centroOperarioModalQuery);
              return !q || upper(p.pedido).includes(q) || upper(p.nombre).includes(q);
            }).length}</Text>
            <View style={[styles.inputGroup, { flex: 1 }]}>
              <Text style={styles.label}>Buscar</Text>
              <TextInput
                value={centroOperarioModalQuery}
                onChangeText={setCentroOperarioModalQuery}
                placeholder="pedido / cliente..."
                style={styles.input}
              />
            </View>
          </View>

          <ScrollView contentContainerStyle={{ padding: 12, gap: 12 }}>
            {(centroOperarioSel?.pedidos ?? []).filter(p => {
              const q = upper(centroOperarioModalQuery);
              return !q || upper(p.pedido).includes(q) || upper(p.nombre).includes(q);
            }).map((p, idx) => (
              <TouchableOpacity
                key={`${p.pedido}-${idx}`}
                style={[styles.rowCard, styles.cardShadow]}
                onPress={() => { setSelectedGroup(p); setPedidoModalVisible(true); setPedidoModalQuery(''); }}
              >
                <Text style={styles.rowLine}>PEDIDO: {p.pedido}</Text>
                <Text style={styles.rowLine}>Registros: {p.count} · Estado: {p.estado || '—'}</Text>
                <Text style={styles.rowLine}>Última fecha: {fmtYmdHm(p.fechaUlt) || '—'}</Text>
                <TimeChips totals={p.totals} avg={p.avg} />
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      </Modal>

      {/* Pedido (detalle) */}
      <Modal visible={pedidoModalVisible} animationType="slide" onRequestClose={() => setPedidoModalVisible(false)}>
        <View style={styles.modalWrap}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>
              Pedido {selectedGroup?.pedido} · {selectedGroup?.nombre}
            </Text>
            <Button title="Cerrar" onPress={() => setPedidoModalVisible(false)} />
          </View>

          {/* Totales del pedido */}
          {selectedGroup && (
            <View style={styles.modalTotals}>
              <Text style={styles.modalTotalsTitle}>Totales del pedido</Text>
              <TimeChips totals={selectedGroup.totals} avg={selectedGroup.avg} />
            </View>
          )}

          <View style={styles.modalFilterRow}>
            <Text style={styles.modalCount}>Registros: {(selectedGroup?.rows ?? []).filter(r => {
              const q = upper(pedidoModalQuery);
              return !q ||
                upper(firstOf(r, 'username', 'USERNAME')).includes(q) ||
                upper(firstOf(r, 'centro_trabajo', 'CENTRO_TRABAJO')).includes(q) ||
                upper(firstOf(r, 'VIDRIO')).includes(q) ||
                upper(firstOf(r, 'PRODUCTO')).includes(q) ||
                upper(firstOf(r, 'pedido', 'PEDIDO')).includes(q) ||
                String(firstOf(r, 'linea')).includes(q);
            }).length}</Text>
            <View style={[styles.inputGroup, { flex: 1 }]}>
              <Text style={styles.label}>Buscar</Text>
              <TextInput
                value={pedidoModalQuery}
                onChangeText={setPedidoModalQuery}
                placeholder="operario / centro / vidrio / producto / pedido / línea..."
                style={styles.input}
              />
            </View>
          </View>

          <ScrollView contentContainerStyle={{ padding: 12, gap: 12 }}>
            {(selectedGroup?.rows ?? []).filter(r => {
              const q = upper(pedidoModalQuery);
              return !q ||
                upper(firstOf(r, 'username', 'USERNAME')).includes(q) ||
                upper(firstOf(r, 'centro_trabajo', 'CENTRO_TRABAJO')).includes(q) ||
                upper(firstOf(r, 'VIDRIO')).includes(q) ||
                upper(firstOf(r, 'PRODUCTO')).includes(q) ||
                upper(firstOf(r, 'pedido', 'PEDIDO')).includes(q) ||
                String(firstOf(r, 'linea')).includes(q);
            }).map((r, idx) => {
              const USERNAME = firstOf(r, 'username', 'USERNAME');
              const CENTRO_TRABAJO = firstOf(r, 'centro_trabajo', 'CENTRO_TRABAJO');
              const N_VIDRIO = firstOf(r, 'N_VIDRIO');
              const VIDRIO = firstOf(r, 'VIDRIO');
              const LINEA = firstOf(r, 'linea');
              const MEDIDA_X = firstOf(r, 'MEDIDA_X', 'MEDIDA X');
              const MEDIDA_Y = firstOf(r, 'MEDIDA_Y', 'MEDIDA Y');
              const PROGR = firstOf(r, 'PROGR');
              const PRODUCTO = firstOf(r, 'PRODUCTO');

              // fechas y tiempos unitarios
              const EVENTDT = firstOf(r, 'eventdt');
              const FINI = firstOf(r, 'fecha_inicio_op');
              const FFIN = firstOf(r, 'fecha_fin_op', 'DATAHORA_COMPL'); // cae a DATAHORA_COMPL si hace falta
              const FROT = firstOf(r, 'fecha_rotura', 'DATEBROKEN');
              const FPED = firstOf(r, 'fecha_pedido');
              const FENT = firstOf(r, 'fecha_entrega_prog');

              const TT = numOf(r, 't_trabajo_seg');
              const TE = numOf(r, 't_espera_prev_maquina_seg');
              const TO = numOf(r, 't_entre_operaciones_seg');
              const TDP = numOf(r, 't_desde_pedido_seg');
              const THE = numOf(r, 't_hasta_entrega_prog_seg');
              const TCP = numOf(r, 't_ciclo_pieza_total_seg');

              const R1 = norm(firstOf(r, 'RAZON_QUEBRA1'));
              const R2 = norm(firstOf(r, 'RAZON_QUEBRA2'));
              const R3 = norm(firstOf(r, 'RAZON_QUEBRA3'));
              const T1 = norm(firstOf(r, 'TEXT1'));
              const showReasons = !!(R1 || R2 || R3 || T1);
              // Verificar si esta fila específica está fuera del rango
              const eventDate = firstOf(r, 'eventdt', 'DATAHORA_COMPL', 'DATA_COMPLETE', 'fecha_fin_op');
              const isOutOfRange = isDateOutOfRange(eventDate);
              return (
                <View key={idx} style={[styles.rowCard, styles.cardShadow, isOutOfRange && styles.cardOutOfRange]}>
                  <Text style={styles.rowLine}>USERNAME: {USERNAME ?? '—'}</Text>
                  <Text style={styles.rowLine}>CENTRO TRABAJO: {CENTRO_TRABAJO ?? '—'}</Text>
                  <Text style={styles.rowLine}>N VIDRIO: {N_VIDRIO ?? '—'} · VIDRIO: {VIDRIO ?? '—'}</Text>
                  <Text style={styles.rowLine}>LINEA: {LINEA ?? '—'}</Text>
                  <Text style={styles.rowLine}>MEDIDA X: {MEDIDA_X ?? '—'} · MEDIDA Y: {MEDIDA_Y ?? '—'}</Text>
                  <Text style={styles.rowLine}>PROGR: {PROGR ?? '—'}</Text>
                  <Text style={styles.rowLine}>PRODUCTO: {PRODUCTO ?? '—'}</Text>

                  {/* fechas unitarias */}
                  <View style={styles.unitTimes}>
                    <Text style={styles.unitTitle}>Fechas</Text>
                    <Text style={styles.unitLine}>eventdt: {EVENTDT ? fmtYmdHm(String(EVENTDT)) : '—'}</Text>
                    <Text style={styles.unitLine}>inicio op: {FINI ? fmtYmdHm(String(FINI)) : '—'}</Text>
                    <Text style={styles.unitLine}>fin op: {FFIN ? fmtYmdHm(String(FFIN)) : '—'}</Text>
                    <Text style={styles.unitLine}>rotura: {FROT ? fmtYmdHm(String(FROT)) : '—'}</Text>
                    <Text style={styles.unitLine}>pedido: {FPED ? fmtYmdHm(String(FPED)) : '—'}</Text>
                    <Text style={styles.unitLine}>entrega prog: {FENT ? fmtYmdHm(String(FENT)) : '—'}</Text>
                  </View>

                  {/* tiempos unitarios */}
                  <View style={styles.timeChipsWrap}>
                    <View style={styles.timeChip}><Text style={styles.timeKey}>Trabajo</Text><Text style={styles.timeVal}>{fmtDur(TT)}</Text></View>
                    <View style={styles.timeChip}><Text style={styles.timeKey}>Espera prev.</Text><Text style={styles.timeVal}>{fmtDur(TE)}</Text></View>
                    <View style={styles.timeChip}><Text style={styles.timeKey}>Entre ops</Text><Text style={styles.timeVal}>{fmtDur(TO)}</Text></View>
                    <View style={styles.timeChip}><Text style={styles.timeKey}>Desde pedido</Text><Text style={styles.timeVal}>{fmtDur(TDP)}</Text></View>
                    <View style={styles.timeChip}><Text style={styles.timeKey}>Hasta entrega</Text><Text style={styles.timeVal}>{fmtDur(THE)}</Text></View>
                    <View style={styles.timeChip}><Text style={styles.timeKey}>Ciclo pieza</Text><Text style={styles.timeVal}>{fmtDur(TCP)}</Text></View>
                  </View>

                  {showReasons && <View style={{ height: 6 }} />}
                  {!!R1 && <Text style={styles.rowLine}>RAZON QUEBRA1: {R1}</Text>}
                  {!!R2 && <Text style={styles.rowLine}>RAZON QUEBRA2: {R2}</Text>}
                  {!!R3 && <Text style={styles.rowLine}>RAZON QUEBRA3: {R3}</Text>}
                  {!!T1 && <Text style={styles.rowLine}>TEXT1: {T1}</Text>}
                </View>
              );
            })}
          </ScrollView>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

/** ===================== Estilos ===================== */
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f3f4f6' },

  // filtros
  filters: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 8,
    padding: 10,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  inputGroup: { width: 150 },
  label: { fontSize: 12, color: '#6b7280', marginBottom: 4 },
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
  btnDisabled: { opacity: 0.6 },
  btnText: { color: '#fff', fontWeight: '700' },
  errorText: { color: '#b91c1c', paddingHorizontal: 12, paddingTop: 6 },

  // panel global tiempos
  globalPanel: {
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
    paddingHorizontal: 10,
    paddingVertical: 10,
  },
  globalTitle: { fontSize: 14, fontWeight: '800', color: '#111827', marginBottom: 6 },

  // header de lista
  listHeader: {
    paddingHorizontal: 10,
    paddingTop: 10,
    paddingBottom: 8,
    backgroundColor: '#f3f4f6',
  },
  listHeaderText: { color: '#374151' },
  bold: { fontWeight: '800' },

  // columnas
  columnWrap: { gap: 12, paddingVertical: 4 },

  // tarjetas
  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    marginVertical: 6,
  },
  cardShadow: {
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 3,
  },
  cardHead: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 },
  title: { fontSize: 16, fontWeight: '700', color: '#2e78b7' },
  badge: {
    backgroundColor: '#eff6ff',
    color: '#1d4ed8',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
    overflow: 'hidden',
  },
  sub: { color: '#6b7280', marginBottom: 4 },

  // chips de tiempo
  timeChipsWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 8,
  },
  timeChip: {
    backgroundColor: '#f9fafb',
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  timeKey: { fontSize: 12, color: '#374151', fontWeight: '700' },
  timeVal: { fontSize: 12, color: '#1f2937' },

  // vacíos / footer
  empty: { textAlign: 'center', color: '#6b7280', marginTop: 20 },
  endText: { textAlign: 'center', color: '#9ca3af', paddingVertical: 12 },

  // modales
  modalWrap: { flex: 1, backgroundColor: '#f3f4f6' },
  modalHeader: {
    padding: 12,
    paddingTop: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottomColor: '#e5e7eb',
    borderBottomWidth: 1,
    backgroundColor: '#fff',
  },
  modalTitle: { color: '#111827', fontSize: 18, fontWeight: '800' },
  rowCard: {
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 12,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  rowLine: { color: '#111827', marginBottom: 2 },

  // totales en modal
  modalTotals: {
    backgroundColor: '#fff',
    borderBottomColor: '#e5e7eb',
    borderBottomWidth: 1,
    paddingHorizontal: 12,
    paddingTop: 8,
    paddingBottom: 8,
  },
  modalTotalsTitle: { fontWeight: '800', color: '#111827', marginBottom: 6 },

  // filtros dentro de modales
  modalInnerBar: {
    paddingHorizontal: 12,
    paddingTop: 10,
    paddingBottom: 4,
    backgroundColor: '#fff',
    borderBottomColor: '#e5e7eb',
    borderBottomWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  modalFilterRow: {
    paddingHorizontal: 12,
    paddingTop: 10,
    paddingBottom: 8,
    backgroundColor: '#fff',
    borderBottomColor: '#e5e7eb',
    borderBottomWidth: 1,
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 8,
  },
  modalCount: { fontWeight: '700', color: '#374151', marginRight: 8 },

  // segment (toggles)
  segment: { flexDirection: 'row', backgroundColor: '#e5e7eb', borderRadius: 10, padding: 4 },
  segmentBtn: { paddingVertical: 6, paddingHorizontal: 12, borderRadius: 8 },
  segmentBtnActive: { backgroundColor: '#2e78b7' },
  segmentText: { color: '#1f2937', fontWeight: '600' },
  segmentTextActive: { color: '#fff', fontWeight: '700' },

  // unit times block
  unitTimes: {
    marginTop: 6,
    borderTopWidth: 1,
    borderTopColor: '#f3f4f6',
    paddingTop: 6,
  },
  unitTitle: { fontWeight: '800', color: '#374151', marginBottom: 2 },
  unitLine: { color: '#4b5563', fontSize: 12, marginBottom: 1 },

  cardOutOfRange: {
    backgroundColor: '#fffbeb', // fondo amarillo claro
    borderColor: '#f59e0b', // borde amarillo
  },


});
