// app/optima/despacho-salidas.tsx
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

type RutaPlanificada = {
  id: number | string;
  codigo?: string;            // RP-0001
  centro?: string;
  vehiculo?: string;          // matrícula/código
  conductor?: string;         // nombre
  paradas?: number;           // total stops
  distancia_km?: number;
  tiempo_est_min?: number;
  estado?: 'aprobada' | 'en_cola' | string;
  ventana_turno?: 'M' | 'T' | 'N' | string;
  [k: string]: any;
};

type Salida = {
  id: number | string;
  ruta_id?: number | string;
  codigo?: string;           // SAL-0001
  centro?: string;
  vehiculo?: string;
  conductor?: string;
  hora_prog?: string;        // ISO
  hora_ini?: string;         // ISO
  hora_cierre?: string;      // ISO
  estado?: 'programada' | 'en_curso' | 'cerrada' | 'incidencia';
  [k: string]: any;
};

type Turno = 'M' | 'T' | 'N';
type CrudAction = 'programar' | 'iniciar' | 'cerrar' | 'incidencia' | 'config';

// ====== Endpoints ======
const ENDPOINTS = {
  rutasPlan: `${API_URL}/control-optima/rutas-plan?estado=aprobada`,
  salidas:   `${API_URL}/control-optima/salidas?estado=hoy`,
  programar: `${API_URL}/control-optima/despacho-salidas/programar`,
  iniciar:   `${API_URL}/control-optima/despacho-salidas/iniciar`,
  cerrar:    `${API_URL}/control-optima/despacho-salidas/cerrar`,
  incidencia:`${API_URL}/control-optima/despacho-salidas/incidencia`,
};

