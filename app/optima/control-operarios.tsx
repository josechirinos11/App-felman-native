// app/optima/control-operarios.tsx
import { Stack } from 'expo-router';
import Ionicons from '@expo/vector-icons/Ionicons';
import React, { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator, FlatList, Modal, Pressable, StyleSheet,
  Text, TextInput, TouchableOpacity, View, ScrollView
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { API_URL } from '../../config/constants';
import { useOfflineMode } from '../../hooks/useOfflineMode';
import AppHeader from '../../components/AppHeader';

type Row = Record<string, any>;
const pick = (r: Row, keys: string[], fb = '—') => {
  for (const k of keys) {
    const v = r?.[k];
    if (v !== undefined && v !== null && String(v).trim() !== '') return String(v);
  }
  return fb;
};
const prettyDate = (v?: any) => {
  if (!v) return '—';
  const s = String(v);
  const d = new Date(s);
  return isNaN(d.getTime()) ? s : d.toLocaleString();
};

export default function ControlOperarios() {
  const { serverReachable } = useOfflineMode();
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState('');
  const [modalVisible, setModalVisible] = useState(false);
  const [selected, setSelected] = useState<Row | null>(null);

  const ENDPOINT = `${API_URL}/control-optima/_OptimaTemp`;

  const refresh = () => {
    setLoading(true);
    console.log('[Operarios] GET:', ENDPOINT);
    fetch(ENDPOINT)
      .then(async (r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        const data = await r.json();
        return Array.isArray(data) ? data : [];
      })
      .then(setRows)
      .catch((e) => {
        console.error('[Operarios] error:', e);
        setRows([]);
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => { refresh(); }, []);

  const filtered = useMemo(() => {
    const t = q.trim().toLowerCase();
    if (!t) return rows;
    return rows.filter((r) => JSON.stringify(r).toLowerCase().includes(t));
  }, [rows, q]);

  const openModal = (item: Row) => {
    setSelected(item);
    setModalVisible(true);
  };

  const renderCard = (r: Row) => {
    const nombre = pick(r, ['USERNAME', 'NOME', 'DESCR', 'COGNOME', 'RAGIONE_SOCIALE']); // USERNAME viene del backend
    const codigo = pick(r, ['ID_PERSONE', 'ID_DIPEND', 'ID', 'CODIGO', 'COD'], '');
    const ultimoEvento = pick(r, ['EventName','ActionName','RIF','STATUS'], '');
    const fecha = pick(r, ['LASTDATE', 'DATE', 'DATECREATE', 'DATA', 'DATE_COMPL'], '');
    const terminal = pick(r, ['CLIENTNAME','ID_COMMESSE','RIF'], '');

    return (
      <TouchableOpacity style={styles.card} onPress={() => openModal(r)}>
        <Text style={styles.title}>{nombre}</Text>
        {!!codigo && <Text style={styles.sub}>Código: {codigo}</Text>}
        {!!ultimoEvento && <Text>Último evento: {ultimoEvento}</Text>}
        {!!terminal && <Text>Terminal: {terminal}</Text>}
        {!!fecha && <Text>Fecha: {prettyDate(fecha)}</Text>}
      </TouchableOpacity>
    );
  };



  return (
    <SafeAreaView style={styles.container}>
      <Stack.Screen options={{ title: 'Control Operarios' }} />

      {/* Header */}
      <AppHeader
                count={rows.length}          // o filtered.length, items.length, etc.
                onRefresh={refresh}          // opcional
            // serverReachableOverride={serverReachable} // sólo si NO usas useOfflineMode
            />


      {/* Búsqueda */}
      <View style={styles.search}>
        <Ionicons name="search-outline" size={20} color="#757575" />
        <TextInput
          style={styles.searchInput}
          placeholder="Buscar en cualquier campo"
          value={q}
          onChangeText={setQ}
        />
      </View>

      {/* Aviso vacío */}
      {!loading && filtered.length === 0 && (
        <View style={{ padding: 12, marginHorizontal: 8, backgroundColor: '#EFF6FF', borderRadius: 8, borderWidth: 1, borderColor: '#3B82F6' }}>
          <Text style={{ color: '#1E3A8A', fontWeight: '600' }}>
            Sin operarios (/_OptimaTemp devuelve 0).
          </Text>
          <Text style={{ color: '#1E3A8A' }}>
            Cuando haya actividad en DASHBOARD_QALOG aparecerán aquí.
          </Text>
        </View>
      )}

      {/* Lista */}
      {loading ? (
        <ActivityIndicator style={{ flex: 1 }} />
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(_, idx) => String(idx)}
          renderItem={({ item }) => renderCard(item)}
        />
      )}

      {/* Modal Detalle */}
      <Modal visible={modalVisible} animationType="slide" transparent onRequestClose={() => setModalVisible(false)}>
        <View style={styles.overlay}>
          <View style={styles.modal}>
            <Text style={styles.modalTitle}>Detalle del operario</Text>
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
  header: { flexDirection: 'row', alignItems: 'center', padding: 12, backgroundColor: '#fff', justifyContent: 'center' },
  status: { marginHorizontal: 6, fontSize: 16, fontWeight: 'bold' },
  ok: { color: '#4CAF50' }, bad: { color: '#F44336' },
  iconBtn: { marginLeft: 8, padding: 4 },

  search: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', margin: 8, paddingHorizontal: 12, borderRadius: 8, elevation: 2 },
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

  close: { marginTop: 12, backgroundColor: '#2e78b7', padding: 10, borderRadius: 8 },
  closeText: { color: '#fff', textAlign: 'center', fontWeight: 'bold' },
});
