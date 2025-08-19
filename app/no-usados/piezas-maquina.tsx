// app/optima/piezas-maquina.tsx
import Ionicons from '@expo/vector-icons/Ionicons';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Button,
  FlatList,
  Modal,
  Pressable,
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
  PEDIDO?: string;
  NOMBRE?: string;          // cliente
  ESTADO?: string;
  DATAHORA_COMPL?: string;
  DATA_COMPLETE?: string;
  USERNAME?: string;        // operario
  CENTRO_TRABAJO?: string;  // máquina
  [key: string]: any;
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
};

// Cliente
type ClienteGroup = {
  kind: 'cliente';
  cliente: string;
  count: number;
  fechaUlt: string | null;
  pedidos: Group[];
};

// Operario dentro de un centro (para modal de centro)
type CentroOperario = {
  username: string;
  count: number;
  fechaUlt: string | null;
  pedidos: Group[];
};

// Centro de trabajo (máquina)
type CentroGroup = {
  kind: 'centro';
  centro: string;
  count: number;
  fechaUlt: string | null;
  pedidos: Group[];
  operarios: CentroOperario[];
};

// Operario (global)
type OperarioGroup = {
  kind: 'operario';
  username: string;
  count: number;
  fechaUlt: string | null;
  pedidos: Group[];
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
const nowMs = () => (typeof performance !== 'undefined' && performance.now ? performance.now() : Date.now());

const validYmd = (s: string) => /^\d{4}-\d{2}-\d{2}$/.test(s) && !Number.isNaN(new Date(s + 'T00:00:00').getTime());

/** Guards */
const isGroup = (x: VisibleItem): x is Group => (x as Group).kind === 'pedido';
const isClienteGroup = (x: VisibleItem): x is ClienteGroup => (x as ClienteGroup).kind === 'cliente';
const isCentroGroup = (x: VisibleItem): x is CentroGroup => (x as CentroGroup).kind === 'centro';
const isOperarioGroup = (x: VisibleItem): x is OperarioGroup => (x as OperarioGroup).kind === 'operario';

/** Agrupar por pedido */
const groupByPedido = (rows: Row[]): Group[] => {
  const map = new Map<string, Row[]>();
  for (const r of rows) {
    const pedido = norm(firstOf(r, 'PEDIDO'));
    if (!pedido) continue;
    if (!map.has(pedido)) map.set(pedido, []);
    map.get(pedido)!.push(r);
  }

  const out: Group[] = [];
  for (const [pedido, arr] of map) {
    const nombre = norm(firstOf(arr[0], 'NOMBRE')) || '—';
    const estados = new Set(arr.map((x) => upper(firstOf(x, 'ESTADO'))).filter(Boolean));
    const estado = estados.size === 0 ? '' : (estados.size === 1 ? [...estados][0] : 'Mixto');
    const maxMs = Math.max(
      ...arr.map((r) => {
        const a = parseMillis(norm(firstOf(r, 'DATAHORA_COMPL', 'DATAHORA COMPL')));
        const b = parseMillis(norm(firstOf(r, 'DATA_COMPLETE', 'DATA COMPLETE')));
        return Number.isFinite(a) || Number.isFinite(b) ? Math.max(a || -Infinity, b || -Infinity) : -Infinity;
      })
    );
    const fechaUlt = Number.isFinite(maxMs) ? new Date(maxMs).toISOString() : null;
    out.push({ kind: 'pedido', pedido, nombre, count: arr.length, estado, fechaUlt, rows: arr });
  }

  out.sort((a, b) => (parseMillis(b.fechaUlt) || 0) - (parseMillis(a.fechaUlt) || 0));
  return out;
};

/** Agrupar por cliente */
const groupByCliente = (rows: Row[]): ClienteGroup[] => {
  const map = new Map<string, Row[]>();
  for (const r of rows) {
    const cliente = norm(firstOf(r, 'NOMBRE'));
    if (!cliente) continue;
    if (!map.has(cliente)) map.set(cliente, []);
    map.get(cliente)!.push(r);
  }

  const out: ClienteGroup[] = [];
  for (const [cliente, arr] of map) {
    const pedidos = groupByPedido(arr);
    const count = arr.length;
    const fechaUlt = pedidos.length ? pedidos[0].fechaUlt : null;
    out.push({ kind: 'cliente', cliente, count, fechaUlt, pedidos });
  }
  out.sort((a, b) => (parseMillis(b.fechaUlt) || 0) - (parseMillis(a.fechaUlt) || 0));
  return out;
};

/** Agrupar por operario (global) */
const groupByOperario = (rows: Row[]): OperarioGroup[] => {
  const map = new Map<string, Row[]>();
  for (const r of rows) {
    const user = norm(firstOf(r, 'USERNAME'));
    if (!user) continue;
    if (!map.has(user)) map.set(user, []);
    map.get(user)!.push(r);
  }
  const out: OperarioGroup[] = [];
  for (const [username, arr] of map) {
    const pedidos = groupByPedido(arr);
    const count = arr.length;
    const fechaUlt = pedidos.length ? pedidos[0].fechaUlt : null;
    out.push({ kind: 'operario', username, count, fechaUlt, pedidos });
  }
  out.sort((a, b) => (parseMillis(b.fechaUlt) || 0) - (parseMillis(a.fechaUlt) || 0));
  return out;
};

/** Agrupar por centro (máquina) */
const groupByCentro = (rows: Row[]): CentroGroup[] => {
  const map = new Map<string, Row[]>();
  for (const r of rows) {
    const centro = norm(firstOf(r, 'CENTRO_TRABAJO', 'CENTRO TRABAJO'));
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
      const u = norm(firstOf(r, 'USERNAME'));
      if (!u) continue;
      if (!byUser.has(u)) byUser.set(u, []);
      byUser.get(u)!.push(r);
    }
    const operarios: CentroOperario[] = [];
    for (const [username, subarr] of byUser) {
      const peds = groupByPedido(subarr);
      const fechaUlt = peds.length ? peds[0].fechaUlt : null;
      operarios.push({ username, count: subarr.length, fechaUlt, pedidos: peds });
    }
    operarios.sort((a, b) => (parseMillis(b.fechaUlt) || 0) - (parseMillis(a.fechaUlt) || 0));

    const count = arr.length;
    const fechaUlt = pedidos.length ? pedidos[0].fechaUlt : null;
    out.push({ kind: 'centro', centro, count, fechaUlt, pedidos, operarios });
  }
  out.sort((a, b) => (parseMillis(b.fechaUlt) || 0) - (parseMillis(a.fechaUlt) || 0));
  return out;
};

