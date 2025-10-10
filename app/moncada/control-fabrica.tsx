// app/moncada/control-produccion.tsx
import Ionicons from '@expo/vector-icons/Ionicons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as NavigationBar from 'expo-navigation-bar';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Modal,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  useColorScheme,
  useWindowDimensions,
  View
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useRouter } from 'expo-router';
import AppHeader from '../../components/AppHeader';
import ModalHeader from '../../components/ModalHeader';
import SQLModal from '../../components/SQLModal';
import { API_URL } from '../../config/constants';
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

interface LoteLineaAPI {
  Codigo: string;
  NumeroManual: string;
  FechaRealInicio: string;
  Descripcion: string;
  OrigenSerie: string;
  OrigenNumero: number;
  Linea: number;
  DatosFabricacion?: string;
  FabricacionNumeroManual: string;
  Cliente: string;
  Modulo: string;
  LineaDescripcion: string;
}

interface PaginationInfo {
  total: number;
  limit: number;
  offset: number;
  hasMore: boolean;
}

interface PedidoIntegrado {
  NumeroManual: string;
  tiempoRecords: TiempoRealRecord[];
  pedidoInfo?: Pedido;
  modulosInfo: ModuloInfo[];
  totalTiempo: number;
  operarios: Set<string>;
  fechas: Set<string>;
  cliente?: string;
  descripcion?: string;
  fechaInicio?: string;
}

interface UserData {
  id: number;
  nombre?: string;
  rol?: string;
  name?: string;
  role?: string;
}

