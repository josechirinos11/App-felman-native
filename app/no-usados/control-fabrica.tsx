// app/moncada/control-produccion.tsx
import Ionicons from '@expo/vector-icons/Ionicons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import DateTimePicker from '@react-native-community/datetimepicker';
import * as NavigationBar from 'expo-navigation-bar';
import React, { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Modal,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity, useColorScheme, useWindowDimensions,
  View
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useRouter } from 'expo-router';
import AppHeader from '../../components/AppHeader';
import ModalHeader from '../../components/ModalHeader';
import SQLModal from '../../components/SQLModal';
import { API_URL } from '../../config/constants';
import COLORS from '../../constants/Colors';
import { useAuth } from '../../hooks/useAuth';

// ===================== Tipos =====================
type TiempoRealRecord = {
  Serie?: string;
  Numero?: number;
  Fecha: string;
  CodigoOperario: string;
  OperarioNombre?: string | null;
  Tipo?: number;
  Gastos1?: number;
  Gastos2?: number;
  Kms1?: number;
  Kms2?: number;
  CodigoSerie?: string;
  CodigoNumero?: number;
  Linea?: number;
  FechaInicio?: string | null;
  HoraInicio?: string | null;
  FechaFin?: string | null;
  HoraFin?: string | null;
  CodigoPuesto?: string | null;
  CodigoTarea?: string | null;
  ObraSerie?: string | null;
  ObraNumero?: number | null;
  FabricacionSerie?: string | null;
  FabricacionNumero?: number | null;
  FabricacionLinea?: number | null;
  NumeroManual?: string | null;
  CodigoLote?: string | null;
  LoteLinea?: number | null;
  Modulo?: string | null;
  TiempoDedicado?: number | null;
  Abierta?: number | null;
  TipoTarea?: number | null;
};

interface Pedido {
  NoPedido: string;
  Seccion: string;
  Cliente: string;
  Comercial: string;
  RefCliente: string;
  Compromiso: string;
  Id_ControlMat: number;
  Material: string;
  Proveedor: string;
  FechaPrevista: string;
  Recibido: number;
  EstadoPedido?: string;
  Incidencia?: string | null;
}

interface ModuloInfo {
  Serie: string;
  Numero: number;
  Linea: number;
  solape?: boolean;
  guias?: boolean;
  cristal?: boolean;
}

interface PedidoIntegrado {
  NumeroManual: string;
  tiempoRecords: TiempoRealRecord[];
  pedidoInfo?: Pedido;
  modulosInfo: ModuloInfo[];
  totalTiempo: number;
  operarios: Set<string>;
  fechas: Set<string>;
}

interface UserData {
  id: number;
  nombre?: string;
  rol?: string;
  name?: string;
  role?: string;
}

// ===================== Utilidades =====================
function getLastMonday(date = new Date()) {
  const d = new Date(date);
  const day = d.getDay();
  const diff = day === 0 ? 6 : day - 1;
  d.setDate(d.getDate() - diff);
  d.setHours(0, 0, 0, 0);
  return d;
}

const formatDateOnly = (dateStr?: string | null) => {
  if (!dateStr) return '-';
  const s = String(dateStr).trim();
  if (!s) return '-';
  if (s.includes('T')) return s.split('T')[0];
  const d = new Date(s);
  if (!isNaN(d.getTime())) return d.toISOString().slice(0, 10);
  return s.slice(0, 10);
};

const formatDurationLong = (value?: number | null) => {
  if (value == null) return '-';
  const n = Math.floor(Number(value));
  if (!isFinite(n)) return '-';
  const days = Math.floor(n / 86400);
  const hours = Math.floor((n % 86400) / 3600);
  const minutes = Math.floor((n % 3600) / 60);
  const seconds = n % 60;
  if (days > 0) return `${days} día${days > 1 ? 's' : ''} - ${hours}h - ${minutes}m`;
  if (hours > 0) return `${hours}h - ${minutes}m`;
  return `${minutes}m - ${seconds}s`;
};

