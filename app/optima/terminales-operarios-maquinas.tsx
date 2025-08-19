// app/(control-optima)/terminales-operarios-maquinas.tsx
import Ionicons from '@expo/vector-icons/Ionicons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Picker } from '@react-native-picker/picker';
import { Stack } from 'expo-router';
import React, { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Platform,
  Pressable,
  ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import AppHeader from '../../components/AppHeader';
import ModalHeader from '../../components/ModalHeader';
import { API_URL } from '../../config/constants';
import { useOfflineMode } from '../../hooks/useOfflineMode';

// ===== Tipos =====
type ActivaMaquina = { Maquina: string; Registros: number; Segundos: number };
type ActivoOperario = { Operario: string; Registros: number; Segundos: number };
type MatrixItem = { Maquina: string; Operario: string; Registros: number; Segundos: number };

type RawItem = {
  Pedido: string; IdPedido: number; Linea: number;
  Maquina: string; CodProceso: string; DescProceso: string;
  Operario: string; DateStart: string; DateEnd: string; Segundos: number;
};
type ResumenPedido = {
  Operario: string; Pedido: string; IdPedido: number;
  Registros: number; Segundos: number; Inicio: string; Fin: string;
};
type ResumenMaqProc = {
  Operario: string; Maquina: string; CodProceso: string; DescProceso: string;
  Registros: number; Segundos: number; Inicio: string; Fin: string;
};
type OrderOverview = {
  Pedido: string; IdPedido: number; Cliente: string; NombrePedido: string;
  Inicio: string; Fin: string; SegundosMakespan: number; MakespanHHMMSS: string;
  SegundosBrutos: number; SegundosUnicos: number; TiempoUnicoHHMMSS: string;
  Piezas: number; Area: number;
};
type MaqResumenOperario = { Maquina: string; Operario: string; Registros: number; Segundos: number; Inicio: string; Fin: string; };
type MaqResumenPedido = { Maquina: string; Pedido: string; IdPedido: number; Registros: number; Segundos: number; Inicio: string; Fin: string; };

type LookupPedido = { Pedido: string; IdPedido: number; Cliente: string };

// ===== Utiles =====
const pad = (n: number) => (n < 10 ? `0${n}` : `${n}`);

const secsHHMMSS = (x?: number) => {
  const s = Number.isFinite(x as number) ? Math.max(0, Math.floor(x as number)) : 0;
  const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), ss = s % 60;
  return `${pad(h)}:${pad(m)}:${pad(ss)}`;
};


const todayYMD = () => { const d = new Date(); return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`; };
const monthStartYMD = () => { const d = new Date(); return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-01`; };
const prettyDate = (v?: any) => {
  if (!v) return '—';
  const s = String(v); const d = new Date(s);
  return isNaN(d.getTime()) ? s : d.toLocaleString();
};

async function getJSON(url: string) {
  const r = await fetch(url);
  const text = await r.text(); // para poder mostrar errores crudos si viniera HTML
  let data: any;
  try { data = text ? JSON.parse(text) : null; }
  catch { throw new Error('Respuesta no es JSON válido.\n\nRespuesta cruda\n' + text.slice(0, 800)); }
  if (!r.ok) throw new Error(data?.message || `HTTP ${r.status}`);
  return data;
}