// ===================== Utilidades =====================
const formatDateOnly = (dateStr?: string | null) => {
  if (!dateStr) return '-';
  const s = String(dateStr).trim();
  if (!s) return '-';
  if (s.includes('T')) return s.split('T')[0];
  const d = new Date(s);
  if (!isNaN(d.getTime())) return d.toISOString().slice(0, 10);
  return s.slice(0, 10);
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

const normalizarPedido = (pedido: string): string => {
  if (!pedido) return '';
  const partes = pedido.split('-');
  if (partes.length === 3) {
    const ultimaParte = parseInt(partes[2], 10).toString();
    return `${partes[0]}_${partes[1]}_${ultimaParte}`;
  }
  return pedido.replace(/-/g, '_');
};

// ===================== Componente =====================
export default function ControlTerminalesScreen() {
  const colorScheme = useColorScheme();
  const loadedRef = useRef(false);

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
  const [searchInput, setSearchInput] = useState('');

  const [detailModalVisible, setDetailModalVisible] = useState(false);
  const [selectedPedido, setSelectedPedido] = useState<PedidoIntegrado | null>(null);

  const [userData, setUserData] = useState<UserData | null>(null);
  const [userModalVisible, setUserModalVisible] = useState(false);
  const [modalUser, setModalUser] = useState({ userName: '', role: '' });
  const [token, setToken] = useState<string | null>(null);

  const [sqlVisible, setSqlVisible] = useState(false);

  // Paginación
  const [pagination, setPagination] = useState<PaginationInfo>({
    total: 0,
    limit: 100,
    offset: 0,
    hasMore: false
  });
  const [isLoadingMore, setIsLoadingMore] = useState(false);

  // Layout
  const isWeb = Platform.OS === 'web';
  const { width: windowWidth } = useWindowDimensions();
  const isMobile = !isWeb && windowWidth < 600;

  // Autenticación
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

  // Carga inicial
  useEffect(() => {
    if (loadedRef.current) return;
    loadedRef.current = true;
    fetchAllData(false);
  }, []);

  // Fetch Tiempo Real (todos los registros)
  async function fetchTiempoReal() {
    try {
      setLoadingTiempo(true);
      const res = await fetch(`${API_URL}/control-terminales/tiempo-real-nueva`);
      if (!res.ok) {
        setTiempoRecords([]);
        return [];
      }
      const json = await res.json();
      const records = Array.isArray(json) ? (json as TiempoRealRecord[]) : [];
      console.log(`[fetchTiempoReal] Registros: ${records.length}`);
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

  // Fetch Pedidos Comerciales
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
      console.log(`[fetchPedidosComerciales] Registros: ${pedidos.length}`);
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

  // Fetch Módulos Info
  async function fetchModulosInfo(modulos: { Serie: string; Numero: number; Linea: number }[]) {
    try {
      setLoadingModulos(true);
      const res = await fetch(`${API_URL}/control-pedido/modulos-info`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ modulos })
      });
      if (!res.ok) return [];
      const json = await res.json();
      const modulosInfo = Array.isArray(json) ? json : [];
      console.log(`[fetchModulosInfo] Consulta: ${modulos.length} módulos, respuesta: ${modulosInfo.length}`);
      return modulosInfo;
    } catch (err) {
      console.error('[modulos-info] error', err);
      return [];
    } finally {
      setLoadingModulos(false);
    }
  }

  // Fetch Pedidos en Fábrica (con paginación y búsqueda)
  async function fetchPedidosEnFabrica(loadMore = false) {
    try {
      if (loadMore) {
        setIsLoadingMore(true);
      }

      const currentOffset = loadMore ? pagination.offset + pagination.limit : 0;
      const params = new URLSearchParams({
        limit: String(pagination.limit),
        offset: String(currentOffset),
        search: searchQuery
      });

      const res = await fetch(`${API_URL}/control-terminales/pedidos-en-fabrica?${params}`);
      if (!res.ok) throw new Error('Error al cargar pedidos');

      const json = await res.json();
      console.log('[fetchPedidosEnFabrica] Respuesta recibida:', {
        tieneData: 'data' in json,
        tienePagination: 'pagination' in json,
        esArray: Array.isArray(json),
        tipo: typeof json
      });
      
      // Verificar si la respuesta tiene la estructura esperada
      if (json && typeof json === 'object' && 'data' in json && 'pagination' in json) {
        const { data, pagination: paginationInfo } = json;
        setPagination(paginationInfo || {
          total: 0,
          limit: pagination.limit,
          offset: currentOffset,
          hasMore: false
        });
        return { data: data || [], isLoadMore: loadMore };
      } else {
        // Si no tiene la estructura esperada, tratar como array directo
        console.warn('[pedidos-en-fabrica] Respuesta sin estructura de paginación, usando array directo');
        const dataArray = Array.isArray(json) ? json : [];
        setPagination({
          total: dataArray.length,
          limit: pagination.limit,
          offset: 0,
          hasMore: false
        });
        return { data: dataArray, isLoadMore: loadMore };
      }
    } catch (err) {
      console.error('[pedidos-en-fabrica] error', err);
      setPagination({
        total: 0,
        limit: pagination.limit,
        offset: 0,
        hasMore: false
      });
      return { data: [], isLoadMore: loadMore };
    } finally {
      if (loadMore) {
        setIsLoadingMore(false);
      }
    }
  }

  // Integrar todas las consultas
  async function fetchAllData(loadMore = false) {
    const tiempoData = await fetchTiempoReal();
    const pedidosData = await fetchPedidosComerciales();
    const { data: lotesLineas, isLoadMore } = await fetchPedidosEnFabrica(loadMore);

    // Pedidos terminados
    const pedidosTerminados = new Set(
      pedidosData
        .filter(p => p.EstadoPedido === 'TERMINADO')
        .map(p => normalizarPedido(p.NoPedido))
    );

    // Agrupar lotes/líneas por NumeroManual
    const lotesMap = new Map<string, LoteLineaAPI[]>();
    (lotesLineas as LoteLineaAPI[]).forEach(linea => {
      const numManual = linea.FabricacionNumeroManual || linea.NumeroManual;
      if (!lotesMap.has(numManual)) {
        lotesMap.set(numManual, []);
      }
      lotesMap.get(numManual)!.push(linea);
    });

    // Filtrar pedidos terminados
    const pedidosActivos = new Map<string, LoteLineaAPI[]>();
    for (const [pedido, lineas] of lotesMap.entries()) {
      if (!pedidosTerminados.has(pedido)) {
        pedidosActivos.set(pedido, lineas);
      }
    }

    console.log(`[LOG] Pedidos activos: ${pedidosActivos.size}`);

    // Recopilar todos los módulos únicos
    const todosLosModulosMap = new Map<string, ModuloInfo>();
    for (const [pedido, lineas] of pedidosActivos.entries()) {
      lineas.forEach(linea => {
        if (linea.OrigenSerie && linea.OrigenNumero && linea.Linea) {
          const key = `${linea.OrigenSerie}-${linea.OrigenNumero}-${linea.Linea}`;
          if (!todosLosModulosMap.has(key)) {
            todosLosModulosMap.set(key, {
              Serie: linea.OrigenSerie,
              Numero: linea.OrigenNumero,
              Linea: linea.Linea
            });
          }
        }
      });
    }

    const todosLosModulos = Array.from(todosLosModulosMap.values());
    console.log(`[LOG] Total módulos únicos: ${todosLosModulos.length}`);

    // Consultar info de módulos
    let modulosInfoGlobal: ModuloInfo[] = [];
    if (todosLosModulos.length > 0) {
      type BackendModuloInfo = { 
        id: string; 
        alias?: string[]; 
        solape?: boolean; 
        guias?: boolean; 
        cristal?: boolean 
      };
      const modulosInfoData: BackendModuloInfo[] = await fetchModulosInfo(todosLosModulos);

      const byId = new Map<string, BackendModuloInfo>();
      for (const mi of modulosInfoData) {
        byId.set(mi.id, mi);
        (mi.alias ?? []).forEach(a => byId.set(a, mi));
      }

      modulosInfoGlobal = todosLosModulos.map(m => {
        const key = `${m.Serie}-${m.Numero}-${m.Linea}`;
        const info = byId.get(key);
        return {
          ...m,
          solape: !!info?.solape,
          guias: !!info?.guias,
          cristal: !!info?.cristal,
        };
      });
    }

    // Procesar cada pedido
    const pedidosIntegradosTemp: PedidoIntegrado[] = [];

    for (const [pedido, lineas] of pedidosActivos.entries()) {
      // Filtrar registros de tiempo para este pedido
      const recordsPedido = tiempoData.filter(r => r.NumeroManual === pedido);

      // Extraer módulos del pedido
      const modulosDelPedido = new Map<string, ModuloInfo>();
      lineas.forEach(linea => {
        if (linea.OrigenSerie && linea.OrigenNumero && linea.Linea) {
          const key = `${linea.OrigenSerie}-${linea.OrigenNumero}-${linea.Linea}`;
          if (!modulosDelPedido.has(key)) {
            const infoModulo = modulosInfoGlobal.find(
              m => m.Serie === linea.OrigenSerie &&
                m.Numero === linea.OrigenNumero &&
                m.Linea === linea.Linea
            );

            modulosDelPedido.set(key, infoModulo || {
              Serie: linea.OrigenSerie,
              Numero: linea.OrigenNumero,
              Linea: linea.Linea,
              solape: false,
              guias: false,
              cristal: false
            });
          }
        }
      });

      const modulosInfo = Array.from(modulosDelPedido.values());

      // Buscar info comercial
      const pedidoInfo = pedidosData.find(p => normalizarPedido(p.NoPedido) === pedido);

      // Calcular métricas
      const totalTiempo = recordsPedido.reduce((sum, r) => sum + (r.TiempoDedicado || 0), 0);
      const operarios = new Set(
        recordsPedido.map(r => operarioFirstNameKey(r.OperarioNombre || r.CodigoOperario))
      );
      const fechas = new Set(
        recordsPedido.map(r => formatDateOnly(r.FechaInicio || r.Fecha)).filter(f => f !== '-')
      );

      // Info adicional del lote
      const primeraLinea = lineas[0];

      pedidosIntegradosTemp.push({
        NumeroManual: pedido,
        tiempoRecords: recordsPedido,
        pedidoInfo,
        modulosInfo,
        totalTiempo,
        operarios,
        fechas,
        cliente: primeraLinea?.Cliente,
        descripcion: primeraLinea?.Descripcion,
        fechaInicio: primeraLinea?.FechaRealInicio
      });
    }

    console.log(`[LOG] ✅ Procesamiento completo: ${pedidosIntegradosTemp.length} pedidos`);

    pedidosIntegradosTemp.sort((a, b) => b.totalTiempo - a.totalTiempo);

    if (isLoadMore) {
      setPedidosIntegrados(prev => [...prev, ...pedidosIntegradosTemp]);
    } else {
      setPedidosIntegrados(pedidosIntegradosTemp);
    }
  }

  // Búsqueda con debounce
  const searchTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const handleSearch = (text: string) => {
    setSearchInput(text);
    
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    searchTimeoutRef.current = setTimeout(() => {
      setSearchQuery(text);
      setPagination(prev => ({ ...prev, offset: 0 }));
      fetchAllData(false);
    }, 500);
  };

  // Cargar más pedidos
  const handleLoadMore = () => {
    if (!isLoadingMore && pagination.hasMore) {
      fetchAllData(true);
    }
  };

  // Render Footer
  const renderFooter = () => {
    if (!isLoadingMore) return null;
    return (
      <View style={styles.footerLoader}>
        <ActivityIndicator size="small" color="#1976D2" />
        <Text style={styles.footerText}>Cargando más pedidos...</Text>
      </View>
    );
  };

  // Filtrar por búsqueda local (adicional)
  const filteredPedidos = useMemo(() => {
    if (!searchInput) return pedidosIntegrados;
    const q = searchInput.toLowerCase();
    return pedidosIntegrados.filter(p =>
      p.NumeroManual.toLowerCase().includes(q) ||
      p.pedidoInfo?.Cliente?.toLowerCase().includes(q) ||
      p.cliente?.toLowerCase().includes(q) ||
      p.pedidoInfo?.RefCliente?.toLowerCase().includes(q) ||
      Array.from(p.operarios).some(op => op.toLowerCase().includes(q))
    );
  }, [pedidosIntegrados, searchInput]);

  // ===================== Render principal =====================
  if (authLoading || loadingTiempo || loadingPedidos) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#1976D2" />
        <Text style={styles.loadingText}>
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
        onRefresh={() => {
          setPagination(prev => ({ ...prev, offset: 0 }));
          fetchAllData(false);
        }}
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

      {/* Búsqueda */}
      <View style={styles.searchContainer}>
        <Ionicons name="search-outline" size={20} color="#757575" />
        <TextInput
          style={styles.searchInput}
          placeholder="Buscar pedido / cliente / operario..."
          placeholderTextColor="#999999"
          value={searchInput}
          onChangeText={handleSearch}
        />
        {searchInput.length > 0 && (
          <TouchableOpacity onPress={() => handleSearch('')}>
            <Ionicons name="close-circle" size={20} color="#757575" />
          </TouchableOpacity>
        )}
      </View>

      {/* Info de paginación */}
      {pagination && pagination.total > 0 && (
        <View style={styles.paginationInfo}>
          <Text style={styles.paginationText}>
            Mostrando {filteredPedidos.length} de {pagination.total} pedidos
          </Text>
        </View>
      )}

      {loadingModulos && (
        <View style={styles.loadingModulosContainer}>
          <ActivityIndicator size="small" color="#1976D2" />
          <Text style={styles.loadingModulosText}>Cargando información de módulos...</Text>
        </View>
      )}

      {/* Lista de pedidos */}
      <FlatList
        data={filteredPedidos}
        keyExtractor={(item) => item.NumeroManual}
        style={styles.flatList}
        contentContainerStyle={{ paddingBottom: 24 }}
        onEndReached={handleLoadMore}
        onEndReachedThreshold={0.5}
        ListFooterComponent={renderFooter}
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

            {/* Info del pedido */}
            <View style={styles.pedidoInfoContainer}>
              <Text style={styles.pedidoInfoText}>
                Cliente: {item.pedidoInfo?.Cliente || item.cliente || 'N/A'}
              </Text>
              {item.pedidoInfo?.RefCliente && (
                <Text style={styles.pedidoInfoText}>Ref: {item.pedidoInfo.RefCliente}</Text>
              )}
              {item.descripcion && (
                <Text style={styles.pedidoInfoText}>Desc: {item.descripcion}</Text>
              )}
              {item.fechaInicio && (
                <Text style={styles.pedidoInfoText}>
                  Inicio: {formatDateOnly(item.fechaInicio)}
                </Text>
              )}
              {item.pedidoInfo?.EstadoPedido && (
                <Text style={styles.pedidoInfoText}>Estado: {item.pedidoInfo.EstadoPedido}</Text>
              )}
            </View>

            {/* Métricas */}
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
              <Ionicons name="chevron-forward-outline" size={16} color="#1976D2" />
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
              <Ionicons name="close" size={24} color="#1976D2" />
            </TouchableOpacity>
          </View>

          {selectedPedido && (
            selectedPedido.modulosInfo.length > 0 ? (
              <FlatList
                data={selectedPedido.modulosInfo}
                keyExtractor={(m) => `${m.Serie}-${m.Numero}-${m.Linea}`}
                contentContainerStyle={{ padding: 12 }}
                renderItem={({ item: modulo }) => (
                  <View style={styles.moduloDetailCard}>
                    <Text style={styles.moduloDetailTitle}>
                      📦 Módulo: {modulo.Serie} - {modulo.Numero} - Línea {modulo.Linea}
                    </Text>
                    <View style={{ flexDirection: 'row', gap: 12, marginTop: 8, flexWrap: 'wrap' }}>
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
            ) : (
              <View style={styles.noModulosContainer}>
                <Text style={styles.noModulosText}>
                  Este pedido no tiene módulos asociados.
                </Text>
                <Text style={styles.noModulosDetails}>
                  Registros de tiempo: {selectedPedido.tiempoRecords.length}
                </Text>
              </View>
            )
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
    backgroundColor: '#f5f5f5',
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
  },
  errorText: {
    color: '#d32f2f',
    fontSize: 16,
    textAlign: 'center',
    fontWeight: '600',
  },
  loadingText: {
    marginTop: 10,
    color: '#333333',
    fontSize: 14,
  },

  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    marginHorizontal: 12,
    marginVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    elevation: 2,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  searchInput: {
    flex: 1,
    height: 40,
    marginLeft: 8,
    color: '#333333',
    fontSize: 14,
  },

  paginationInfo: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  paginationText: {
    fontSize: 12,
    color: '#666666',
    fontWeight: '500',
  },

  loadingModulosContainer: {
    padding: 10,
    alignItems: 'center',
    backgroundColor: '#ffffff',
  },
  loadingModulosText: {
    color: '#666666',
    fontSize: 12,
    marginTop: 4,
  },

  footerLoader: {
    paddingVertical: 20,
    alignItems: 'center',
  },
  footerText: {
    marginTop: 8,
    fontSize: 12,
    color: '#666666',
  },

  flatList: {
    flex: 1,
    paddingHorizontal: 12,
  },

  card: {
    backgroundColor: '#ffffff',
    marginVertical: 6,
    padding: 16,
    borderRadius: 12,
    elevation: 3,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1976D2',
    flex: 1,
    marginRight: 8,
  },
  cardStats: {
    alignItems: 'flex-end',
  },
  cardTime: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#2d3748',
  },
  cardCount: {
    fontSize: 12,
    color: '#718096',
    marginTop: 2,
  },

  pedidoInfoContainer: {
    marginBottom: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
  },
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
    marginBottom: 2,
  },
  metricValue: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#2d3748',
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
    color: '#1976D2',
    fontWeight: '600',
    marginRight: 4,
  },

  modalContainer: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
    backgroundColor: '#ffffff',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1976D2',
  },
  closeButton: {
    padding: 8,
  },

  moduloDetailCard: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    elevation: 2,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    borderLeftWidth: 4,
    borderLeftColor: '#1976D2',
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

  noModulosContainer: {
    padding: 16,
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1,
  },
  noModulosText: {
    color: '#888888',
    fontSize: 14,
    textAlign: 'center',
  },
  noModulosDetails: {
    marginTop: 8,
    fontWeight: 'bold',
    color: '#333333',
    fontSize: 14,
  },
});