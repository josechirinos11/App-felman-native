// app/optima/incidencias.tsx
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
type UserData = { nombre?: string; rol?: string; name?: string; role?: string };

type Incidencia = {
  id: number | string;
  codigo?: string;                    // INC-0001
  tipo?: 'ENTREGA'|'VEHICULO'|'RUTA'|string;
  centro?: string;
  pedido_id?: number|string;          // si aplica
  ruta_id?: number|string;            // si aplica
  vehiculo?: string;                  // matrícula
  conductor?: string;
  estado?: 'ABIERTA'|'EN_PROGRESO'|'RESUELTA'|'CERRADA'|string;
  prioridad?: 'ALTA'|'MEDIA'|'BAJA'|string;
  descripcion?: string;
  creada?: string;                    // ISO
  actualizada?: string;               // ISO
  [k: string]: any;
};

type Reentrega = {
  id: number | string;
  codigo?: string;                    // REE-0001
  pedido_id?: number|string;
  motivo?: string;
  estado?: 'PENDIENTE'|'PROGRAMADA'|'COMPLETADA'|'FALLIDA'|string;
  ventana_inicio?: string;            // ISO
  ventana_fin?: string;               // ISO
  direccion?: string;
  centro?: string;
  [k: string]: any;
};

type CrudAction = 'crear'|'actualizar'|'cerrar'|'reentrega';

// ====== Endpoints ======
const ENDPOINTS = {
  incidencias: `${API_URL}/control-optima/incidencias?estado=abiertas`,
  reentregas:  `${API_URL}/control-optima/reentregas?estado=pending`,
  crear:       `${API_URL}/control-optima/incidencias/crear`,
  actualizar:  `${API_URL}/control-optima/incidencias/actualizar`,
  cerrar:      `${API_URL}/control-optima/incidencias/cerrar`,
  programarRe: `${API_URL}/control-optima/reentregas/programar`,
};