// ===== Componente =====
export default function TerminalesOperariosMaquinas() {
  const { serverReachable } = useOfflineMode();

  // usuario/rol (igual que en terminales)
  const [userName, setUserName] = useState<string>('—');
  const [userRole, setUserRole] = useState<string>('—');
  const [userModalVisible, setUserModalVisible] = useState(false);
  const [modalUser, setModalUser] = useState({ userName: '', role: '' });

  // filtros
  const [from, setFrom] = useState<string>(monthStartYMD());
  const [to, setTo] = useState<string>(todayYMD());
  const [q, setQ] = useState('');

  // selects
  const [maquinas, setMaquinas] = useState<ActivaMaquina[]>([]);
  const [operarios, setOperarios] = useState<ActivoOperario[]>([]);
  const [selMaquina, setSelMaquina] = useState<string>('');
  const [selOperario, setSelOperario] = useState<string>('');

  // datos
  const [matrix, setMatrix] = useState<MatrixItem[]>([]);
  const [raw, setRaw] = useState<RawItem[]>([]);
  const [resPedido, setResPedido] = useState<ResumenPedido[]>([]);
  const [resMaqProc, setResMaqProc] = useState<ResumenMaqProc[]>([]);

  // estado
  const [loading, setLoading] = useState<boolean>(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // pestañas
  // (máquina, operario, pedido)
  const [allOperarios, setAllOperarios] = useState<string[]>([]);
  const [allMaquinas, setAllMaquinas] = useState<string[]>([]);
  const [allPedidos, setAllPedidos] = useState<LookupPedido[]>([]);


  const [tab, setTab] = useState<'MAQ' | 'OP' | 'PED'>('OP');


  // Máquina
  const [maqResOps, setMaqResOps] = useState<MaqResumenOperario[]>([]);
  const [maqResPedidos, setMaqResPedidos] = useState<MaqResumenPedido[]>([]);
  const [maqRaw, setMaqRaw] = useState<RawItem[]>([]);

  // Pedido
  const [pedidoInput, setPedidoInput] = useState<string>('');
  const [idPedidoInput, setIdPedidoInput] = useState<string>('');
  const [orderOverview, setOrderOverview] = useState<OrderOverview | null>(null);
  const [orderProcesos, setOrderProcesos] = useState<any[]>([]);
  const [orderRaw, setOrderRaw] = useState<RawItem[]>([]);


  // endpoints base (idéntico patrón a terminales)
  const EP = {
    machines: `${API_URL}/control-optima/qw/machines`,
    operators: `${API_URL}/control-optima/qw/operators`,
    matrix: `${API_URL}/control-optima/qw/matrix`,
    raw: `${API_URL}/control-optima/qw/operario/raw`,
    resPedidos: `${API_URL}/control-optima/qw/operario/resumen-pedidos`,
    resMaqProc: `${API_URL}/control-optima/qw/operario/resumen-maquina-proceso`,
  };

  // Totales desde backend
  const [totalOps, setTotalOps] = useState(0);
  const [totalMaqs, setTotalMaqs] = useState(0);
  const [totalPeds, setTotalPeds] = useState(0);
  // Búsqueda de pedidos aparte
  const [qPedido, setQPedido] = useState('');
  const searchDebRef = useRef<ReturnType<typeof setTimeout> | null>(null);
const triggerPedidoSearch = () => {
  if (searchDebRef.current) clearTimeout(searchDebRef.current);
  searchDebRef.current = setTimeout(() => { searchPedidosBackend().catch(()=>{}); }, 300);
};
  // Calendario nativo (si está instalado)
  const [DatePickerComp, setDatePickerComp] = useState<any>(null);
  const [showFromCal, setShowFromCal] = useState(false);
  const [showToCal, setShowToCal] = useState(false);



  const ymd = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

  // usuario igual que terminales
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

  const setThisMonth = () => { setFrom(monthStartYMD()); setTo(todayYMD()); };

  // ==== Cargas ====
  const qs = (extra?: Record<string, string>) => {
    const params = new URLSearchParams({ from, to, ...(extra || {}) });
    return `?${params.toString()}`;
  };

  async function searchPedidosBackend() {
    const term = qPedido.trim();
    if (!term) { await loadLookups(); return; } // reset a todo
    const url = new URL(`${API_URL}/control-optima/qw/lookups`);
    url.searchParams.set('q', term);
    url.searchParams.set('limit', '100');
    const r = await getJSON(url.toString());
    setAllPedidos(r?.pedidos || []);
    setTotalPeds(Number(r?.totalPedidos || 0));
  }



  async function loadLookups(q?: string) {
    const url = new URL(`${API_URL}/control-optima/qw/lookups`);
    if (q && q.trim()) url.searchParams.set('q', q.trim());
    url.searchParams.set('limit', '5000'); // ajusta si necesitas más
    const r = await getJSON(url.toString());
    setAllOperarios((r?.operarios || []).map((x: any) => x.Operario).filter(Boolean));
    setAllMaquinas((r?.maquinas || []).map((x: any) => x.Maquina).filter(Boolean));
    setAllPedidos(r?.pedidos || []);
    setTotalOps(Number(r?.totalOperarios || 0));
    setTotalMaqs(Number(r?.totalMaquinas || 0));
    setTotalPeds(Number(r?.totalPedidos || 0));
  }


  const loadMatrix = async () => {
    const extra: Record<string, string> = {};
    if (selMaquina) extra.maquina = selMaquina;
    if (selOperario) extra.operario = selOperario;
    const m = await getJSON(EP.matrix + qs(extra));
    setMatrix(Array.isArray(m?.data) ? m.data : []);
  };

  async function loadMachineBlocks() {
    if (!selMaquina) return;
    const qs = (o: any) =>
      Object.entries(o).filter(([, v]) => v !== undefined && v !== null && `${v}` !== '')
        .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(String(v))}`).join('&');

    const base = `${API_URL}/control-optima/qw/machine`;
    const params = { from, to, maquina: selMaquina, operario: selOperario || '' };

    const [r1, r2, r3] = await Promise.all([
      getJSON(`${base}/resumen-operarios?${qs(params)}`),
      getJSON(`${base}/resumen-pedidos?${qs(params)}`),
      getJSON(`${base}/raw?${qs(params)}`),
    ]);
    setMaqResOps(r1?.data || []);
    setMaqResPedidos(r2?.data || []);
    setMaqRaw(r3?.data || []);
  }

  async function loadOrderBlocks() {
    const hasPedido = !!pedidoInput?.trim();
    const hasId = !!idPedidoInput?.trim();
    if (!hasPedido && !hasId) return;

    const qs = (o: any) =>
      Object.entries(o).filter(([, v]) => v !== undefined && v !== null && `${v}` !== '')
        .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(String(v))}`).join('&');

    const params = { from, to, pedido: hasPedido ? pedidoInput.trim() : '', idPedido: hasId ? idPedidoInput.trim() : '' };

    const [ov, pr, rw] = await Promise.all([
      getJSON(`${API_URL}/control-optima/qw/order/overview?${qs(params)}`),
      getJSON(`${API_URL}/control-optima/qw/order/procesos?${qs(params)}`),
      getJSON(`${API_URL}/control-optima/qw/order/raw?${qs(params)}`),
    ]);
    setOrderOverview(ov?.data || null);
    setOrderProcesos(pr?.data || []);
    setOrderRaw(rw?.data || []);
  }





  const loadOperarioBlocks = async () => {
    if (!selOperario) { setRaw([]); setResPedido([]); setResMaqProc([]); return; }
    const extra: Record<string, string> = { operario: selOperario };
    if (selMaquina) extra.maquina = selMaquina;

    const [r1, r2, r3] = await Promise.all([
      getJSON(EP.raw + qs(extra)),
      getJSON(EP.resPedidos + qs(extra)),
      getJSON(EP.resMaqProc + qs(extra)),
    ]);
    setRaw(Array.isArray(r1?.data) ? r1.data : []);
    setResPedido(Array.isArray(r2?.data) ? r2.data : []);
    setResMaqProc(Array.isArray(r3?.data) ? r3.data : []);
  };

  const applyAll = async () => {
    setLoading(true); setErrorMsg(null);
    try {
      await loadLookups();
      await loadMatrix();
      await loadOperarioBlocks();
    } catch (e: any) {
      setErrorMsg(e?.message || 'Error consultando el backend.');
      setMaquinas([]); setOperarios([]); setMatrix([]); setRaw([]); setResPedido([]); setResMaqProc([]);
    } finally { setLoading(false); }
  };

  useEffect(() => { applyAll(); /* carga inicial */ }, []);
  useEffect(() => {
    (async () => {
      setLoading(true); setErrorMsg(null);
      try { await loadMatrix(); await loadOperarioBlocks(); } catch (e: any) { setErrorMsg(e?.message || 'Error'); }
      finally { setLoading(false); }
    })();
  }, [selMaquina, selOperario]);

  // filtros de búsqueda (aplicados a listas largas)
  const t = q.trim().toLowerCase();
  const filterObj = <T extends object>(arr: T[]) =>
    t ? arr.filter((r) => JSON.stringify(r).toLowerCase().includes(t)) : arr;

  // KPIs
  const kpiMaquinas = maquinas.length;
  const kpiOperarios = operarios.length;

  // ==== Render ====
  const Row = ({ label, value }: { label: string; value: any }) => (
    <View style={styles.rowLine}><Text style={styles.rowLabel}>{label}:</Text><Text style={styles.rowValue}>{String(value ?? '—')}</Text></View>
  );

  const renderMatrix = ({ item }: { item: MatrixItem }) => (
    <TouchableOpacity style={styles.cardSm}>
      <Text style={styles.title}>{item.Maquina} · {item.Operario}</Text>
      <Row label="Registros" value={item.Registros} />
      <Row label="Segundos" value={item.Segundos} />
    </TouchableOpacity>
  );

  const renderRaw = ({ item }: { item: RawItem }) => (
    <TouchableOpacity style={styles.card}>
      <Text style={styles.title}>{item.Pedido} · {item.Operario}</Text>
      <Text style={styles.sub}>{item.Maquina} · {item.CodProceso} — {item.DescProceso}</Text>
      <Row label="Inicio" value={prettyDate(item.DateStart)} />
      <Row label="Fin" value={prettyDate(item.DateEnd)} />
      <Row label="Segundos" value={item.Segundos} />
      <Row label="Línea" value={item.Linea} />
    </TouchableOpacity>
  );

  const renderResPedido = ({ item }: { item: ResumenPedido }) => (
    <TouchableOpacity style={styles.cardSm}>
      <Text style={styles.title}>{item.Operario} · {item.Pedido}</Text>
      <Row label="Registros" value={item.Registros} />
      <Row label="Segundos" value={item.Segundos} />
      <Row label="Inicio" value={prettyDate(item.Inicio)} />
      <Row label="Fin" value={prettyDate(item.Fin)} />
    </TouchableOpacity>
  );

  const renderResMaqProc = ({ item }: { item: ResumenMaqProc }) => (
    <TouchableOpacity style={styles.cardSm}>
      <Text style={styles.title}>{item.Operario} · {item.Maquina}</Text>
      <Text style={styles.sub}>{item.CodProceso} — {item.DescProceso}</Text>
      <Row label="Registros" value={item.Registros} />
      <Row label="Segundos" value={item.Segundos} />
      <Row label="Inicio" value={prettyDate(item.Inicio)} />
      <Row label="Fin" value={prettyDate(item.Fin)} />
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container}>
      <Stack.Screen options={{ title: 'Terminales · Operarios · Máquinas' }} />

      <AppHeader
        titleOverride="Terminales · Operarios · Máquinas"
        count={matrix.length}
        userNameProp={userName}
        roleProp={userRole}
        serverReachableOverride={!!serverReachable}
        onRefresh={applyAll}
        onUserPress={({ userName, role }) => { setModalUser({ userName, role }); setUserModalVisible(true); }}
      />
      <ModalHeader
        visible={userModalVisible}
        onClose={() => setUserModalVisible(false)}
        userName={modalUser.userName || userName}
        role={modalUser.role || userRole}
      />


      {/* pestañas */}
      <View style={styles.tabBar}>
        {[
          { k: 'MAQ', label: 'Máquina', icon: 'hardware-chip-outline' },
          { k: 'OP', label: 'Operario', icon: 'person-outline' },
          { k: 'PED', label: 'Pedido', icon: 'receipt-outline' },
        ].map(t => (
          <Pressable key={t.k} onPress={() => setTab(t.k as any)} style={[styles.tabBtn, tab === t.k && styles.tabBtnActive]}>
            <Ionicons name={t.icon as any} size={16} />
            <Text style={[styles.tabBtnText, tab === t.k && styles.tabBtnTextActive]}>{t.label}</Text>
          </Pressable>
        ))}
      </View>


      {/* controles de pestañas */}


      {tab === 'MAQ' && (
        <View style={styles.panel}>
          <View style={styles.row}>
            {/* ya tienes el Picker de máquina; reutilízalo */}
            <TouchableOpacity style={styles.btn} onPress={loadMachineBlocks}>
              <Text style={styles.btnTxt}>Cargar máquina</Text>
            </TouchableOpacity>
          </View>

          <Text style={styles.h3}>Operarios de la máquina</Text>
          <FlatList data={maqResOps} keyExtractor={(x, i) => `${x.Operario}-${i}`}
            renderItem={({ item }) => (
              <View style={styles.itemRow}>
                <Text style={styles.itemL}>{item.Operario}</Text>
                <Text style={styles.itemR}>{secsHHMMSS(item.Segundos)}</Text>
              </View>
            )}
          />

          <Text style={styles.h3}>Pedidos en la máquina</Text>
          <FlatList data={maqResPedidos} keyExtractor={(x, i) => `${x.Pedido}-${i}`}
            renderItem={({ item }) => (
              <View style={styles.itemRow}>
                <Text style={styles.itemL}>{item.Pedido}</Text>
                <Text style={styles.itemR}>{secsHHMMSS(item.Segundos)}</Text>
              </View>
            )}
          />

          <Text style={styles.h3}>Eventos</Text>
          <FlatList data={maqRaw} keyExtractor={(x, i) => `${x.Pedido}-${x.Linea}-${i}`}
            renderItem={({ item }) => (
              <View style={styles.itemRow}>
                <Text style={styles.itemL}>{`${item.DateStart} · ${item.Maquina} · ${item.DescProceso}`}</Text>
                <Text style={styles.itemR}>{secsHHMMSS(item.Segundos)}</Text>
              </View>
            )}
          />
        </View>
      )}














      {tab === 'PED' && (
        <>
          <Text style={styles.dateLabel}>Pedido</Text>
          <View style={[styles.row, { marginBottom: 6 }]}>
            <View style={[styles.search, { flex: 1 }]}>
              <Ionicons name="search-outline" size={18} color="#757575" />
              <TextInput
                style={styles.searchInput}
                placeholder="Buscar pedido (RIF, cliente, Id)…"
                value={qPedido}
                onChangeText={(v)=>{ setQPedido(v); triggerPedidoSearch(); }}
                onSubmitEditing={searchPedidosBackend}
                returnKeyType="search"
              />
            </View>
            <Pressable style={styles.btn} onPress={searchPedidosBackend}>
              <Ionicons name="search" size={18} /><Text style={styles.btnText}>Buscar</Text>
            </Pressable>
            <Pressable style={[styles.btn, styles.btnGhost]} onPress={() => { setQPedido(''); loadLookups(); }}>
              <Ionicons name="close-circle-outline" size={18} /><Text style={styles.btnText}>Limpiar</Text>
            </Pressable>
          </View>
          <View style={styles.pickerWrap}>
            <Picker
              selectedValue={pedidoInput}
              onValueChange={(rif) => {
                setPedidoInput(rif);
                const p = allPedidos.find(x => x.Pedido === rif);
                setIdPedidoInput(p ? String(p.IdPedido) : '');
              }}
            >
              <Picker.Item label={`(seleccione pedido) — ${allPedidos.length}/${totalPeds}`} value="" />
              {allPedidos.map(p => (
                <Picker.Item key={`${p.Pedido}-${p.IdPedido}`} label={`${p.Pedido} · ${p.Cliente}`} value={p.Pedido} />
              ))}
            </Picker>
          </View>
        </>
      )}















      {tab === 'OP' && (
        // deja tu vista actual de Operario tal cual
        <View style={styles.panel}>
          {/* ... tus matrices, resúmenes y raw ... */}
        </View>
      )}

      {tab === 'PED' && (
        <View style={styles.panel}>
          <View style={styles.row}>
            <TextInput
  value={pedidoInput}
  onChangeText={(v)=>{ setPedidoInput(v); setQPedido(v); triggerPedidoSearch(); }}
  style={styles.input}
  placeholder="Pedido (RIF)"
/>
            <Text style={{ marginHorizontal: 8 }}>o</Text>
           <TextInput
  value={idPedidoInput}
  onChangeText={(v)=>{ setIdPedidoInput(v); setQPedido(v); triggerPedidoSearch(); }}
  style={styles.input}
  placeholder="IdPedido"
/>
            <TouchableOpacity style={styles.btn} onPress={loadOrderBlocks}>
              <Text style={styles.btnTxt}>Cargar pedido</Text>
            </TouchableOpacity>
          </View>

          {!!orderOverview && (
            <View style={styles.card}>
              <Text style={styles.h3}>{orderOverview.Pedido} · {orderOverview.Cliente}</Text>
              <Text>{orderOverview.NombrePedido}</Text>
              <Text>Inicio: {prettyDate(orderOverview.Inicio)}  ·  Fin: {prettyDate(orderOverview.Fin)}</Text>
              <Text>Makespan: {orderOverview.MakespanHHMMSS} · Únicos: {orderOverview.TiempoUnicoHHMMSS}</Text>
              <Text>Piezas: {orderOverview.Piezas} · Área: {orderOverview.Area}</Text>
            </View>
          )}

          <Text style={styles.h3}>Procesos por línea</Text>
          <FlatList data={orderProcesos} keyExtractor={(x, i) => `${x.Linea}-${x.CodProceso}-${i}`}
            renderItem={({ item }) => (
              <View style={styles.itemRow}>
                <Text style={styles.itemL}>{`L${item.Linea} · ${item.Maquina} · ${item.DescProceso} · [${item.Operarios}]`}</Text>
                <Text style={styles.itemR}>{secsHHMMSS(item.Segundos)}</Text>
              </View>
            )}
          />

          <Text style={styles.h3}>Eventos</Text>
          <FlatList data={orderRaw} keyExtractor={(x, i) => `${x.Linea}-${x.Maquina}-${x.CodProceso}-${i}`}
            renderItem={({ item }) => (
              <View style={styles.itemRow}>
                <Text style={styles.itemL}>{`${item.DateStart} · ${item.Maquina} · ${item.DescProceso} · ${item.Operario}`}</Text>
                <Text style={styles.itemR}>{secsHHMMSS(item.Segundos)}</Text>
              </View>
            )}
          />
        </View>
      )}



      {/* Filtros */}
      <View style={styles.filters}>
        <View style={styles.dateRow}>

          <View style={styles.dateCol}>
            <Text style={styles.dateLabel}>Desde</Text>
            <View style={styles.dateInputWrap}>
              <TextInput value={from} onChangeText={setFrom} placeholder="YYYY-MM-DD" autoCapitalize="none" style={styles.dateInputField} />
              <Pressable
                onPress={() => {
                  if (Platform.OS === 'web') {
                    // fallback web: prompt
                    // @ts-ignore
                    const v = window.prompt('Fecha (YYYY-MM-DD):', from);
                    if (v) setFrom(v);
                    return;
                  }
                  try {
                    const comp = require('@react-native-community/datetimepicker').default;
                    setDatePickerComp(comp);
                    setShowFromCal(true);
                  } catch {
                    Alert.alert('Calendario no disponible', 'Instala @react-native-community/datetimepicker o escribe la fecha manualmente.');
                  }
                }}
              >
                <Ionicons name="calendar-outline" size={18} />
              </Pressable>
            </View>
            {showFromCal && DatePickerComp && (
              <DatePickerComp
                value={new Date(from || todayYMD())}
                mode="date"
                display="default"
                onChange={(_: any, d?: Date) => { setShowFromCal(false); if (d) setFrom(ymd(d)); }}
              />
            )}
          </View>


          <View style={styles.dateCol}>
            <Text style={styles.dateLabel}>Hasta</Text>
            <View style={styles.dateInputWrap}>
              <TextInput value={to} onChangeText={setTo} placeholder="YYYY-MM-DD" autoCapitalize="none" style={styles.dateInputField} />
              <Pressable
                onPress={() => {
                  if (Platform.OS === 'web') {
                    // @ts-ignore
                    const v = window.prompt('Fecha (YYYY-MM-DD):', to);
                    if (v) setTo(v);
                    return;
                  }
                  try {
                    const comp = require('@react-native-community/datetimepicker').default;
                    setDatePickerComp(comp);
                    setShowToCal(true);
                  } catch {
                    Alert.alert('Calendario no disponible', 'Instala @react-native-community/datetimepicker o escribe la fecha manualmente.');
                  }
                }}
              >
                <Ionicons name="calendar-outline" size={18} />
              </Pressable>
            </View>
            {showToCal && DatePickerComp && (
              <DatePickerComp
                value={new Date(to || todayYMD())}
                mode="date"
                display="default"
                onChange={(_: any, d?: Date) => { setShowToCal(false); if (d) setTo(ymd(d)); }}
              />
            )}
          </View>




        </View>

        <View style={styles.pickersRow}>
          <View style={styles.pickerCol}>
            <Text style={styles.dateLabel}>Máquina</Text>
            <View style={styles.pickerWrap}>
              <Picker selectedValue={selMaquina} onValueChange={setSelMaquina}>
                <Picker.Item label="(todas)" value="" />
                {allMaquinas.map(m => <Picker.Item key={m} label={m} value={m} />)}
              </Picker>
            </View>
          </View>
          <View style={styles.pickerCol}>
            <Text style={styles.dateLabel}>Operario</Text>
            <View style={styles.pickerWrap}>
              <Picker selectedValue={selOperario} onValueChange={setSelOperario}>
                <Picker.Item label="(todos)" value="" />
                {allOperarios.map(o => <Picker.Item key={o} label={o} value={o} />)}
              </Picker>
            </View>
          </View>
        </View>

        <View style={styles.actionsRow}>
          <Pressable style={styles.btn} onPress={applyAll}>
            <Ionicons name="refresh" size={18} /><Text style={styles.btnText}>Aplicar</Text>
          </Pressable>
          <Pressable style={[styles.btn, styles.btnGhost]} onPress={setThisMonth}>
            <Ionicons name="calendar" size={18} /><Text style={styles.btnText}>Mes actual</Text>
          </Pressable>
          <View style={styles.search}>
            <Ionicons name="search-outline" size={18} color="#757575" />
            <TextInput style={styles.searchInput} placeholder="Buscar…" value={q} onChangeText={setQ} />
          </View>
        </View>
      </View>

      {loading ? (
        <View style={{ padding: 16 }}><ActivityIndicator /><Text style={{ textAlign: 'center', marginTop: 8 }}>Cargando…</Text></View>
      ) : errorMsg ? (
        <View style={styles.error}><Text style={styles.errorText}>Error</Text><Text>{errorMsg}</Text></View>
      ) : (
        <ScrollView style={{ flex: 1 }}>
          {/* KPIs */}
          <View style={styles.kpisRow}>
            <View style={styles.kpi}><Text style={styles.kpiValue}>{kpiMaquinas}</Text><Text style={styles.kpiLabel}>Máquinas activas (rango)</Text></View>
            <View style={styles.kpi}><Text style={styles.kpiValue}>{kpiOperarios}</Text><Text style={styles.kpiLabel}>Operarios activos (rango)</Text></View>
          </View>
          <View style={styles.kpisRow}>
            <View style={styles.kpi}><Text style={styles.kpiValue}>{`${allMaquinas.length}/${totalMaqs}`}</Text><Text style={styles.kpiLabel}>Máquinas (catálogo)</Text></View>
            <View style={styles.kpi}><Text style={styles.kpiValue}>{`${allOperarios.length}/${totalOps}`}</Text><Text style={styles.kpiLabel}>Operarios (catálogo)</Text></View>
            <View style={styles.kpi}><Text style={styles.kpiValue}>{`${allPedidos.length}/${totalPeds}`}</Text><Text style={styles.kpiLabel}>Pedidos (catálogo)</Text></View>
          </View>

          {/* MATRIZ */}
          <Text style={styles.sectionTitle}>Relación máquina–operario (rango)</Text>
          <FlatList
            data={filterObj(matrix)}
            keyExtractor={(_, i) => String(i)}
            renderItem={renderMatrix}
            contentContainerStyle={{ paddingBottom: 12 }}
          />

          {/* DETALLE CRUDO POR OPERARIO */}
          <Text style={styles.sectionTitle}>Detalle crudo por operario {selOperario ? `(${selOperario})` : ''}</Text>
          <FlatList
            data={filterObj(raw)}
            keyExtractor={(_, i) => String(i)}
            renderItem={renderRaw}
            contentContainerStyle={{ paddingBottom: 12 }}
          />

          {/* RESUMEN POR OPERARIO → PEDIDO */}
          <Text style={styles.sectionTitle}>Resumen por operario → pedido</Text>
          <FlatList
            data={filterObj(resPedido)}
            keyExtractor={(_, i) => String(i)}
            renderItem={renderResPedido}
            contentContainerStyle={{ paddingBottom: 12 }}
          />

          {/* RESUMEN POR OPERARIO → MÁQUINA/PROCESO */}
          <Text style={styles.sectionTitle}>Resumen por operario → máquina/proceso</Text>
          <FlatList
            data={filterObj(resMaqProc)}
            keyExtractor={(_, i) => String(i)}
            renderItem={renderResMaqProc}
            contentContainerStyle={{ paddingBottom: 24 }}
          />
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

// ===== Estilos (mismo lenguaje visual de "terminales") =====
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },

  filters: { padding: 12, gap: 10, borderBottomWidth: 1, borderBottomColor: '#eee' },
  dateRow: { flexDirection: 'row', gap: 12 },
  dateCol: { flex: 1 },
  dateLabel: { fontSize: 12, color: '#666', marginBottom: 4 },

  dateInputWrap: { flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: '#ddd', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 6, gap: 8 },
  dateInputField: { flex: 1, paddingVertical: 2 },



  pickersRow: { flexDirection: 'row', gap: 12 },
  pickerCol: { flex: 1 },
  pickerWrap: { borderWidth: 1, borderColor: '#ddd', borderRadius: 8, overflow: 'hidden' },

  actionsRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  btn: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: '#2e78b7', paddingVertical: 8, paddingHorizontal: 12, borderRadius: 8 },
  btnGhost: { backgroundColor: '#e7f1fa' },
  btnText: { color: '#fff', fontWeight: '600' },

  search: { flexDirection: 'row', alignItems: 'center', gap: 6, borderWidth: 1, borderColor: '#ddd', borderRadius: 8, paddingHorizontal: 8, paddingVertical: 6, flex: 1 },
  searchInput: { flex: 1 },

  sectionTitle: { fontSize: 16, fontWeight: '700', paddingHorizontal: 12, paddingTop: 16, paddingBottom: 8 },

  card: { backgroundColor: '#fafafa', borderWidth: 1, borderColor: '#eee', borderRadius: 10, padding: 12, marginHorizontal: 12, marginBottom: 10 },
  cardSm: { backgroundColor: '#fbfdff', borderWidth: 1, borderColor: '#e6f0f8', borderRadius: 10, padding: 10, marginHorizontal: 12, marginBottom: 8 },
  title: { fontWeight: '700', marginBottom: 4 },
  sub: { color: '#555', marginBottom: 6 },

  rowLine: { flexDirection: 'row', gap: 8 },
  rowLabel: { width: 100, color: '#666' },
  rowValue: { flex: 1, fontWeight: '500' },

  kpisRow: { flexDirection: 'row', gap: 12, paddingHorizontal: 12, paddingTop: 8 },
  kpi: { flex: 1, backgroundColor: '#f7fbff', borderWidth: 1, borderColor: '#e5f0fb', borderRadius: 12, padding: 12, alignItems: 'center' },
  kpiValue: { fontSize: 22, fontWeight: '800' },
  kpiLabel: { fontSize: 12, color: '#666' },

  error: { padding: 12, margin: 12, borderWidth: 1, borderColor: '#f3c0c0', backgroundColor: '#fff5f5', borderRadius: 8 },
  errorText: { color: '#b00020', fontWeight: '700', marginBottom: 4 },
  tabBar: { flexDirection: 'row', gap: 8, paddingVertical: 6, alignItems: 'center', justifyContent: 'center' },
  tabBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 14, borderWidth: 1, borderColor: '#444' },
  tabBtnActive: { backgroundColor: '#2a2a2a' },
  tabBtnText: { fontSize: 13 },
  tabBtnTextActive: { fontWeight: '600' },
  panel: { gap: 10, paddingVertical: 8 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  input: { flex: 1, borderWidth: 1, borderColor: '#444', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 8, color: '#111' },

  btnTxt: { color: '#fff', fontWeight: '600' },

  h3: { fontSize: 16, fontWeight: '700', marginTop: 6, marginBottom: 4 },
  itemRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 6, borderBottomWidth: StyleSheet.hairlineWidth, borderColor: '#333' },
  itemL: { flex: 1, paddingRight: 8 },
  itemR: { fontVariant: ['tabular-nums'] },

});
