// app/optima/optimizacion-carga.tsx
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
  View
} from 'react-native';
import { SafeAreaProvider, SafeAreaView as SafeAreaViewSA } from 'react-native-safe-area-context';

import AppHeader from '../../components/AppHeader';
import ModalHeader from '../../components/ModalHeader';
import { API_URL } from '../../config/constants';

// ====== Tipos ======
type UserData = { nombre?: string; rol?: string; name?: string; role?: string };

type Vehiculo = {
  id: number | string;
  codigo?: string;
  matricula?: string;
  largo_cm?: number; ancho_cm?: number; alto_cm?: number;
  capacidad_kg?: number;
  volumen_m3_calc?: number;
  activo?: boolean;
  [k: string]: any;
};

type Pedido = {
  id: number | string;
  cliente?: string;
  prioridad?: 'ALTA' | 'MEDIA' | 'BAJA' | string;
  direccion?: string;
  centro?: string;
  ventana_inicio?: string;
  ventana_fin?: string;
  peso_kg?: number;
  volumen_m3?: number;
  bultos?: number;
  fragil?: boolean;
  apilable?: boolean;
  [k: string]: any;
};

type Objetivo = 'ocupacion' | 'min_camiones' | 'balance' | 'prioridad';

const ENDPOINTS = {
  vehiculos: `${API_URL}/control-optima/vehiculos`,
  pedidos:   `${API_URL}/control-optima/pedidos?estado=pending`,
  simular:   `${API_URL}/control-optima/optimizacion-carga/simular`,
};