export default function IncidenciasScreen() {
  // Header (usuario)
  const [userName, setUserName] = useState('—');
  const [userRole, setUserRole] = useState('—');
  const [userModalVisible, setUserModalVisible] = useState(false);

  // Estado general
  const [query, setQuery] = useState('');
  const [centro, setCentro] = useState('');
  const [filtroTipo, setFiltroTipo] = useState<Incidencia['tipo']|null>(null); // chip
  const [filtroEstado, setFiltroEstado] = useState<'ABIERTA'|'EN_PROGRESO'|'RESUELTA'|null>('ABIERTA'); // chip

  const [incidencias, setIncidencias] = useState<Incidencia[]>([]);
  const [reentregas, setReentregas] = useState<Reentrega[]>([]);

  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [serverReachable, setServerReachable] = useState(true);
  const [loadPct, setLoadPct] = useState(0);

  // CRUD modal “en construcción”
  const [crudModal, setCrudModal] = useState<null | CrudAction>(null);

  // anti-duplicado
  const inFlightAbort = useRef<AbortController | null>(null);

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

  // ====== fetch ======
  const fetchAll = useCallback(async () => {
    try { inFlightAbort.current?.abort(); } catch {}
    const controller = new AbortController();
    inFlightAbort.current = controller;

    setLoading(true);
    setRefreshing(false);
    setLoadPct(10);

    try {
      // Incidencias (según estado principal del chip)
      const qsInc =
        (filtroEstado ? `estado=${encodeURIComponent(filtroEstado.toLowerCase())}` : 'estado=abiertas') +
        (centro ? `&centro=${encodeURIComponent(centro)}` : '');
      const r1 = await fetch(`${API_URL}/control-optima/incidencias?${qsInc}`, { signal: controller.signal });
      setLoadPct(45);
      const ok1 = r1.ok;
      const j1 = await r1.json();
      if (!ok1) throw new Error(j1?.message || `Incidencias HTTP ${r1.status}`);
      setIncidencias(Array.isArray(j1) ? j1 : []);

      // Reentregas pendientes/programadas
      const r2 = await fetch(ENDPOINTS.reentregas + (centro ? `&centro=${encodeURIComponent(centro)}` : ''), { signal: controller.signal });
      setLoadPct(80);
      const ok2 = r2.ok;
      const j2 = await r2.json();
      if (!ok2) throw new Error(j2?.message || `Reentregas HTTP ${r2.status}`);
      setReentregas(Array.isArray(j2) ? j2 : []);

      setServerReachable(true);
    } catch (e) {
      console.error('[incidencias] fetchAll error:', e);
      setServerReachable(false);
      setIncidencias([]);
      setReentregas([]);
    } finally {
      setLoadPct(100);
      setTimeout(() => setLoadPct(0), 600);
      setLoading(false);
      setRefreshing(false);
    }
  }, [centro, filtroEstado]);

  useEffect(() => { fetchAll(); }, [fetchAll]);
  const onRefresh = useCallback(() => fetchAll(), [fetchAll]);

  // ====== filtros locales (query / tipo) ======
  const q = query.trim().toUpperCase();

  const incidenciasFiltered = useMemo(() => {
    let arr = incidencias;
    if (filtroTipo) arr = arr.filter(i => (i.tipo || '').toUpperCase() === (filtroTipo || '').toUpperCase());
    if (!q) return arr;
    return arr.filter(i =>
      (i.codigo || '').toUpperCase().includes(q) ||
      (i.vehiculo || '').toUpperCase().includes(q) ||
      (i.conductor || '').toUpperCase().includes(q) ||
      (i.centro || '').toUpperCase().includes(q) ||
      (i.descripcion || '').toUpperCase().includes(q) ||
      (i.estado || '').toUpperCase().includes(q) ||
      String(i.pedido_id ?? '').toUpperCase().includes(q) ||
      String(i.ruta_id ?? '').toUpperCase().includes(q)
    );
  }, [incidencias, q, filtroTipo]);

  const reentregasFiltered = useMemo(() => {
    if (!q) return reentregas;
    return reentregas.filter(r =>
      (r.codigo || '').toUpperCase().includes(q) ||
      (r.direccion || '').toUpperCase().includes(q) ||
      (r.estado || '').toUpperCase().includes(q) ||
      String(r.pedido_id ?? '').toUpperCase().includes(q) ||
      (r.centro || '').toUpperCase().includes(q)
    );
  }, [reentregas, q]);

  const headerCount = incidenciasFiltered.length + reentregasFiltered.length;

  // ====== acciones (placeholders con POST real) ======
  const postAction = async (url: string, payload: any) => {
    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        console.error('POST action error:', data);
        return { ok: false, data };
      }
      return { ok: true, data };
    } catch (e) {
      console.error('POST action exception:', e);
      return { ok: false, data: null };
    }
  };

  const actionCrear = async () => {
    setCrudModal('crear');
    await postAction(ENDPOINTS.crear, { centro: centro || undefined });
  };
  const actionActualizar = async () => {
    setCrudModal('actualizar');
    const ids = incidenciasFiltered.map(i => i.id);
    await postAction(ENDPOINTS.actualizar, { incidencias_ids: ids });
  };
  const actionCerrar = async () => {
    setCrudModal('cerrar');
    const ids = incidenciasFiltered.map(i => i.id);
    await postAction(ENDPOINTS.cerrar, { incidencias_ids: ids });
  };
  const actionReentrega = async () => {
    setCrudModal('reentrega');
    const pedidos = incidenciasFiltered
      .map(i => i.pedido_id)
      .filter(Boolean);
    await postAction(ENDPOINTS.programarRe, { pedidos_ids: pedidos, centro: centro || undefined });
  };

  // ====== UI ======
  return (
    <SafeAreaProvider>
      <SafeAreaViewSA edges={['top', 'bottom']} style={styles.container}>
        {/* Header superior */}
        <AppHeader
          titleOverride="Incidencias y Reentregas"
          count={headerCount}
          userNameProp={userName}
          roleProp={userRole}
          serverReachableOverride={!!serverReachable}
          onRefresh={onRefresh}
          onUserPress={() => setUserModalVisible(true)}
        />
        <ModalHeader
          visible={userModalVisible}
          onClose={() => setUserModalVisible(false)}
          userName={userName}
          role={userRole}
        />

        {/* Filtros (compacto) */}
        <View style={styles.filtersGrid}>
          <View style={styles.filterRow}>
            <View style={[styles.inputGroup, styles.flex1]}>
              <Text style={styles.label}>Centro (opcional)</Text>
              <TextInput
                value={centro}
                onChangeText={setCentro}
                placeholder="Ej: LAM310"
                style={styles.input}
                returnKeyType="search"
                onSubmitEditing={onRefresh}
              />
            </View>
          </View>

          <View style={[styles.filterRow, { alignItems: 'center' }]}>
            <View style={[styles.inputGroup, styles.flex1]}>
              <Text style={styles.label}>Buscar (código / vehículo / conductor / pedido / ruta / estado / dirección)</Text>
              <TextInput
                value={query}
                onChangeText={setQuery}
                placeholder="Ej: INC-0001 · 1234-ABC · PED-1029 · ABIERTA"
                style={styles.input}
                returnKeyType="search"
              />
            </View>
          </View>

          {/* Chips de filtro por Tipo y Estado */}
          <View style={[styles.filterRow, { marginTop: 2, flexWrap: 'wrap' }]}>
            {(['ENTREGA','VEHICULO','RUTA'] as Incidencia['tipo'][]).map(t => (
              <Pressable
                key={String(t)}
                onPress={() => setFiltroTipo(prev => prev === t ? null : t)}
                style={[styles.chip, filtroTipo === t && styles.chipActive]}
              >
                <Text style={[styles.chipText, filtroTipo === t && styles.chipTextActive]}>
                  {t}
                </Text>
              </Pressable>
            ))}
            {(['ABIERTA','EN_PROGRESO','RESUELTA'] as const).map(est => (
              <Pressable
                key={est}
                onPress={() => setFiltroEstado(prev => prev === est ? null : est)}
                style={[styles.chip, filtroEstado === est && styles.chipActive]}
              >
                <Text style={[styles.chipText, filtroEstado === est && styles.chipTextActive]}>
                  {est}
                </Text>
              </Pressable>
            ))}
          </View>

          {/* Acciones CRUD suaves */}
          <View style={styles.crudRow}>
            <TouchableOpacity style={[styles.crudBtn, styles.create]} onPress={actionCrear}>
              <Ionicons name="add-circle-outline" size={22} />
              <Text style={styles.crudText}>Crear</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.crudBtn, styles.update]} onPress={actionActualizar}>
              <Ionicons name="create-outline" size={22} />
              <Text style={styles.crudText}>Actualizar</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.crudBtn, styles.read]} onPress={actionCerrar}>
              <Ionicons name="checkmark-done-outline" size={22} />
              <Text style={styles.crudText}>Cerrar</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.crudBtn, styles.delete]} onPress={actionReentrega}>
              <Ionicons name="repeat-outline" size={22} />
              <Text style={styles.crudText}>Programar reentrega</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Modal “Página en construcción” (crear/actualizar/cerrar/reentrega) */}
        <Modal visible={crudModal !== null} animationType="slide" onRequestClose={() => setCrudModal(null)}>
          <View style={styles.fullModal}>
            <Ionicons
              name={
                crudModal === 'crear'     ? 'add-circle-outline' :
                crudModal === 'actualizar'? 'create-outline' :
                crudModal === 'cerrar'    ? 'checkmark-done-outline' :
                'repeat-outline'
              }
              size={72}
              color="#2e78b7"
            />
            <Text style={styles.fullModalTitle}>
              {crudModal === 'crear' ? 'Crear incidencia' :
               crudModal === 'actualizar' ? 'Actualizar incidencia' :
               crudModal === 'cerrar' ? 'Cerrar incidencia' :
               'Programar reentrega'}
            </Text>
            <Text style={styles.fullModalText}>Página en construcción</Text>

            <Pressable onPress={() => setCrudModal(null)} style={styles.closeFullBtn}>
              <Ionicons name="close" size={18} color="#fff" />
              <Text style={styles.closeFullBtnText}>Cerrar</Text>
            </Pressable>
          </View>
        </Modal>

        {/* Contenido */}
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
            data={[{_header:true}, ...incidenciasFiltered, {_divider:true}, ...reentregasFiltered]}
            keyExtractor={(item, idx) => String((item as any).id ?? (item as any)._header ?? (item as any)._divider ?? idx)}
            contentContainerStyle={{ paddingHorizontal: 10, paddingBottom: 24 }}
            refreshing={refreshing}
            onRefresh={onRefresh}
            renderItem={({ item }) => {
              const it: any = item;
              if (it._header) {
                return (
                  <View style={styles.listHeader}>
                    <Text style={styles.listHeaderText}>
                      Incidencias: <Text style={styles.bold}>{incidenciasFiltered.length}</Text> ·
                      Reentregas: <Text style={styles.bold}>{reentregasFiltered.length}</Text>
                    </Text>
                  </View>
                );
              }
              if (it._divider) {
                return <Text style={styles.sectionTitle}>Reentregas</Text>;
              }

              // Incidencia
              if ((item as Incidencia).tipo !== undefined) {
                const i = item as Incidencia;
                return (
                  <TouchableOpacity style={[styles.card, styles.cardShadow]}>
                    <View style={styles.cardHead}>
                      <Text style={styles.title}>{i.codigo || 'Incidencia'}</Text>
                      <Text style={styles.badge}>{(i.estado || 'ABIERTA').toUpperCase()}</Text>
                    </View>
                    <Text style={styles.sub}>
                      {i.tipo || '—'} {i.centro ? `· ${i.centro}` : ''} {i.vehiculo ? `· Veh: ${i.vehiculo}` : ''} {i.conductor ? `· Cond: ${i.conductor}` : ''}
                    </Text>
                    {(i.pedido_id || i.ruta_id) ? (
                      <Text style={styles.sub}>
                        {i.pedido_id ? `Pedido: ${i.pedido_id}` : ''}{i.pedido_id && i.ruta_id ? ' · ' : ''}{i.ruta_id ? `Ruta: ${i.ruta_id}` : ''}
                      </Text>
                    ) : null}
                    {i.descripcion ? <Text style={styles.notes}>{i.descripcion}</Text> : null}
                  </TouchableOpacity>
                );
              }

              // Reentrega
              const r = item as Reentrega;
              return (
                <TouchableOpacity style={[styles.card, styles.cardShadow]}>
                  <View style={styles.cardHead}>
                    <Text style={styles.title}>{r.codigo || 'Reentrega'}</Text>
                    <Text style={styles.badge}>{(r.estado || 'PENDIENTE').toUpperCase()}</Text>
                  </View>
                  <Text style={styles.sub}>
                    Pedido: {r.pedido_id ?? '—'} {r.centro ? `· ${r.centro}` : ''}
                  </Text>
                  <Text style={styles.sub}>
                    Ventana: {r.ventana_inicio ? r.ventana_inicio.slice(11,16) : '—'}–{r.ventana_fin ? r.ventana_fin.slice(11,16) : '—'} · {r.direccion || '—'}
                  </Text>
                  {r.motivo ? <Text style={styles.notes}>Motivo: {r.motivo}</Text> : null}
                </TouchableOpacity>
              );
            }}
            ListEmptyComponent={<Text style={styles.empty}>Sin datos para mostrar.</Text>}
          />
        )}
      </SafeAreaViewSA>
    </SafeAreaProvider>
  );
}

