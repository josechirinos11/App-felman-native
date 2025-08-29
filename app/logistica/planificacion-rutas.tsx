// app/optima/planificacion-rutas.tsx
import Ionicons from '@expo/vector-icons/Ionicons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
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

type Vehiculo = {
  id: number | string;
  codigo?: string;
  matricula?: string;
  capacidad_kg?: number;
  activo?: boolean;
  // opcional: velocidad_media_kmh, coste_hora, etc.
  [k: string]: any;
};

type Parada = {
  id: number | string;
  cliente?: string;
  direccion?: string;
  centro?: string;
  lat?: number;
  lng?: number;
  ventana_inicio?: string; // ISO
  ventana_fin?: string;    // ISO
  duracion_min?: number;   // tiempo de servicio
  prioridad?: 'ALTA' | 'MEDIA' | 'BAJA' | string;
  demanda_kg?: number;
  // flags
  fragil?: boolean;
  requiere_cita?: boolean;
  [k: string]: any;
};

type ObjetivoRuta = 'min_distancia' | 'min_tiempo' | 'cumplir_ventanas' | 'balanceo';

// ====== Endpoints ======
const ENDPOINTS = {
  vehiculos: `${API_URL}/control-optima/vehiculos`,
  paradas:   `${API_URL}/control-optima/paradas?estado=pending`,
  simular:   `${API_URL}/control-optima/planificacion-rutas/simular`,
};

