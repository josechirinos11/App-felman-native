// app/moncada/control-produccion.tsx
import Ionicons from '@expo/vector-icons/Ionicons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import DateTimePicker from '@react-native-community/datetimepicker';
import React, { useEffect, useMemo, useState } from 'react';
import {
    ActivityIndicator,
    FlatList,
    Modal,
    Platform,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    useWindowDimensions,
    View
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useRouter } from 'expo-router';
import AppHeader from '../../components/AppHeader';
import ModalHeader from '../../components/ModalHeader';
import SQLModal from '../../components/SQLModal';
import { API_URL } from '../../config/constants';
import COLORS from '../../constants/Colors';
import { useAuth } from '../../hooks/useAuth';

// ===================== Tipos =====================
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

interface HierarchicalRecord {
  pedido: string;
  modulo: string;
  tarea: string;
  operario: string;
  records: TiempoRealRecord[];
  totalTime: number;
  fechas: string[];
}

interface ModuloGroup {
  modulo: string;
  tareas: Map<string, HierarchicalRecord[]>;
  totalTime: number;
  operarios: Set<string>;
  fechas: Set<string>;
}

interface PedidoGroup {
  pedido: string;
  modulos: Map<string, ModuloGroup>;
  totalTime: number;
  operarios: Set<string>;
  fechas: Set<string>;
}

// ===================== Utilidades =====================
function getLastMonday(date = new Date()) {
  const d = new Date(date);
  const day = d.getDay();
  const diff = day === 0 ? 6 : day - 1;
  d.setDate(d.getDate() - diff);
  d.setHours(0, 0, 0, 0);
  return d;
}

const formatDateOnly = (dateStr?: string | null) => {
  if (!dateStr) return '-';
  const s = String(dateStr).trim();
  if (!s) return '-';
  if (s.includes('T')) return s.split('T')[0];
  const d = new Date(s);
  if (!isNaN(d.getTime())) return d.toISOString().slice(0, 10);
  return s.slice(0, 10);
};

const formatDurationLong = (value?: number | null) => {
  if (value == null) return '-';
  const n = Math.floor(Number(value));
  if (!isFinite(n)) return '-';
  const days = Math.floor(n / 86400);
  const hours = Math.floor((n % 86400) / 3600);
  const minutes = Math.floor((n % 3600) / 60);
  const seconds = n % 60;
  if (days > 0) return `${days} día${days > 1 ? 's' : ''} - ${hours}h - ${minutes}m`;
  if (hours > 0) return `${hours}h - ${minutes}m`;
  return `${minutes}m - ${seconds}s`;
};

const formatHM = (seconds?: number | null) => {
  if (seconds == null) return '-';
  const s = Math.max(0, Math.floor(Number(seconds)));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  return `${h}h ${String(m).padStart(2, '0')}m`;
};

const recordTimestamp = (r: TiempoRealRecord) => {
  try {
    const fecha = r.FechaInicio || r.Fecha || r.FechaFin;
    let hora = r.HoraInicio || r.HoraFin || '00:00:00';
    if (!fecha) return 0;
    if (/^\d{1,2}:\d{2}$/.test(hora)) hora = `${hora}:00`;
    const t = new Date(`${fecha}T${hora}`).getTime();
    return isNaN(t) ? 0 : t;
  } catch {
    return 0;
  }
};

const operarioFirstNameKey = (val?: string | null) => {
  if (!val) return 'SIN_OPERARIO';
  const first = String(val).trim().split(/[\s\/]+/)[0];
  return first ? first.toUpperCase() : 'SIN_OPERARIO';
};

