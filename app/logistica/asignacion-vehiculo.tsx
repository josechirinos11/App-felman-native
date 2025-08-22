// app/optima/asignacion-vehiculo.tsx
import Ionicons from '@expo/vector-icons/Ionicons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
    ActivityIndicator,
    FlatList,
    Modal,
    Pressable,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';
import { SafeAreaProvider, SafeAreaView as SafeAreaViewSA } from 'react-native-safe-area-context';

import AppHeader from '../../components/AppHeader';
import ModalHeader from '../../components/ModalHeader';
import { API_URL } from '../../config/constants';

// ====== Tipos ======
type AssignmentRow = {
  id_asignacion: number | string;
  vehiculo_id?: string | number;
  vehiculo?: string;             // placa o código
  conductor_id?: string | number;
  conductor?: string;            // nombre
  ruta?: string;                 // nombre de ruta
  estado?: string;               // ACTIVA / FINALIZADA / ...
  notas?: string;
  [key: string]: any;
};

type UserData = { nombre?: string; rol?: string; name?: string; role?: string };

const ENDPOINT = `${API_URL}/control-optima/asignacion-vehiculo`; // la ruta = nombre del archivo

export default function AsignacionVehiculoScreen() {
  // Header (usuario)
  const [userName, setUserName] = useState('—');
  const [userRole, setUserRole] = useState('—');
  const [userModalVisible, setUserModalVisible] = useState(false);

  // Estado general (sin fechas)
  const [query, setQuery] = useState('');
  const [rows, setRows] = useState<AssignmentRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [serverReachable, setServerReachable] = useState(true);
  const [loadPct, setLoadPct] = useState(0);

  // CRUD modal “en construcción”
  const [crudModal, setCrudModal] = useState<null | 'create' | 'read' | 'update' | 'delete'>(null);

  // anti-duplicado
  const inFlightAbort = useRef<AbortController | null>(null);
  const lastKey = useRef<string>('');

  // ====== efectos base (usuario) ======
  useEffect(() => {
    (async () => {
      try {
        const s = await AsyncStorage.getItem('userData');
        const u: UserData | null = s ? JSON.parse(s) : null;
        setUserName(u?.nombre || u?.name || '—');
        setUserRole(u?.rol || u?.role || '—');
      } catch {}
    })();
  }, []);

  const reqKey = () => JSON.stringify({ q: query.trim() });

  // ====== fetch (sin fechas) ======
  const fetchData = useCallback(
    async (force = false) => {
      if (loading) return;

      const key = reqKey();
      if (!force && key === lastKey.current) return;

      // abortar anterior
      try { inFlightAbort.current?.abort(); } catch {}
      const controller = new AbortController();
      inFlightAbort.current = controller;

      setLoading(true);
      setRefreshing(false);
      setLoadPct(10);

      try {
        const res = await fetch(ENDPOINT, {
          method: 'POST',
          signal: controller.signal,
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ q: query.trim() || undefined }),
        });
        setLoadPct(50);
        setServerReachable(res.ok);
        const data = await res.json();
        setLoadPct(85);

        if (!res.ok) throw new Error(data?.message || `HTTP ${res.status}`);

        const arr: AssignmentRow[] = Array.isArray(data) ? data : [];
        setRows(arr);
        lastKey.current = key;
      } catch (e) {
        console.error('[asignacion-vehiculo] fetch error:', e);
        setServerReachable(false);
        setRows([]);
      } finally {
        setLoadPct(100);
        setTimeout(() => setLoadPct(0), 600);
        setLoading(false);
        setRefreshing(false);
      }
    },
    [query, loading]
  );

  useEffect(() => {
    fetchData(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const onRefresh = useCallback(() => fetchData(true), [fetchData]);

  const filtered = useMemo(() => {
    const q = query.trim().toUpperCase();
    if (!q) return rows;
    return rows.filter(r =>
      (r.vehiculo || '').toUpperCase().includes(q) ||
      (r.conductor || '').toUpperCase().includes(q) ||
      (r.ruta || '').toUpperCase().includes(q) ||
      (r.estado || '').toUpperCase().includes(q)
    );
  }, [rows, query]);

  const headerCount = filtered.length;

  // ====== UI ======
  return (
    <SafeAreaProvider>
      <SafeAreaViewSA edges={['top', 'bottom']} style={styles.container}>
        {/* Header superior */}
        <AppHeader
          titleOverride="Asignación Vehículo–Chofer"
          count={headerCount}
          userNameProp={userName}
          roleProp={userRole}
          serverReachableOverride={!!serverReachable}
          onRefresh={() => fetchData(true)}
          onUserPress={({ userName, role }) => setUserModalVisible(true)}
        />
        <ModalHeader
          visible={userModalVisible}
          onClose={() => setUserModalVisible(false)}
          userName={userName}
          role={userRole}
        />

        {/* Barra de búsqueda + Aplicar */}
        <View style={styles.filtersGrid}>
          <View style={styles.filterRow}>
            <View style={[styles.inputGroup, styles.flex1]}>
              <Text style={styles.label}>Buscar (vehículo / conductor / ruta / estado)</Text>
              <TextInput
                value={query}
                onChangeText={setQuery}
                placeholder="Ej: 1234-ABC · Juan Pérez · Ruta Norte · ACTIVA"
                style={styles.input}
                autoCapitalize="characters"
                returnKeyType="search"
                onSubmitEditing={() => fetchData(true)}
              />
            </View>
          </View>

          <View style={styles.filterRow}>
            <Pressable
              style={[styles.btn, styles.flex1]}
              onPress={() => fetchData(true)}
            >
              <Ionicons name="checkmark-done-outline" size={20} color="#fff" />
              <Text style={styles.btnText}>Aplicar cambios</Text>
            </Pressable>
          </View>
        </View>

        {/* CRUD menú (colores claros + modal de pantalla completa “en construcción”) */}
        <View style={styles.crudRow}>
          <TouchableOpacity style={[styles.crudBtn, styles.create]} onPress={() => setCrudModal('create')}>
            <Ionicons name="add-circle-outline" size={22} />
            <Text style={styles.crudText}>Crear</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.crudBtn, styles.read]} onPress={() => setCrudModal('read')}>
            <Ionicons name="eye-outline" size={22} />
            <Text style={styles.crudText}>Consultar</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.crudBtn, styles.update]} onPress={() => setCrudModal('update')}>
            <Ionicons name="create-outline" size={22} />
            <Text style={styles.crudText}>Actualizar</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.crudBtn, styles.delete]} onPress={() => setCrudModal('delete')}>
            <Ionicons name="trash-outline" size={22} />
            <Text style={styles.crudText}>Eliminar</Text>
          </TouchableOpacity>
        </View>

        {/* Modal “Página en construcción” por CRUD */}
        <Modal visible={crudModal !== null} animationType="slide" onRequestClose={() => setCrudModal(null)}>
          <View style={styles.fullModal}>
            <Ionicons
              name={
                crudModal === 'create' ? 'add-circle-outline' :
                crudModal === 'read' ? 'eye-outline' :
                crudModal === 'update' ? 'create-outline' :
                'trash-outline'
              }
              size={72}
              color="#2e78b7"
            />
            <Text style={styles.fullModalTitle}>
              {crudModal === 'create' ? 'Crear asignación' :
               crudModal === 'read' ? 'Consulta de asignaciones' :
               crudModal === 'update' ? 'Actualizar asignación' :
               'Eliminar asignación'}
            </Text>
            <Text style={styles.fullModalText}>Página en construcción</Text>

            <Pressable onPress={() => setCrudModal(null)} style={styles.closeFullBtn}>
              <Ionicons name="close" size={18} color="#fff" />
              <Text style={styles.closeFullBtnText}>Cerrar</Text>
            </Pressable>
          </View>
        </Modal>

        {/* Lista */}
        {loading ? (
          <View style={styles.loadingPanel}>
            <ActivityIndicator size="large" />
            <Text style={styles.loadingText}>Cargando {Math.max(0, Math.min(100, Math.round(loadPct)))}%</Text>
            <View style={styles.progressBarOuter}>
              <View style={[styles.progressBarInner, { width: `${Math.max(0, Math.min(100, loadPct))}%` }]} />
            </View>
          </View>
        ) : (
          <FlatList
            data={filtered}
            keyExtractor={(it) => String(it.id_asignacion ?? Math.random())}
            contentContainerStyle={{ paddingHorizontal: 10, paddingBottom: 24 }}
            refreshing={refreshing}
            onRefresh={onRefresh}
            ListHeaderComponent={
              <View style={styles.listHeader}>
                <Text style={styles.listHeaderText}>
                  Resultados: <Text style={styles.bold}>{filtered.length}</Text>
                </Text>
              </View>
            }
            ListEmptyComponent={<Text style={styles.empty}>Sin asignaciones que mostrar.</Text>}
            renderItem={({ item }) => (
              <TouchableOpacity style={[styles.card, styles.cardShadow]}>
                <View style={styles.cardHead}>
                  <Text style={styles.title}>
                    {item.vehiculo || 'Vehículo —'} · {item.conductor || 'Conductor —'}
                  </Text>
                  <Text style={styles.badge}>{item.estado || '—'}</Text>
                </View>
                <Text style={styles.sub}>Ruta: {item.ruta || '—'}</Text>
                {item.notas ? <Text style={styles.notes}>Notas: {item.notas}</Text> : null}
              </TouchableOpacity>
            )}
          />
        )}
      </SafeAreaViewSA>
    </SafeAreaProvider>
  );
}