export default function OptimizacionCargaScreen() {
  // Header (usuario)
  const [userName, setUserName] = useState('—');
  const [userRole, setUserRole] = useState('—');
  const [userModalVisible, setUserModalVisible] = useState(false);

  // Estado general
  const [query, setQuery] = useState('');
  const [objetivo, setObjetivo] = useState<Objetivo>('ocupacion');
  const [centro, setCentro] = useState(''); // libre: filtro opcional

  const [vehiculos, setVehiculos] = useState<Vehiculo[]>([]);
  const [pedidos, setPedidos] = useState<Pedido[]>([]);

  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [serverReachable, setServerReachable] = useState(true);
  const [loadPct, setLoadPct] = useState(0);

  // CRUD modal “en construcción”
  const [crudModal, setCrudModal] = useState<null | 'vehiculos' | 'reglas' | 'simular'>(null);

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
    // abortar anterior
    try { inFlightAbort.current?.abort(); } catch {}
    const controller = new AbortController();
    inFlightAbort.current = controller;

    setLoading(true);
    setRefreshing(false);
    setLoadPct(10);

    try {
      // Vehículos - con manejo mejorado de errores
      const r1 = await fetch(ENDPOINTS.vehiculos, { signal: controller.signal });
      setLoadPct(35);
      
      let json1;
      try {
        const text1 = await r1.text();
        if (!text1 || text1.trim().startsWith('<')) {
          throw new Error('Backend no disponible');
        }
        json1 = JSON.parse(text1);
      } catch (parseError: any) {
        if (parseError?.message === 'Backend no disponible') {
          throw parseError;
        }
        throw new Error(`Respuesta inválida del servidor de vehículos`);
      }
      
      if (!r1.ok) throw new Error(json1?.message || `Vehículos HTTP ${r1.status}`);
      setVehiculos(Array.isArray(json1) ? json1 : []);

      // Pedidos - con manejo mejorado de errores
      const r2 = await fetch(ENDPOINTS.pedidos + (centro ? `&centro=${encodeURIComponent(centro)}` : ''), { signal: controller.signal });
      setLoadPct(70);
      
      let json2;
      try {
        const text2 = await r2.text();
        if (!text2 || text2.trim().startsWith('<')) {
          throw new Error('Backend no disponible');
        }
        json2 = JSON.parse(text2);
      } catch (parseError: any) {
        if (parseError?.message === 'Backend no disponible') {
          throw parseError;
        }
        throw new Error(`Respuesta inválida del servidor de pedidos`);
      }
      
      if (!r2.ok) throw new Error(json2?.message || `Pedidos HTTP ${r2.status}`);
      setPedidos(Array.isArray(json2) ? json2 : []);

      setServerReachable(true);
    } catch (e: any) {
      // Solo logear errores detallados si no es el error conocido de backend no disponible
      if (e?.message?.includes('Backend no disponible')) {
        console.log('[optimizacion-carga] Backend no disponible - mostrando mensaje al usuario');
      } else {
        console.error('[optimizacion-carga] fetchAll error:', e);
      }
      setServerReachable(false);
      setVehiculos([]);
      setPedidos([]);
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
  const vehiculosFiltered = useMemo(() => {
    if (!q) return vehiculos;
    return vehiculos.filter(v =>
      (v.codigo || '').toUpperCase().includes(q) ||
      (v.matricula || '').toUpperCase().includes(q)
    );
  }, [vehiculos, q]);

  const pedidosFiltered = useMemo(() => {
    if (!q) return pedidos;
    return pedidos.filter(p =>
      (p.cliente || '').toUpperCase().includes(q) ||
      (p.direccion || '').toUpperCase().includes(q) ||
      (p.prioridad || '').toUpperCase().includes(q)
    );
  }, [pedidos, q]);

  // ====== acción SIMULAR (placeholder con llamada real) ======
  const simular = useCallback(async () => {
    try {
      setCrudModal('simular'); // abrimos el modal “en construcción”
      const idsVeh = vehiculosFiltered.map(v => v.id);
      const idsPed = pedidosFiltered.map(p => p.id);

      const body = {
        pedidos: idsPed,
        vehiculos: idsVeh,
        objetivo,
        reglas: { apilamiento: true, segregarFragil: true }, // demo
      };

      const res = await fetch(ENDPOINTS.simular, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        console.error('SIMULAR error:', data);
        return;
      }
      // Aquí en futuro: guardar resultado en estado y mostrarlo.
      console.log('SIMULAR ok (placeholder):', data);
    } catch (e) {
      console.error('SIMULAR exception:', e);
    }
  }, [vehiculosFiltered, pedidosFiltered, objetivo]);

  const headerCount = vehiculosFiltered.length + pedidosFiltered.length;

  // ====== UI ======
  return (
    <SafeAreaProvider>
      <SafeAreaViewSA edges={['top', 'bottom']} style={styles.container}>
        {/* Header superior */}
        <AppHeader
          titleOverride="Optimización de Carga"
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
              <Text style={styles.label}>Buscar (vehículo / matrícula / cliente / dirección / prioridad)</Text>
              <TextInput
                value={query}
                onChangeText={setQuery}
                placeholder="Ej: 1234-ABC · CLIENTE SA · ALTA"
                style={styles.input}
                returnKeyType="search"
              />
            </View>
          </View>

          {/* Objetivo (chips) - Divididos en 2 filas */}
          <Text style={styles.sectionLabel}>Objetivo de optimización:</Text>
          <View style={styles.chipContainer}>
            <View style={styles.chipRow}>
              {(['ocupacion','min_camiones'] as Objetivo[]).map(o => (
                <Pressable
                  key={o}
                  onPress={() => setObjetivo(o)}
                  style={[styles.chip, objetivo === o && styles.chipActive]}
                >
                  <Text style={[styles.chipText, objetivo === o && styles.chipTextActive]}>
                    {o === 'ocupacion' ? '↑ Ocupación' : '↓ Camiones'}
                  </Text>
                </Pressable>
              ))}
            </View>
            <View style={styles.chipRow}>
              {(['balance','prioridad'] as Objetivo[]).map(o => (
                <Pressable
                  key={o}
                  onPress={() => setObjetivo(o)}
                  style={[styles.chip, objetivo === o && styles.chipActive]}
                >
                  <Text style={[styles.chipText, objetivo === o && styles.chipTextActive]}>
                    {o === 'balance' ? '≈ Balance' : '⚑ Prioridad'}
                  </Text>
                </Pressable>
              ))}
            </View>
          </View>

          {/* Acciones - Una sola fila más espaciada */}
          <Text style={styles.sectionLabel}>Acciones:</Text>
          <View style={styles.actionRow}>
            <TouchableOpacity style={[styles.actionBtn, styles.config]} onPress={() => setCrudModal('vehiculos')}>
              <Ionicons name="car-outline" size={20} />
              <Text style={styles.actionText}>Vehículos</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.actionBtn, styles.settings]} onPress={() => setCrudModal('reglas')}>
              <Ionicons name="options-outline" size={20} />
              <Text style={styles.actionText}>Reglas</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.actionBtn, styles.simulate]} onPress={simular}>
              <Ionicons name="play-outline" size={20} color="#fff" />
              <Text style={styles.simulateText}>SIMULAR</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Modal “Página en construcción” (vehículos / reglas / simular) */}
        <Modal visible={crudModal !== null} animationType="slide" onRequestClose={() => setCrudModal(null)}>
          <View style={styles.fullModal}>
            <Ionicons
              name={
                crudModal === 'vehiculos' ? 'car-outline' :
                crudModal === 'reglas' ? 'options-outline' :
                'play-outline'
              }
              size={72}
              color="#2e78b7"
            />
            <Text style={styles.fullModalTitle}>
              {crudModal === 'vehiculos' ? 'Configuración de vehículos' :
               crudModal === 'reglas' ? 'Reglas de carga' :
               'Simulación de carga'}
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
              No se pudo obtener información de vehículos y pedidos.{'\n'}
              Verifique que el servidor backend esté funcionando.
            </Text>
            <TouchableOpacity style={styles.retryButton} onPress={onRefresh}>
              <Ionicons name="refresh-outline" size={20} color="#fff" />
              <Text style={styles.retryButtonText}>Reintentar</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <FlatList
            data={[{_header:true}, ...vehiculosFiltered, {_divider:true}, ...pedidosFiltered]}
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
                      Vehículos: <Text style={styles.bold}>{vehiculosFiltered.length}</Text> · Pedidos: <Text style={styles.bold}>{pedidosFiltered.length}</Text>
                    </Text>
                  </View>
                );
              }
              if (it._divider) {
                return <Text style={styles.sectionTitle}>Pedidos pendientes</Text>;
              }
              if ((item as Vehiculo).capacidad_kg !== undefined || (item as Vehiculo).matricula) {
                const v = item as Vehiculo;
                return (
                  <TouchableOpacity style={[styles.card, styles.cardShadow]}>
                    <View style={styles.cardHead}>
                      <Text style={styles.title}>
                        {v.codigo || v.matricula || 'Vehículo'}{v.activo === false ? ' · INACTIVO' : ''}
                      </Text>
                      <Text style={styles.badge}>Cap: {v.capacidad_kg ?? '—'} kg</Text>
                    </View>
                    <Text style={styles.sub}>
                      Dim (cm): {v.largo_cm ?? '—'}×{v.ancho_cm ?? '—'}×{v.alto_cm ?? '—'} · Vol: {v.volumen_m3_calc ?? '—'} m³
                    </Text>
                  </TouchableOpacity>
                );
              }
              // Pedido
              const p = item as Pedido;
              return (
                <TouchableOpacity style={[styles.card, styles.cardShadow]}>
                  <View style={styles.cardHead}>
                    <Text style={styles.title}>{p.cliente || 'Pedido'}</Text>
                    <Text style={styles.badge}>{p.prioridad || '—'}</Text>
                  </View>
                  <Text style={styles.sub}>
                    Kg: {p.peso_kg ?? '—'} · m³: {p.volumen_m3 ?? '—'} · Bultos: {p.bultos ?? '—'}
                  </Text>
                  <Text style={styles.sub}>Dir: {p.direccion || '—'} {p.centro ? `· ${p.centro}` : ''}</Text>
                  {(p.fragil || p.apilable === false) ? (
                    <Text style={styles.notes}>
                      {p.fragil ? 'Frágil' : ''}{p.fragil && p.apilable === false ? ' · ' : ''}{p.apilable === false ? 'No apilable' : ''}
                    </Text>
                  ) : null}
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

// ====== Estilos (mismo lenguaje visual de asignacion-vehiculo) ======
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

  // chips objetivo
  chip: {
    backgroundColor: '#eef2ff',
    paddingHorizontal: 10, paddingVertical: 8,
    borderRadius: 999, marginRight: 8,
    borderWidth: 1, borderColor: '#6366f133',
  },
  chipActive: { backgroundColor: '#2e78b7' },
  chipText: { color: '#374151', fontWeight: '600' },
  chipTextActive: { color: '#fff' },

  // CRUD + Simular
  crudRow: { flexDirection: 'row', gap: 8, paddingHorizontal: 12, marginBottom: 8 },
  crudBtn: {
    flex: 1, 
    minHeight: 50, 
    borderRadius: 10, 
    alignItems: 'center', 
    justifyContent: 'center',
    flexDirection: 'row', 
    gap: 6, 
    borderWidth: 1,
    paddingHorizontal: 8,
    paddingVertical: 8,
  },
  crudText: { 
    fontWeight: '600', 
    color: '#374151', 
    fontSize: 12,
    textAlign: 'center',
    flexShrink: 1,
  },
  create: { backgroundColor: '#ecfdf5', borderColor: '#10b98133' },   // verde claro
  read:   { backgroundColor: '#eef2ff', borderColor: '#6366f133' },   // índigo claro
  btnSimular: {
    flex: 1,
    minHeight: 50, 
    borderRadius: 10, 
    alignItems: 'center', 
    justifyContent: 'center',
    flexDirection: 'row', 
    gap: 6, 
    paddingHorizontal: 8,
    paddingVertical: 8,
    backgroundColor: '#2e78b7',
  },
  btnSimularText: { 
    color: '#fff', 
    fontWeight: '700',
    fontSize: 12,
    textAlign: 'center',
    flexShrink: 1,
  },

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
  notes: { marginTop: 6, color: '#64748b' },

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
  chipContainer: {
    paddingHorizontal: 12,
    marginBottom: 8,
  },
  chipRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
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

  // utils
  flex1: { flex: 1 },
});