export default function DespachoSalidasScreen() {
  // Header (usuario)
  const [userName, setUserName] = useState('—');
  const [userRole, setUserRole] = useState('—');
  const [userModalVisible, setUserModalVisible] = useState(false);

  // Estado general
  const [query, setQuery] = useState('');
  const [centro, setCentro] = useState('');
  const [turno, setTurno] = useState<Turno | null>(null); // M/T/N

  const [rutas, setRutas] = useState<RutaPlanificada[]>([]);
  const [salidas, setSalidas] = useState<Salida[]>([]);

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
      // Rutas planificadas aprobadas (listas para despachar)
      const r1 = await fetch(ENDPOINTS.rutasPlan + (centro ? `&centro=${encodeURIComponent(centro)}` : ''), { signal: controller.signal });
      setLoadPct(40);
      const ok1 = r1.ok;
      const j1 = await r1.json();
      if (!ok1) throw new Error(j1?.message || `Rutas HTTP ${r1.status}`);
      setRutas(Array.isArray(j1) ? j1 : []);

      // Salidas del día (programadas/en curso/cerradas)
      const r2 = await fetch(ENDPOINTS.salidas + (centro ? `&centro=${encodeURIComponent(centro)}` : ''), { signal: controller.signal });
      setLoadPct(75);
      const ok2 = r2.ok;
      const j2 = await r2.json();
      if (!ok2) throw new Error(j2?.message || `Salidas HTTP ${r2.status}`);
      setSalidas(Array.isArray(j2) ? j2 : []);

      setServerReachable(true);
    } catch (e) {
      console.error('[despacho-salidas] fetchAll error:', e);
      setServerReachable(false);
      setRutas([]);
      setSalidas([]);
    } finally {
      setLoadPct(100);
      setTimeout(() => setLoadPct(0), 600);
      setLoading(false);
      setRefreshing(false);
    }
  }, [centro]);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  const onRefresh = useCallback(() => fetchAll(), [fetchAll]);

  // ====== filtros locales (query / turno) ======
  const q = query.trim().toUpperCase();

  const rutasFiltered = useMemo(() => {
    let arr = rutas;
    if (turno) arr = arr.filter(r => (r.ventana_turno || '').toUpperCase() === turno);
    if (!q) return arr;
    return arr.filter(r =>
      (r.codigo || '').toUpperCase().includes(q) ||
      (r.vehiculo || '').toUpperCase().includes(q) ||
      (r.conductor || '').toUpperCase().includes(q) ||
      (r.centro || '').toUpperCase().includes(q)
    );
  }, [rutas, q, turno]);

  const salidasFiltered = useMemo(() => {
    let arr = salidas;
    if (!q) return arr;
    return arr.filter(s =>
      (s.codigo || '').toUpperCase().includes(q) ||
      (s.vehiculo || '').toUpperCase().includes(q) ||
      (s.conductor || '').toUpperCase().includes(q) ||
      (s.centro || '').toUpperCase().includes(q) ||
      (s.estado || '').toUpperCase().includes(q)
    );
  }, [salidas, q]);

  const headerCount = rutasFiltered.length + salidasFiltered.length;

  // ====== acciones (placeholders con POST real) ======
  const doAction = useCallback(async (action: CrudAction) => {
    setCrudModal(action); // Abrimos modal “en construcción”
    // Aquí podrías pasar IDs seleccionados; por ahora usamos todo lo filtrado.
    const payload = {
      rutas_ids: rutasFiltered.map(r => r.id),
      salidas_ids: salidasFiltered.map(s => s.id),
      centro: centro || undefined,
      turno: turno || undefined,
    };
    const url =
      action === 'programar' ? ENDPOINTS.programar :
      action === 'iniciar'   ? ENDPOINTS.iniciar   :
      action === 'cerrar'    ? ENDPOINTS.cerrar    :
      action === 'incidencia'? ENDPOINTS.incidencia: '';

    if (!url) return;

    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        console.error(`${action.toUpperCase()} error:`, data);
        return;
      }
      console.log(`${action.toUpperCase()} ok (placeholder):`, data);
      // opcional: onRefresh();
    } catch (e) {
      console.error(`${action.toUpperCase()} exception:`, e);
    }
  }, [centro, turno, rutasFiltered, salidasFiltered]);

  // ====== UI ======
  return (
    <SafeAreaProvider>
      <SafeAreaViewSA edges={['top', 'bottom']} style={styles.container}>
        {/* Header superior */}
        <AppHeader
          titleOverride="Despacho y Salidas"
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
              <Text style={styles.label}>Buscar (código / vehículo / conductor / centro / estado)</Text>
              <TextInput
                value={query}
                onChangeText={setQuery}
                placeholder="Ej: RP-0001 · 1234-ABC · EN_CURSO"
                style={styles.input}
                returnKeyType="search"
              />
            </View>
          </View>

          {/* Turno (chips) */}
          <View style={[styles.filterRow, { marginTop: 2 }]}>
            {(['M','T','N'] as Turno[]).map(t => (
              <Pressable
                key={t}
                onPress={() => setTurno(prev => prev === t ? null : t)}
                style={[styles.chip, turno === t && styles.chipActive]}
              >
                <Text style={[styles.chipText, turno === t && styles.chipTextActive]}>
                  {t === 'M' ? 'Turno Mañana' : t === 'T' ? 'Turno Tarde' : 'Turno Noche'}
                </Text>
              </Pressable>
            ))}
          </View>

          {/* Acciones (CRUD suaves) */}
          <View style={styles.crudRow}>
            <TouchableOpacity style={[styles.crudBtn, styles.create]} onPress={() => doAction('programar')}>
              <Ionicons name="calendar-outline" size={22} />
              <Text style={styles.crudText}>Programar</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.crudBtn, styles.update]} onPress={() => doAction('iniciar')}>
              <Ionicons name="play-outline" size={22} />
              <Text style={styles.crudText}>Iniciar</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.crudBtn, styles.read]} onPress={() => doAction('cerrar')}>
              <Ionicons name="checkmark-done-outline" size={22} />
              <Text style={styles.crudText}>Cerrar</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.crudBtn, styles.delete]} onPress={() => doAction('incidencia')}>
              <Ionicons name="alert-circle-outline" size={22} />
              <Text style={styles.crudText}>Incidencia</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Modal “Página en construcción” para cada acción */}
        <Modal visible={crudModal !== null} animationType="slide" onRequestClose={() => setCrudModal(null)}>
          <View style={styles.fullModal}>
            <Ionicons
              name={
                crudModal === 'programar' ? 'calendar-outline' :
                crudModal === 'iniciar'   ? 'play-outline'     :
                crudModal === 'cerrar'    ? 'checkmark-done-outline' :
                crudModal === 'incidencia'? 'alert-circle-outline' :
                'options-outline'
              }
              size={72}
              color="#2e78b7"
            />
            <Text style={styles.fullModalTitle}>
              {crudModal === 'programar' ? 'Programar salidas' :
               crudModal === 'iniciar'   ? 'Iniciar salidas'   :
               crudModal === 'cerrar'    ? 'Cerrar salidas'    :
               crudModal === 'incidencia'? 'Registrar incidencia' :
               'Configuración'}
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
            data={[{_header:true}, ...rutasFiltered, {_divider:true}, ...salidasFiltered]}
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
                      Rutas aprobadas: <Text style={styles.bold}>{rutasFiltered.length}</Text> ·
                      Salidas del día: <Text style={styles.bold}>{salidasFiltered.length}</Text>
                    </Text>
                  </View>
                );
              }
              if (it._divider) {
                return <Text style={styles.sectionTitle}>Salidas del día</Text>;
              }

              // Rutas planificadas (aprobadas)
              if ((item as RutaPlanificada).paradas !== undefined || (item as RutaPlanificada).vehiculo) {
                const r = item as RutaPlanificada;
                return (
                  <TouchableOpacity style={[styles.card, styles.cardShadow]}>
                    <View style={styles.cardHead}>
                      <Text style={styles.title}>{r.codigo || 'Ruta planificada'}</Text>
                      <Text style={styles.badge}>{r.ventana_turno || '—'}</Text>
                    </View>
                    <Text style={styles.sub}>
                      {r.centro ? `Centro: ${r.centro} · ` : ''}Veh: {r.vehiculo || '—'} · Cond: {r.conductor || '—'}
                    </Text>
                    <Text style={styles.sub}>
                      Paradas: {r.paradas ?? '—'} · Dist: {r.distancia_km ?? '—'} km · ETA: {r.tiempo_est_min ?? '—'} min
                    </Text>
                  </TouchableOpacity>
                );
              }

              // Salidas del día
              const s = item as Salida;
              return (
                <TouchableOpacity style={[styles.card, styles.cardShadow]}>
                  <View style={styles.cardHead}>
                    <Text style={styles.title}>{s.codigo || 'Salida'}</Text>
                    <Text style={styles.badge}>{(s.estado || '').toUpperCase() || '—'}</Text>
                  </View>
                  <Text style={styles.sub}>
                    Ruta: {s.ruta_id ?? '—'} · Veh: {s.vehiculo || '—'} · Cond: {s.conductor || '—'}
                  </Text>
                  <Text style={styles.sub}>
                    Prog: {s.hora_prog ? s.hora_prog.slice(11,16) : '—'} · Ini: {s.hora_ini ? s.hora_ini.slice(11,16) : '—'} · Cierre: {s.hora_cierre ? s.hora_cierre.slice(11,16) : '—'}
                  </Text>
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

// ====== Estilos (alineados con las demás vistas) ======
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

  // chips turno
  chip: {
    backgroundColor: '#eef2ff',
    paddingHorizontal: 10, paddingVertical: 8,
    borderRadius: 999, marginRight: 8,
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
  create: { backgroundColor: '#ecfdf5', borderColor: '#10b98133' },   // Programar (verde claro)
  read:   { backgroundColor: '#eef2ff', borderColor: '#6366f133' },   // Cerrar (índigo claro)
  update: { backgroundColor: '#fff7ed', borderColor: '#f59e0b33' },   // Iniciar (ámbar claro)
  delete: { backgroundColor: '#fef2f2', borderColor: '#ef444433' },   // Incidencia (rojo claro)

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
});