// ====== Estilos (inspirados en piezas-maquina) ======
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f3f4f6' },

  // filtros
  filtersGrid: { paddingHorizontal: 12, paddingTop: 10 },
  filterRow: { flexDirection: 'row', gap: 10, marginBottom: 10 },
  inputGroup: { gap: 6 },
  label: { fontSize: 12, color: '#4b5563' },
  input: {
    borderWidth: 1, borderColor: '#e5e7eb', backgroundColor: '#fff',
    borderRadius: 8, paddingHorizontal: 12, height: 40,
  },
  btn: {
    backgroundColor: '#2e78b7',
    height: 40, borderRadius: 10,
    alignItems: 'center', justifyContent: 'center',
    flexDirection: 'row', gap: 8,
  },
  btnText: { color: '#fff', fontWeight: '700' },

  // CRUD
  crudRow: { flexDirection: 'row', gap: 10, paddingHorizontal: 12, marginBottom: 8 },
  crudBtn: {
    flex: 1, height: 44, borderRadius: 10, alignItems: 'center', justifyContent: 'center',
    flexDirection: 'row', gap: 8, borderWidth: 1,
  },
  crudText: { fontWeight: '600', color: '#374151' },
  create: { backgroundColor: '#ecfdf5', borderColor: '#10b98133' },   // verde claro
  read:   { backgroundColor: '#eef2ff', borderColor: '#6366f133' },   // índigo claro
  update: { backgroundColor: '#fff7ed', borderColor: '#f59e0b33' },   // ámbar claro
  delete: { backgroundColor: '#fef2f2', borderColor: '#ef444433' },   // rojo claro

  // modal full
  fullModal: {
    flex: 1, alignItems: 'center', justifyContent: 'center', gap: 14, padding: 24, backgroundColor: '#f8fafc',
  },
  fullModalTitle: { fontSize: 20, fontWeight: '700', color: '#111827' },
  fullModalText: { fontSize: 16, color: '#334155' },
  closeFullBtn: {
    marginTop: 10, backgroundColor: '#2e78b7', paddingHorizontal: 16, paddingVertical: 10,
    borderRadius: 10, flexDirection: 'row', gap: 8, alignItems: 'center',
  },
  closeFullBtnText: { color: '#fff', fontWeight: '700' },

  // lista
  listHeader: { paddingHorizontal: 10, paddingVertical: 6 },
  listHeaderText: { color: '#334155' },
  bold: { fontWeight: '700' },
  empty: { textAlign: 'center', color: '#6b7280', paddingVertical: 24 },
  card: { backgroundColor: '#fff', borderRadius: 12, padding: 14, marginBottom: 10 },
  cardShadow: {
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.08, shadowRadius: 4, elevation: 3,
  },
  cardHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
  title: { fontWeight: '700', color: '#111827' },
  sub: { color: '#475569' },
  badge: {
    paddingHorizontal: 8, paddingVertical: 2, borderRadius: 999, backgroundColor: '#e5f3fb',
    color: '#0c4a6e', fontWeight: '700', overflow: 'hidden',
  },
  notes: { marginTop: 6, color: '#64748b' },

  // loading
  loadingPanel: { padding: 16, alignItems: 'center', gap: 10 },
  loadingText: { color: '#334155' },
  progressBarOuter: { width: '92%', height: 8, borderRadius: 8, backgroundColor: '#e5e7eb' },
  progressBarInner: { height: 8, borderRadius: 8, backgroundColor: '#2e78b7' },

  // utils
  flex1: { flex: 1 },
});