const formatHM = (seconds?: number | null) => {
  if (seconds == null) return '-';
  const s = Math.max(0, Math.floor(Number(seconds)));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  return `${h}h ${String(m).padStart(2, '0')}m`;
};

const operarioFirstNameKey = (val?: string | null) => {
  if (!val) return 'SIN_OPERARIO';
  const first = String(val).trim().split(/[\s\/]+/)[0];
  return first ? first.toUpperCase() : 'SIN_OPERARIO';
};

// Convertir formato de pedido: 2025-42-0422 -> 2025_42_422
const normalizarPedido = (pedido: string): string => {
  if (!pedido) return '';
  // Eliminar ceros a la izquierda del último segmento y reemplazar - por _
  const partes = pedido.split('-');
  if (partes.length === 3) {
    const ultimaParte = parseInt(partes[2], 10).toString(); // Elimina ceros a la izquierda
    return `${partes[0]}_${partes[1]}_${ultimaParte}`;
  }
  return pedido.replace(/-/g, '_');
};

// ===================== Componente =====================
export default function ControlTerminalesScreen() {
  const colorScheme = useColorScheme();
  useEffect(() => {
    if (colorScheme === 'dark') {
      NavigationBar.setBackgroundColorAsync('#000000');
      NavigationBar.setButtonStyleAsync('light');
    } else {
      NavigationBar.setBackgroundColorAsync('#ffffff');
      NavigationBar.setButtonStyleAsync('dark');
    }
  }, [colorScheme]);
  const { authenticated, loading: authLoading } = useAuth();
  const router = useRouter();

  const [tiempoRecords, setTiempoRecords] = useState<TiempoRealRecord[]>([]);
  const [pedidosComerciales, setPedidosComerciales] = useState<Pedido[]>([]);
  const [pedidosIntegrados, setPedidosIntegrados] = useState<PedidoIntegrado[]>([]);
  const [loadingTiempo, setLoadingTiempo] = useState(false);
  const [loadingPedidos, setLoadingPedidos] = useState(false);
  const [loadingModulos, setLoadingModulos] = useState(false);

  const [searchQuery, setSearchQuery] = useState('');

  const [detailModalVisible, setDetailModalVisible] = useState(false);
  const [selectedPedido, setSelectedPedido] = useState<PedidoIntegrado | null>(null);

  const [userData, setUserData] = useState<UserData | null>(null);
  const [userModalVisible, setUserModalVisible] = useState(false);
  const [modalUser, setModalUser] = useState({ userName: '', role: '' });
  const [token, setToken] = useState<string | null>(null);

  const [sqlVisible, setSqlVisible] = useState(false);

  // Layout
  const isWeb = Platform.OS === 'web';
  const { width: windowWidth } = useWindowDimensions();
  const isMobile = !isWeb && windowWidth < 600;

  // Autenticación / rol
  useEffect(() => {
    if (!authLoading && !authenticated) {
      router.replace('/login');
    }
  }, [authenticated, authLoading, router]);

  useEffect(() => {
    (async () => {
      try {
        const storedToken = await AsyncStorage.getItem('token');
        const rawUser = await AsyncStorage.getItem('userData');
        if (storedToken) setToken(storedToken);
        if (rawUser) {
          const parsed = JSON.parse(rawUser);
          if (parsed?.nombre && parsed?.rol) setUserData(parsed);
          else if (parsed?.name && parsed?.role) {
            setUserData({ id: parsed.id || 0, nombre: parsed.name, rol: parsed.role });
          }
        }
      } catch (e) {
        console.error('Error AsyncStorage:', e);
      }
    })();
  }, []);

  const normalizedRole = ((userData?.rol ?? userData?.role) ?? '')
    .toString().trim().toLowerCase();
  const allowed = ['admin', 'developer', 'administrador'].includes(normalizedRole);

  // Fechas (último lunes → hoy)
  const today = new Date();
  const lastMonday = getLastMonday(today);
  const [fromDate, setFromDate] = useState<Date>(lastMonday);
  const [toDate, setToDate] = useState<Date>(today);
  const [showFromPicker, setShowFromPicker] = useState(false);
  const [showToPicker, setShowToPicker] = useState(false);

  // Carga inicial
  useEffect(() => {
    fetchAllData(formatDateOnly(fromDate.toISOString()), formatDateOnly(toDate.toISOString()));
  }, [fromDate, toDate]);

  // Fetch Consulta 1: Tiempo Real (pedidos en fábrica)
  async function fetchTiempoReal(from: string, to: string) {
    try {
      setLoadingTiempo(true);
      const res = await fetch(`${API_URL}/control-terminales/production-analytics-sin-fechas`);
      if (!res.ok) {
        setTiempoRecords([]);
        return [];
      }
      const json = await res.json();
      const records = Array.isArray(json) ? (json as TiempoRealRecord[]) : [];
      setTiempoRecords(records);
      return records;
    } catch (err) {
      console.error('[tiempo-real] error', err);
      setTiempoRecords([]);
      return [];
    } finally {
      setLoadingTiempo(false);
    }
  }

  // Fetch Consulta 2: Pedidos Comerciales (departamento técnico)
  async function fetchPedidosComerciales() {
    try {
      setLoadingPedidos(true);
      const res = await fetch(`${API_URL}/control-access/pedidosComerciales`);
      if (!res.ok) {
        setPedidosComerciales([]);
        return [];
      }
      const json = await res.json();
      const pedidos = Array.isArray(json) ? (json as Pedido[]) : [];
      setPedidosComerciales(pedidos);
      return pedidos;
    } catch (err) {
      console.error('[pedidos-comerciales] error', err);
      setPedidosComerciales([]);
      return [];
    } finally {
      setLoadingPedidos(false);
    }
  }

  // Fetch Consulta 3: Información de módulos (solape, guías, cristal)
  async function fetchModulosInfo(modulos: { Serie: string; Numero: number; Linea: number }[]) {
    try {
      setLoadingModulos(true);
      const res = await fetch(`${API_URL}/control-pedido/contro-fabrica`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ modulos })
      });
      if (!res.ok) return [];
      const json = await res.json();
      return Array.isArray(json) ? json : [];
    } catch (err) {
      console.error('[modulos-info] error', err);
      return [];
    } finally {
      setLoadingModulos(false);
    }
  }

  // Integrar todas las consultas
  async function fetchAllData(from: string, to: string) {
    // 1. Obtener tiempo real (fábrica)
    const tiempoData = await fetchTiempoReal(from, to);
    
    // 2. Obtener pedidos comerciales (dpto técnico)
    const pedidosData = await fetchPedidosComerciales();

    // 3. Filtrar pedidos TERMINADOS de consulta 2
    const pedidosTerminados = new Set(
      pedidosData
        .filter(p => p.EstadoPedido === 'TERMINADO')
        .map(p => normalizarPedido(p.NoPedido))
    );

    // 4. Agrupar por pedido y filtrar terminados
    const pedidosMap = new Map<string, TiempoRealRecord[]>();
    tiempoData.forEach(record => {
      const pedido = record.NumeroManual || 'SIN_PEDIDO';
      
      // Filtrar si está terminado
      if (pedidosTerminados.has(pedido)) return;

      if (!pedidosMap.has(pedido)) {
        pedidosMap.set(pedido, []);
      }
      pedidosMap.get(pedido)!.push(record);
    });

    // 5. Para cada pedido, obtener módulos únicos y consultar info
    const pedidosIntegradosTemp: PedidoIntegrado[] = [];

    for (const [pedido, records] of pedidosMap.entries()) {
      // Extraer módulos únicos (Serie, Numero, Linea)
      const modulosSet = new Map<string, ModuloInfo>();
      records.forEach(r => {
        if (r.FabricacionSerie && r.FabricacionNumero && r.FabricacionLinea) {
          const key = `${r.FabricacionSerie}-${r.FabricacionNumero}-${r.FabricacionLinea}`;
          if (!modulosSet.has(key)) {
            modulosSet.set(key, {
              Serie: r.FabricacionSerie,
              Numero: r.FabricacionNumero,
              Linea: r.FabricacionLinea
            });
          }
        }
      });

      const modulosArray = Array.from(modulosSet.values());

      // Consultar info de módulos (Consulta 3)
      let modulosInfo: ModuloInfo[] = modulosArray;
      if (modulosArray.length > 0) {
        const modulosInfoData = await fetchModulosInfo(modulosArray);
        // Fusionar info
        modulosInfo = modulosArray.map(m => {
          const info = modulosInfoData.find(
            (mi: any) => mi.Serie === m.Serie && mi.Numero === m.Numero && mi.Linea === m.Linea
          );
          return {
            ...m,
            solape: info?.solape || false,
            guias: info?.guias || false,
            cristal: info?.cristal || false
          };
        });
      }

      // Buscar info del pedido en consulta 2
      const pedidoInfo = pedidosData.find(p => normalizarPedido(p.NoPedido) === pedido);

      // Calcular métricas
      const totalTiempo = records.reduce((sum, r) => sum + (r.TiempoDedicado || 0), 0);
      const operarios = new Set(records.map(r => operarioFirstNameKey(r.OperarioNombre || r.CodigoOperario)));
      const fechas = new Set(records.map(r => formatDateOnly(r.FechaInicio || r.Fecha)).filter(f => f !== '-'));

      pedidosIntegradosTemp.push({
        NumeroManual: pedido,
        tiempoRecords: records,
        pedidoInfo,
        modulosInfo,
        totalTiempo,
        operarios,
        fechas
      });
    }

    // Ordenar por tiempo total descendente
    pedidosIntegradosTemp.sort((a, b) => b.totalTiempo - a.totalTiempo);
    setPedidosIntegrados(pedidosIntegradosTemp);
  }

  // Filtrar por búsqueda
  const filteredPedidos = useMemo(() => {
    const q = (searchQuery || '').toLowerCase();
    if (!q) return pedidosIntegrados;
    return pedidosIntegrados.filter(p =>
      p.NumeroManual.toLowerCase().includes(q) ||
      p.pedidoInfo?.Cliente?.toLowerCase().includes(q) ||
      p.pedidoInfo?.RefCliente?.toLowerCase().includes(q) ||
      Array.from(p.operarios).some(op => op.toLowerCase().includes(q))
    );
  }, [pedidosIntegrados, searchQuery]);

  // ===================== Render principal =====================
  if (authLoading || loadingTiempo || loadingPedidos) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={COLORS.primary} />
        <Text style={{ marginTop: 10, color: COLORS.text }}>
          Cargando datos integrados...
        </Text>
      </View>
    );
  }
  if (!authenticated) return null;
  if (!allowed) {
    return (
      <View style={styles.center}>
        <Text style={styles.errorText}>No tiene credenciales para ver esta información</Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <AppHeader
        titleOverride="Control de Fábrica Integrado"
        count={filteredPedidos.length}
        userNameProp={userData?.nombre || userData?.name || '—'}
        roleProp={userData?.rol || userData?.role || '—'}
        serverReachableOverride={!!authenticated}
        onRefresh={() => fetchAllData(formatDateOnly(fromDate.toISOString()), formatDateOnly(toDate.toISOString()))}
        onUserPress={({ userName, role }) => {
          setModalUser({ userName, role });
          setUserModalVisible(true);
        }}
      />

      <ModalHeader
        visible={userModalVisible}
        onClose={() => setUserModalVisible(false)}
        userName={userData?.nombre || userData?.name || '—'}
        role={userData?.rol || userData?.role || '—'}
      />

      {/* Filtros de fecha */}
      <View style={styles.dateFilterContainer}>
        {Platform.OS === 'web' ? (
          <>
            <View style={styles.dateInputContainer}>
              <Text style={styles.dateLabel}>Desde</Text>
              <TextInput
                style={[styles.dateInput, { color: COLORS.text }]}
                value={formatDateOnly(fromDate.toISOString())}
                onChangeText={(v) => {
                  if (v) setFromDate(new Date(`${v}T00:00:00`));
                }}
                placeholder="YYYY-MM-DD"
                placeholderTextColor={COLORS.textSecondary}
              />
            </View>
            <View style={styles.dateInputContainer}>
              <Text style={styles.dateLabel}>Hasta</Text>
              <TextInput
                style={[styles.dateInput, { color: COLORS.text }]}
                value={formatDateOnly(toDate.toISOString())}
                onChangeText={(v) => {
                  if (v) setToDate(new Date(`${v}T00:00:00`));
                }}
                placeholder="YYYY-MM-DD"
                placeholderTextColor={COLORS.textSecondary}
              />
            </View>
          </>
        ) : (
          <>
            <TouchableOpacity style={{ flex: 1 }} onPress={() => setShowFromPicker(true)}>
              <Text style={styles.dateLabel}>Desde</Text>
              <View style={styles.dateInput}><Text style={{ color: COLORS.text }}>{formatDateOnly(fromDate.toISOString())}</Text></View>
            </TouchableOpacity>
            {showFromPicker && (
              <DateTimePicker
                value={fromDate}
                mode="date"
                display="calendar"
                onChange={(event, selectedDate) => {
                  setShowFromPicker(false);
                  if (selectedDate) setFromDate(selectedDate);
                }}
              />
            )}
            <TouchableOpacity style={{ flex: 1 }} onPress={() => setShowToPicker(true)}>
              <Text style={styles.dateLabel}>Hasta</Text>
              <View style={styles.dateInput}><Text style={{ color: COLORS.text }}>{formatDateOnly(toDate.toISOString())}</Text></View>
            </TouchableOpacity>
            {showToPicker && (
              <DateTimePicker
                value={toDate}
                mode="date"
                display="calendar"
                onChange={(event, selectedDate) => {
                  setShowToPicker(false);
                  if (selectedDate) setToDate(selectedDate);
                }}
              />
            )}
          </>
        )}
        <TouchableOpacity
          style={styles.refreshButton}
          onPress={() => fetchAllData(formatDateOnly(fromDate.toISOString()), formatDateOnly(toDate.toISOString()))}
        >
          <Ionicons name="refresh-outline" size={22} color={COLORS.primary} />
        </TouchableOpacity>
      </View>

      {/* Búsqueda */}
      <View style={styles.searchContainer}>
        <Ionicons name="search-outline" size={20} color="#757575" />
        <TextInput
          style={styles.searchInput}
          placeholder="Buscar pedido / cliente / operario..."
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
      </View>

      {loadingModulos && (
        <View style={{ padding: 10, alignItems: 'center' }}>
          <ActivityIndicator size="small" color={COLORS.primary} />
          <Text style={{ color: COLORS.textSecondary, fontSize: 12 }}>Cargando información de módulos...</Text>
        </View>
      )}

      {/* Lista de pedidos integrados */}
      <FlatList
        data={filteredPedidos}
        keyExtractor={(item) => item.NumeroManual}
        style={styles.flatList}
        contentContainerStyle={{ paddingBottom: 24 }}
        renderItem={({ item }) => (
          <TouchableOpacity
            style={styles.card}
            onPress={() => {
              setSelectedPedido(item);
              setDetailModalVisible(true);
            }}
          >
            <View style={styles.cardHeader}>
              <Text style={styles.cardTitle}>{item.NumeroManual}</Text>
              <View style={styles.cardStats}>
                <Text style={styles.cardTime}>{formatHM(item.totalTiempo)}</Text>
                <Text style={styles.cardCount}>{item.tiempoRecords.length} registros</Text>
              </View>
            </View>

            {item.pedidoInfo && (
              <View style={{ marginBottom: 8, paddingTop: 8, borderTopWidth: 1, borderTopColor: '#f0f0f0' }}>
                <Text style={styles.pedidoInfoText}>Cliente: {item.pedidoInfo.Cliente}</Text>
                <Text style={styles.pedidoInfoText}>Ref: {item.pedidoInfo.RefCliente}</Text>
                <Text style={styles.pedidoInfoText}>Estado: {item.pedidoInfo.EstadoPedido || 'N/A'}</Text>
              </View>
            )}

            <View style={styles.cardMetrics}>
              <View style={styles.metricItem}>
                <Text style={styles.metricLabel}>Módulos</Text>
                <Text style={styles.metricValue}>{item.modulosInfo.length}</Text>
              </View>
              <View style={styles.metricItem}>
                <Text style={styles.metricLabel}>Operarios</Text>
                <Text style={styles.metricValue}>{item.operarios.size}</Text>
              </View>
              <View style={styles.metricItem}>
                <Text style={styles.metricLabel}>Solape</Text>
                <Text style={styles.metricValue}>
                  {item.modulosInfo.filter(m => m.solape).length}/{item.modulosInfo.length}
                </Text>
              </View>
              <View style={styles.metricItem}>
                <Text style={styles.metricLabel}>Guías</Text>
                <Text style={styles.metricValue}>
                  {item.modulosInfo.filter(m => m.guias).length}/{item.modulosInfo.length}
                </Text>
              </View>
              <View style={styles.metricItem}>
                <Text style={styles.metricLabel}>Cristal</Text>
                <Text style={styles.metricValue}>
                  {item.modulosInfo.filter(m => m.cristal).length}/{item.modulosInfo.length}
                </Text>
              </View>
            </View>

            <View style={styles.statsButton}>
              <Text style={styles.statsButtonText}>Ver detalle completo</Text>
              <Ionicons name="chevron-forward-outline" size={16} color={COLORS.primary} />
            </View>
          </TouchableOpacity>
        )}
      />

      {/* Modal de detalle */}
      <Modal
        visible={detailModalVisible}
        animationType="slide"
        onRequestClose={() => setDetailModalVisible(false)}
      >
        <SafeAreaView style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>
              Pedido: {selectedPedido?.NumeroManual}
            </Text>
            <TouchableOpacity onPress={() => setDetailModalVisible(false)} style={styles.closeButton}>
              <Ionicons name="close" size={24} color={COLORS.primary} />
            </TouchableOpacity>
          </View>

          {selectedPedido && (
            <FlatList
              data={selectedPedido.modulosInfo}
              keyExtractor={(m) => `${m.Serie}-${m.Numero}-${m.Linea}`}
              contentContainerStyle={{ padding: 12 }}
              renderItem={({ item: modulo }) => (
                <View style={styles.moduloDetailCard}>
                  <Text style={styles.moduloDetailTitle}>
                    📦 Módulo: {modulo.Serie} - {modulo.Numero} - Línea {modulo.Linea}
                  </Text>
                  <View style={{ flexDirection: 'row', gap: 12, marginTop: 8 }}>
                    <View style={[styles.badge, modulo.solape && styles.badgeSuccess]}>
                      <Text style={styles.badgeText}>Solape: {modulo.solape ? '✓' : '✗'}</Text>
                    </View>
                    <View style={[styles.badge, modulo.guias && styles.badgeSuccess]}>
                      <Text style={styles.badgeText}>Guías: {modulo.guias ? '✓' : '✗'}</Text>
                    </View>
                    <View style={[styles.badge, modulo.cristal && styles.badgeSuccess]}>
                      <Text style={styles.badgeText}>Cristal: {modulo.cristal ? '✓' : '✗'}</Text>
                    </View>
                  </View>
                </View>
              )}
            />
          )}
        </SafeAreaView>
      </Modal>

      {sqlVisible && <SQLModal visible={sqlVisible} onClose={() => setSqlVisible(false)} />}
    </SafeAreaView>
  );
}