export default function PlanificacionRutasScreen() {
  // Header (usuario)
  const [userName, setUserName] = useState('—');
  const [userRole, setUserRole] = useState('—');
  const [userModalVisible, setUserModalVisible] = useState(false);

  // Estado general
  const [query, setQuery] = useState('');
  const [objetivo, setObjetivo] = useState<ObjetivoRuta>('min_distancia');
  const [centro, setCentro] = useState(''); // filtro opcional

  const [vehiculos, setVehiculos] = useState<Vehiculo[]>([]);
  const [paradas, setParadas] = useState<Parada[]>([]);

  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [serverReachable, setServerReachable] = useState(true);
  const [loadPct, setLoadPct] = useState(0);

  // CRUD modal “en construcción”
  const [crudModal, setCrudModal] = useState<null | 'paradas' | 'restricciones' | 'simular'>(null);

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
      // Vehículos - con manejo mejorado de errores
      const r1 = await fetch(ENDPOINTS.vehiculos, { signal: controller.signal });
      setLoadPct(35);
      
      let json1;
      try {
        // Verificar si es JSON válido
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

      // Paradas - con manejo mejorado de errores
      const r2 = await fetch(ENDPOINTS.paradas + (centro ? `&centro=${encodeURIComponent(centro)}` : ''), { signal: controller.signal });
      setLoadPct(70);
      
      let json2;
      try {
        // Verificar si es JSON válido
        const text2 = await r2.text();
        if (!text2 || text2.trim().startsWith('<')) {
          throw new Error('Backend no disponible');
        }
        json2 = JSON.parse(text2);
      } catch (parseError: any) {
        if (parseError?.message === 'Backend no disponible') {
          throw parseError;
        }
        throw new Error(`Respuesta inválida del servidor de paradas`);
      }
      
      if (!r2.ok) throw new Error(json2?.message || `Paradas HTTP ${r2.status}`);
      setParadas(Array.isArray(json2) ? json2 : []);

      setServerReachable(true);
    } catch (e: any) {
      // Solo logear errores detallados si no es el error conocido de backend no disponible
      if (e?.message?.includes('Backend no disponible')) {
        console.log('[planificacion-rutas] Backend no disponible - mostrando mensaje al usuario');
      } else {
        console.error('[planificacion-rutas] fetchAll error:', e);
      }
      setServerReachable(false);
      setVehiculos([]);
      setParadas([]);
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

  const paradasFiltered = useMemo(() => {
    if (!q) return paradas;
    return paradas.filter(p =>
      (p.cliente || '').toUpperCase().includes(q) ||
      (p.direccion || '').toUpperCase().includes(q) ||
      (p.prioridad || '').toUpperCase().includes(q) ||
      (p.centro || '').toUpperCase().includes(q)
    );
  }, [paradas, q]);

  // ====== acción SIMULAR (placeholder con llamada real) ======
  const simular = useCallback(async () => {
    // Validar que hay datos para simular
    if (vehiculosFiltered.length === 0) {
      Alert.alert(
        'Sin vehículos',
        'No hay vehículos disponibles para la simulación. Verifique la conexión con el backend.',
        [{ text: 'OK' }]
      );
      return;
    }

    if (paradasFiltered.length === 0) {
      Alert.alert(
        'Sin paradas',
        'No hay paradas disponibles para la simulación. Verifique la conexión con el backend.',
        [{ text: 'OK' }]
      );
      return;
    }

    try {
      setCrudModal('simular'); // modal “en construcción”
      const idsVeh = vehiculosFiltered.map(v => v.id);
      const idsPar = paradasFiltered.map(p => p.id);

      const body = {
        vehiculos: idsVeh,
        paradas: idsPar,
        objetivo,
        // restricciones demo:
        restricciones: {
          ventanas: true,
          maxHorasPorRuta: 9,
          inicioFinEnCentro: Boolean(centro),
        },
      };

      const res = await fetch(ENDPOINTS.simular, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
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
          Alert.alert(
            'Backend no disponible',
            'No se puede conectar con el servidor de simulación. Por favor, verifique que el backend esté funcionando.',
            [{ text: 'OK' }]
          );
        } else {
          Alert.alert(
            'Error de respuesta',
            'El servidor devolvió una respuesta inválida.',
            [{ text: 'OK' }]
          );
        }
        return;
      }
      
      if (!res.ok) {
        Alert.alert(
          'Error de simulación',
          data?.message || `Error del servidor: ${res.status}`,
          [{ text: 'OK' }]
        );
        return;
      }
      
      // Futuro: setResultado(data) y mostrar itinerarios por camión.
      console.log('SIMULAR rutas ok (placeholder):', data);
      
      // Mostrar éxito temporal hasta que se implemente la UI de resultados
      Alert.alert(
        'Simulación exitosa',
        'La simulación se completó correctamente. Los resultados se mostrarán aquí en futuras versiones.',
        [{ text: 'OK' }]
      );
      
    } catch (e: any) {
      console.error('SIMULAR rutas exception:', e);
      Alert.alert(
        'Error inesperado',
        'Ocurrió un error durante la simulación. Por favor, inténtelo nuevamente.',
        [{ text: 'OK' }]
      );
    }
  }, [vehiculosFiltered, paradasFiltered, objetivo, centro]);

  const headerCount = vehiculosFiltered.length + paradasFiltered.length;

  // ====== UI ======
  return (
    <SafeAreaProvider>
      <SafeAreaViewSA edges={['top', 'bottom']} style={styles.container}>
        {/* Header superior */}
        <AppHeader
          titleOverride="Planificación de Rutas"
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
              <Text style={styles.label}>Buscar (vehículo / matrícula / cliente / dirección / prioridad / centro)</Text>
              <TextInput
                value={query}
                onChangeText={setQuery}
                placeholder="Ej: 1234-ABC · CLIENTE SA · ALTA · LAM310"
                style={styles.input}
                returnKeyType="search"
              />
            </View>
          </View>

          {/* Objetivo (chips) - Divididos en 2 filas */}
          <Text style={styles.sectionLabel}>Objetivo de optimización:</Text>
          <View style={styles.chipContainer}>
            <View style={styles.chipRow}>
              {(['min_distancia','min_tiempo'] as ObjetivoRuta[]).map(o => (
                <Pressable
                  key={o}
                  onPress={() => setObjetivo(o)}
                  style={[styles.chip, objetivo === o && styles.chipActive]}
                >
                  <Text style={[styles.chipText, objetivo === o && styles.chipTextActive]}>
                    {o === 'min_distancia' ? '↓ Distancia' : '↓ Tiempo'}
                  </Text>
                </Pressable>
              ))}
            </View>
            <View style={styles.chipRow}>
              {(['cumplir_ventanas','balanceo'] as ObjetivoRuta[]).map(o => (
                <Pressable
                  key={o}
                  onPress={() => setObjetivo(o)}
                  style={[styles.chip, objetivo === o && styles.chipActive]}
                >
                  <Text style={[styles.chipText, objetivo === o && styles.chipTextActive]}>
                    {o === 'cumplir_ventanas' ? '✓ Ventanas' : '≈ Balanceo'}
                  </Text>
                </Pressable>
              ))}
            </View>
          </View>

          {/* Acciones - Una sola fila más espaciada */}
          <Text style={styles.sectionLabel}>Acciones:</Text>
          <View style={styles.actionRow}>
            <TouchableOpacity style={[styles.actionBtn, styles.config]} onPress={() => setCrudModal('paradas')}>
              <Ionicons name="flag-outline" size={20} />
              <Text style={styles.actionText}>Paradas</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.actionBtn, styles.settings]} onPress={() => setCrudModal('restricciones')}>
              <Ionicons name="options-outline" size={20} />
              <Text style={styles.actionText}>Restricciones</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.actionBtn, styles.simulate]} onPress={simular}>
              <Ionicons name="navigate-outline" size={20} color="#fff" />
              <Text style={styles.simulateText}>SIMULAR</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Modal “Página en construcción” (paradas / restricciones / simular) */}
        <Modal visible={crudModal !== null} animationType="slide" onRequestClose={() => setCrudModal(null)}>
          <View style={styles.fullModal}>
            <Ionicons
              name={
                crudModal === 'paradas' ? 'flag-outline' :
                crudModal === 'restricciones' ? 'options-outline' :
                'navigate-outline'
              }
              size={72}
              color="#2e78b7"
            />
            <Text style={styles.fullModalTitle}>
              {crudModal === 'paradas' ? 'Configuración de paradas' :
               crudModal === 'restricciones' ? 'Restricciones de ruta' :
               'Simulación de rutas'}
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
              No se pudo obtener información de vehículos y paradas.{'\n'}
              Verifique que el servidor backend esté funcionando.
            </Text>
            <TouchableOpacity style={styles.retryButton} onPress={onRefresh}>
              <Ionicons name="refresh-outline" size={20} color="#fff" />
              <Text style={styles.retryButtonText}>Reintentar</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <FlatList
            data={[{_header:true}, ...vehiculosFiltered, {_divider:true}, ...paradasFiltered]}
            keyExtractor={(item, idx) => {
              const it: any = item;
              if (it._header) return 'header';
              if (it._divider) return 'divider';
              if (it.id) return String(it.id);
              return `item-${idx}`;
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
                      Vehículos: <Text style={styles.bold}>{vehiculosFiltered.length}</Text> · Paradas: <Text style={styles.bold}>{paradasFiltered.length}</Text>
                    </Text>
                  </View>
                );
              }
              if (it._divider) {
                return <Text style={styles.sectionTitle}>Paradas pendientes</Text>;
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
                      {/* Puedes añadir más atributos relevantes para rutas, p.e. velocidad_media_kmh */}
                      Preparado para planificación
                    </Text>
                  </TouchableOpacity>
                );
              }
              // Parada
              const p = item as Parada;
              return (
                <TouchableOpacity style={[styles.card, styles.cardShadow]}>
                  <View style={styles.cardHead}>
                    <Text style={styles.title}>{p.cliente || 'Parada'}</Text>
                    <Text style={styles.badge}>{p.prioridad || '—'}</Text>
                  </View>
                  <Text style={styles.sub}>
                    {p.direccion || '—'} {p.centro ? `· ${p.centro}` : ''}
                  </Text>
                  <Text style={styles.sub}>
                    Ventana: {p.ventana_inicio ? p.ventana_inicio.slice(11,16) : '—'} – {p.ventana_fin ? p.ventana_fin.slice(11,16) : '—'} · Servicio: {p.duracion_min ?? '—'} min
                  </Text>
                  {(p.fragil || p.requiere_cita) ? (
                    <Text style={styles.notes}>
                      {p.fragil ? 'Frágil' : ''}{p.fragil && p.requiere_cita ? ' · ' : ''}{p.requiere_cita ? 'Requiere cita' : ''}
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

// ====== Estilos (alineados a asignacion-vehiculo / optimizacion-carga) ======
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
  crudRow: { flexDirection: 'row', gap: 10, paddingHorizontal: 12, marginBottom: 8 },
  crudBtn: {
    flex: 1, height: 44, borderRadius: 10, alignItems: 'center', justifyContent: 'center',
    flexDirection: 'row', gap: 8, borderWidth: 1,
  },
  crudText: { fontWeight: '600', color: '#374151' },
  create: { backgroundColor: '#ecfdf5', borderColor: '#10b98133' },   // verde claro
  read:   { backgroundColor: '#eef2ff', borderColor: '#6366f133' },   // índigo claro
  btnSimular: {
    height: 44, borderRadius: 10, alignItems: 'center', justifyContent: 'center',
    flexDirection: 'row', gap: 8, paddingHorizontal: 16, backgroundColor: '#2e78b7',
  },
  btnSimularText: { color: '#fff', fontWeight: '700' },

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
