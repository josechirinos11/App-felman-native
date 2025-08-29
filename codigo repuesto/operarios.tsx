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

export default function ControlOperarios() {
  const { serverReachable } = useOfflineMode();

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

  // modal detalle
  const [modalVisible, setModalVisible] = useState(false);
  const [selected, setSelected] = useState<Row | null>(null);

  const ENDPOINT = `${API_URL}/control-optima/operarios`;


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
  console.log('[Operarios] URL =>', url);

  fetch(url, { method: 'GET' })
    .then(async (r) => {
      console.log('[Operarios] HTTP', r.status, r.statusText);
      console.log('[Operarios] Headers:', JSON.stringify(Object.fromEntries(r.headers as any)));
      const text = await r.text();
      setRawResponse(text);

      let data: any;
      try {
        data = text ? JSON.parse(text) : [];
      } catch {
        throw new Error('Respuesta no es JSON válido.');
      }

      if (!r.ok) {
        throw new Error(typeof data === 'object' && data?.message ? data.message : `HTTP ${r.status}`);
      }

      if (Array.isArray(data)) {
        console.log('[Operarios] filas:', data.length);
        if (data[0]) console.log('[Operarios] ejemplo fila 0:', data[0]);
        return data;
      } else if (data?.rows && Array.isArray(data.rows)) {
        console.log('[Operarios] envoltorio.rows:', data.rows.length);
        return data.rows;
      } else {
        console.log('[Operarios] respuesta NO array, ver rawResponse en UI');
        return [];
      }
    })
    .then(setRows)
    .catch((e: any) => {
      console.error('[Operarios] ERROR:', e?.message || e);
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

  const openModal = (item: Row) => { setSelected(item); setModalVisible(true); };

  const setThisMonth = () => {
    setFrom(monthStartYMD());
    setTo(todayYMD());
  };

  const renderCard = (r: Row) => {
    const pedido = r.Pedido ?? '—';
    const linea = r.Linea ?? '—';
    const cod = r.CodProceso ?? '—';
    const desc = r.DescProceso ?? '';
    const maquina = r.Maquina ?? '—';
    const ops = r.Operarios ?? '';
    const tiempo = r.TiempoHHMMSS ?? '—';
    const inicio = prettyDate(r.InicioProceso);
    const fin = prettyDate(r.FinProceso);
    const regs = r.Registros ?? 0;

    return (
      <TouchableOpacity style={styles.card} onPress={() => openModal(r)}>
        <Text style={styles.title}>{pedido} · Proc {cod} — {desc}</Text>
        <Text style={styles.sub}>Línea: {linea} · Máquina: {maquina}</Text>
        {!!ops && <Text>Operarios: {ops}</Text>}
        <Text>Tiempo (único): {tiempo} · Registros: {regs}</Text>
        <Text>Inicio: {inicio} · Fin: {fin}</Text>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <Stack.Screen options={{ title: 'Operarios' }} />

      <AppHeader
        titleOverride="Operarios"
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
          contentContainerStyle={{ paddingBottom: 24 }}
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


      <Modal
        visible={modalVisible}
        animationType="slide"
        transparent
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.overlay}>
          <View style={styles.modal}>
            <Text style={styles.modalTitle}>Detalle del operario / proceso</Text>
            <ScrollView style={{ maxHeight: '75%' }}>
              {selected && Object.keys(selected).map((k) => (
                <View key={k} style={styles.detailRow}>
                  <Text style={styles.detailLeft}>{k}</Text>
                  <Text style={styles.detailRight}>{String(selected[k])}</Text>
                </View>
              ))}
            </ScrollView>
            <Pressable style={styles.close} onPress={() => setModalVisible(false)}>
              <Text style={styles.closeText}>Cerrar</Text>
            </Pressable>
          </View>
        </View>
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

  detailRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: '#eee' },
  detailLeft: { width: '45%', fontWeight: '600', color: '#374151' },
  detailRight: { width: '55%', textAlign: 'right', color: '#111827' },

  close: { marginTop: 12, backgroundColor: '#2e78b7', padding: 10, borderRadius: 8, alignSelf: 'center', minWidth: 120 },
  closeText: { color: '#fff', textAlign: 'center', fontWeight: 'bold' },
  btnText: { fontWeight: '700', color: '#1f2937' }, // texto de botones

});
