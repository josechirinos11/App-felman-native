// app/optima/integracion-gestion.tsx
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

type Conector = {
  id: number | string;
  nombre: string;
  tipo: 'ERP'|'WMS'|'GPS'|'MAPS'|'MENSAJERIA'|'FACTURACION'|string;
  proveedor?: string;
  estado?: 'ok'|'degradado'|'error'|'pendiente'|string;
  ultima_sync?: string;
  detalles?: string;
  [k: string]: any;
};

type Job = {
  id: number | string;
  nombre: string;
  tipo: 'cron'|'webhook'|'manual'|string;
  estado?: 'activo'|'pausado'|'error'|string;
  ultima_ejecucion?: string;
  proxima?: string;
  [k: string]: any;
};

type CrudAction = 'config'|'test'|'sincronizar'|'webhook'|'pausar'|'reanudar';

// ====== Endpoints ======
const ENDPOINTS = {
  conectores: `${API_URL}/control-optima/conectores`,
  jobs:       `${API_URL}/control-optima/jobs?estado=activos`,
  test:       `${API_URL}/control-optima/integracion-gestion/test-conexion`,
  sync:       `${API_URL}/control-optima/integracion-gestion/sincronizar`,
  webhook:    `${API_URL}/control-optima/integracion-gestion/crear-webhook`,
  pausar:     `${API_URL}/control-optima/integracion-gestion/pausar-job`,
  reanudar:   `${API_URL}/control-optima/integracion-gestion/reanudar-job`,
};