// ===================== Componente =====================
export default function ControlTerminalesScreen() {
  const { authenticated, loading: authLoading } = useAuth();
  const router = useRouter();

  const [tiempoRecords, setTiempoRecords] = useState<TiempoRealRecord[]>([]);
  const [loadingTiempo, setLoadingTiempo] = useState(false);

  const [filterMode, setFilterMode] = useState<'operador' | 'tarea' | 'pedido'>('operador');
  const [groupedList, setGroupedList] = useState<any[]>([]);
  const [counts, setCounts] = useState({ operador: 0, tarea: 0, pedido: 0 });

  const [searchQuery, setSearchQuery] = useState('');

  const [detailModalVisible, setDetailModalVisible] = useState(false);
  const [detailList, setDetailList] = useState<TiempoRealRecord[]>([]);
  const [selectedGroupKey, setSelectedGroupKey] = useState<string | null>(null);
  const [modalContext, setModalContext] = useState<'operador' | 'tarea' | 'pedido' | null>(null);

  const [userData, setUserData] = useState<UserData | null>(null);
  const [userModalVisible, setUserModalVisible] = useState(false);
  const [modalUser, setModalUser] = useState({ userName: '', role: '' });
  const [token, setToken] = useState<string | null>(null);

  const [sqlVisible, setSqlVisible] = useState(false);

  // Layout
  const isWeb = Platform.OS === 'web';
  const { width: windowWidth } = useWindowDimensions();
  const isMobile = !isWeb && windowWidth < 600;

  // Autenticación / rol
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
        if (storedToken) setToken(storedToken);
        if (rawUser) {
          const parsed = JSON.parse(rawUser);
          if (parsed?.nombre && parsed?.rol) setUserData(parsed);
          else if (parsed?.name && parsed?.role) {
            setUserData({ id: parsed.id || 0, nombre: parsed.name, rol: parsed.role });
          }
        }
      } catch (e) {
        console.error('Error AsyncStorage:', e);
      }
    })();
  }, []);

  const normalizedRole = ((userData?.rol ?? userData?.role) ?? '')
    .toString().trim().toLowerCase();
  const allowed = ['admin', 'developer', 'administrador'].includes(normalizedRole);

  // Fechas (último lunes → hoy)
  const today = new Date();
  const lastMonday = getLastMonday(today);
  const [fromDate, setFromDate] = useState<Date>(lastMonday);
  const [toDate, setToDate] = useState<Date>(today);
  const [showFromPicker, setShowFromPicker] = useState(false);
  const [showToPicker, setShowToPicker] = useState(false);

  // Carga por rango
  useEffect(() => {
    fetchTiempoReal(formatDateOnly(fromDate.toISOString()), formatDateOnly(toDate.toISOString()));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fromDate, toDate]);

  async function fetchTiempoReal(from: string, to: string) {
    try {
      setLoadingTiempo(true);
      const res = await fetch(`${API_URL}/control-terminales/production-analytics?start=${from}&end=${to}`);
      if (!res.ok) {
        setTiempoRecords([]);
        return;
      }
      const json = await res.json();
      setTiempoRecords(Array.isArray(json) ? (json as TiempoRealRecord[]) : []);
    } catch (err) {
      console.error('[tiempo-real] error', err);
      setTiempoRecords([]);
    } finally {
      setLoadingTiempo(false);
    }
  }

  // Agrupar por modo
  const computeGroups = (records: TiempoRealRecord[], mode: 'operador' | 'tarea' | 'pedido') => {
    const map = new Map<string, TiempoRealRecord[]>();
    for (const r of records) {
      let key = 'SIN';
      if (mode === 'operador') key = operarioFirstNameKey(r.OperarioNombre || r.CodigoOperario);
      else if (mode === 'tarea') key = String(r.CodigoTarea ?? 'SIN_TAREA');
      else key = String(r.NumeroManual ?? 'SIN_PEDIDO');
      const arr = map.get(key) || [];
      arr.push(r);
      map.set(key, arr);
    }
    const groups: any[] = [];
    for (const [k, arr] of map) {
      const totalTiempo = arr.reduce((s, x) => s + (x.TiempoDedicado ?? 0), 0);
      const minFecha = arr.reduce((m, x) => (x.Fecha && x.Fecha < m ? x.Fecha : m), '9999-99-99');
      const maxFecha = arr.reduce((m, x) => (x.Fecha && x.Fecha > m ? x.Fecha : m), '0000-00-00');
      groups.push({
        key: k,
        items: arr,
        totalTiempo,
        count: arr.length,
        minFecha: formatDateOnly(minFecha),
        maxFecha: formatDateOnly(maxFecha)
      });
    }
    groups.sort((a, b) => b.totalTiempo - a.totalTiempo);
    return groups;
  };

  // Recompute grouped list + counts
  useEffect(() => {
    setGroupedList(computeGroups(tiempoRecords, filterMode));
    const operadorSet = new Set<string>();
    const tareaSet = new Set<string>();
    const pedidoSet = new Set<string>();
    for (const r of tiempoRecords) {
      operadorSet.add(operarioFirstNameKey(r.OperarioNombre || r.CodigoOperario));
      tareaSet.add(String(r.CodigoTarea ?? 'SIN_TAREA'));
      pedidoSet.add(String(r.NumeroManual ?? 'SIN_PEDIDO'));
    }
    setCounts({ operador: operadorSet.size, tarea: tareaSet.size, pedido: pedidoSet.size });
  }, [tiempoRecords, filterMode]);

  const filteredGroupedList = useMemo(() => {
    const q = (searchQuery || '').toLowerCase();
    if (!q) return groupedList;
    return groupedList.filter((g) =>
      g.key.toLowerCase().includes(q) ||
      g.items.some((r: TiempoRealRecord) =>
        String(r.NumeroManual || '').toLowerCase().includes(q) ||
        String(r.CodigoTarea || '').toLowerCase().includes(q) ||
        operarioFirstNameKey(r.OperarioNombre || r.CodigoOperario).toLowerCase().includes(q) ||
        String(r.Modulo || '').toLowerCase().includes(q)
      )
    );
  }, [groupedList, searchQuery]);

  // ===================== Jerarquías =====================
  const createHierarchicalStructure = (records: TiempoRealRecord[]): Map<string, PedidoGroup> => {
    const pedidosMap = new Map<string, PedidoGroup>();
    for (const record of records) {
      const pedido = record.NumeroManual || 'SIN_PEDIDO';
      const modulo = record.Modulo || 'SIN_MODULO';
      const tarea = record.CodigoTarea || 'SIN_TAREA';
      const operario = operarioFirstNameKey(record.OperarioNombre || record.CodigoOperario);
      const tiempo = record.TiempoDedicado || 0;
      const fecha = formatDateOnly(record.FechaInicio || record.Fecha);

      if (!pedidosMap.has(pedido)) {
        pedidosMap.set(pedido, {
          pedido,
          modulos: new Map<string, ModuloGroup>(),
          totalTime: 0,
          operarios: new Set<string>(),
          fechas: new Set<string>()
        });
      }
      const pedidoGroup = pedidosMap.get(pedido)!;

      if (!pedidoGroup.modulos.has(modulo)) {
        pedidoGroup.modulos.set(modulo, {
          modulo,
          tareas: new Map<string, HierarchicalRecord[]>(),
          totalTime: 0,
          operarios: new Set<string>(),
          fechas: new Set<string>()
        });
      }
      const moduloGroup = pedidoGroup.modulos.get(modulo)!;

      if (!moduloGroup.tareas.has(tarea)) {
        moduloGroup.tareas.set(tarea, []);
      }
      const lista = moduloGroup.tareas.get(tarea)!;

      let hr = lista.find(x => x.operario === operario);
      if (!hr) {
        hr = { pedido, modulo, tarea, operario, records: [], totalTime: 0, fechas: [] };
        lista.push(hr);
      }

      hr.records.push(record);
      hr.totalTime += tiempo;
      if (!hr.fechas.includes(fecha)) hr.fechas.push(fecha);

      moduloGroup.totalTime += tiempo;
      moduloGroup.operarios.add(operario);
      moduloGroup.fechas.add(fecha);

      pedidoGroup.totalTime += tiempo;
      pedidoGroup.operarios.add(operario);
      pedidoGroup.fechas.add(fecha);
    }
    return pedidosMap;
  };

  const renderOperarioHierarchy = (records: TiempoRealRecord[]) => {
    const hierarchy = createHierarchicalStructure(records);
    const pedidos = Array.from(hierarchy.values()).sort((a, b) => a.pedido.localeCompare(b.pedido));
    return (
      <FlatList
        data={pedidos}
        keyExtractor={(p) => p.pedido}
        renderItem={({ item: pedido }) => (
          <View style={styles.hierarchyContainer}>
            <View style={styles.hierarchyHeader}>
              <Text style={styles.hierarchyTitle}>📋 Pedido: {pedido.pedido}</Text>
              <Text style={styles.hierarchySubtitle}>
                Tiempo: {formatDurationLong(pedido.totalTime)} · Operarios: {pedido.operarios.size} · Fechas: {Array.from(pedido.fechas).join(', ')}
              </Text>
            </View>

            {Array.from(pedido.modulos.values())
              .sort((a, b) => a.modulo.localeCompare(b.modulo))
              .map((mod) => (
                <View key={mod.modulo} style={styles.moduloContainer}>
                  <View style={styles.moduloHeader}>
                    <Text style={styles.moduloTitle}>🔧 Módulo: {mod.modulo}</Text>
                    <Text style={styles.moduloSubtitle}>
                      Tiempo: {formatDurationLong(mod.totalTime)} · Operarios: {mod.operarios.size}
                    </Text>
                  </View>

                  {Array.from(mod.tareas.entries())
                    .sort((a, b) => a[0].localeCompare(b[0]))
                    .map(([tareaKey, lista]) => (
                      <View key={tareaKey} style={styles.tareaContainer}>
                        <Text style={styles.tareaTitle}>⚙️ Tarea: {tareaKey}</Text>
                        {lista
                          .sort((a, b) => a.operario.localeCompare(b.operario))
                          .map((hr) => (
                            <View key={`${tareaKey}-${hr.operario}`} style={styles.operarioRecord}>
                              <Text style={styles.operarioTitle}>👤 {hr.operario}</Text>
                              <Text style={styles.operarioStats}>
                                Registros: {hr.records.length} · Tiempo: {formatDurationLong(hr.totalTime)} · Fechas: {hr.fechas.join(', ')}
                              </Text>
                              <View style={styles.recordsContainer}>
                                {hr.records
                                  .sort((a, b) => recordTimestamp(a) - recordTimestamp(b))
                                  .map((r, idx) => (
                                    <View key={idx} style={styles.individualRecord}>
                                      <Text style={styles.recordText}>
                                        📅 {formatDateOnly(r.FechaInicio || r.Fecha)} · 🕐 {r.HoraInicio || '-'} → {r.HoraFin || '-'} · ⏱ {formatDurationLong(r.TiempoDedicado)}
                                      </Text>
                                      {r.CodigoPuesto && <Text style={styles.recordMeta}>Puesto: {r.CodigoPuesto}</Text>}
                                    </View>
                                  ))}
                              </View>
                            </View>
                          ))}
                      </View>
                    ))}
                </View>
              ))}
          </View>
        )}
      />
    );
  };

  const renderPedidoHierarchy = (records: TiempoRealRecord[]) => {
    const hierarchy = createHierarchicalStructure(records);
    const pedidos = Array.from(hierarchy.values()).sort((a, b) => a.pedido.localeCompare(b.pedido));
    return (
      <FlatList
        data={pedidos}
        keyExtractor={(p) => p.pedido}
        renderItem={({ item: pedido }) => (
          <View style={styles.hierarchyContainer}>
            <View style={styles.hierarchyHeader}>
              <Text style={styles.hierarchyTitle}>📋 Pedido: {pedido.pedido}</Text>
              <Text style={styles.hierarchySubtitle}>
                Tiempo: {formatDurationLong(pedido.totalTime)} · Operarios: {pedido.operarios.size} · Módulos: {pedido.modulos.size}
              </Text>
            </View>

            {Array.from(pedido.modulos.values()).map((mod) => (
              <View key={mod.modulo} style={styles.moduloContainer}>
                <Text style={styles.moduloTitle}>🔧 {mod.modulo}</Text>
                {Array.from(mod.tareas.entries()).map(([tareaKey, lista]) => (
                  <View key={tareaKey} style={styles.tareaContainer}>
                    <Text style={styles.tareaTitle}>⚙️ Tarea: {tareaKey}</Text>
                    {lista.map((hr) => (
                      <View key={`${tareaKey}-${hr.operario}`} style={styles.operarioRecord}>
                        <Text style={styles.operarioTitle}>👤 {hr.operario}</Text>
                        <Text style={styles.operarioStats}>
                          Registros: {hr.records.length} · Tiempo: {formatDurationLong(hr.totalTime)}
                        </Text>
                      </View>
                    ))}
                  </View>
                ))}
              </View>
            ))}
          </View>
        )}
      />
    );
  };

  const renderTareaHierarchy = (records: TiempoRealRecord[]) => {
    // reutilizamos createHierarchicalStructure pero agrupando por tarea
    const tareaMap = new Map<string, Map<string, PedidoGroup>>();
    for (const r of records) {
      const tarea = r.CodigoTarea || 'SIN_TAREA';
      if (!tareaMap.has(tarea)) tareaMap.set(tarea, new Map<string, PedidoGroup>());
      const pedMap = tareaMap.get(tarea)!;
      const partial = createHierarchicalStructure([r]);
      for (const [pedidoKey, pedGroup] of partial.entries()) {
        if (!pedMap.has(pedidoKey)) {
          pedMap.set(pedidoKey, {
            pedido: pedidoKey,
            modulos: new Map<string, ModuloGroup>(),
            totalTime: 0,
            operarios: new Set<string>(),
            fechas: new Set<string>()
          });
        }
        const target = pedMap.get(pedidoKey)!;
        target.totalTime += pedGroup.totalTime;
        pedGroup.operarios.forEach(o => target.operarios.add(o));
        pedGroup.fechas.forEach(f => target.fechas.add(f));
        for (const [modKey, modGroup] of pedGroup.modulos.entries()) {
          if (!target.modulos.has(modKey)) {
            target.modulos.set(modKey, {
              modulo: modKey,
              tareas: new Map<string, HierarchicalRecord[]>(),
              totalTime: 0,
              operarios: new Set<string>(),
              fechas: new Set<string>()
            });
          }
          const tgtMod = target.modulos.get(modKey)!;
          tgtMod.totalTime += modGroup.totalTime;
          modGroup.operarios.forEach(o => tgtMod.operarios.add(o));
          modGroup.fechas.forEach(f => tgtMod.fechas.add(f));
          for (const [tKey, hrs] of modGroup.tareas.entries()) {
            if (!tgtMod.tareas.has(tKey)) tgtMod.tareas.set(tKey, []);
            tgtMod.tareas.get(tKey)!.push(...hrs);
          }
        }
      }
    }
    const tareas = Array.from(tareaMap.entries()).sort((a, b) => a[0].localeCompare(b[0]));
    return (
      <FlatList
        data={tareas}
        keyExtractor={([t]) => t}
        renderItem={({ item: [tareaKey, pedMap] }) => (
          <View style={styles.hierarchyContainer}>
            <View style={styles.hierarchyHeader}>
              <Text style={styles.hierarchyTitle}>⚙️ Tarea: {tareaKey}</Text>
            </View>
            {Array.from(pedMap.values()).map((pedido) => (
              <View key={pedido.pedido} style={styles.pedidoInTareaContainer}>
                <Text style={styles.pedidoInTareaTitle}>📋 {pedido.pedido}</Text>
                {Array.from(pedido.modulos.values()).map((mod) => (
                  <View key={mod.modulo} style={styles.moduloContainer}>
                    <Text style={styles.moduloTitle}>🔧 {mod.modulo}</Text>
                    {(mod.tareas.get(tareaKey) || []).map((hr) => (
                      <View key={`${hr.operario}`} style={styles.operarioRecord}>
                        <Text style={styles.operarioTitle}>👤 {hr.operario}</Text>
                        <Text style={styles.operarioStats}>
                          Registros: {hr.records.length} · Tiempo: {formatDurationLong(hr.totalTime)}
                        </Text>
                      </View>
                    ))}
                  </View>
                ))}
              </View>
            ))}
          </View>
        )}
      />
    );
  };

  // ===================== Render principal =====================
  if (authLoading || loadingTiempo) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={COLORS.primary} />
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
        titleOverride="Análisis de Producción"
        count={tiempoRecords.length}
        userNameProp={userData?.nombre || userData?.name || '—'}
        roleProp={userData?.rol || userData?.role || '—'}
        serverReachableOverride={!!authenticated}
        onRefresh={() => fetchTiempoReal(formatDateOnly(fromDate.toISOString()), formatDateOnly(toDate.toISOString()))}
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

      {/* Filtros de fecha */}
      <View style={styles.dateFilterContainer}>
        {Platform.OS === 'web' ? (
          <>
            <View style={styles.dateInputContainer}>
              <Text style={styles.dateLabel}>Desde</Text>
              <TextInput
                style={styles.dateInput}
                value={formatDateOnly(fromDate.toISOString())}
                onChangeText={(v) => {
                  if (v) setFromDate(new Date(`${v}T00:00:00`));
                }}
                placeholder="YYYY-MM-DD"
              />
            </View>
            <View style={styles.dateInputContainer}>
              <Text style={styles.dateLabel}>Hasta</Text>
              <TextInput
                style={styles.dateInput}
                value={formatDateOnly(toDate.toISOString())}
                onChangeText={(v) => {
                  if (v) setToDate(new Date(`${v}T00:00:00`));
                }}
                placeholder="YYYY-MM-DD"
              />
            </View>
          </>
        ) : (
          <>
            <TouchableOpacity style={{ flex: 1 }} onPress={() => setShowFromPicker(true)}>
              <Text style={styles.dateLabel}>Desde</Text>
              <View style={styles.dateInput}><Text>{formatDateOnly(fromDate.toISOString())}</Text></View>
            </TouchableOpacity>
            {showFromPicker && (
              <DateTimePicker
                value={fromDate}
                mode="date"
                display="calendar"
                onChange={(event, selectedDate) => {
                  setShowFromPicker(false);
                  if (selectedDate) setFromDate(selectedDate);
                }}
              />
            )}
            <TouchableOpacity style={{ flex: 1 }} onPress={() => setShowToPicker(true)}>
              <Text style={styles.dateLabel}>Hasta</Text>
              <View style={styles.dateInput}><Text>{formatDateOnly(toDate.toISOString())}</Text></View>
            </TouchableOpacity>
            {showToPicker && (
              <DateTimePicker
                value={toDate}
                mode="date"
                display="calendar"
                onChange={(event, selectedDate) => {
                  setShowToPicker(false);
                  if (selectedDate) setToDate(selectedDate);
                }}
              />
            )}
          </>
        )}
        <TouchableOpacity
          style={styles.refreshButton}
          onPress={() => fetchTiempoReal(formatDateOnly(fromDate.toISOString()), formatDateOnly(toDate.toISOString()))}
        >
          <Ionicons name="refresh-outline" size={22} color={COLORS.primary} />
        </TouchableOpacity>
      </View>

      {/* Búsqueda */}
      <View style={styles.searchContainer}>
        <Ionicons name="search-outline" size={20} color="#757575" />
        <TextInput
          style={styles.searchInput}
          placeholder="Buscar operario / pedido / tarea / módulo"
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
      </View>

      {/* Filtros */}
      <View style={styles.filterContainer}>
        <TouchableOpacity
          style={[styles.filterButton, filterMode === 'operador' && styles.filterButtonActive]}
          onPress={() => setFilterMode('operador')}
        >
          <Text style={[styles.filterText, filterMode === 'operador' && styles.filterTextActive]}>
            Operadores · {counts.operador}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.filterButton, filterMode === 'tarea' && styles.filterButtonActive]}
          onPress={() => setFilterMode('tarea')}
        >
          <Text style={[styles.filterText, filterMode === 'tarea' && styles.filterTextActive]}>
            Tareas · {counts.tarea}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.filterButton, filterMode === 'pedido' && styles.filterButtonActive]}
          onPress={() => setFilterMode('pedido')}
        >
          <Text style={[styles.filterText, filterMode === 'pedido' && styles.filterTextActive]}>
            Pedidos · {counts.pedido}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Lista */}
      <FlatList
        data={filteredGroupedList}
        keyExtractor={(item) => item.key}
        style={styles.flatList}
        contentContainerStyle={{ paddingBottom: 24 }}
        renderItem={({ item }) => (
          <TouchableOpacity
            style={styles.card}
            onPress={() => {
              const all = tiempoRecords.filter((r) => {
                if (filterMode === 'operador') return operarioFirstNameKey(r.OperarioNombre || r.CodigoOperario) === item.key;
                if (filterMode === 'tarea') return String(r.CodigoTarea ?? 'SIN_TAREA') === item.key;
                return String(r.NumeroManual ?? 'SIN_PEDIDO') === item.key;
              });
              setDetailList(all.sort((a, b) => recordTimestamp(b) - recordTimestamp(a)));
              setSelectedGroupKey(item.key);
              setModalContext(filterMode);
              setDetailModalVisible(true);
            }}
          >
            <View style={styles.cardHeader}>
              <Text style={styles.cardTitle}>{item.key}</Text>
              <View style={styles.cardStats}>
                <Text style={styles.cardTime}>{formatHM(item.totalTiempo)}</Text>
                <Text style={styles.cardCount}>{item.count} registros</Text>
              </View>
            </View>

            <View style={styles.cardMetrics}>
              <View style={styles.metricItem}>
                <Text style={styles.metricLabel}>Fechas</Text>
                <Text style={styles.metricValue}>{item.minFecha} — {item.maxFecha}</Text>
              </View>
              <View style={styles.metricItem}>
                <Text style={styles.metricLabel}>
                  {filterMode !== 'pedido' ? 'Pedido(s)' : 'Tarea(s)'}
                </Text>
                <Text style={styles.metricValue}>
                  {filterMode !== 'pedido'
                    ? new Set(item.items.map((r: TiempoRealRecord) => r.NumeroManual)).size
                    : new Set(item.items.map((r: TiempoRealRecord) => r.CodigoTarea)).size}
                </Text>
              </View>
              <View style={styles.metricItem}>
                <Text style={styles.metricLabel}>
                  {filterMode === 'operador' ? 'Tarea(s)' : 'Operario(s)'}
                </Text>
                <Text style={styles.metricValue}>
                  {filterMode === 'operador'
                    ? new Set(item.items.map((r: TiempoRealRecord) => r.CodigoTarea)).size
                    : new Set(item.items.map((r: TiempoRealRecord) => operarioFirstNameKey(r.OperarioNombre || r.CodigoOperario))).size}
                </Text>
              </View>
            </View>

            <View style={styles.statsButton}>
              <Text style={styles.statsButtonText}>Ver detalle</Text>
              <Ionicons name="stats-chart-outline" size={16} color={COLORS.primary} />
            </View>
          </TouchableOpacity>
        )}
      />

      {/* Modal Jerárquico */}
      <Modal
        visible={detailModalVisible}
        animationType="slide"
        onRequestClose={() => setDetailModalVisible(false)}
      >
        <SafeAreaView style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>
              {modalContext === 'operador' && `Operario: ${selectedGroupKey}`}
              {modalContext === 'tarea' && `Tarea: ${selectedGroupKey}`}
              {modalContext === 'pedido' && `Pedido: ${selectedGroupKey}`}
            </Text>
            <TouchableOpacity onPress={() => setDetailModalVisible(false)} style={styles.closeButton}>
              <Ionicons name="close" size={24} color={COLORS.primary} />
            </TouchableOpacity>
          </View>

          <View style={{ flex: 1 }}>
            {modalContext === 'operador' && renderOperarioHierarchy(detailList)}
            {modalContext === 'tarea' && renderTareaHierarchy(detailList)}
            {modalContext === 'pedido' && renderPedidoHierarchy(detailList)}
          </View>
        </SafeAreaView>
      </Modal>

      {/* SQL Debug (opcional) */}
      {sqlVisible && <SQLModal visible={sqlVisible} onClose={() => setSqlVisible(false)} />}
    </SafeAreaView>
  );
}