// ====== Estilos (coherentes con las demás vistas)
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

  // chips
  chip: {
    backgroundColor: '#eef2ff',
    paddingHorizontal: 10, paddingVertical: 8,
    borderRadius: 999, marginRight: 8, marginBottom: 8,
    borderWidth: 1, borderColor: '#6366f133',
  },
  chipActive: { backgroundColor: '#2e78b7' },
  chipText: { color: '#374151', fontWeight: '600' },
  chipTextActive: { color: '#fff' },

  // CRUD
  crudRow: { flexDirection: 'row', gap: 10, paddingHorizontal: 12, marginBottom: 8 },
  crudBtn: {
    flex: 1, height: 44, borderRadius: 10, alignItems: 'center', justifyContent: 'center',
    flexDirection: 'row', gap: 8, borderWidth: 1,
  },
  crudText: { fontWeight: '600', color: '#374151' },
  create: { backgroundColor: '#ecfdf5', borderColor: '#10b98133' },   // Crear (verde claro)
  read:   { backgroundColor: '#eef2ff', borderColor: '#6366f133' },   // Cerrar (índigo claro)
  update: { backgroundColor: '#fff7ed', borderColor: '#f59e0b33' },   // Actualizar (ámbar claro)
  delete: { backgroundColor: '#fef2f2', borderColor: '#ef444433' },   // Reentrega (rojo claro)

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
  sectionTitle: { paddingHorizontal: 10, paddingVertical: 8, fontWeight: '700', color: '#1f2937' },
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

  // loading
  loadingPanel: { padding: 16, alignItems: 'center', gap: 10 },
  loadingText: { color: '#334155' },
  progressBarOuter: { width: '92%', height: 8, borderRadius: 8, backgroundColor: '#e5e7eb' },
  progressBarInner: { height: 8, borderRadius: 8, backgroundColor: '#2e78b7' },

  // utils
  flex1: { flex: 1 },
  
notes:{marginTop:6, color:'#64748b'},
});