export default function IntegracionGestionScreen() {
  // Header (usuario)
  const [userName, setUserName] = useState('—');
  const [userRole, setUserRole] = useState('—');
  const [userModalVisible, setUserModalVisible] = useState(false);

  // Estado general
  const [query, setQuery] = useState('');
  const [centro, setCentro] = useState('');

  const [conectores, setConectores] = useState<Conector[]>([]);
  const [jobs, setJobs] = useState<Job[]>([]);

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
      // Conectores - con manejo mejorado de errores
      const r1 = await fetch(ENDPOINTS.conectores + (centro ? `?centro=${encodeURIComponent(centro)}` : ''), { signal: controller.signal });
      setLoadPct(45);
      
      let j1;
      try {
        const text1 = await r1.text();
        if (!text1 || text1.trim().startsWith('<')) {
          throw new Error('Backend no disponible');
        }
        j1 = JSON.parse(text1);
      } catch (parseError: any) {
        if (parseError?.message === 'Backend no disponible') {
          throw parseError;
        }
        throw new Error(`Respuesta inválida del servidor de conectores`);
      }
      
      if (!r1.ok) throw new Error(j1?.message || `Conectores HTTP ${r1.status}`);
      setConectores(Array.isArray(j1) ? j1 : []);

      // Jobs - con manejo mejorado de errores
      const r2 = await fetch(ENDPOINTS.jobs, { signal: controller.signal });
      setLoadPct(80);
      
      let j2;
      try {
        const text2 = await r2.text();
        if (!text2 || text2.trim().startsWith('<')) {
          throw new Error('Backend no disponible');
        }
        j2 = JSON.parse(text2);
      } catch (parseError: any) {
        if (parseError?.message === 'Backend no disponible') {
          throw parseError;
        }
        throw new Error(`Respuesta inválida del servidor de jobs`);
      }
      
      if (!r2.ok) throw new Error(j2?.message || `Jobs HTTP ${r2.status}`);
      setJobs(Array.isArray(j2) ? j2 : []);

      setServerReachable(true);
    } catch (e: any) {
      // Solo logear errores detallados si no es el error conocido de backend no disponible
      if (e?.message?.includes('Backend no disponible')) {
        console.log('[integracion-gestion] Backend no disponible - mostrando mensaje al usuario');
      } else {
        console.error('[integracion-gestion] fetchAll error:', e);
      }
      setServerReachable(false);
      setConectores([]);
      setJobs([]);
    } finally {
      setLoadPct(100);
      setTimeout(() => setLoadPct(0), 600);
      setLoading(false);
      setRefreshing(false);
    }
  }, [centro]);

  useEffect(() => { fetchAll(); }, [fetchAll]);
  const onRefresh = useCallback(() => fetchAll(), [fetchAll]);

  // ====== filtros locales (query) ======
  const q = query.trim().toUpperCase();

  const conectoresFiltered = useMemo(() => {
    if (!q) return conectores;
    return conectores.filter(c =>
      (c.nombre || '').toUpperCase().includes(q) ||
      (c.tipo || '').toUpperCase().includes(q) ||
      (c.proveedor || '').toUpperCase().includes(q) ||
      (c.estado || '').toUpperCase().includes(q)
    );
  }, [conectores, q]);

  const jobsFiltered = useMemo(() => {
    if (!q) return jobs;
    return jobs.filter(j =>
      (j.nombre || '').toUpperCase().includes(q) ||
      (j.tipo || '').toUpperCase().includes(q) ||
      (j.estado || '').toUpperCase().includes(q)
    );
  }, [jobs, q]);

  const headerCount = conectoresFiltered.length + jobsFiltered.length;

  // ====== acciones reales (stub) ======
  const postAction = async (url: string, payload: any) => {
    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      
      let data;
      try {
        const text = await res.text();
        if (!text || text.trim().startsWith('<')) {
          throw new Error('Backend no disponible');
        }
        data = JSON.parse(text);
      } catch (parseError: any) {
        if (parseError?.message === 'Backend no disponible') {
          console.log('[POST action] Backend no disponible - endpoint no implementado');
          return { ok: false, data: null };
        }
        throw new Error(`Respuesta inválida del servidor`);
      }
      
      if (!res.ok) {
        console.error('POST action error:', data?.message || `HTTP ${res.status}`);
        return { ok: false, data };
      }
      return { ok: true, data };
    } catch (e: any) {
      // Solo logear errores detallados si no es el error conocido de backend no disponible
      if (e?.message?.includes('Backend no disponible')) {
        console.log('[POST action] Endpoint no implementado en el backend');
      } else {
        console.error('POST action exception:', e?.message || e);
      }
      return { ok: false, data: null };
    }
  };

  const handleTestConexion = async () => {
    setCrudModal('test');
    const ids = conectoresFiltered.map(c => c.id);
    await postAction(ENDPOINTS.test, { conectores_ids: ids, centro: centro || undefined });
  };

  const handleSincronizar = async () => {
    setCrudModal('sincronizar');
    const ids = conectoresFiltered.map(c => c.id);
    await postAction(ENDPOINTS.sync, { conectores_ids: ids, centro: centro || undefined });
  };

  const handleCrearWebhook = async () => {
    setCrudModal('webhook');
    await postAction(ENDPOINTS.webhook, {
      nombre: 'Webhook Integración',
      destino: '/control-optima/webhook/externo',
      activo: true,
    });
  };

  const handlePausar = async () => {
    setCrudModal('pausar');
    const ids = jobsFiltered.map(j => j.id);
    await postAction(ENDPOINTS.pausar, { jobs_ids: ids });
  };

  const handleReanudar = async () => {
    setCrudModal('reanudar');
    const ids = jobsFiltered.map(j => j.id);
    await postAction(ENDPOINTS.reanudar, { jobs_ids: ids });
  };

  // ====== UI ======
  return (
    <SafeAreaProvider>
      <SafeAreaViewSA edges={['top', 'bottom']} style={styles.container}>
        {/* Header superior */}
        <AppHeader
          titleOverride="Integración y Gestión"
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
              <Text style={styles.label}>Buscar (conector / tipo / proveedor / estado / job)</Text>
              <TextInput
                value={query}
                onChangeText={setQuery}
                placeholder="Ej: ERP · SAP · ACTIVO · cron"
                style={styles.input}
                returnKeyType="search"
              />
            </View>
          </View>

          {/* Acciones principales - Una sola fila más espaciada */}
          <Text style={styles.sectionLabel}>Acciones sobre conectores:</Text>
          <View style={styles.actionRow}>
            <TouchableOpacity style={[styles.actionBtn, styles.config]} onPress={() => setCrudModal('config')}>
              <Ionicons name="construct-outline" size={20} />
              <Text style={styles.actionText}>Config</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.actionBtn, styles.settings]} onPress={handleTestConexion}>
              <Ionicons name="pulse-outline" size={20} />
              <Text style={styles.actionText}>Test</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.actionBtn, styles.simulate]} onPress={handleSincronizar}>
              <Ionicons name="cloud-upload-outline" size={20} color="#fff" />
              <Text style={styles.simulateText}>Sincronizar</Text>
            </TouchableOpacity>
          </View>

          {/* Acciones sobre jobs - Segunda fila */}
          <Text style={styles.sectionLabel}>Acciones sobre jobs:</Text>
          <View style={styles.actionRow}>
            <TouchableOpacity style={[styles.actionBtn, styles.webhook]} onPress={handleCrearWebhook}>
              <Ionicons name="git-branch-outline" size={20} />
              <Text style={styles.actionText}>Webhook</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.actionBtn, styles.pauseAction]} onPress={handlePausar}>
              <Ionicons name="pause-circle-outline" size={20} />
              <Text style={styles.actionText}>Pausar</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.actionBtn, styles.resumeAction]} onPress={handleReanudar}>
              <Ionicons name="play-circle-outline" size={20} />
              <Text style={styles.actionText}>Reanudar</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Modal “Página en construcción” */}
        <Modal visible={crudModal !== null} animationType="slide" onRequestClose={() => setCrudModal(null)}>
          <View style={styles.fullModal}>
            <Ionicons
              name={
                crudModal === 'config'      ? 'construct-outline' :
                crudModal === 'test'        ? 'pulse-outline' :
                crudModal === 'sincronizar' ? 'cloud-upload-outline' :
                crudModal === 'webhook'     ? 'git-branch-outline' :
                crudModal === 'pausar'      ? 'pause-circle-outline' :
                crudModal === 'reanudar'    ? 'play-circle-outline' :
                'options-outline'
              }
              size={72}
              color="#2e78b7"
            />
            <Text style={styles.fullModalTitle}>
              {crudModal === 'config'      ? 'Configurar conectores' :
               crudModal === 'test'        ? 'Test de conexión' :
               crudModal === 'sincronizar' ? 'Sincronización' :
               crudModal === 'webhook'     ? 'Crear webhook' :
               crudModal === 'pausar'      ? 'Pausar jobs' :
               crudModal === 'reanudar'    ? 'Reanudar jobs' :
               'Integración'}
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
        ) : !serverReachable ? (
          <View style={styles.errorPanel}>
            <Ionicons name="cloud-offline-outline" size={64} color="#dc3545" />
            <Text style={styles.errorTitle}>Sin conexión con el backend</Text>
            <Text style={styles.errorText}>
              No se pudo obtener información de conectores y jobs.{'\n'}
              Verifique que el servidor backend esté funcionando.
            </Text>
            <TouchableOpacity style={styles.retryButton} onPress={onRefresh}>
              <Ionicons name="refresh-outline" size={20} color="#fff" />
              <Text style={styles.retryButtonText}>Reintentar</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <FlatList
            data={[{_header:true}, ...conectoresFiltered, {_divider:true}, ...jobsFiltered]}
            keyExtractor={(item, idx) => {
              const it: any = item;
              if (it._header) return 'header-unique';
              if (it._divider) return 'divider-unique';
              if (it.id) return `item-${it.id}`;
              return `fallback-${idx}`;
            }}
            contentContainerStyle={{ paddingHorizontal: 10, paddingBottom: 24 }}
            refreshing={refreshing}
            onRefresh={onRefresh}
            renderItem={({ item }) => {
              const it: any = item;
              if (it._header) {
                return (
                  <View style={styles.listHeader}>
                    <Text style={styles.listHeaderText}>
                      Conectores: <Text style={styles.bold}>{conectoresFiltered.length}</Text> ·
                      Jobs: <Text style={styles.bold}>{jobsFiltered.length}</Text>
                    </Text>
                  </View>
                );
              }
              if (it._divider) {
                return <Text style={styles.sectionTitle}>Jobs activos</Text>;
              }

              // Conector
              if ((item as Conector).tipo !== undefined) {
                const c = item as Conector;
                return (
                  <TouchableOpacity style={[styles.card, styles.cardShadow]}>
                    <View style={styles.cardHead}>
                      <Text style={styles.title}>{c.nombre}</Text>
                      <Text style={styles.badge}>{(c.estado || 'PENDIENTE').toUpperCase()}</Text>
                    </View>
                    <Text style={styles.sub}>
                      Tipo: {c.tipo} {c.proveedor ? `· ${c.proveedor}` : ''} {c.ultima_sync ? `· Últ. sync: ${c.ultima_sync.slice(11,16)}` : ''}
                    </Text>
                    {c.detalles ? <Text style={styles.notes}>{c.detalles}</Text> : null}
                  </TouchableOpacity>
                );
              }

              // Job
              const j = item as Job;
              return (
                <TouchableOpacity style={[styles.card, styles.cardShadow]}>
                  <View style={styles.cardHead}>
                    <Text style={styles.title}>{j.nombre}</Text>
                    <Text style={styles.badge}>{(j.estado || 'ACTIVO').toUpperCase()}</Text>
                  </View>
                  <Text style={styles.sub}>
                    Tipo: {j.tipo} {j.ultima_ejecucion ? `· Últ: ${j.ultima_ejecucion.slice(11,16)}` : ''} {j.proxima ? `· Próx: ${j.proxima.slice(11,16)}` : ''}
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

// ====== Estilos (coherentes con tus otras vistas)
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

  // CRUD filas
  crudRow: { flexDirection: 'row', gap: 10, paddingHorizontal: 12, marginBottom: 8 },
  crudBtn: {
    flex: 1, height: 44, borderRadius: 10, alignItems: 'center', justifyContent: 'center',
    flexDirection: 'row', gap: 8, borderWidth: 1,
  },
  crudText: { fontWeight: '600', color: '#374151' },

  // Paletas suaves fila 1
  create: { backgroundColor: '#ecfdf5', borderColor: '#10b98133' },   // Config
  read:   { backgroundColor: '#eef2ff', borderColor: '#6366f133' },   // Test
  update: { backgroundColor: '#fff7ed', borderColor: '#f59e0b33' },   // Sync
  delete: { backgroundColor: '#fef2f2', borderColor: '#ef444433' },   // Webhook

  // Paletas suaves fila 2 (jobs)
  pauseBtn:  { backgroundColor: '#fff7ed', borderColor: '#f59e0b33' }, // Pausar
  resumeBtn: { backgroundColor: '#ecfdf5', borderColor: '#10b98133' }, // Reanudar

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

  // error panel
  errorPanel: { 
    flex: 1, 
    justifyContent: 'center', 
    alignItems: 'center', 
    padding: 40,
    backgroundColor: '#f8f9fa'
  },
  errorTitle: { 
    fontSize: 18, 
    fontWeight: 'bold', 
    color: '#dc3545', 
    marginTop: 16, 
    marginBottom: 8, 
    textAlign: 'center' 
  },
  errorText: { 
    fontSize: 14, 
    color: '#6c757d', 
    textAlign: 'center', 
    lineHeight: 20,
    marginBottom: 24 
  },
  retryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#007bff',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
  },
  retryButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },

  // Nuevos estilos para mejor organización
  sectionLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 8,
    marginTop: 12,
    paddingHorizontal: 12,
  },
  actionRow: {
    flexDirection: 'row',
    gap: 8,
    paddingHorizontal: 12,
    marginBottom: 8,
  },
  actionBtn: {
    flex: 1,
    height: 44,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 6,
    borderWidth: 1,
  },
  actionText: {
    fontWeight: '600',
    color: '#374151',
    fontSize: 13,
  },
  config: {
    backgroundColor: '#ecfdf5',
    borderColor: '#10b98133',
  },
  settings: {
    backgroundColor: '#eef2ff',
    borderColor: '#6366f133',
  },
  simulate: {
    backgroundColor: '#2e78b7',
    borderColor: '#2e78b7',
  },
  simulateText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 13,
  },
  webhook: {
    backgroundColor: '#fef2f2',
    borderColor: '#ef444433',
  },
  pauseAction: {
    backgroundColor: '#fff7ed',
    borderColor: '#f59e0b33',
  },
  resumeAction: {
    backgroundColor: '#ecfdf5',
    borderColor: '#10b98133',
  },

  // utils
  flex1: { flex: 1 },

  notes: { marginTop: 6, color: '#64748b' },
});