// ===================== Estilos =====================
// Basados en tu archivo adjunto (mismos tokens y look&feel) + clases nuevas para jerarquías
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  center: {
    flex: 1, justifyContent: 'center', alignItems: 'center',
  },
  errorText: {
    color: 'red', fontSize: 16, textAlign: 'center',
  },

  // Fecha / filtros
  dateFilterContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: COLORS.surface,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
    gap: 12,
  },
  dateInputContainer: { flex: 1 },
  dateLabel: {
    fontSize: 12, color: COLORS.textSecondary, marginBottom: 4, fontWeight: '600',
  },
  dateInput: {
    borderWidth: 1, borderColor: '#ddd', borderRadius: 8,
    paddingHorizontal: 12, paddingVertical: 8, backgroundColor: '#fff',
  },
  refreshButton: {
    padding: 8, borderRadius: 8, backgroundColor: COLORS.surface, elevation: 2,
  },

  // Búsqueda
  searchContainer: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: COLORS.surface,
    marginHorizontal: 12, marginVertical: 8,
    paddingHorizontal: 12, borderRadius: 8,
    elevation: 2, shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1, shadowRadius: 2,
  },
  searchInput: {
    flex: 1, height: 40, marginLeft: 8, color: '#333', fontSize: 14,
  },

  // Botones filtro
  filterContainer: {
    flexDirection: 'row', paddingHorizontal: 12, paddingVertical: 8, justifyContent: 'space-between', gap: 8,
  },
  filterButton: {
    flex: 1, paddingHorizontal: 16, paddingVertical: 10, borderRadius: 20,
    backgroundColor: '#f5f5f5', borderWidth: 1, borderColor: '#ddd',
  },
  filterButtonActive: {
    backgroundColor: COLORS.primary, borderColor: COLORS.primary,
  },
  filterText: {
    fontSize: 13, fontWeight: '600', color: '#666', textAlign: 'center',
  },
  filterTextActive: { color: '#fff' },

  // Lista / tarjeta
  flatList: { flex: 1, paddingHorizontal: 12 },
  card: {
    backgroundColor: '#fff', marginVertical: 6, padding: 16, borderRadius: 12,
    elevation: 3, shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1, shadowRadius: 4,
  },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 },
  cardTitle: { fontSize: 18, fontWeight: 'bold', color: COLORS.primary, flex: 1, marginRight: 8 },
  cardStats: { alignItems: 'flex-end' },
  cardTime: { fontSize: 16, fontWeight: 'bold', color: '#2d3748' },
  cardCount: { fontSize: 12, color: '#718096', marginTop: 2 },
  cardMetrics: {
    flexDirection: 'row', justifyContent: 'space-between', marginBottom: 12, paddingTop: 12,
    borderTopWidth: 1, borderTopColor: '#f0f0f0',
  },
  metricItem: { alignItems: 'center', flex: 1 },
  metricLabel: { fontSize: 11, color: '#718096', fontWeight: '600', marginBottom: 2 },
  metricValue: { fontSize: 14, fontWeight: 'bold', color: '#2d3748' },
  statsButton: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    paddingVertical: 8, borderTopWidth: 1, borderTopColor: '#f0f0f0', marginTop: 8,
  },
  statsButtonText: { color: COLORS.primary, fontWeight: '600', marginRight: 4 },

  // Modal genérico
  modalContainer: { flex: 1, backgroundColor: COLORS.background },
  modalHeader: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0', backgroundColor: COLORS.surface,
  },
  modalTitle: { fontSize: 18, fontWeight: 'bold', color: COLORS.primary },
  closeButton: { padding: 8 },

  // Jerarquías
  hierarchyContainer: {
    backgroundColor: '#fff', margin: 12, borderRadius: 12, padding: 12,
    elevation: 2, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 3, shadowOffset: { width: 0, height: 1 },
  },
  hierarchyHeader: { borderBottomWidth: 1, borderBottomColor: '#f0f0f0', paddingBottom: 8, marginBottom: 8 },
  hierarchyTitle: { fontSize: 16, fontWeight: 'bold', color: '#2d3748' },
  hierarchySubtitle: { fontSize: 12, color: '#4a5568', marginTop: 2 },

  moduloContainer: { backgroundColor: '#f8f9fa', borderRadius: 8, padding: 10, marginTop: 8 },
  moduloHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  moduloTitle: { fontWeight: '700', color: COLORS.primary },
  moduloSubtitle: { color: '#4a5568' },

  tareaContainer: { marginTop: 8, backgroundColor: '#ffffff', borderRadius: 8, padding: 10, borderWidth: 1, borderColor: '#eef2f7' },
  tareaTitle: { fontWeight: '700', color: '#1f2937', marginBottom: 6 },

  operarioRecord: { paddingVertical: 8, borderTopWidth: 1, borderTopColor: '#f0f0f0' },
  operarioTitle: { fontWeight: '700', color: '#374151' },
  operarioStats: { color: '#4b5563', marginTop: 2 },

  recordsContainer: { marginTop: 6, backgroundColor: '#f9fafb', borderRadius: 6, padding: 8 },
  individualRecord: { paddingVertical: 6, borderBottomWidth: 1, borderBottomColor: '#e5e7eb' },
  recordText: { color: '#111827' },
  recordMeta: { color: '#6b7280', marginTop: 2 },

  pedidoInTareaContainer: { backgroundColor: '#fff', borderRadius: 8, padding: 10, marginTop: 8, borderWidth: 1, borderColor: '#eef2f7' },
  pedidoInTareaTitle: { fontWeight: '700', color: COLORS.primary, marginBottom: 6 },
});
