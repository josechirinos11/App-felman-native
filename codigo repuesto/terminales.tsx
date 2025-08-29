import Ionicons from '@expo/vector-icons/Ionicons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Stack } from 'expo-router';
import React, { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator, FlatList, Modal, Pressable,
  ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import AppHeader from '../components/AppHeader';
import ModalHeader from '../components/ModalHeader';
import { API_URL } from '../config/constants';
import { useOfflineMode } from '../hooks/useOfflineMode';

type Row = Record<string, any>;

const pad = (n: number) => (n < 10 ? `0${n}` : `${n}`);
const todayYMD = () => {
  const d = new Date();
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
};
const monthStartYMD = () => {
  const d = new Date();
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-01`;
};
const prettyDate = (v?: any) => {
  if (!v) return '—';
  const s = String(v);
  const d = new Date(s);
  return isNaN(d.getTime()) ? s : d.toLocaleString();
};

export default function ControlTerminalesAlmassera() {
  const { serverReachable } = useOfflineMode();

  // usuario/rol
  const [userName, setUserName] = useState<string>('—');
  const [userRole, setUserRole] = useState<string>('—');
  const [userModalVisible, setUserModalVisible] = useState(false);
  const [modalUser, setModalUser] = useState({ userName: '', role: '' });

  // filtros
  const [from, setFrom] = useState<string>(monthStartYMD());
  const [to, setTo] = useState<string>(todayYMD());

  // datos
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState('');

  // modales
  const [detailVisible, setDetailVisible] = useState(false);
  const [selected, setSelected] = useState<Row | null>(null);

  // SQL runner opcional
  const [sqlVisible, setSqlVisible] = useState(false);
  const [sqlText, setSqlText] = useState('SELECT TOP 50 * FROM dbo.QUEUEWORK');
  const [sqlData, setSqlData] = useState<Row[] | null>(null);
  const [sqlLoading, setSqlLoading] = useState(false);
  const [sqlError, setSqlError] = useState<string | null>(null);

  const ENDPOINT = `${API_URL}/control-optima/terminales`;

  const [errorMsg, setErrorMsg] = useState<string | null>(null);
const [rawResponse, setRawResponse] = useState<any>(null);

  useEffect(() => {
    (async () => {
      try {
        const s = await AsyncStorage.getItem('userData');
        const u = s ? JSON.parse(s) : null;
        setUserName(u?.nombre || u?.name || '—');
        setUserRole(u?.rol || u?.role || '—');
      } catch { /* ignore */ }
    })();
  }, []);

  const buildUrl = () => {
    const qs = new URLSearchParams({ from, to });
    return `${ENDPOINT}?${qs.toString()}`;
  };

const refresh = () => {
  setLoading(true);
  setErrorMsg(null);
  setRawResponse(null);

  const url = buildUrl();
  console.log('[Terminales] URL =>', url);

  fetch(url, { method: 'GET' })
    .then(async (r) => {
      console.log('[Terminales] HTTP', r.status, r.statusText);
      console.log('[Terminales] Headers:', JSON.stringify(Object.fromEntries(r.headers as any)));
      const text = await r.text();
      // Guarda crudo para inspección en pantalla si hace falta:
      setRawResponse(text);

      let data: any;
      try {
        data = text ? JSON.parse(text) : [];
      } catch (e) {
        throw new Error('Respuesta no es JSON válido.');
      }

      if (!r.ok) {
        throw new Error(typeof data === 'object' && data?.message ? data.message : `HTTP ${r.status}`);
      }

      // Normaliza: si no es array, intenta mapear o convertir
      if (Array.isArray(data)) {
        console.log('[Terminales] filas:', data.length);
        if (data[0]) console.log('[Terminales] ejemplo fila 0:', data[0]);
        return data;
      } else if (data?.rows && Array.isArray(data.rows)) {
        console.log('[Terminales] envoltorio.rows:', data.rows.length);
        return data.rows;
      } else {
        console.log('[Terminales] respuesta NO array, ver rawResponse en UI');
        return [];
      }
    })
    .then(setRows)
    .catch((e: any) => {
      console.error('[Terminales] ERROR:', e?.message || e);
      setErrorMsg(e?.message || 'Error inesperado consultando el backend.');
      setRows([]);
    })
    .finally(() => setLoading(false));
};

  // Carga inicial con mes actual
  useEffect(() => { refresh(); }, []);

  const filtered = useMemo(() => {
    const t = q.trim().toLowerCase();
    if (!t) return rows;
    return rows.filter((r) => JSON.stringify(r).toLowerCase().includes(t));
  }, [rows, q]);

  const openModal = (item: Row) => { setSelected(item); setDetailVisible(true); };

  const runSql = async () => {
    setSqlLoading(true); setSqlError(null); setSqlData(null);
    try {
      const res = await fetch(`${API_URL}/control-optima/sql`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: sqlText }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.message || 'Error SQL');
      setSqlData(Array.isArray(data) ? data : []);
    } catch (e: any) { setSqlError(e.message); }
    finally { setSqlLoading(false); }
  };

  const setThisMonth = () => {
    setFrom(monthStartYMD());
    setTo(todayYMD());
  };

  const renderCard = (r: Row) => {
    const pedido = r.Pedido ?? '—';
    const cliente = r.Cliente ?? '—';
    const nombrePedido = r.NombrePedido ?? '';
    const inicio = prettyDate(r.Inicio);
    const fin = prettyDate(r.Fin);
    const makespan = r.MakespanHHMMSS ?? '—';
    const tiempoUnico = r.TiempoUnicoHHMMSS ?? '—';
    const procesos = r.Procesos ?? '';
    const operarios = r.Operarios ?? '';
    const maquinas = r.Maquinas ?? '';

    return (
      <TouchableOpacity style={styles.card} onPress={() => openModal(r)}>
        <Text style={styles.title}>{pedido} — {cliente}</Text>
        {!!nombrePedido && <Text style={styles.sub}>{nombrePedido}</Text>}
        <Text>Inicio: {inicio}</Text>
        <Text>Fin: {fin}</Text>
        <Text>Makespan: {makespan} · Tiempo único: {tiempoUnico}</Text>
        {!!procesos && <Text>Procesos: {procesos}</Text>}
        {!!operarios && <Text>Operarios: {operarios}</Text>}
        {!!maquinas && <Text>Máquinas: {maquinas}</Text>}
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <Stack.Screen options={{ title: 'Terminales Almassera' }} />

      <AppHeader
        titleOverride="Terminales Almassera"
        count={filtered.length}
        userNameProp={userName}
        roleProp={userRole}
        serverReachableOverride={!!serverReachable}
        onRefresh={refresh}
        onUserPress={({ userName, role }) => { setModalUser({ userName, role }); setUserModalVisible(true); }}
      />
      <ModalHeader
        visible={userModalVisible}
        onClose={() => setUserModalVisible(false)}
        userName={modalUser.userName || userName}
        role={modalUser.role || userRole}
      />

      {/* Filtros: fechas + búsqueda */}
      <View style={styles.filters}>
        <View style={styles.dateRow}>
          <View style={styles.dateCol}>
            <Text style={styles.dateLabel}>Desde</Text>
            <TextInput
              value={from}
              onChangeText={setFrom}
              placeholder="YYYY-MM-DD"
              autoCapitalize="none"
              autoCorrect={false}
              style={styles.dateInput}
            />
          </View>
          <View style={styles.dateCol}>
            <Text style={styles.dateLabel}>Hasta</Text>
            <TextInput
              value={to}
              onChangeText={setTo}
              placeholder="YYYY-MM-DD"
              autoCapitalize="none"
              autoCorrect={false}
              style={styles.dateInput}
            />
          </View>
        </View>

        <View style={styles.actionsRow}>
          <Pressable style={styles.btn} onPress={refresh}>
            <Ionicons name="refresh" size={18} />
            <Text style={styles.btnText}>Aplicar</Text>
          </Pressable>
          <Pressable style={[styles.btn, styles.btnGhost]} onPress={() => { setThisMonth(); }}>
            <Ionicons name="calendar" size={18} />
            <Text style={styles.btnText}>Mes actual</Text>
          </Pressable>

          <View style={styles.search}>
            <Ionicons name="search-outline" size={18} color="#757575" />
            <TextInput
              style={styles.searchInput}
              placeholder="Buscar…"
              value={q}
              onChangeText={setQ}
            />
            <Pressable style={styles.iconBtn} onPress={() => setSqlVisible(true)}>
              <Ionicons name="code-slash-outline" size={20} color="#2e78b7" />
            </Pressable>
          </View>
        </View>
      </View>

      {loading ? (
        <ActivityIndicator style={{ flex: 1 }} />
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(_, idx) => String(idx)}
          renderItem={({ item }) => renderCard(item)}
        />
      )}


      {errorMsg && (
  <View style={{ marginHorizontal: 8, padding: 10, borderRadius: 8, backgroundColor: '#fee2e2', borderWidth: 1, borderColor: '#fecaca' }}>
    <Text style={{ color: '#991b1b', fontWeight: '700' }}>Error</Text>
    <Text style={{ color: '#7f1d1d' }}>{errorMsg}</Text>
  </View>
)}

{!loading && rows.length === 0 && !errorMsg && (
  <View style={{ margin: 12, padding: 12, borderRadius: 10, backgroundColor: '#fff' }}>
    <Text style={{ color: '#374151' }}>
      Sin datos para el rango seleccionado. Revisa fechas o filtros.
    </Text>
  </View>
)}

{/* Depuración opcional: mostrar crudo cuando no hay filas */}
{!loading && rows.length === 0 && rawResponse && (
  <View style={{ margin: 12, padding: 12, borderRadius: 10, backgroundColor: '#f8fafc' }}>
    <Text style={{ fontWeight: '700', color: '#0f172a', marginBottom: 6 }}>Respuesta cruda</Text>
    <Text selectable style={{ color: '#0f172a' }}>
      {typeof rawResponse === 'string' ? rawResponse : JSON.stringify(rawResponse, null, 2)}
    </Text>
  </View>
)}


      {/* Modal Detalle */}
      <Modal visible={detailVisible} animationType="slide" transparent onRequestClose={() => setDetailVisible(false)}>
        <View style={styles.overlay}>
          <View style={styles.modal}>
            <Text style={styles.modalTitle}>Detalle del registro</Text>
            <ScrollView style={{ maxHeight: '75%' }}>
              {selected && Object.keys(selected).map((k) => (
                <View key={k} style={styles.detailRow}>
                  <Text style={styles.detailLeft}>{k}</Text>
                  <Text style={styles.detailRight}>{String(selected[k])}</Text>
                </View>
              ))}
            </ScrollView>
            <Pressable style={styles.close} onPress={() => setDetailVisible(false)}>
              <Text style={styles.closeText}>Cerrar</Text>
            </Pressable>
          </View>
        </View>
      </Modal>

      {/* SQL Runner */}
      <Modal visible={sqlVisible} animationType="slide" onRequestClose={() => setSqlVisible(false)}>
        <SafeAreaView style={{ flex: 1, backgroundColor: '#fff' }}>
          <View style={{ padding: 12, borderBottomWidth: 1, borderBottomColor: '#eee', flexDirection: 'row', alignItems: 'center' }}>
            <Text style={{ fontSize: 16, fontWeight: '700', color: '#2e78b7', flex: 1 }}>SQL (lectura)</Text>
            <Pressable onPress={() => setSqlVisible(false)}><Ionicons name="close-circle" size={28} color="#2e78b7" /></Pressable>
          </View>
          <View style={{ padding: 12 }}>
            <TextInput
              style={{ borderWidth: 1, borderColor: '#ddd', borderRadius: 8, padding: 10, minHeight: 90 }}
              multiline
              value={sqlText}
              onChangeText={setSqlText}
              placeholder="SELECT TOP 50 * FROM dbo.QUEUEWORK"
              autoCapitalize="none"
              autoCorrect={false}
            />
            <View style={{ flexDirection: 'row', marginTop: 10 }}>
              <Pressable style={[styles.btn]} onPress={runSql} disabled={sqlLoading}>
                <Text style={styles.btnText}>{sqlLoading ? 'Ejecutando…' : 'Ejecutar'}</Text>
              </Pressable>
            </View>
            {sqlError && <Text style={{ color: 'red', marginTop: 8 }}>{sqlError}</Text>}
            {sqlData && (
              <ScrollView style={{ marginTop: 12, flex: 1 }}>
                {sqlData.length === 0 ? (
                  <Text style={{ textAlign: 'center', color: '#666' }}>Sin resultados</Text>
                ) : sqlData.map((row, i) => (
                  <View key={i} style={styles.card}>
                    <Text style={styles.title}>Fila {i + 1}</Text>
                    {Object.keys(row).slice(0, 12).map((k) => (
                      <Text key={k}><Text style={{ fontWeight: '600' }}>{k}:</Text> {String(row[k])}</Text>
                    ))}
                  </View>
                ))}
              </ScrollView>
            )}
          </View>
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f3f4f6' },
  filters: { backgroundColor: '#fff', margin: 8, padding: 12, borderRadius: 10, elevation: 2 },
  dateRow: { flexDirection: 'row', gap: 10 },
  dateCol: { flex: 1 },
  dateLabel: { fontSize: 12, color: '#555', marginBottom: 4 },
  dateInput: { borderWidth: 1, borderColor: '#ddd', borderRadius: 8, paddingHorizontal: 10, height: 40, backgroundColor: '#fafafa' },
  actionsRow: { marginTop: 10, flexDirection: 'row', alignItems: 'center', gap: 10 },
  btn: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: '#e3eafc', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8 },
  btnGhost: { backgroundColor: '#eef2ff' },

  search: { flex: 1, flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', paddingHorizontal: 10, borderRadius: 8, borderWidth: 1, borderColor: '#eee' },
  searchInput: { flex: 1, height: 40, marginLeft: 8 },

  card: { margin: 8, padding: 16, borderRadius: 12, elevation: 3, backgroundColor: '#fff' },
  title: { fontSize: 16, fontWeight: '700', color: '#2e78b7' },
  sub: { color: '#666', marginBottom: 4 },

  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.3)', justifyContent: 'center', alignItems: 'center' },
  modal: { backgroundColor: '#fff', borderRadius: 12, padding: 16, width: '90%', maxHeight: '85%' },
  modalTitle: { fontSize: 18, fontWeight: 'bold', color: '#2e78b7', textAlign: 'center', marginBottom: 8 },
  detailRow: { flexDirection: 'row', paddingVertical: 6, borderBottomWidth: 1, borderBottomColor: '#eee' },
  detailLeft: { width: 140, color: '#555', fontWeight: '600' },
  detailRight: { flex: 1, color: '#333' },
  close: { alignSelf: 'center', marginTop: 12, padding: 10, backgroundColor: '#e3eafc', borderRadius: 8 },
  closeText: { color: '#1976d2', fontWeight: '700' },
  iconBtn: { padding: 6, borderRadius: 8, marginLeft: 8, alignItems: 'center', justifyContent: 'center' },
  btnText: { fontWeight: '700', color: '#1f2937' }, // texto de botones

});