/** ===================== Componente ===================== */
const ENDPOINT = `${API_URL}/control-optima/piezas-maquina`;
const DEFAULT_FROM = '2025-01-01';
const DEFAULT_TO = toYmd(new Date());

export default function PiezasMaquina() {
  // ---- encabezado global
  const [userName, setUserName] = useState<string>(''); // setear desde auth/context
  const [userRole, setUserRole] = useState<string>(''); // setear desde auth/context
  const [serverReachable, setServerReachable] = useState<boolean>(true);
  const [userModalVisible, setUserModalVisible] = useState(false);
  const [modalUser, setModalUser] = useState<{ userName?: string; role?: string }>({});

  const { width } = useWindowDimensions();
  const numColumns = width >= 1024 ? 3 : width >= 700 ? 2 : 1;

  // Fechas por defecto
  const [from, setFrom] = useState<string>(DEFAULT_FROM);
  const [to, setTo] = useState<string>(DEFAULT_TO);
  const [dateError, setDateError] = useState<string>('');

  // Estado de consulta/paginación
  const [page, setPage] = useState<number>(1);
  const [pageSize] = useState<number>(1000);
  const [rows, setRows] = useState<Row[]>([]);
  const [totalRecords, setTotalRecords] = useState<number>(0);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [reachedEnd, setReachedEnd] = useState(false);
  const [query, setQuery] = useState('');

  // Anti-bucle / anti-duplicados
  const inFlightAbort = useRef<AbortController | null>(null);
  const lastReqKeyRef = useRef<string>('');
  const lastSuccessKeyRef = useRef<string>('');
  const endReachedTsRef = useRef<number>(0); // throttle onEndReached

  // Tiempos por proceso
  const [timings, setTimings] = useState<{
    fetchMs: number;
    jsonMs: number;
    groupPedidoMs: number;
    groupClienteMs: number;
    groupCentroMs: number;
    groupOperarioMs: number;
    totalMs: number;
  }>({
    fetchMs: 0,
    jsonMs: 0,
    groupPedidoMs: 0,
    groupClienteMs: 0,
    groupCentroMs: 0,
    groupOperarioMs: 0,
    totalMs: 0,
  });

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
  const buildReqKey = (p: number) =>
    JSON.stringify({ from, to, page: p, pageSize, query: query.trim().toUpperCase() });

  /** ===== reset con filtros ===== */
  const applyFilters = useCallback(() => {
    if (!validateDates()) return;
    setPage(1);
    setReachedEnd(false);
    setRefreshing(true);
    fetchPage(1, true);
  }, [validateDates]);

  /** ===== carga inicial ===== */
  useEffect(() => {
    // primera carga
    fetchPage(1, true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /** ===== debounce de búsqueda server-side ===== */
  useEffect(() => {
    const t = setTimeout(() => {
      if (!validateDates()) return;
      setPage(1);
      setReachedEnd(false);
      setRefreshing(true);
      fetchPage(1, true);
    }, 500);
    return () => clearTimeout(t);
  }, [query, validateDates]);

  /** ===== fetch con anti-bucle y timings ===== */
  const fetchPage = useCallback(
    async (pageToLoad: number, replace = false) => {
      if (!validateDates()) return;
      if (loading) return;

      // Anti-duplicado: no repitas misma petición que ya está corriendo o ya fue un éxito reciente
      const reqKey = buildReqKey(pageToLoad);
      if (reqKey === lastReqKeyRef.current) return;               // ya en curso
      if (!replace && reqKey === lastSuccessKeyRef.current) return; // ya exitosa y no es replace

      // Aborta petición anterior (si existe)
      try { inFlightAbort.current?.abort(); } catch (_) {}
      const controller = new AbortController();
      inFlightAbort.current = controller;

      setLoading(true);

      const t0 = nowMs();
      try {
        const params = new URLSearchParams({
          page: String(pageToLoad),
          pageSize: String(pageSize),
          from,
          to,
          search: query.trim(),
        });

        // Solo marcar custom si el rango difiere del default → evita el camino de UNION problemático
        if (!(from === DEFAULT_FROM && to === DEFAULT_TO)) {
          params.set('scope', 'custom');
        }

        const url = `${ENDPOINT}?${params.toString()}`;
        lastReqKeyRef.current = reqKey;

        const tFetch0 = nowMs();
        const res = await fetch(url, { signal: controller.signal });
        const tFetch1 = nowMs();

        setServerReachable(res.ok);

        const tJson0 = nowMs();
        const data = await res.json();
        const tJson1 = nowMs();

        if (!res.ok) {
          const msg = (data as any)?.message || `HTTP ${res.status}`;
          throw new Error(msg);
        }

        const newItems = Array.isArray(data.items) ? (data.items as Row[]) : [];
        const totalFromApi = Number(data.total) || 0;

        // merge + agrupaciones con timings
        const merged = replace ? newItems : [...rows, ...newItems];

        const tg0 = nowMs();
        const gPedidos = groupByPedido(merged);
        const tg1 = nowMs();
        const gClientes = groupByCliente(merged);
        const tg2 = nowMs();
        const gCentros = groupByCentro(merged);
        const tg3 = nowMs();
        const gOperarios = groupByOperario(merged);
        const tg4 = nowMs();

        setRows(merged);
        setGroupsPedido(gPedidos);
        setGroupsCliente(gClientes);
        setGroupsCentro(gCentros);
        setGroupsOperario(gOperarios);

        // total
        setTotalRecords(totalFromApi > 0 ? totalFromApi : merged.length);

        // reachedEnd: preferir total si viene del backend
        let end = false;
        if (totalFromApi > 0) {
          end = pageToLoad * pageSize >= totalFromApi;
        } else {
          end = newItems.length < pageSize;
        }
        setReachedEnd(end);

        // avanzar page actual
        setPage(pageToLoad);

        // guardar claves anti-bucle
        lastSuccessKeyRef.current = reqKey;

        // timings
        setTimings({
          fetchMs: Math.max(0, tFetch1 - tFetch0),
          jsonMs: Math.max(0, tJson1 - tJson0),
          groupPedidoMs: Math.max(0, tg1 - tg0),
          groupClienteMs: Math.max(0, tg2 - tg1),
          groupCentroMs: Math.max(0, tg3 - tg2),
          groupOperarioMs: Math.max(0, tg4 - tg3),
          totalMs: Math.max(0, nowMs() - t0),
        });
      } catch (e: any) {
        if (e?.name === 'AbortError') {
          // ignorar abortos intencionales
        } else {
          console.error('[piezas-maquina] fetchPage error:', e);
          setServerReachable(false);
          if (replace) {
            setRows([]);
            setGroupsPedido([]);
            setGroupsCliente([]);
            setGroupsCentro([]);
            setGroupsOperario([]);
            setTotalRecords(0);
          }
        }
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [from, to, pageSize, query, rows, validateDates, loading]
  );

  /** ===== pull-to-refresh ===== */
  const onRefresh = useCallback(() => {
    applyFilters();
  }, [applyFilters]);

  /** ===== infinite scroll con throttle ===== */
  const onEndReached = useCallback(() => {
    if (loading || refreshing || reachedEnd) return;

    // throttle para onEndReached (evita disparos múltiples seguidos)
    const now = Date.now();
    if (now - endReachedTsRef.current < 600) return;
    endReachedTsRef.current = now;

    fetchPage(page + 1);
  }, [loading, refreshing, reachedEnd, page, fetchPage]);

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

  // Key extractor
  const getKey = (item: VisibleItem) => {
    if (isGroup(item)) return `ped-${item.pedido}`;
    if (isClienteGroup(item)) return `cli-${item.cliente}`;
    if (isCentroGroup(item)) return `ctr-${item.centro}`;
    if (isOperarioGroup(item)) return `opr-${item.username}`;
    return Math.random().toString(36).slice(2);
  };

  const loadedPct = totalRecords > 0 ? Math.min(100, (rows.length / totalRecords) * 100) : 0;

  /** ===================== Render ===================== */
  return (
    <View style={styles.container}>
      {/* ======= App Header ======= */}
      <AppHeader
        titleOverride="Terminales · Piezas por Maquinas"
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
            placeholder="Buscar (servidor): pedido, cliente, centro, operario…"
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
                onPress={() => setGroupMode(m)}
                style={[styles.segmentBtn, groupMode === m && styles.segmentBtnActive]}
              >
                <Text style={[styles.segmentText, groupMode === m && styles.segmentTextActive]}>
                  {m === 'pedido' ? 'Pedido' : m === 'cliente' ? 'Cliente' : m === 'centro' ? 'Centro' : 'Operario'}
                </Text>
              </Pressable>
            ))}
          </View>
        </View>

        <Pressable
          style={[styles.btn, (!validYmd(from) || !validYmd(to)) && styles.btnDisabled]}
          onPress={applyFilters}
          disabled={!validYmd(from) || !validYmd(to)}
        >
          <Ionicons name="checkmark-done-outline" size={20} color="#fff" />
          <Text style={styles.btnText}>Aplicar cambios</Text>
        </Pressable>
      </View>
      {!!dateError && <Text style={styles.errorText}>{dateError}</Text>}

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
            <View style={styles.progressBar}>
              <View style={[styles.progressFill, { width: `${loadedPct}%` }]} />
            </View>
            <View style={styles.timingsRow}>
              <Text style={styles.timingChip}>⏱ fetch {Math.round(timings.fetchMs)} ms</Text>
              <Text style={styles.timingChip}>json {Math.round(timings.jsonMs)} ms</Text>
              <Text style={styles.timingChip}>pedido {Math.round(timings.groupPedidoMs)} ms</Text>
              <Text style={styles.timingChip}>cliente {Math.round(timings.groupClienteMs)} ms</Text>
              <Text style={styles.timingChip}>centro {Math.round(timings.groupCentroMs)} ms</Text>
              <Text style={styles.timingChip}>operario {Math.round(timings.groupOperarioMs)} ms</Text>
              <Text style={[styles.timingChip, styles.timingChipStrong]}>total {Math.round(timings.totalMs)} ms</Text>
            </View>
          </View>
        }
        renderItem={({ item }) => {
          if (isGroup(item)) {
            const g = item;
            return (
              <TouchableOpacity
                onPress={() => { setSelectedGroup(g); setPedidoModalVisible(true); setPedidoModalQuery(''); }}
                style={[styles.card, styles.cardShadow, { flex: 1 }]}
              >
                <View style={styles.cardHead}>
                  <Text style={styles.title}>{g.pedido} · {g.nombre}</Text>
                  <Text style={styles.badge}>{g.estado || '—'}</Text>
                </View>
                <Text style={styles.sub}>{g.count} registros · {fmtYmdHm(g.fechaUlt)}</Text>
              </TouchableOpacity>
            );
          } else if (isClienteGroup(item)) {
            const c = item;
            return (
              <TouchableOpacity
                onPress={() => { setSelectedCliente(c); setClientModalVisible(true); setClientModalQuery(''); }}
                style={[styles.card, styles.cardShadow, { flex: 1 }]}
              >
                <View style={styles.cardHead}>
                  <Text style={styles.title}>{c.cliente}</Text>
                </View>
                <Text style={styles.sub}>{c.pedidos.length} pedidos · {c.count} registros · {fmtYmdHm(c.fechaUlt)}</Text>
              </TouchableOpacity>
            );
          } else if (isCentroGroup(item)) {
            const c = item;
            return (
              <TouchableOpacity
                onPress={() => { setSelectedCentro(c); setCentroListMode('operario'); setCentroModalVisible(true); setCentroModalQuery(''); }}
                style={[styles.card, styles.cardShadow, { flex: 1 }]}
              >
                <View style={styles.cardHead}>
                  <Text style={styles.title}>{c.centro}</Text>
                </View>
                <Text style={styles.sub}>
                  {c.pedidos.length} pedidos · {c.operarios.length} operarios · {c.count} registros · {fmtYmdHm(c.fechaUlt)}
                </Text>
              </TouchableOpacity>
            );
          } else {
            const o = item;
            return (
              <TouchableOpacity
                onPress={() => { setSelectedOperario(o); setOperarioModalVisible(true); setOperarioModalQuery(''); }}
                style={[styles.card, styles.cardShadow, { flex: 1 }]}
              >
                <View style={styles.cardHead}>
                  <Text style={styles.title}>{o.username}</Text>
                </View>
                <Text style={styles.sub}>{o.pedidos.length} pedidos · {o.count} registros · {fmtYmdHm(o.fechaUlt)}</Text>
              </TouchableOpacity>
            );
          }
        }}
        contentContainerStyle={{ paddingBottom: 24, paddingHorizontal: 10 }}
        onEndReachedThreshold={0.4}
        onEndReached={onEndReached}
        refreshing={refreshing}
        onRefresh={onRefresh}
        ListFooterComponent={
          loading ? <ActivityIndicator style={{ paddingVertical: 12 }} /> :
          reachedEnd ? <Text style={styles.endText}>No hay más resultados</Text> : null
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
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      </Modal>

      {/* Centro (máquina) */}
      <Modal visible={centroModalVisible} animationType="slide" onRequestClose={() => setCentroModalVisible(false)}>
        <View style={styles.modalWrap}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Centro: {selectedCentro?.centro || '—'}</Text>
            <Button title="Cerrar" onPress={() => setCentroModalVisible(false)} />
          </View>

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

          <View style={styles.modalFilterRow}>
            <Text style={styles.modalCount}>Registros: {(selectedGroup?.rows ?? []).filter(r => {
              const q = upper(pedidoModalQuery);
              return !q ||
                upper(firstOf(r, 'USERNAME')).includes(q) ||
                upper(firstOf(r, 'CENTRO_TRABAJO', 'CENTRO TRABAJO')).includes(q) ||
                upper(firstOf(r, 'VIDRIO')).includes(q) ||
                upper(firstOf(r, 'PRODUCTO')).includes(q) ||
                upper(firstOf(r, 'PEDIDO')).includes(q) ||
                String(firstOf(r, 'LINEA')).includes(q);
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
                upper(firstOf(r, 'USERNAME')).includes(q) ||
                upper(firstOf(r, 'CENTRO_TRABAJO', 'CENTRO TRABAJO')).includes(q) ||
                upper(firstOf(r, 'VIDRIO')).includes(q) ||
                upper(firstOf(r, 'PRODUCTO')).includes(q) ||
                upper(firstOf(r, 'PEDIDO')).includes(q) ||
                String(firstOf(r, 'LINEA')).includes(q);
            }).map((r, idx) => {
              const USERNAME = firstOf(r, 'USERNAME');
              const CENTRO_TRABAJO = firstOf(r, 'CENTRO_TRABAJO', 'CENTRO TRABAJO');
              const N_VIDRIO = firstOf(r, 'N_VIDRIO', 'N VIDRIO');
              const VIDRIO = firstOf(r, 'VIDRIO');
              const LINEA = firstOf(r, 'LINEA');
              const MEDIDA_X = firstOf(r, 'MEDIDA_X', 'MEDIDA X', 'DIMXPZR');
              const MEDIDA_Y = firstOf(r, 'MEDIDA_Y', 'MEDIDA Y', 'DIMYPZR');
              const PROGR = firstOf(r, 'PROGR');
              const PRODUCTO = firstOf(r, 'PRODUCTO');
              const DATAHORA = firstOf(r, 'DATAHORA_COMPL', 'DATAHORA COMPL', 'DATA_COMPLETE', 'DATA COMPLETE');

              const R1 = norm(firstOf(r, 'RAZON_QUEBRA1', 'RAZON QUEBRA1'));
              const R2 = norm(firstOf(r, 'RAZON_QUEBRA2', 'RAZON QUEBRA2'));
              const R3 = norm(firstOf(r, 'RAZON_QUEBRA3', 'RAZON QUEBRA3'));
              const T1 = norm(firstOf(r, 'TEXT1', 'TEXT 1'));
              const showReasons = !!(R1 || R2 || R3 || T1);

              return (
                <View key={idx} style={[styles.rowCard, styles.cardShadow]}>
                  <Text style={styles.rowLine}>USERNAME: {USERNAME ?? '—'}</Text>
                  <Text style={styles.rowLine}>CENTRO TRABAJO: {CENTRO_TRABAJO ?? '—'}</Text>
                  <Text style={styles.rowLine}>N VIDRIO: {N_VIDRIO ?? '—'} · VIDRIO: {VIDRIO ?? '—'}</Text>
                  <Text style={styles.rowLine}>LINEA: {LINEA ?? '—'}</Text>
                  <Text style={styles.rowLine}>MEDIDA X: {MEDIDA_X ?? '—'} · MEDIDA Y: {MEDIDA_Y ?? '—'}</Text>
                  <Text style={styles.rowLine}>PROGR: {PROGR ?? '—'}</Text>
                  <Text style={styles.rowLine}>PRODUCTO: {PRODUCTO ?? '—'}</Text>
                  <Text style={styles.rowLine}>DATAHORA COMPL: {DATAHORA ? fmtYmdHm(String(DATAHORA)) : '—'}</Text>

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
    </View>
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
  btnDisabled: {
    opacity: 0.6,
  },
  btnText: { color: '#fff', fontWeight: '700' },
  errorText: { color: '#b91c1c', paddingHorizontal: 12, paddingTop: 6 },

  // header de lista
  listHeader: {
    paddingHorizontal: 10,
    paddingTop: 10,
    paddingBottom: 8,
    backgroundColor: '#f3f4f6',
  },
  listHeaderText: { color: '#374151' },
  bold: { fontWeight: '800' },
  progressBar: {
    height: 6,
    backgroundColor: '#e5e7eb',
    borderRadius: 999,
    overflow: 'hidden',
    marginTop: 6,
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#2e78b7',
  },
  timingsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 8,
  },
  timingChip: {
    backgroundColor: '#eef2ff',
    color: '#374151',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 999,
    overflow: 'hidden',
    fontSize: 12,
  },
  timingChipStrong: {
    backgroundColor: '#dbeafe',
    fontWeight: '700',
  },

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
});
