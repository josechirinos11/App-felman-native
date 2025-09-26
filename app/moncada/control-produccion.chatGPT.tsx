import Ionicons from '@expo/vector-icons/Ionicons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  KeyboardAvoidingView,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useRouter } from 'expo-router';
import AppHeader from '../../components/AppHeader';
import SQLModal from '../../components/SQLModal';
import { API_URL } from '../../config/constants';
import COLORS from '../../constants/Colors';
import { useAuth } from '../../hooks/useAuth';
import { useOfflineMode } from '../../hooks/useOfflineMode';

// ---------------------------------------------
// Tipos
// ---------------------------------------------
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
  TiempoDedicado?: number | null; // segundos
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

// ---------------------------------------------
// Utilidades
// ---------------------------------------------
const tareaNombres: Record<string | number, string> = {
  1: 'CORTE',
  2: 'PRE-ARMADO',
  3: 'ARMADO',
  4: 'HERRAJE',
  6: 'MATRIMONIO',
  7: 'COMPACTO',
  9: 'ACRISTALADO',
  10: 'EMBALAJE',
  11: 'OPTIMIZACION',
  12: 'REBARBA',
};

const formatDateOnly = (dateStr?: string | null) => {
  if (!dateStr) return '-';
  const s = String(dateStr).trim();
  if (!s) return '-';
  if (s.includes('T')) return s.split('T')[0];
  const d = new Date(s);
  return isNaN(d.getTime()) ? s.slice(0, 10) : d.toISOString().slice(0, 10);
};

const formatHM = (seconds?: number | null) => {
  if (seconds == null) return '-';
  const s = Math.max(0, Math.floor(Number(seconds)));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  return `${h}h ${String(m).padStart(2, '0')}m`;
};

const formatDuration = (value?: number | null) => {
  if (value == null) return '-';
  const n = Number(value);
  if (isNaN(n)) return '-';
  const totalSeconds = n > 1e9 ? Math.floor(n / 1000) : Math.floor(n);
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = totalSeconds % 60;
  if (h > 0) return `${h} horas - ${m} minutos`;
  return `${m} minutos - ${s} segundos`;
};

const operarioKey = (val?: string | null) => {
  if (!val) return 'SIN_OPERARIO';
  const first = String(val).trim().split(/[\s\/]+/)[0];
  return first.toUpperCase();
};

const tareaKey = (r: TiempoRealRecord) => (r.CodigoTarea ?? 'SIN_TAREA').toString();
const pedidoKey = (r: TiempoRealRecord) => (r.NumeroManual ?? 'SIN_PEDIDO').toString();

const uniqueCount = <T,>(arr: T[]) => new Set(arr).size;

// ---------------------------------------------
// Componente
// ---------------------------------------------

// Función para obtener el primer lunes anterior (o el mismo día si es lunes)
function getPreviousMonday(date: Date): Date {
  const day = date.getDay(); // 0=Domingo, 1=Lunes, ..., 6=Sábado
  const diff = day === 1 ? 0 : (day === 0 ? 6 : day - 1);
  const monday = new Date(date);
  monday.setDate(date.getDate() - diff);
  return monday;
}

