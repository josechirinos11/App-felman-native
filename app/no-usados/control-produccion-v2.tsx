import Ionicons from '@expo/vector-icons/Ionicons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Modal, Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity, useWindowDimensions, View
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useRouter } from 'expo-router';
import AppHeader from '../../components/AppHeader';
import ModalHeader from '../../components/ModalHeader';
import SQLModal from '../../components/SQLModal';
import { API_URL } from '../../config/constants';
import COLORS from '../../constants/Colors';
import { useAuth } from '../../hooks/useAuth';

// Tipo para los datos de producción
type ProductionRecord = {
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

// Tipos para estadísticas
type OperatorStats = {
  operario: string;
  totalTiempo: number;
  totalPedidos: number;
  totalModulos: number;
  tareas: { [key: string]: { tiempo: number; pedidos: number; modulos: number; registros: ProductionRecord[] } };
  pedidos: { [key: string]: { tiempo: number; modulos: number; tareas: string[]; registros: ProductionRecord[] } };
  promedioTiempoPorModulo: number;
  eficiencia: number;
  ranking: number;
};

type TaskStats = {
  tarea: string;
  totalTiempo: number;
  totalOperarios: number;
  totalPedidos: number;
  totalModulos: number;
  operarios: { [key: string]: { tiempo: number; pedidos: number; modulos: number; eficiencia: number; registros: ProductionRecord[] } };
  pedidos: { [key: string]: { tiempo: number; operarios: string[]; modulos: number; registros: ProductionRecord[] } };
  tiempoPromedioPorModulo: number;
  distribucionTrabajo: number; // % de tiempo total de producción
};

type OrderStats = {
  pedido: string;
  totalTiempo: number;
  totalOperarios: number;
  totalTareas: number;
  totalModulos: number;
  tareas: { [key: string]: { tiempo: number; operarios: string[]; modulos: number; registros: ProductionRecord[] } };
  operarios: { [key: string]: { tiempo: number; tareas: string[]; modulos: number; registros: ProductionRecord[] } };
  tiempoPromedioPorModulo: number;
  complejidad: number; // basado en número de tareas y operarios
  estado: 'completo' | 'parcial';
};

interface UserData {
  id: number;
  nombre?: string;
  rol?: string;
  name?: string;
  role?: string;
}

// Helper para calcular el último lunes
function getLastMonday(date = new Date()) {
  const d = new Date(date);
  const day = d.getDay();
  const diff = day === 0 ? 6 : day - 1; // Si es domingo, retrocede 6 días
  d.setDate(d.getDate() - diff);
  d.setHours(0,0,0,0);
  return d;
}

// Formatear fecha a YYYY-MM-DD
const formatDateOnly = (dateStr?: string | null) => {
  if (!dateStr) return '-';
  const s = String(dateStr).trim();
  if (!s) return '-';
  if (s.includes('T')) return s.split('T')[0];
  try {
    const d = new Date(s);
    if (!isNaN(d.getTime())) return d.toISOString().slice(0, 10);
  } catch (e) {
    // fallthrough
  }
  // Fallback: first 10 chars
  return s.slice(0, 10);
};

export default function ProductionAnalyticsScreen() {
  const { authenticated, loading: authLoading } = useAuth();
  const router = useRouter();

  // Estados principales
  const [records, setRecords] = useState<ProductionRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [filterMode, setFilterMode] = useState<'operador' | 'tarea' | 'pedido'>('operador');
  const [searchQuery, setSearchQuery] = useState('');
  
  // Filtros de fecha
  const [startDate, setStartDate] = useState(() => {
    const lastMonday = getLastMonday();
    return lastMonday.toISOString().split('T')[0];
  });
  const [endDate, setEndDate] = useState(() => {
    return new Date().toISOString().split('T')[0];
  });

  // Estados para modales
  const [detailModalVisible, setDetailModalVisible] = useState(false);
  const [selectedItem, setSelectedItem] = useState<any>(null);
  const [modalStats, setModalStats] = useState<any>(null);

  // Estados de usuario
  const [userData, setUserData] = useState<UserData | null>(null);
  const [userModalVisible, setUserModalVisible] = useState(false);
  const [modalUser, setModalUser] = useState({ userName: '', role: '' });
  const [token, setToken] = useState<string | null>(null);
  const [sqlVisible, setSqlVisible] = useState(false);

  // Estados de UI
  const [groupedList, setGroupedList] = useState<any[]>([]);
  const [counts, setCounts] = useState<{ operador: number; tarea: number; pedido: number }>({ 
    operador: 0, tarea: 0, pedido: 0 
  });
  const [subDetailModalVisible, setSubDetailModalVisible] = useState(false);
  const [subDetailData, setSubDetailData] = useState<any>(null);

  // Layout
  const isWeb = Platform.OS === 'web';
  const { width: windowWidth } = useWindowDimensions();
  const isMobile = !isWeb && windowWidth < 600;

  // Verificar autenticación
  useEffect(() => {
    if (!authLoading && !authenticated) {
      router.replace('/login');
    }
  }, [authenticated, authLoading, router]);

  // Cargar datos de usuario
  useEffect(() => {
    (async () => {
      try {
        const storedToken = await AsyncStorage.getItem('token');
        const rawUser = await AsyncStorage.getItem('userData');

        if (storedToken) setToken(storedToken);
        if (rawUser) {
          const parsedUser = JSON.parse(rawUser);
          if (parsedUser.nombre && parsedUser.rol) {
            setUserData(parsedUser);
          } else if (parsedUser.name && parsedUser.role) {
            setUserData({
              id: parsedUser.id || 0,
              nombre: parsedUser.name,
              rol: parsedUser.role,
            });
          }
        }
      } catch (error) {
        console.error('Error al leer AsyncStorage:', error);
      }
    })();
  }, []);

  // Verificar permisos
  const normalizedRole = ((userData?.rol ?? userData?.role) ?? '')
    .toString().trim().toLowerCase();
  const allowed = ['admin', 'developer', 'administrador'].includes(normalizedRole);

  // Funciones de utilidad
  const operarioFirstNameKey = (val?: string | null) => {
    if (!val) return 'SIN_OPERARIO';
    const s = String(val).trim();
    if (!s) return 'SIN_OPERARIO';
    const first = s.split(/[\s\/]+/)[0];
    return first.toUpperCase();
  };

  const formatDuration = (seconds?: number | null) => {
    if (seconds == null || isNaN(Number(seconds))) return '-';
    const totalSeconds = Math.floor(Number(seconds));
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    return `${hours}h ${minutes}m`;
  };

  // Función para obtener datos
  const fetchData = async () => {
    try {
      setLoading(true);
      const response = await fetch(
        `${API_URL}/control-terminales/production-analytics?start=${startDate}&end=${endDate}`
      );
      
      if (!response.ok) {
        console.warn('Respuesta no válida:', response.status);
        setRecords([]);
        return;
      }

      const data = await response.json();
      if (!Array.isArray(data)) {
        setRecords([]);
        return;
      }

      setRecords(data as ProductionRecord[]);
      processGroupedData(data);
    } catch (error) {
      console.error('Error al obtener datos:', error);
      setRecords([]);
    } finally {
      setLoading(false);
    }
  };

  // Procesar datos agrupados
  const processGroupedData = (data: ProductionRecord[]) => {
    const operadorSet = new Set<string>();
    const tareaSet = new Set<string>();
    const pedidoSet = new Set<string>();

    data.forEach(record => {
      operadorSet.add(operarioFirstNameKey(record.OperarioNombre || record.CodigoOperario));
      tareaSet.add(String(record.CodigoTarea ?? 'SIN_TAREA'));
      pedidoSet.add(String(record.NumeroManual ?? 'SIN_PEDIDO'));
    });

    setCounts({
      operador: operadorSet.size,
      tarea: tareaSet.size,
      pedido: pedidoSet.size
    });

    // Agrupar datos según el modo de filtro
    const grouped = groupDataByMode(data, filterMode);
    setGroupedList(grouped);
  };

  // Agrupar datos por modo
  const groupDataByMode = (data: ProductionRecord[], mode: 'operador' | 'tarea' | 'pedido') => {
    const groups = new Map<string, ProductionRecord[]>();

    data.forEach(record => {
      let key = 'SIN';
      if (mode === 'operador') {
        key = operarioFirstNameKey(record.OperarioNombre || record.CodigoOperario);
      } else if (mode === 'tarea') {
        key = String(record.CodigoTarea ?? 'SIN_TAREA');
      } else {
        key = String(record.NumeroManual ?? 'SIN_PEDIDO');
      }

      if (!groups.has(key)) groups.set(key, []);
      groups.get(key)!.push(record);
    });

    const result: any[] = [];
    groups.forEach((records, key) => {
      const safeRecords = Array.isArray(records) ? records : [];
      const totalTiempo = safeRecords.reduce((sum, r) => sum + (r.TiempoDedicado || 0), 0);
      const uniquePedidos = new Set(safeRecords.map(r => r.NumeroManual)).size;
      const uniqueTareas = new Set(safeRecords.map(r => r.CodigoTarea)).size;
      const uniqueOperarios = new Set(safeRecords.map(r => operarioFirstNameKey(r.OperarioNombre || r.CodigoOperario))).size;
      const totalModulos = safeRecords.length;

      let minFecha = '9999-99-99';
      let maxFecha = '0000-00-00';
      safeRecords.forEach(r => {
        if (r.Fecha && r.Fecha < minFecha) minFecha = r.Fecha;
        if (r.Fecha && r.Fecha > maxFecha) maxFecha = r.Fecha;
      });

      result.push({
        key,
        records,
        totalTiempo,
        count: totalModulos, // ahora 'Módulos' es igual al total de registros
        uniquePedidos,
        uniqueTareas,
        uniqueOperarios,
        totalModulos,
        minFecha: formatDateOnly(minFecha),
        maxFecha: formatDateOnly(maxFecha)
      });
    });

    return result.sort((a, b) => b.totalTiempo - a.totalTiempo);
  };

  // Calcular estadísticas de operario
  const calculateOperatorStats = (operario: string): OperatorStats => {
    const operatorRecords = (Array.isArray(records) ? records : []).filter(r => 
      operarioFirstNameKey(r.OperarioNombre || r.CodigoOperario) === operario
    );


    const stats: OperatorStats = {
      operario,
      totalTiempo: 0,
      totalPedidos: 0,
      totalModulos: 0,
      tareas: {},
      pedidos: {},
      promedioTiempoPorModulo: 0,
      eficiencia: 0,
      ranking: 0
    };

    let modulosCount = 0;
    let pedidosCount = 0;
    const pedidosSet = new Set<string>();
    const modulosSet = new Set<string>();

    operatorRecords.forEach(record => {
      const tiempo = record.TiempoDedicado || 0;
      const tarea = String(record.CodigoTarea || 'SIN_TAREA');
      const pedido = String(record.NumeroManual || 'SIN_PEDIDO');
      const modulo = String(record.Modulo || 'SIN_MODULO');

      stats.totalTiempo += tiempo;
      pedidosSet.add(pedido);
      modulosSet.add(modulo);
      modulosCount += 1;
      pedidosCount += 1;

      // Estadísticas por tarea
      if (!stats.tareas[tarea]) {
        stats.tareas[tarea] = { tiempo: 0, pedidos: 0, modulos: 0, registros: [] };
      }
      stats.tareas[tarea].tiempo += tiempo;
      stats.tareas[tarea].modulos += 1;
      stats.tareas[tarea].pedidos += 1;
      stats.tareas[tarea].registros.push(record);

      // Estadísticas por pedido
      if (!stats.pedidos[pedido]) {
        stats.pedidos[pedido] = { tiempo: 0, modulos: 0, tareas: [], registros: [] };
      }
      stats.pedidos[pedido].tiempo += tiempo;
      stats.pedidos[pedido].modulos += 1;
      if (!stats.pedidos[pedido].tareas.includes(tarea)) {
        stats.pedidos[pedido].tareas.push(tarea);
      }
      stats.pedidos[pedido].registros.push(record);
    });

    stats.totalPedidos = pedidosSet.size;
    stats.totalModulos = modulosCount;
    stats.promedioTiempoPorModulo = stats.totalModulos > 0 ? stats.totalTiempo / stats.totalModulos : 0;

    // Calcular eficiencia comparativa
    const allOperators = [...new Set((Array.isArray(records) ? records : []).map(r => operarioFirstNameKey(r.OperarioNombre || r.CodigoOperario)))];
    const operatorTotals = (Array.isArray(allOperators) ? allOperators : []).map(op => {
      const opRecords = records.filter(r => operarioFirstNameKey(r.OperarioNombre || r.CodigoOperario) === op);
      const totalTime = opRecords.reduce((sum, r) => sum + (r.TiempoDedicado || 0), 0);
      const totalMods = new Set((Array.isArray(opRecords) ? opRecords : []).map(r => r.Modulo)).size;
      return { operario: op, tiempo: totalTime, modulos: totalMods, eficiencia: totalMods > 0 ? totalTime / totalMods : 0 };
    });

    const sortedByEfficiency = operatorTotals.sort((a, b) => a.eficiencia - b.eficiencia);
    const operatorIndex = sortedByEfficiency.findIndex(op => op.operario === operario);
    stats.ranking = operatorIndex + 1;
    stats.eficiencia = stats.promedioTiempoPorModulo;

    return stats;
  };

  // Calcular estadísticas de tarea
  const calculateTaskStats = (tarea: string): TaskStats => {
    const taskRecords = (Array.isArray(records) ? records : []).filter(r => 
      String(r.CodigoTarea || 'SIN_TAREA') === tarea
    );

    const stats: TaskStats = {
      tarea,
      totalTiempo: 0,
      totalOperarios: 0,
      totalPedidos: 0,
      totalModulos: 0,
      operarios: {},
      pedidos: {},
      tiempoPromedioPorModulo: 0,
      distribucionTrabajo: 0
    };

    const operariosSet = new Set<string>();
    const pedidosSet = new Set<string>();
    const modulosSet = new Set<string>();

    taskRecords.forEach(record => {
      const tiempo = record.TiempoDedicado || 0;
      const operario = operarioFirstNameKey(record.OperarioNombre || record.CodigoOperario);
      const pedido = String(record.NumeroManual || 'SIN_PEDIDO');
      const modulo = String(record.Modulo || 'SIN_MODULO');

      stats.totalTiempo += tiempo;
      operariosSet.add(operario);
      pedidosSet.add(pedido);
      modulosSet.add(modulo);

      // Estadísticas por operario
      if (!stats.operarios[operario]) {
        stats.operarios[operario] = { tiempo: 0, pedidos: 0, modulos: 0, eficiencia: 0, registros: [] };
      }
      stats.operarios[operario].tiempo += tiempo;
      stats.operarios[operario].registros.push(record);

      // Estadísticas por pedido
      if (!stats.pedidos[pedido]) {
        stats.pedidos[pedido] = { tiempo: 0, operarios: [], modulos: 0, registros: [] };
      }
      stats.pedidos[pedido].tiempo += tiempo;
      if (!stats.pedidos[pedido].operarios.includes(operario)) {
        stats.pedidos[pedido].operarios.push(operario);
      }
      stats.pedidos[pedido].registros.push(record);
    });

    // Completar estadísticas por operario
    Object.keys(stats?.operarios ?? {}).forEach(operario => {
      const operarioModulos = new Set(
        taskRecords
          .filter(r => operarioFirstNameKey(r.OperarioNombre || r.CodigoOperario) === operario)
          .map(r => r.Modulo)
      );
      stats.operarios[operario].modulos = operarioModulos.size;
      stats.operarios[operario].pedidos = new Set(
        taskRecords
          .filter(r => operarioFirstNameKey(r.OperarioNombre || r.CodigoOperario) === operario)
          .map(r => r.NumeroManual)
      ).size;
      stats.operarios[operario].eficiencia = stats.operarios[operario].modulos > 0 
        ? stats.operarios[operario].tiempo / stats.operarios[operario].modulos : 0;
    });

    // Completar estadísticas por pedido
    Object.keys(stats?.pedidos ?? {}).forEach(pedido => {
      const pedidoModulos = new Set(
        taskRecords
          .filter(r => String(r.NumeroManual || 'SIN_PEDIDO') === pedido)
          .map(r => r.Modulo)
      );
      stats.pedidos[pedido].modulos = pedidoModulos.size;
    });

    stats.totalOperarios = operariosSet.size;
    stats.totalPedidos = pedidosSet.size;
    stats.totalModulos = modulosSet.size;
    stats.tiempoPromedioPorModulo = stats.totalModulos > 0 ? stats.totalTiempo / stats.totalModulos : 0;

    // Calcular distribución de trabajo
    const totalProductionTime = records.reduce((sum, r) => sum + (r.TiempoDedicado || 0), 0);
    stats.distribucionTrabajo = totalProductionTime > 0 ? (stats.totalTiempo / totalProductionTime) * 100 : 0;

    return stats;
  };

  // Calcular estadísticas de pedido
  const calculateOrderStats = (pedido: string): OrderStats => {
    const orderRecords = (Array.isArray(records) ? records : []).filter(r => 
      String(r.NumeroManual || 'SIN_PEDIDO') === pedido
    );

    const stats: OrderStats = {
      pedido,
      totalTiempo: 0,
      totalOperarios: 0,
      totalTareas: 0,
      totalModulos: 0,
      tareas: {},
      operarios: {},
      tiempoPromedioPorModulo: 0,
      complejidad: 0, // basado en número de tareas y operarios
      estado: 'completo'
    };

    const operariosSet = new Set<string>();
    const tareasSet = new Set<string>();
    const modulosSet = new Set<string>();

    orderRecords.forEach(record => {
      const tiempo = record.TiempoDedicado || 0;
      const operario = operarioFirstNameKey(record.OperarioNombre || record.CodigoOperario);
      const tarea = String(record.CodigoTarea || 'SIN_TAREA');
      const modulo = String(record.Modulo || 'SIN_MODULO');

      stats.totalTiempo += tiempo;
      operariosSet.add(operario);
      tareasSet.add(tarea);
      modulosSet.add(modulo);

      // Estadísticas por tarea
      if (!stats.tareas[tarea]) {
        stats.tareas[tarea] = { tiempo: 0, operarios: [], modulos: 0, registros: [] };
      }
      stats.tareas[tarea].tiempo += tiempo;
      if (!stats.tareas[tarea].operarios.includes(operario)) {
        stats.tareas[tarea].operarios.push(operario);
      }
      stats.tareas[tarea].registros.push(record);

      // Estadísticas por operario
      if (!stats.operarios[operario]) {
        stats.operarios[operario] = { tiempo: 0, tareas: [], modulos: 0, registros: [] };
      }
      stats.operarios[operario].tiempo += tiempo;
      if (!stats.operarios[operario].tareas.includes(tarea)) {
        stats.operarios[operario].tareas.push(tarea);
      }
      stats.operarios[operario].registros.push(record);
    });

    // Completar estadísticas
    Object.keys(stats?.tareas ?? {}).forEach(tarea => {
      const tareaModulos = new Set(
        orderRecords
          .filter(r => String(r.CodigoTarea || 'SIN_TAREA') === tarea)
          .map(r => r.Modulo)
      );
      stats.tareas[tarea].modulos = tareaModulos.size;
    });

    Object.keys(stats?.operarios ?? {}).forEach(operario => {
      const operarioModulos = new Set(
        orderRecords
          .filter(r => operarioFirstNameKey(r.OperarioNombre || r.CodigoOperario) === operario)
          .map(r => r.Modulo)
      );
      stats.operarios[operario].modulos = operarioModulos.size;
    });

    stats.totalOperarios = operariosSet.size;
    stats.totalTareas = tareasSet.size;
    stats.totalModulos = modulosSet.size;
    stats.tiempoPromedioPorModulo = stats.totalModulos > 0 ? stats.totalTiempo / stats.totalModulos : 0;
    
    // Calcular complejidad (normalizada 0-100)
    stats.complejidad = Math.min(100, (stats.totalTareas * 20) + (stats.totalOperarios * 15) + (stats.totalModulos * 2));
    
    // Determinar estado (simplificado)
    stats.estado = orderRecords.some(r => r.Abierta === 1) ? 'parcial' : 'completo';

    return stats;
  };

  // Abrir modal con estadísticas
  const openStatsModal = (item: any) => {
    let stats: any = null;
    
    if (filterMode === 'operador') {
      stats = calculateOperatorStats(item.key);
    } else if (filterMode === 'tarea') {
      stats = calculateTaskStats(item.key);
    } else {
      stats = calculateOrderStats(item.key);
    }
    
    setSelectedItem(item);
    setModalStats(stats);
    setDetailModalVisible(true);
  };

  // Filtrar datos por búsqueda
  const filteredGroupedList = groupedList.filter(item => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    
    return item.key.toLowerCase().includes(query) ||
           item.records.some((record: ProductionRecord) => 
             String(record.NumeroManual || '').toLowerCase().includes(query) ||
             String(record.CodigoTarea || '').toLowerCase().includes(query) ||
             operarioFirstNameKey(record.OperarioNombre || record.CodigoOperario).toLowerCase().includes(query) ||
             String(record.Modulo || '').toLowerCase().includes(query)
           );
  });

  // Cargar datos cuando cambian las fechas
  useEffect(() => {
    if (startDate && endDate) {
      fetchData();
    }
  }, [startDate, endDate]);

  // Actualizar agrupación cuando cambia el modo de filtro
  useEffect(() => {
    if (records.length > 0) {
      processGroupedData(records);
    }
  }, [filterMode]);

  // Render de loading y verificaciones
  if (authLoading || loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={COLORS.primary} />
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
        titleOverride="Análisis de Producción"
        count={records.length}
        userNameProp={userData?.nombre || userData?.name || '—'}
        roleProp={userData?.rol || userData?.role || '—'}
        serverReachableOverride={!!authenticated}
        onRefresh={fetchData}
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
        <View style={styles.dateInputContainer}>
          <Text style={styles.dateLabel}>Desde:</Text>
          <TextInput
            style={styles.dateInput}
            value={startDate}
            onChangeText={setStartDate}
            placeholder="YYYY-MM-DD"
          />
        </View>
        <View style={styles.dateInputContainer}>
          <Text style={styles.dateLabel}>Hasta:</Text>
          <TextInput
            style={styles.dateInput}
            value={endDate}
            onChangeText={setEndDate}
            placeholder="YYYY-MM-DD"
          />
        </View>
        <TouchableOpacity style={styles.refreshButton} onPress={fetchData}>
          <Ionicons name="refresh-outline" size={24} color={COLORS.primary} />
        </TouchableOpacity>
      </View>

      {/* Búsqueda */}
      <View style={styles.searchContainer}>
        <Ionicons name="search-outline" size={20} color="#757575" />
        <TextInput
          style={styles.searchInput}
          placeholder="Buscar operario, pedido, tarea o módulo..."
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
      </View>

      {/* Botones de filtro */}
      <View style={styles.filterContainer}>
        <TouchableOpacity 
          style={[styles.filterButton, filterMode === 'operador' && styles.filterButtonActive]} 
          onPress={() => setFilterMode('operador')}
        >
          <Text style={[styles.filterText, filterMode === 'operador' && styles.filterTextActive]}>
            Operadores · {counts.operador}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity 
          style={[styles.filterButton, filterMode === 'tarea' && styles.filterButtonActive]} 
          onPress={() => setFilterMode('tarea')}
        >
          <Text style={[styles.filterText, filterMode === 'tarea' && styles.filterTextActive]}>
            Tareas · {counts.tarea}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity 
          style={[styles.filterButton, filterMode === 'pedido' && styles.filterButtonActive]} 
          onPress={() => setFilterMode('pedido')}
        >
          <Text style={[styles.filterText, filterMode === 'pedido' && styles.filterTextActive]}>
            Pedidos · {counts.pedido}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Lista principal */}
      <FlatList
        data={filteredGroupedList}
        keyExtractor={(item) => item.key}
        style={styles.flatList}
        contentContainerStyle={{ paddingBottom: 24 }}
        renderItem={({ item }) => (
          <TouchableOpacity style={styles.card} onPress={() => openStatsModal(item)}>
            <View style={styles.cardHeader}>
              <Text style={styles.cardTitle}>{item.key}</Text>
              <View style={styles.cardStats}>
                <Text style={styles.cardTime}>{formatDuration(item.totalTiempo)}</Text>
                <Text style={styles.cardCount}>{item.count} registros</Text>
              </View>
            </View>
            
            <View style={styles.cardMetrics}>
              <View style={styles.metricItem}>
                <Text style={styles.metricLabel}>Fechas</Text>
                <Text style={styles.metricValue}>{item.minFecha} - {item.maxFecha}</Text>
              </View>
              <View style={styles.metricItem}>
                <Text style={styles.metricLabel}>
                  {filterMode === 'operador' && 'Pedidos'}
                  {filterMode === 'tarea' && 'Pedidos'}
                  {filterMode === 'pedido' && 'Tareas'}
                </Text>
                <Text style={styles.metricValue}>
                  {filterMode === 'operador' && item.uniquePedidos}
                  {filterMode === 'tarea' && item.uniquePedidos}
                  {filterMode === 'pedido' && item.uniqueTareas}
                </Text>
              </View>
              <View style={styles.metricItem}>
                <Text style={styles.metricLabel}>
                  {filterMode === 'operador' && 'Tareas'}
                  {filterMode === 'tarea' && 'Operarios'}
                  {filterMode === 'pedido' && 'Operarios'}
                </Text>
                <Text style={styles.metricValue}>
                  {filterMode === 'operador' && item.uniqueTareas}
                  {filterMode === 'tarea' && item.uniqueOperarios}
                  {filterMode === 'pedido' && item.uniqueOperarios}
                </Text>
              </View>
            </View>

            <TouchableOpacity style={styles.statsButton} onPress={() => openStatsModal(item)}>
              <Text style={styles.statsButtonText}>Ver Estadísticas</Text>
              <Ionicons name="stats-chart-outline" size={16} color={COLORS.primary} />
            </TouchableOpacity>
          </TouchableOpacity>
        )}
      />

      {/* Modal de estadísticas principales */}
      <Modal
        visible={detailModalVisible}
        animationType="slide"
        onRequestClose={() => setDetailModalVisible(false)}
      >
        <SafeAreaView style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>
              Estadísticas de {filterMode === 'operador' ? 'Operario' : filterMode === 'tarea' ? 'Tarea' : 'Pedido'}: {selectedItem?.key}
            </Text>
            <TouchableOpacity onPress={() => setDetailModalVisible(false)} style={styles.closeButton}>
              <Ionicons name="close" size={24} color={COLORS.primary} />
            </TouchableOpacity>
          </View>
          <ScrollView style={styles.modalScrollView} contentContainerStyle={styles.modalScrollContent}>
            {modalStats && (
              <View>
                {/* Resumen general */}
                <View style={styles.statsSection}>
                  <Text style={styles.sectionTitle}>Resumen General</Text>
                  <View style={styles.statsGrid}>
                    <View style={styles.statItem}>
                      <Text style={styles.statLabel}>Tiempo Total</Text>
                      <Text style={styles.statValue}>{formatDuration(modalStats.totalTiempo)}</Text>
                    </View>
                    <View style={styles.statItem}>
                      <Text style={styles.statLabel}>Módulos</Text>
                      <Text style={styles.statValue}>{modalStats.totalModulos}</Text>
                    </View>
                    <View style={styles.statItem}>
                      <Text style={styles.statLabel}>
                        {filterMode === 'operador' && 'Pedidos'}
                        {filterMode === 'tarea' && 'Pedidos'}
                        {filterMode === 'pedido' && 'Tareas'}
                      </Text>
                      <Text style={styles.statValue}>
                        {filterMode === 'operador' && modalStats.totalPedidos}
                        {filterMode === 'tarea' && modalStats.totalPedidos}
                        {filterMode === 'pedido' && modalStats.totalTareas}
                      </Text>
                    </View>
                    <View style={styles.statItem}>
                      <Text style={styles.statLabel}>
                        {filterMode === 'operador' && 'Tareas'}
                        {filterMode === 'tarea' && 'Operarios'}
                        {filterMode === 'pedido' && 'Operarios'}
                      </Text>
                      <Text style={styles.statValue}>
                        {filterMode === 'operador' && Object.keys(modalStats?.tareas ?? {}).length}
                        {filterMode === 'tarea' && modalStats.totalOperarios}
                        {filterMode === 'pedido' && modalStats.totalOperarios}
                      </Text>
                    </View>
                  </View>

                  {/* Métricas avanzadas */}
                  <View style={styles.advancedMetrics}>
                    <View style={styles.metricCard}>
                      <Text style={styles.metricCardTitle}>Tiempo Promedio por Módulo</Text>
                      <Text style={styles.metricCardValue}>
                        {formatDuration(modalStats.tiempoPromedioPorModulo || modalStats.promedioTiempoPorModulo)}
                      </Text>
                    </View>
                    
                    {filterMode === 'operador' && (
                      <View style={styles.metricCard}>
                        <Text style={styles.metricCardTitle}>Ranking de Eficiencia</Text>
                        <Text style={styles.metricCardValue}>#{modalStats.ranking}</Text>
                        <Text style={styles.metricCardSubtitle}>
                          (Menos tiempo por módulo = mejor eficiencia)
                        </Text>
                      </View>
                    )}
                    
                    {filterMode === 'tarea' && (
                      <View style={styles.metricCard}>
                        <Text style={styles.metricCardTitle}>Distribución del Trabajo</Text>
                        <Text style={styles.metricCardValue}>{(typeof modalStats.distribucionTrabajo === 'number' ? modalStats.distribucionTrabajo : 0).toFixed(1)}%</Text>
                        <Text style={styles.metricCardSubtitle}>
                          Del tiempo total de producción
                        </Text>
                      </View>
                    )}
                    
                    {filterMode === 'pedido' && (
                      <View style={styles.metricCard}>
                        <Text style={styles.metricCardTitle}>Complejidad del Pedido</Text>
                        <Text style={styles.metricCardValue}>{(typeof modalStats.complejidad === 'number' ? modalStats.complejidad : 0).toFixed(0)}/100</Text>
                        <Text style={styles.metricCardSubtitle}>
                          Estado: {modalStats.estado === 'completo' ? 'Completo' : 'En progreso'}
                        </Text>
                      </View>
                    )}
                  </View>
                </View>

                {/* Desglose detallado por operarios (para tareas y pedidos) */}
                {(filterMode === 'tarea' || filterMode === 'pedido') && modalStats.operarios && (
                  <View style={styles.statsSection}>
                    <Text style={styles.sectionTitle}>Desglose por Operarios</Text>
                    <View style={styles.detailTable}>
                      <View style={styles.tableHeader}>
                        <Text style={[styles.tableHeaderText, { flex: 2 }]}>Operario</Text>
                        <Text style={styles.tableHeaderText}>Tiempo</Text>
                        <Text style={styles.tableHeaderText}>Módulos</Text>
                        <Text style={styles.tableHeaderText}>
                          {filterMode === 'tarea' ? 'Pedidos' : 'Tareas'}
                        </Text>
                        {filterMode === 'tarea' && <Text style={styles.tableHeaderText}>Efic.</Text>}
                      </View>
                      {(Array.isArray(Object.entries(modalStats.operarios ?? {})) ? Object.entries(modalStats.operarios ?? {}) : [])
                        .sort(([,a], [,b]) => (b as any).tiempo - (a as any).tiempo)
                        .map(([operario, data]: [string, any]) => (
                        <TouchableOpacity
                          key={operario}
                          style={styles.tableRow}
                          onPress={() => {
                            const unitarios = data.registros || [];
                            setSubDetailData({ tipo: 'operario', nombre: operario, registros: unitarios, resumen: data });
                            setSubDetailModalVisible(true);
                          }}
                        >
                          <Text style={[styles.tableCell, { flex: 2 }]}>{operario}</Text>
                          <Text style={styles.tableCell}>{formatDuration(data.tiempo)}</Text>
                          <Text style={styles.tableCell}>{data.modulos}</Text>
                          <Text style={styles.tableCell}>
                            {filterMode === 'tarea' ? (Array.isArray(data?.pedidos) ? data.pedidos.length : 0) : (Array.isArray(data?.tareas) ? data.tareas.length : 0)}
                          </Text>
                          {filterMode === 'tarea' && (
                            <Text style={styles.tableCell}>{formatDuration(data.eficiencia)}</Text>
                          )}
                        </TouchableOpacity>
                      ))}
                    </View>
                  </View>
                )}

                {/* Desglose detallado por tareas (para operarios y pedidos) */}
                {(filterMode === 'operador' || filterMode === 'pedido') && modalStats.tareas && (
                  <View style={styles.statsSection}>
                    <Text style={styles.sectionTitle}>Desglose por Tareas</Text>
                    <View style={styles.detailTable}>
                      <View style={styles.tableHeader}>
                        <Text style={[styles.tableHeaderText, { flex: 2 }]}>Tarea</Text>
                        <Text style={styles.tableHeaderText}>Tiempo</Text>
                        <Text style={styles.tableHeaderText}>Módulos</Text>
                        <Text style={styles.tableHeaderText}>
                          {filterMode === 'operador' ? 'Pedidos' : 'Operarios'}
                        </Text>
                      </View>
                      {(Array.isArray(Object.entries(modalStats.tareas ?? {})) ? Object.entries(modalStats.tareas ?? {}) : [])
                        .sort(([,a], [,b]) => (b as any).tiempo - (a as any).tiempo)
                        .map(([tarea, data]: [string, any]) => (
                        <TouchableOpacity
                          key={tarea}
                          style={styles.tableRow}
                          onPress={() => {
                            const unitarios = data.registros || [];
                            setSubDetailData({ tipo: 'tarea', nombre: tarea, registros: unitarios, resumen: data });
                            setSubDetailModalVisible(true);
                          }}
                        >
                          <Text style={[styles.tableCell, { flex: 2 }]}>{tarea}</Text>
                          <Text style={styles.tableCell}>{formatDuration(data.tiempo)}</Text>
                          <Text style={styles.tableCell}>{data.modulos}</Text>
                          <Text style={styles.tableCell}>
                            {filterMode === 'operador' ? (Array.isArray(data?.pedidos) ? data.pedidos.length : 0) : (Array.isArray(data?.operarios) ? data.operarios.length : 0)}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  </View>
                )}

                {/* Desglose detallado por pedidos (para operarios y tareas) */}
                {(filterMode === 'operador' || filterMode === 'tarea') && modalStats.pedidos && (
                  <View style={styles.statsSection}>
                    <Text style={styles.sectionTitle}>Desglose por Pedidos</Text>
                    <View style={styles.detailTable}>
                      <View style={styles.tableHeader}>
                        <Text style={[styles.tableHeaderText, { flex: 2 }]}>Pedido</Text>
                        <Text style={styles.tableHeaderText}>Tiempo</Text>
                        <Text style={styles.tableHeaderText}>Módulos</Text>
                        <Text style={styles.tableHeaderText}>
                          {filterMode === 'operador' ? 'Tareas' : 'Operarios'}
                        </Text>
                      </View>
                      {(Array.isArray(Object.entries(modalStats.pedidos ?? {})) ? Object.entries(modalStats.pedidos ?? {}) : [])
                        .sort(([,a], [,b]) => (b as any).tiempo - (a as any).tiempo)
                        .map(([pedido, data]: [string, any]) => (
                        <TouchableOpacity
                          key={pedido}
                          style={styles.tableRow}
                          onPress={() => {
                            const unitarios = data.registros || [];
                            setSubDetailData({ tipo: 'pedido', nombre: pedido, registros: unitarios, resumen: data });
                            setSubDetailModalVisible(true);
                          }}
                        >
                          <Text style={[styles.tableCell, { flex: 2 }]}>{pedido}</Text>
                          <Text style={styles.tableCell}>{formatDuration(data.tiempo)}</Text>
                          <Text style={styles.tableCell}>{data.modulos}</Text>
                          <Text style={styles.tableCell}>
                            {filterMode === 'operador' ? (Array.isArray(data?.tareas) ? data.tareas.length : 0) : (Array.isArray(data?.operarios) ? data.operarios.length : 0)}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  </View>
                )}

                {/* Conclusiones y recomendaciones */}
                <View style={styles.statsSection}>
                  <Text style={styles.sectionTitle}>Conclusiones</Text>
                  <View style={styles.conclusionsContainer}>
                    {filterMode === 'operador' && (
                      <View>
                        <Text style={styles.conclusionText}>
                          • Eficiencia: {modalStats.eficiencia > 0 ? 
                            `${formatDuration(modalStats.eficiencia)} por módulo (Ranking #${modalStats.ranking})` : 
                            'No calculable'}
                        </Text>
                        <Text style={styles.conclusionText}>
                          • Versatilidad: Trabaja en {(modalStats.tareas ? Object.keys(modalStats.tareas).length : 0)} tareas diferentes
                        </Text>
                        <Text style={styles.conclusionText}>
                          • Productividad: {modalStats.totalModulos} módulos completados en {modalStats.totalPedidos} pedidos
                        </Text>
                        <Text style={styles.conclusionText}>
                          • Tarea principal: {(Array.isArray(Object.entries(modalStats.tareas ?? {})) ? Object.entries(modalStats.tareas ?? {}) : []).sort(([,a], [,b]) => (b as any).tiempo - (a as any).tiempo)[0]?.[0] || 'N/A'}
                        </Text>
                      </View>
                    )}
                    
                    {filterMode === 'tarea' && (
                      <View>
                        <Text style={styles.conclusionText}>
                          • Importancia: Representa el {(typeof modalStats.distribucionTrabajo === 'number' ? modalStats.distribucionTrabajo : 0).toFixed(1)}% del tiempo total de producción
                        </Text>
                        <Text style={styles.conclusionText}>
                          • Colaboración: {modalStats.totalOperarios} operarios trabajan en esta tarea
                        </Text>
                        <Text style={styles.conclusionText}>
                          • Operario más eficiente: {(Array.isArray(Object.entries(modalStats.operarios ?? {})) ? Object.entries(modalStats.operarios ?? {}) : []).sort(([,a], [,b]) => (a as any).eficiencia - (b as any).eficiencia)[0]?.[0] || 'N/A'}
                        </Text>
                        <Text style={styles.conclusionText}>
                          • Complejidad: {modalStats.tiempoPromedioPorModulo > 0 ? 
                            `${formatDuration(modalStats.tiempoPromedioPorModulo)} promedio por módulo` : 
                            'No calculable'}
                        </Text>
                      </View>
                    )}
                    
                    {filterMode === 'pedido' && (
                      <View>
                        <Text style={styles.conclusionText}>
                          • Complejidad: {(typeof modalStats.complejidad === 'number' ? modalStats.complejidad : 0).toFixed(0)}/100 
                          {modalStats.complejidad > 70 ? ' (Alta)' : modalStats.complejidad > 40 ? ' (Media)' : ' (Baja)'}
                        </Text>
                        <Text style={styles.conclusionText}>
                          • Estado: {modalStats.estado === 'completo' ? 'Completado' : 'En progreso'}
                        </Text>
                        <Text style={styles.conclusionText}>
                          • Colaboración: {modalStats.totalOperarios} operarios en {modalStats.totalTareas} tareas
                        </Text>
                        <Text style={styles.conclusionText}>
                          • Tarea principal: {Object.entries(modalStats.tareas ?? {})
                            .sort(([,a], [,b]) => (b as any).tiempo - (a as any).tiempo)[0]?.[0] || 'N/A'}
                        </Text>
                        <Text style={styles.conclusionText}>
                          • Eficiencia: {modalStats.tiempoPromedioPorModulo > 0 ? 
                            `${formatDuration(modalStats.tiempoPromedioPorModulo)} por módulo` : 
                            'No calculable'}
                        </Text>
                      </View>
                    )}
                  </View>
                </View>
              </View>
            )}
          </ScrollView>
        </SafeAreaView>
      </Modal>

      {/* SQL Debug Modal */}
      {sqlVisible && <SQLModal visible={sqlVisible} onClose={() => setSqlVisible(false)} />}

      {/* Modal de desglose individual */}
      <Modal
        visible={subDetailModalVisible}
        animationType="slide"
        onRequestClose={() => setSubDetailModalVisible(false)}
      >
        <SafeAreaView style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>
              {subDetailData?.tipo === 'operario' && `Detalle de Operario: ${subDetailData?.nombre}`}
              {subDetailData?.tipo === 'tarea' && `Detalle de Tarea: ${subDetailData?.nombre}`}
              {subDetailData?.tipo === 'pedido' && `Detalle de Pedido: ${subDetailData?.nombre}`}
            </Text>
            <TouchableOpacity onPress={() => setSubDetailModalVisible(false)} style={styles.closeButton}>
              <Ionicons name="close" size={24} color={COLORS.primary} />
            </TouchableOpacity>
          </View>
          <ScrollView style={styles.modalScrollView} contentContainerStyle={styles.modalScrollContent}>
            {subDetailData?.registros && subDetailData.registros.length > 0 ? (
              <View style={{ padding: 16 }}>
                {/* Agrupar por pedido y módulo para mostrar desglose de repeticiones */}
                {(() => {
                  // Crear un mapa para agrupar por pedido y módulo
                  const agrupados: { [key: string]: ProductionRecord[] } = {};
                  subDetailData.registros.forEach((r: ProductionRecord) => {
                    const key = `${r.NumeroManual ?? '-'}|${r.Modulo ?? '-'}`;
                    if (!agrupados[key]) agrupados[key] = [];
                    agrupados[key].push(r);
                  });
                  return Object.entries(agrupados).map(([key, registros], idx) => {
                    const [pedido, modulo] = key.split('|');
                    const repeticiones = registros.length;
                    const tiemposIndividuales = registros.map(x => formatDuration(x.TiempoDedicado));
                    const tiempoTotal = registros.reduce((sum, x) => sum + (typeof x.TiempoDedicado === 'number' ? x.TiempoDedicado : 0), 0);
                    return (
                      <View key={idx} style={{ marginBottom: 16, backgroundColor: '#f8f9fa', borderRadius: 8, padding: 12 }}>
                        <Text style={{ fontWeight: 'bold', color: COLORS.primary }}>
                          Pedido: {pedido} | Módulo: {modulo}
                        </Text>
                        {repeticiones > 1 ? (
                          <View style={{ marginBottom: 4 }}>
                            <Text style={{ color: 'orange', fontWeight: 'bold' }}>
                              Se marcó {repeticiones} veces este pedido y módulo.
                            </Text>
                            <Text style={{ color: '#333', fontWeight: 'bold' }}>
                              Tiempos individuales: {tiemposIndividuales.join(', ')}
                            </Text>
                            <Text style={{ color: '#333', fontWeight: 'bold' }}>
                              Tiempo total dedicado: {formatDuration(tiempoTotal)}
                            </Text>
                          </View>
                        ) : (
                          <Text style={{ color: '#333', fontWeight: 'bold', marginBottom: 4 }}>
                            Tiempo dedicado: {tiemposIndividuales[0]}
                          </Text>
                        )}
                        {/* Mostrar los detalles de cada registro */}
                        {registros.map((r, i) => (
                          <View key={i} style={{ marginBottom: 8 }}>
                            <Text>Hora Inicio: {r.HoraInicio ?? '-'}</Text>
                            <Text>Hora Fin: {r.HoraFin ?? '-'}</Text>
                            <Text>Operario: {operarioFirstNameKey(r.OperarioNombre || r.CodigoOperario)}</Text>
                            <Text>Tarea: {r.CodigoTarea ?? '-'}</Text>
                            <Text>FechaInicio: {formatDateOnly(r.FechaInicio)}</Text>
                            <Text>FechaFin: {formatDateOnly(r.FechaFin)}</Text>
                            <Text>FabricacionSerie: {r.FabricacionSerie ?? '-'}</Text>
                            <Text>FabricacionNumero: {r.FabricacionNumero ?? '-'}</Text>
                          </View>
                        ))}
                      </View>
                    );
                  });
                })()}
              </View>
            ) : (
              <Text style={{ textAlign: 'center', marginTop: 24 }}>No hay registros para mostrar.</Text>
            )}
          </ScrollView>
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorText: {
    color: 'red',
    fontSize: 16,
    textAlign: 'center',
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
  dateInputContainer: {
    flex: 1,
  },
  dateLabel: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginBottom: 4,
    fontWeight: '600',
  },
  dateInput: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 14,
    backgroundColor: '#fff',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    marginHorizontal: 12,
    marginVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  searchInput: {
    flex: 1,
    height: 40,
    marginLeft: 8,
    color: '#333',
    fontSize: 14,
  },
  refreshButton: {
    padding: 8,
    borderRadius: 8,
    backgroundColor: COLORS.surface,
    elevation: 2,
  },
  filterContainer: {
    flexDirection: 'row',
    paddingHorizontal: 12,
    paddingVertical: 8,
    justifyContent: 'space-between',
    gap: 8,
  },
  filterButton: {
    flex: 1,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    backgroundColor: '#f5f5f5',
    borderWidth: 1,
    borderColor: '#ddd',
  },
  filterButtonActive: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  filterText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#666',
    textAlign: 'center',
  },
  filterTextActive: {
    color: '#fff',
  },
  flatList: {
    flex: 1,
    paddingHorizontal: 12,
  },
  card: {
    backgroundColor: '#fff',
    marginVertical: 6,
    padding: 16,
    borderRadius: 12,
    elevation: 3,
    shadowColor: '#000',
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
    color: COLORS.primary,
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
  cardMetrics: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
  },
  metricItem: {
    alignItems: 'center',
    flex: 1,
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
    color: COLORS.primary,
    fontWeight: '600',
    marginRight: 4,
  },
  modalContainer: {
    flex: 1,
    backgroundColor: COLORS.background,
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
    color: COLORS.primary,
  },
  closeButton: {
    padding: 8,
  },
  modalScrollView: {
    flex: 1,
  },
  modalScrollContent: {
    paddingBottom: 24,
  },
  statsSection: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#2d3748',
    marginBottom: 12,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 16,
  },
  statItem: {
    backgroundColor: '#f8f9fa',
    padding: 12,
    borderRadius: 8,
    flex: 1,
    minWidth: '45%',
    alignItems: 'center',
  },
  statLabel: {
    fontSize: 12,
    color: '#718096',
    fontWeight: '600',
    marginBottom: 4,
  },
  statValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.primary,
  },
  advancedMetrics: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  metricCard: {
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 8,
    flex: 1,
    minWidth: '45%',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  metricCardTitle: {
    fontSize: 13,
    color: '#718096',
    fontWeight: '600',
    marginBottom: 4,
  },
  metricCardValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: COLORS.primary,
  },
  metricCardSubtitle: {
    fontSize: 11,
    color: '#a0aec0',
    marginTop: 2,
  },
  detailTable: {
    backgroundColor: '#fff',
    borderRadius: 8,
    elevation: 2,
  },
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: '#f8f9fa',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderTopLeftRadius: 8,
    borderTopRightRadius: 8,
  },
  tableHeaderText: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#4a5568',
    flex: 1,
    textAlign: 'center',
  },
  tableRow: {
    flexDirection: 'row',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  tableCell: {
    fontSize: 13,
    color: '#2d3748',
    flex: 1,
    textAlign: 'center',
  },
  conclusionsContainer: {
    backgroundColor: '#f8f9fa',
    padding: 16,
    borderRadius: 8,
  },
  conclusionText: {
    fontSize: 14,
    color: '#2d3748',
    marginBottom: 8,
    lineHeight: 20,
  },
});