// ===================== Estilos =====================
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  center: {
    flex: 1, justifyContent: 'center', alignItems: 'center',
  },
  errorText: {
    color: 'red', fontSize: 16, textAlign: 'center',
  },

  dateFilterContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: COLORS.surface,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
    gap: 12,
  },
  dateInputContainer: { flex: 1 },
  dateLabel: {
    fontSize: 12, color: COLORS.textSecondary, marginBottom: 4, fontWeight: '600',
  },
  dateInput: {
    borderWidth: 1, borderColor: '#ddd', borderRadius: 8,
    paddingHorizontal: 12, paddingVertical: 8, backgroundColor: '#fff',
    color: COLORS.text,
  },
  refreshButton: {
    padding: 8, borderRadius: 8, backgroundColor: COLORS.surface, elevation: 2,
  },

  searchContainer: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: COLORS.surface,
    marginHorizontal: 12, marginVertical: 8,
    paddingHorizontal: 12, borderRadius: 8,
    elevation: 2, shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1, shadowRadius: 2,
  },
  searchInput: {
    flex: 1, height: 40, marginLeft: 8, color: '#333', fontSize: 14,
  },

  flatList: { flex: 1, paddingHorizontal: 12 },
  card: {
    backgroundColor: '#fff', marginVertical: 6, padding: 16, borderRadius: 12,
    elevation: 3, shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1, shadowRadius: 4,
  },
  cardHeader: { 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    alignItems: 'flex-start', 
    marginBottom: 12 
  },
  cardTitle: { 
    fontSize: 18, 
    fontWeight: 'bold', 
    color: COLORS.primary, 
    flex: 1, 
    marginRight: 8 
  },
  cardStats: { alignItems: 'flex-end' },
  cardTime: { fontSize: 16, fontWeight: 'bold', color: '#2d3748' },
  cardCount: { fontSize: 12, color: '#718096', marginTop: 2 },
  
  pedidoInfoText: {
    fontSize: 13,
    color: '#4a5568',
    marginBottom: 2,
  },

  cardMetrics: {
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    marginBottom: 12, 
    paddingTop: 12,
    borderTopWidth: 1, 
    borderTopColor: '#f0f0f0',
    flexWrap: 'wrap',
    gap: 8,
  },
  metricItem: { 
    alignItems: 'center', 
    minWidth: 60,
  },
  metricLabel: { 
    fontSize: 11, 
    color: '#718096', 
    fontWeight: '600', 
    marginBottom: 2 
  },
  metricValue: { 
    fontSize: 14, 
    fontWeight: 'bold', 
    color: '#2d3748' 
  },
  statsButton: {
    flexDirection: 'row', 
    alignItems: 'center', 
    justifyContent: 'center',
    paddingVertical: 8, 
    borderTopWidth: 1, 
    borderTopColor: '#f0f0f0', 
    marginTop: 8,
  },
  statsButtonText: { 
    color: COLORS.primary, 
    fontWeight: '600', 
    marginRight: 4 
  },

  modalContainer: { 
    flex: 1, 
    backgroundColor: COLORS.background 
  },
  modalHeader: {
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    alignItems: 'center',
    paddingHorizontal: 16, 
    paddingVertical: 12, 
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0', 
    backgroundColor: COLORS.surface,
  },
  modalTitle: { 
    fontSize: 18, 
    fontWeight: 'bold', 
    color: COLORS.primary 
  },
  closeButton: { 
    padding: 8 
  },

  moduloDetailCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    borderLeftWidth: 4,
    borderLeftColor: COLORS.primary,
  },
  moduloDetailTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#2d3748',
  },
  badge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    backgroundColor: '#fee2e2',
  },
  badgeSuccess: {
    backgroundColor: '#d1fae5',
  },
  badgeText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#374151',
  },
});