export default function ControlProduccionScreen() {
  const { authenticated, loading: authLoading } = useAuth();
  const router = useRouter();

  const [userData, setUserData] = useState<UserData | null>(null);
  const [loading, setLoading] = useState(true);

  // Datos
  const [rows, setRows] = useState<TiempoRealRecord[]>([]);
  const [loadingData, setLoadingData] = useState(false);

  // Filtros UI
  const [mode, setMode] = useState<'operador' | 'tarea' | 'pedido'>('operador');
  const [search, setSearch] = useState('');
  const [desde, setDesde] = useState<string>(formatDateOnly(getPreviousMonday(new Date()).toISOString()));
  const [hasta, setHasta] = useState<string>(formatDateOnly(new Date().toISOString()));
  const [sqlVisible, setSqlVisible] = useState(false);

  // Modal detalle/estadística
  const [detailOpen, setDetailOpen] = useState(false);
  const [detailKey, setDetailKey] = useState<string>('');
  const [detailContext, setDetailContext] = useState<'operador'|'tarea'|'pedido'>('operador');

  // Permisos
  const normalizedRole = ((userData?.rol ?? userData?.role) ?? '').toString().trim().toLowerCase();
  const allowed = ['admin', 'developer', 'administrador'].includes(normalizedRole);

  const { serverReachable } = useOfflineMode();

  // ---------------------------------------------
  // Auth / user data
  // ---------------------------------------------
  useEffect(() => {
    if (!authLoading && !authenticated) {
      router.replace('/login');
    }
  }, [authenticated, authLoading, router]);

  useEffect(() => {
    (async () => {
      try {
        const storedToken = await AsyncStorage.getItem('token');
        const rawUser = await AsyncStorage.getItem('userData');
        if (rawUser) {
          const parsed = JSON.parse(rawUser);
          if (parsed?.nombre && parsed?.rol) {
            setUserData(parsed);
          } else if (parsed?.name && parsed?.role) {
            setUserData({ id: parsed.id || 0, nombre: parsed.name, rol: parsed.role });
          } else {
            setUserData(null);
          }
        }
      } catch (e) {
        console.error('Error leyendo AsyncStorage', e);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  // ---------------------------------------------
  // Carga datos por rango (sin polling)
  // ---------------------------------------------
  const fetchByRange = async () => {
    if (!desde || !hasta) return;
    setLoadingData(true);
    try {
      const res = await fetch(`${API_URL}/control-terminales/production-analytics?start=${encodeURIComponent(desde)}&end=${encodeURIComponent(hasta)}`);
      if (!res.ok) {
        setRows([]);
        return;
      }
      const json = await res.json();
      setRows(Array.isArray(json) ? json : []);
    } catch (err) {
      console.error('[tiempo-real] error', err);
      setRows([]);
    } finally {
      setLoadingData(false);
    }
  };

  // Carga inicial del día
  useEffect(() => {
    fetchByRange();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ---------------------------------------------
  // Agrupación según modo
  // ---------------------------------------------
  type Group = {
    key: string;
    items: TiempoRealRecord[];
    totalSeg: number;
    pedidos: number;
    tareas: number;
    modulos: number;
    avgSegPorModulo: number;
    avgSegPorPedido: number;
  };

  const filteredGrouped: Group[] = useMemo(() => {
    // Filtrado por texto: busca en operario / tarea / pedido indistintamente
    const q = search.trim().toLowerCase();
    const base = q
      ? rows.filter(r =>
          (operarioKey(r.OperarioNombre || r.CodigoOperario)).toLowerCase().includes(q) ||
          (tareaKey(r)).toLowerCase().includes(q) ||
          (pedidoKey(r)).toLowerCase().includes(q)
        )
      : rows;

    const map = new Map<string, TiempoRealRecord[]>();
    for (const r of base) {
      const k = mode === 'operador' ? operarioKey(r.OperarioNombre || r.CodigoOperario)
              : mode === 'tarea' ? tareaKey(r)
              : pedidoKey(r);
      const arr = map.get(k) || [];
      arr.push(r);
      map.set(k, arr);
    }

    const groups: Group[] = [];
    for (const [k, arr] of map.entries()) {
      const totalSeg = arr.reduce((acc, it) => acc + (Number(it.TiempoDedicado) || 0), 0);
      const pedidos = uniqueCount(arr.map(pedidoKey));
      const tareas = uniqueCount(arr.map(tareaKey));
      const modulos = uniqueCount(arr.map(r => r.Modulo ?? '-'));
      const avgSegPorModulo = modulos > 0 ? Math.round(totalSeg / modulos) : 0;
      const avgSegPorPedido = pedidos > 0 ? Math.round(totalSeg / pedidos) : 0;
      groups.push({ key: k, items: arr, totalSeg, pedidos, tareas, modulos, avgSegPorModulo, avgSegPorPedido });
    }
    groups.sort((a, b) => a.key.localeCompare(b.key));
    return groups;
  }, [rows, mode, search]);

  // ---------------------------------------------
  // Estadística para modal (clave seleccionada)
  // ---------------------------------------------
  const detailData = useMemo(() => {
    if (!detailKey) return null;
    let arr = rows;
    if (detailContext === 'operador') {
      arr = rows.filter(r => operarioKey(r.OperarioNombre || r.CodigoOperario) === detailKey);
    } else if (detailContext === 'tarea') {
      arr = rows.filter(r => tareaKey(r) === detailKey);
    } else {
      arr = rows.filter(r => pedidoKey(r) === detailKey);
    }

    // KPIs generales
    const totalSeg = arr.reduce((acc, it) => acc + (Number(it.TiempoDedicado) || 0), 0);
    const pedidos = uniqueCount(arr.map(pedidoKey));
    const tareas = uniqueCount(arr.map(tareaKey));
    const modulos = uniqueCount(arr.map(r => r.Modulo ?? '-'));
    const avgSegPorModulo = modulos > 0 ? Math.round(totalSeg / modulos) : 0;
    const avgSegPorPedido = pedidos > 0 ? Math.round(totalSeg / pedidos) : 0;

    // Rankings / comparativas
    // 1) por tarea -> ranking de operarios dentro de esa tarea
    const rankingOperariosEnTarea: Array<{ op: string; seg: number; pedidos: number; modulos: number }> = [];
    if (detailContext === 'tarea') {
      const mm = new Map<string, TiempoRealRecord[]>();
      for (const r of arr) {
        const ok = operarioKey(r.OperarioNombre || r.CodigoOperario);
        const a = mm.get(ok) || [];
        a.push(r);
        mm.set(ok, a);
      }
      for (const [op, items] of mm.entries()) {
        const seg = items.reduce((acc, it) => acc + (Number(it.TiempoDedicado) || 0), 0);
        const ped = uniqueCount(items.map(pedidoKey));
        const mods = uniqueCount(items.map(i => i.Modulo ?? '-'));
        rankingOperariosEnTarea.push({ op, seg, pedidos: ped, modulos: mods });
      }
      rankingOperariosEnTarea.sort((a, b) => b.seg - a.seg);
    }

    // 2) por operario -> ranking por tarea y por pedido
    const rankingTareasDelOperario: Array<{ tarea: string; seg: number; pedidos: number; modulos: number }> = [];
    const rankingPedidosDelOperario: Array<{ pedido: string; seg: number; modulos: number }> = [];
    if (detailContext === 'operador') {
      const mt = new Map<string, TiempoRealRecord[]>();
      const mp = new Map<string, TiempoRealRecord[]>();
      for (const r of arr) {
        const tk = tareaKey(r);
        const pk = pedidoKey(r);
        const at = mt.get(tk) || [];
        at.push(r);
        mt.set(tk, at);
        const ap = mp.get(pk) || [];
        ap.push(r);
        mp.set(pk, ap);
      }
      for (const [t, items] of mt.entries()) {
        const seg = items.reduce((acc, it) => acc + (Number(it.TiempoDedicado) || 0), 0);
        const ped = uniqueCount(items.map(pedidoKey));
        const mods = uniqueCount(items.map(i => i.Modulo ?? '-'));
        rankingTareasDelOperario.push({ tarea: t, seg, pedidos: ped, modulos: mods });
      }
      for (const [p, items] of mp.entries()) {
        const seg = items.reduce((acc, it) => acc + (Number(it.TiempoDedicado) || 0), 0);
        const mods = uniqueCount(items.map(i => i.Modulo ?? '-'));
        rankingPedidosDelOperario.push({ pedido: p, seg, modulos: mods });
      }
      rankingTareasDelOperario.sort((a, b) => b.seg - a.seg);
      rankingPedidosDelOperario.sort((a, b) => b.seg - a.seg);
    }

    // 3) por pedido -> desglose por tarea y por operario
    const desgloseTareasEnPedido: Array<{ tarea: string; seg: number; operarios: number; modulos: number }> = [];
    const desgloseOperariosEnPedido: Array<{ op: string; seg: number; modulos: number }> = [];
    if (detailContext === 'pedido') {
      const mt = new Map<string, TiempoRealRecord[]>();
      const mo = new Map<string, TiempoRealRecord[]>();
      for (const r of arr) {
        const tk = tareaKey(r);
        const ok = operarioKey(r.OperarioNombre || r.CodigoOperario);
        const at = mt.get(tk) || [];
        at.push(r);
        mt.set(tk, at);
        const ao = mo.get(ok) || [];
        ao.push(r);
        mo.set(ok, ao);
      }
      for (const [t, items] of mt.entries()) {
        const seg = items.reduce((acc, it) => acc + (Number(it.TiempoDedicado) || 0), 0);
        const ops = uniqueCount(items.map(i => operarioKey(i.OperarioNombre || i.CodigoOperario)));
        const mods = uniqueCount(items.map(i => i.Modulo ?? '-'));
        desgloseTareasEnPedido.push({ tarea: t, seg, operarios: ops, modulos: mods });
      }
      for (const [op, items] of mo.entries()) {
        const seg = items.reduce((acc, it) => acc + (Number(it.TiempoDedicado) || 0), 0);
        const mods = uniqueCount(items.map(i => i.Modulo ?? '-'));
        desgloseOperariosEnPedido.push({ op, seg, modulos: mods });
      }
      desgloseTareasEnPedido.sort((a, b) => b.seg - a.seg);
      desgloseOperariosEnPedido.sort((a, b) => b.seg - a.seg);
    }

    // Conclusión automática breve
    const conclusion = (() => {
      const topTask =
        detailContext !== 'tarea'
          ? (() => {
              const mt = new Map<string, number>();
              for (const r of arr) mt.set(tareaKey(r), (mt.get(tareaKey(r)) || 0) + (Number(r.TiempoDedicado) || 0));
              const best = Array.from(mt.entries()).sort((a, b) => b[1] - a[1])[0];
              return best ? `${tareaNombres[best[0]] || best[0]} (${formatHM(best[1])})` : '—';
            })()
          : undefined;

      const topOp =
        detailContext !== 'operador'
          ? (() => {
              const mo = new Map<string, number>();
              for (const r of arr) mo.set(operarioKey(r.OperarioNombre || r.CodigoOperario), (mo.get(operarioKey(r.OperarioNombre || r.CodigoOperario)) || 0) + (Number(r.TiempoDedicado) || 0));
              const best = Array.from(mo.entries()).sort((a, b) => b[1] - a[1])[0];
              return best ? `${best[0]} (${formatHM(best[1])})` : '—';
            })()
          : undefined;

      const topPedido =
        detailContext !== 'pedido'
          ? (() => {
              const mp = new Map<string, number>();
              for (const r of arr) mp.set(pedidoKey(r), (mp.get(pedidoKey(r)) || 0) + (Number(r.TiempoDedicado) || 0));
              const best = Array.from(mp.entries()).sort((a, b) => b[1] - a[1])[0];
              return best ? `${best[0]} (${formatHM(best[1])})` : '—';
            })()
          : undefined;

      const parts: string[] = [];
      parts.push(`Tiempo total: ${formatHM(totalSeg)} · Módulos: ${modulos} · Pedidos: ${pedidos}`);
      if (topTask) parts.push(`Tarea destacada: ${topTask}`);
      if (topOp) parts.push(`Operario destacado: ${topOp}`);
      if (topPedido) parts.push(`Pedido más intenso: ${topPedido}`);
      return parts.join(' · ');
    })();

    return {
      arr,
      totalSeg, pedidos, tareas, modulos, avgSegPorModulo, avgSegPorPedido,
      rankingOperariosEnTarea,
      rankingTareasDelOperario,
      rankingPedidosDelOperario,
      desgloseTareasEnPedido,
      desgloseOperariosEnPedido,
      conclusion,
    };
  }, [rows, detailKey, detailContext]);

  // ---------------------------------------------
  // Render
  // ---------------------------------------------
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
        titleOverride="Producción · Moncada"
        count={rows.length}
        userNameProp={userData?.nombre || userData?.name || '—'}
        roleProp={userData?.rol || userData?.role || '—'}
        serverReachableOverride={!!authenticated}
        onRefresh={fetchByRange}
        onUserPress={({ userName, role }) => { /* Modal de usuario de tu app */ }}
      />

      {/* Barra de filtros */}
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View style={styles.filtersBar}>
          <View style={styles.dateInputWrap}>
            <Ionicons name="calendar-outline" size={18} color="#6b7280" />
            <TextInput
              placeholder="Desde (YYYY-MM-DD)"
              style={styles.dateInput}
              value={desde}
              onChangeText={setDesde}
              inputMode="numeric"
            />
          </View>
          <View style={styles.dateInputWrap}>
            <Ionicons name="calendar-outline" size={18} color="#6b7280" />
            <TextInput
              placeholder="Hasta (YYYY-MM-DD)"
              style={styles.dateInput}
              value={hasta}
              onChangeText={setHasta}
              inputMode="numeric"
            />
          </View>

          <TouchableOpacity onPress={fetchByRange} style={styles.runButton}>
            <Ionicons name="refresh-outline" size={18} color="#fff" />
            <Text style={styles.runButtonText}>Consultar</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.searchRow}>
          <Ionicons name="search-outline" size={18} color="#6b7280" />
          <TextInput
            style={styles.searchInput}
            placeholder="Buscar Operario / Tarea / Pedido"
            value={search}
            onChangeText={setSearch}
          />
        </View>

        <View style={styles.tabsRow}>
          <TouchableOpacity
            onPress={() => setMode('operador')}
            style={[styles.tabBtn, mode === 'operador' && styles.tabBtnActive]}
          >
            <Text style={[styles.tabTxt, mode === 'operador' && styles.tabTxtActive]}>
              Operarios
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => setMode('tarea')}
            style={[styles.tabBtn, mode === 'tarea' && styles.tabBtnActive]}
          >
            <Text style={[styles.tabTxt, mode === 'tarea' && styles.tabTxtActive]}>
              Tareas
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => setMode('pedido')}
            style={[styles.tabBtn, mode === 'pedido' && styles.tabBtnActive]}
          >
            <Text style={[styles.tabTxt, mode === 'pedido' && styles.tabTxtActive]}>
              Pedidos
            </Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>

      {/* Lista */}
      <View style={{ flex: 1, paddingHorizontal: 12, paddingVertical: 8 }}>
        {loadingData ? (
          <ActivityIndicator />
        ) : (
          <FlatList
            data={filteredGrouped}
            keyExtractor={(g) => g.key}
            contentContainerStyle={{ paddingBottom: 24 }}
            renderItem={({ item: g }) => (
              <TouchableOpacity
                style={styles.card}
                onPress={() => {
                  setDetailKey(g.key);
                  setDetailContext(mode);
                  setDetailOpen(true);
                }}
              >
                <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                  <Text style={{ fontWeight: '700', color: COLORS.primary }}>
                    {mode === 'tarea' ? (tareaNombres[g.key] || g.key) : g.key}
                  </Text>
                  <View style={{ alignItems: 'flex-end' }}>
                    <Text style={{ color: '#6b7280', fontWeight: '600' }}>
                      {g.items.length} ítems
                    </Text>
                    <View style={{ flexDirection: 'row', gap: 8, marginTop: 4 }}>
                      <View style={styles.kpiPill}>
                        <Text style={styles.kpiPillLabel}>Tiempo</Text>
                        <Text style={styles.kpiPillValue}>{formatHM(g.totalSeg)}</Text>
                      </View>
                      <View style={styles.kpiPill}>
                        <Text style={styles.kpiPillLabel}>Pedidos</Text>
                        <Text style={styles.kpiPillValue}>{g.pedidos}</Text>
                      </View>
                      <View style={styles.kpiPill}>
                        <Text style={styles.kpiPillLabel}>Módulos</Text>
                        <Text style={styles.kpiPillValue}>{g.modulos}</Text>
                      </View>
                    </View>
                  </View>
                </View>

                <View style={{ flexDirection: 'row', flexWrap: 'wrap', marginTop: 10, gap: 6 }}>
                  <View style={styles.badge}>
                    <Text style={styles.badgeText}>Tareas: {g.tareas}</Text>
                  </View>
                  <View style={styles.badge}>
                    <Text style={styles.badgeText}>Avg / Mód: {formatHM(g.avgSegPorModulo)}</Text>
                  </View>
                  <View style={styles.badge}>
                    <Text style={styles.badgeText}>Avg / Pedido: {formatHM(g.avgSegPorPedido)}</Text>
                  </View>
                </View>
              </TouchableOpacity>
            )}
          />
        )}
      </View>

      {/* Modal de estadísticas */}
      <Modal visible={detailOpen} animationType="slide" onRequestClose={() => setDetailOpen(false)}>
        <SafeAreaView style={styles.modalContainer}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', padding: 12 }}>
            <Text style={{ fontSize: 18, fontWeight: '700' }}>
              {detailContext === 'tarea' ? (tareaNombres[detailKey] || detailKey) : detailKey}
            </Text>
            <TouchableOpacity onPress={() => setDetailOpen(false)}>
              <Text style={{ color: '#ef4444', fontWeight: '700' }}>Cerrar</Text>
            </TouchableOpacity>
          </View>

          {!detailData ? (
            <ActivityIndicator style={{ marginTop: 12 }} />
          ) : (
            <ScrollView contentContainerStyle={{ padding: 12 }}>
              {/* KPIs principales */}
              <View style={[styles.card, { padding: 12 }]}>
                <Text style={{ fontWeight: '700', marginBottom: 8 }}>KPIs</Text>
                <View style={styles.kpiGrid}>
                  <View style={styles.kpiCell}><Text style={styles.kpiLabel}>Tiempo Total</Text><Text style={styles.kpiValue}>{formatHM(detailData.totalSeg)}</Text></View>
                  <View style={styles.kpiCell}><Text style={styles.kpiLabel}>Pedidos</Text><Text style={styles.kpiValue}>{detailData.pedidos}</Text></View>
                  <View style={styles.kpiCell}><Text style={styles.kpiLabel}>Tareas</Text><Text style={styles.kpiValue}>{detailData.tareas}</Text></View>
                  <View style={styles.kpiCell}><Text style={styles.kpiLabel}>Módulos</Text><Text style={styles.kpiValue}>{detailData.modulos}</Text></View>
                  <View style={styles.kpiCell}><Text style={styles.kpiLabel}>Avg / Módulo</Text><Text style={styles.kpiValue}>{formatHM(detailData.avgSegPorModulo)}</Text></View>
                  <View style={styles.kpiCell}><Text style={styles.kpiLabel}>Avg / Pedido</Text><Text style={styles.kpiValue}>{formatHM(detailData.avgSegPorPedido)}</Text></View>
                </View>
              </View>

              {/* Bloques comparativos según contexto */}
              {detailContext === 'operador' && (
                <>
                  <View style={[styles.card, { padding: 12 }]}>
                    <Text style={{ fontWeight: '700', marginBottom: 8 }}>Ranking · Tareas de este operario</Text>
                    <View style={styles.tableHeader}>
                      <Text style={[styles.th, { flex: 2 }]}>Tarea</Text>
                      <Text style={[styles.th, { flex: 1, textAlign: 'right' }]}>Tiempo</Text>
                      <Text style={[styles.th, { flex: 1, textAlign: 'right' }]}>Pedidos</Text>
                      <Text style={[styles.th, { flex: 1, textAlign: 'right' }]}>Módulos</Text>
                    </View>
                    {detailData.rankingTareasDelOperario.map((r) => (
                      <View key={r.tarea} style={styles.tableRow}>
                        <Text style={[styles.td, { flex: 2 }]}>{tareaNombres[r.tarea] || r.tarea}</Text>
                        <Text style={[styles.td, { flex: 1, textAlign: 'right' }]}>{formatHM(r.seg)}</Text>
                        <Text style={[styles.td, { flex: 1, textAlign: 'right' }]}>{r.pedidos}</Text>
                        <Text style={[styles.td, { flex: 1, textAlign: 'right' }]}>{r.modulos}</Text>
                      </View>
                    ))}
                  </View>

                  <View style={[styles.card, { padding: 12 }]}>
                    <Text style={{ fontWeight: '700', marginBottom: 8 }}>Ranking · Pedidos de este operario</Text>
                    <View style={styles.tableHeader}>
                      <Text style={[styles.th, { flex: 2 }]}>Pedido</Text>
                      <Text style={[styles.th, { flex: 1, textAlign: 'right' }]}>Tiempo</Text>
                      <Text style={[styles.th, { flex: 1, textAlign: 'right' }]}>Módulos</Text>
                    </View>
                    {detailData.rankingPedidosDelOperario.map((r) => (
                      <View key={r.pedido} style={styles.tableRow}>
                        <Text style={[styles.td, { flex: 2 }]}>{r.pedido}</Text>
                        <Text style={[styles.td, { flex: 1, textAlign: 'right' }]}>{formatHM(r.seg)}</Text>
                        <Text style={[styles.td, { flex: 1, textAlign: 'right' }]}>{r.modulos}</Text>
                      </View>
                    ))}
                  </View>
                </>
              )}

              {detailContext === 'tarea' && (
                <View style={[styles.card, { padding: 12 }]}>
                  <Text style={{ fontWeight: '700', marginBottom: 8 }}>Comparativa de operarios en esta tarea</Text>
                  <View style={styles.tableHeader}>
                    <Text style={[styles.th, { flex: 2 }]}>Operario</Text>
                    <Text style={[styles.th, { flex: 1, textAlign: 'right' }]}>Tiempo</Text>
                    <Text style={[styles.th, { flex: 1, textAlign: 'right' }]}>Pedidos</Text>
                    <Text style={[styles.th, { flex: 1, textAlign: 'right' }]}>Módulos</Text>
                  </View>
                  {detailData.rankingOperariosEnTarea.map((r) => (
                    <View key={r.op} style={styles.tableRow}>
                      <Text style={[styles.td, { flex: 2 }]}>{r.op}</Text>
                      <Text style={[styles.td, { flex: 1, textAlign: 'right' }]}>{formatHM(r.seg)}</Text>
                      <Text style={[styles.td, { flex: 1, textAlign: 'right' }]}>{r.pedidos}</Text>
                      <Text style={[styles.td, { flex: 1, textAlign: 'right' }]}>{r.modulos}</Text>
                    </View>
                  ))}
                </View>
              )}

              {detailContext === 'pedido' && (
                <>
                  <View style={[styles.card, { padding: 12 }]}>
                    <Text style={{ fontWeight: '700', marginBottom: 8 }}>Tareas implicadas en el pedido</Text>
                    <View style={styles.tableHeader}>
                      <Text style={[styles.th, { flex: 2 }]}>Tarea</Text>
                      <Text style={[styles.th, { flex: 1, textAlign: 'right' }]}>Tiempo</Text>
                      <Text style={[styles.th, { flex: 1, textAlign: 'right' }]}>Operarios</Text>
                      <Text style={[styles.th, { flex: 1, textAlign: 'right' }]}>Módulos</Text>
                    </View>
                    {detailData.desgloseTareasEnPedido.map((r) => (
                      <View key={r.tarea} style={styles.tableRow}>
                        <Text style={[styles.td, { flex: 2 }]}>{tareaNombres[r.tarea] || r.tarea}</Text>
                        <Text style={[styles.td, { flex: 1, textAlign: 'right' }]}>{formatHM(r.seg)}</Text>
                        <Text style={[styles.td, { flex: 1, textAlign: 'right' }]}>{r.operarios}</Text>
                        <Text style={[styles.td, { flex: 1, textAlign: 'right' }]}>{r.modulos}</Text>
                      </View>
                    ))}
                  </View>

                  <View style={[styles.card, { padding: 12 }]}>
                    <Text style={{ fontWeight: '700', marginBottom: 8 }}>Operarios implicados en el pedido</Text>
                    <View style={styles.tableHeader}>
                      <Text style={[styles.th, { flex: 2 }]}>Operario</Text>
                      <Text style={[styles.th, { flex: 1, textAlign: 'right' }]}>Tiempo</Text>
                      <Text style={[styles.th, { flex: 1, textAlign: 'right' }]}>Módulos</Text>
                    </View>
                    {detailData.desgloseOperariosEnPedido.map((r) => (
                      <View key={r.op} style={styles.tableRow}>
                        <Text style={[styles.td, { flex: 2 }]}>{r.op}</Text>
                        <Text style={[styles.td, { flex: 1, textAlign: 'right' }]}>{formatHM(r.seg)}</Text>
                        <Text style={[styles.td, { flex: 1, textAlign: 'right' }]}>{r.modulos}</Text>
                      </View>
                    ))}
                  </View>
                </>
              )}

              {/* Conclusión */}
              <View style={[styles.card, { padding: 12, backgroundColor: '#f8fafc' }]}>
                <Text style={{ fontWeight: '700', marginBottom: 6 }}>Conclusión</Text>
                <Text style={{ color: '#1f2937' }}>{detailData.conclusion}</Text>
              </View>
            </ScrollView>
          )}
        </SafeAreaView>
      </Modal>

      {/* SQL Debug Modal opcional */}
      {sqlVisible && <SQLModal visible={sqlVisible} onClose={() => setSqlVisible(false)} />}
    </SafeAreaView>
  );
}

// ---------------------------------------------
// Estilos (alineados con tu app)
// ---------------------------------------------
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  errorText: { color: 'red', fontSize: 16 },

  filtersBar: {
    flexDirection: Platform.OS === 'web' ? 'row' : 'column',
    gap: 8,
    paddingHorizontal: 12,
    paddingTop: 10,
    alignItems: Platform.OS === 'web' ? 'center' : 'stretch',
  },
  dateInputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    paddingHorizontal: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    height: 42,
    flex: Platform.OS === 'web' ? 0 : undefined,
    minWidth: 200,
  },
  dateInput: {
    marginLeft: 8,
    flex: 1,
    color: '#111827',
  },
  runButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: COLORS.primary,
    paddingHorizontal: 14,
    height: 42,
    borderRadius: 8,
    alignSelf: Platform.OS === 'web' ? 'flex-start' : 'stretch',
    justifyContent: 'center',
  },
  runButtonText: { color: '#fff', fontWeight: '700' },

  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    marginHorizontal: 12,
    marginTop: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    height: 42,
  },
  searchInput: { flex: 1, marginLeft: 8, color: '#111827' },

  tabsRow: {
    flexDirection: 'row',
    gap: 8,
    paddingHorizontal: 12,
    marginTop: 10,
  },
  tabBtn: {
    flex: 1,
    backgroundColor: '#f0f0f0',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#ddd',
    paddingVertical: 8,
  },
  tabBtnActive: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  tabTxt: { textAlign: 'center', fontWeight: '600', color: '#374151' },
  tabTxtActive: { color: '#fff' },

  card: {
    marginVertical: 4,
    marginHorizontal: 6,
    padding: 14,
    borderRadius: 10,
    backgroundColor: '#fff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.18,
    shadowRadius: 6,
    elevation: 5,
  },

  kpiPill: {
    backgroundColor: '#f1f5f9',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  kpiPillLabel: { fontSize: 11, color: '#64748b' },
  kpiPillValue: { fontSize: 12, fontWeight: '700', color: '#0f172a' },

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
  badgeText: { fontSize: 12, color: '#0f172a', fontWeight: '600' },

  modalContainer: { flex: 1, backgroundColor: COLORS.background },

  kpiGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  kpiCell: {
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 10,
    padding: 10,
    minWidth: 140,
    flexGrow: 1,
  },
  kpiLabel: { color: '#6b7280', fontSize: 12 },
  kpiValue: { color: '#111827', fontWeight: '800', marginTop: 4 },

  tableHeader: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#e6eef6',
    paddingVertical: 6,
  },
  tableRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
    paddingVertical: 6,
  },
  th: { fontWeight: '700', color: '#374151' },
  td: { color: '#111827' },
});
