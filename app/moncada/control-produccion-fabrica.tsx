// app/moncada/control-produccion-fabrica.tsx
/**
 * Componente de Producción Fábrica
 * Combina tiempo real de fichajes con análisis de producción y proyección de tiempos
 * 
 * Características:
 * - Vista de fichajes en tiempo real
 * - Análisis de producción con proyecciones
 * - Estructura jerárquica: Pedido > Módulo > Tarea > Operario
 * - Análisis de tiempos promedio por tarea
 * - Proyecciones de cumplimiento de fechas de compromiso
 * - Recomendaciones de personal adicional
 */

import Ionicons from '@expo/vector-icons/Ionicons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import DateTimePicker from '@react-native-community/datetimepicker';
import Constants from 'expo-constants';
import React, { useEffect, useMemo, useState } from 'react';
import {
    ActivityIndicator,
    FlatList,
    Platform,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import AppHeader from '../../components/AppHeader';
import ModalHeader from '../../components/ModalHeader';
import { useOfflineMode } from '../../hooks/useOfflineMode';

// Configuración de API
const API_URL = process.env.EXPO_PUBLIC_API_URL || 
               (Constants.expoConfig?.extra?.apiUrl as string) || 
               'http://85.59.105.234:3000';

// ===================== TIPOS =====================

interface TiempoRealRecord {
  Fecha: string;
  CodigoOperario: string;
  OperarioNombre?: string | null;
  FechaInicio?: string | null;
  HoraInicio?: string | null;
  FechaFin?: string | null;
  HoraFin?: string | null;
  CodigoTarea?: string | null;
  NumeroManual?: string | null;
  Modulo?: string | null;
  TiempoDedicado?: number | null;
  Abierta?: number | null;
  CodigoPuesto?: string | null;
  Serie1Desc?: string | null;
  ClienteNombre?: string | null;
  Fabricacion?: string | null;
  costeTotal?: number;
}

interface InfoModulo {
  Serie1Desc: string;
  CodigoSerie: string;
  CodigoNumero: number;
  Modulo: string;
  Linea: string;
  CosteTotal: string;
}

interface InfoParaTerminalesResponse {
  status: string;
  codigoPresupuesto: string;
  clienteNombre: string;
  modulos: InfoModulo[];
}

interface Pedido {
  NoPedido: string;
  Seccion: string;
  Cliente: string;
  Comercial: string;
  RefCliente: string;
  Compromiso: string;
  EstadoPedido?: string;
  Recibido?: number | null;
}

interface TareaStats {
  codigoTarea: string;
  totalFichajes: number;
  tiempoTotalSegundos: number;
  tiempoPromedioSegundos: number;
  operariosUnicos: Set<string>;
  modulosUnicos: Set<string>;
}

interface ModuloAnalysis {
  modulo: string;
  tareasRealizadas: Set<string>;
  tareasTotales: number;
  porcentajeCompletado: number;
  tiempoTotalSegundos: number;
  operarios: Set<string>;
  fichajesAbiertos: number;
  ultimaActividad?: string;
}

interface PedidoAnalysis {
  pedido: string;
  cliente: string;
  fechaCompromiso?: Date;
  modulos: Map<string, ModuloAnalysis>;
  totalModulos: number;
  modulosIniciados: number;
  modulosCompletados: number;
  tiempoTotalSegundos: number;
  porcentajeGeneral: number;
  fichajesAbiertos: number;
  operariosActivos: Set<string>;
  estadoMaterial?: string;
}

interface ProyeccionAnalysis {
  cumpliraCompromiso: boolean;
  diasRestantes: number;
  horasRestantesEstimadas: number;
  horasDisponibles: number;
  requierePersonalAdicional: boolean;
  personalSugerido?: number;
  tareasCriticas: string[];
  razon: string;
}

interface UserData {
  id: number;
  nombre?: string;
  rol?: string;
  name?: string;
  role?: string;
}

// ===================== UTILIDADES =====================

const formatDateLocal = (date: Date): string => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const formatDateForDisplay = (dateStr: string): string => {
  if (!dateStr) return 'Sin fecha';
  const fecha = new Date(dateStr);
  if (isNaN(fecha.getTime())) return 'Fecha inválida';
  const dia = String(fecha.getDate()).padStart(2, '0');
  const mes = String(fecha.getMonth() + 1).padStart(2, '0');
  const año = fecha.getFullYear();
  return `${dia}/${mes}/${año}`;
};

const formatDurationHM = (seconds?: number | null): string => {
  if (!seconds || seconds <= 0) return '0h 0m';
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  return `${h}h ${m}m`;
};

const normalizePedido = (val?: string | null): string => {
  return val?.trim() || 'SIN_PEDIDO';
};

const normalizeTarea = (val?: string | null): string => {
  return val?.trim() || 'SIN_TAREA';
};

const normalizeModulo = (val?: string | null): string => {
  return val?.trim() || 'SIN_MODULO';
};

// Calcular tiempo dedicado (sin fichajes abiertos)
const calculateAdjustedTime = (record: TiempoRealRecord): number => {
  if (record.Abierta === 1) return 0;
  if (record.TiempoDedicado && record.TiempoDedicado > 0) {
    return record.TiempoDedicado;
  }
  return 0;
};

// ===================== COMPONENTE PRINCIPAL =====================

export default function ControlProduccionFabricaScreen() {
  // Estados principales
  const [records, setRecords] = useState<TiempoRealRecord[]>([]);
  const [pedidosData, setPedidosData] = useState<Pedido[]>([]);
  const [loading, setLoading] = useState(true);
  const [mounted, setMounted] = useState(false);

  // Filtros y búsqueda
  const [fechaDesde, setFechaDesde] = useState<Date>(() => {
    const date = new Date();
    date.setMonth(date.getMonth() - 1);
    date.setHours(12, 0, 0, 0);
    return date;
  });
  const [fechaHasta, setFechaHasta] = useState<Date>(() => {
    const date = new Date();
    date.setHours(12, 0, 0, 0);
    return date;
  });
  const [searchQuery, setSearchQuery] = useState('');
  const [vistaActiva, setVistaActiva] = useState<'tiempo-real' | 'analisis'>('tiempo-real');

  // Date pickers
  const [showFromPicker, setShowFromPicker] = useState(false);
  const [showToPicker, setShowToPicker] = useState(false);

  // Modal y estados de expansión
  const [expandedPedidos, setExpandedPedidos] = useState<Set<string>>(new Set());
  const [expandedModulos, setExpandedModulos] = useState<Set<string>>(new Set());
  const [expandedTareas, setExpandedTareas] = useState<Set<string>>(new Set());
  const [modalVisible, setModalVisible] = useState(false);
  const [modalContent, setModalContent] = useState<any>(null);

  // Usuario
  const [userName, setUserName] = useState<string>('—');
  const [userRole, setUserRole] = useState<string>('—');
  const [userModalVisible, setUserModalVisible] = useState(false);
  const [modalUser, setModalUser] = useState({ userName: '', role: '' });

  const { serverReachable, tryAction } = useOfflineMode();

  // Estadísticas globales de tareas (para proyecciones)
  const [tareaStatsGlobal, setTareaStatsGlobal] = useState<Map<string, TareaStats>>(new Map());

  // ===================== EFECTOS =====================

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    const getUserData = async () => {
      try {
        const rawUser = await AsyncStorage.getItem('userData');
        if (rawUser) {
          const parsedUser = JSON.parse(rawUser);
          setUserName(parsedUser?.nombre || parsedUser?.name || '—');
          setUserRole(parsedUser?.rol || parsedUser?.role || '—');
        }
      } catch (error) {
        console.error('Error al obtener datos de usuario:', error);
      }
    };
    getUserData();
  }, []);

  useEffect(() => {
    if (mounted && fechaDesde && fechaHasta) {
      fetchData();
    }
  }, [mounted]);

  // Cargar datos inicialmente al montar
  useEffect(() => {
    if (mounted) {
      fetchData();
    }
  }, [mounted]);

  // ===================== FUNCIONES DE FETCH =====================

  const fetchData = async () => {
    setLoading(true);
    try {
      await Promise.all([
        fetchTiempoReal(),
        fetchPedidosData(),
      ]);
    } catch (error) {
      console.error('Error al cargar datos:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchTiempoReal = async () => {
    try {
      // Usar el endpoint correcto de production-analytics
      const from = formatDateLocal(fechaDesde);
      const to = formatDateLocal(fechaHasta);
      const url = `${API_URL}/control-terminales/production-analytics?start=${from}&end=${to}`;
      console.log(`📤 Solicitando datos de producción: ${url}`);
      
      const res = await fetch(url);
      if (res.ok) {
        const json = await res.json();
        
        // El backend devuelve { data: [...], pagination: {...} }
        let data = Array.isArray(json?.data) ? json.data : (Array.isArray(json) ? json : []);
        
        console.log(`📦 Datos de producción obtenidos: ${data.length} registros`);
        
        if (data.length === 0) {
          console.warn('⚠️ No se encontraron registros en el rango de fechas especificado');
          setRecords([]);
          return;
        }
        
        // Enriquecer registros con información de módulos y costes
        const enrichedData = await enrichRecordsWithModuleInfo(data);
        setRecords(enrichedData);
        
        // Calcular estadísticas globales
        calculateGlobalTaskStats(enrichedData);
      } else {
        console.error(`❌ Error en respuesta del servidor: ${res.status}`);
        setRecords([]);
      }
    } catch (error) {
      console.error('Error al obtener tiempo real:', error);
      setRecords([]);
    }
  };

  const fetchPedidosData = async () => {
    try {
      const res = await fetch(`${API_URL}/control-access/pedidosComerciales`);
      if (res.ok) {
        const data = await res.json();
        console.log(`📦 Pedidos comerciales obtenidos: ${data.length} pedidos`);
        setPedidosData(Array.isArray(data) ? data : []);
      }
    } catch (error) {
      console.error('Error al obtener pedidos:', error);
      setPedidosData([]);
    }
  };

  // ===================== CÁLCULO DE ESTADÍSTICAS GLOBALES =====================

  const calculateGlobalTaskStats = (allRecords: TiempoRealRecord[]) => {
    const statsMap = new Map<string, TareaStats>();

    allRecords.forEach(record => {
      const tarea = normalizeTarea(record.CodigoTarea);
      const tiempo = calculateAdjustedTime(record);

      if (!statsMap.has(tarea)) {
        statsMap.set(tarea, {
          codigoTarea: tarea,
          totalFichajes: 0,
          tiempoTotalSegundos: 0,
          tiempoPromedioSegundos: 0,
          operariosUnicos: new Set(),
          modulosUnicos: new Set(),
        });
      }

      const stats = statsMap.get(tarea)!;
      stats.totalFichajes++;
      stats.tiempoTotalSegundos += tiempo;
      if (record.OperarioNombre) {
        stats.operariosUnicos.add(record.OperarioNombre);
      }
      if (record.Modulo) {
        stats.modulosUnicos.add(record.Modulo);
      }
    });

    // Calcular promedios
    statsMap.forEach(stats => {
      if (stats.totalFichajes > 0) {
        stats.tiempoPromedioSegundos = stats.tiempoTotalSegundos / stats.totalFichajes;
      }
    });

    console.log(`📊 Estadísticas globales calculadas para ${statsMap.size} tareas`);
    setTareaStatsGlobal(statsMap);
  };

  // ===================== ENRIQUECIMIENTO DE DATOS =====================

  const enrichRecordsWithModuleInfo = async (records: TiempoRealRecord[]): Promise<TiempoRealRecord[]> => {
    try {
      // Agrupar registros por pedido (NumeroManual o Fabricacion)
      const pedidosMap = new Map<string, TiempoRealRecord[]>();
      
      records.forEach(r => {
        const pedido = normalizePedido(r.NumeroManual || r.Fabricacion);
        if (pedido === 'SIN_PEDIDO') return;
        
        if (!pedidosMap.has(pedido)) {
          pedidosMap.set(pedido, []);
        }
        pedidosMap.get(pedido)!.push(r);
      });

      console.log(`📋 Enriqueciendo ${pedidosMap.size} pedidos únicos...`);

      // Obtener información de cada pedido del backend
      const enrichPromises = Array.from(pedidosMap.entries()).map(async ([pedido, pedidoRecords]) => {
        try {
          const requestBody = { codigoPresupuesto: pedido };
          
          const response = await fetch(`${API_URL}/control-pedido/info-para-terminales-costes`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(requestBody)
          });

          if (!response.ok) {
            console.warn(`⚠️ No se pudo obtener info para pedido ${pedido}`);
            return;
          }

          const data: InfoParaTerminalesResponse = await response.json();

          if (data.status !== 'ok' || !data.modulos || data.modulos.length === 0) {
            return;
          }

          console.log(`📦 [Pedido ${pedido}] ${data.modulos.length} módulos, Cliente: ${data.clienteNombre}`);

          // Crear mapa de módulos
          const moduloInfoMap = new Map<string, InfoModulo>();
          data.modulos.forEach(mod => {
            moduloInfoMap.set(mod.Modulo, mod);
          });

          // Enriquecer registros
          let enriquecidos = 0;
          pedidoRecords.forEach(record => {
            const modInfo = moduloInfoMap.get(record.Modulo || '');
            if (modInfo) {
              record.ClienteNombre = data.clienteNombre;
              record.Serie1Desc = modInfo.Serie1Desc;
              record.Fabricacion = `${modInfo.CodigoSerie}-${modInfo.CodigoNumero}`;
              enriquecidos++;
            }
          });

          // Identificar módulos sin fichajes
          const modulosEnRegistros = new Set(pedidoRecords.map(r => r.Modulo).filter(Boolean));
          const modulosSinFichajes = data.modulos
            .filter(m => !modulosEnRegistros.has(m.Modulo))
            .map(m => m.Modulo);

          if (modulosSinFichajes.length > 0) {
            console.log(`⚠️ [Pedido ${pedido}] ${modulosSinFichajes.length} módulos sin fichajes:`, modulosSinFichajes);
          }

          console.log(`✅ [Pedido ${pedido}] ${enriquecidos}/${pedidoRecords.length} registros enriquecidos`);

        } catch (error) {
          console.error(`❌ Error enriqueciendo pedido ${pedido}:`, error);
        }
      });

      await Promise.all(enrichPromises);

      console.log(`✅ Enriquecimiento completado para ${records.length} registros`);
      return records;

    } catch (error) {
      console.error('❌ Error en enrichRecords:', error);
      return records;
    }
  };

  // ===================== ANÁLISIS DE PEDIDOS =====================

  const analyzePedidos = useMemo(() => {
    const pedidosMap = new Map<string, PedidoAnalysis>();

    records.forEach(record => {
      // Usar NumeroManual como clave principal del pedido
      const pedido = normalizePedido(record.NumeroManual || record.Fabricacion);
      if (pedido === 'SIN_PEDIDO') return;

      if (!pedidosMap.has(pedido)) {
        // Buscar info de pedido en pedidosData
        const pedidoInfo = pedidosData.find(p => p.NoPedido === pedido);
        
        pedidosMap.set(pedido, {
          pedido,
          cliente: record.ClienteNombre || pedidoInfo?.Cliente || 'Cliente desconocido',
          fechaCompromiso: pedidoInfo?.Compromiso ? new Date(pedidoInfo.Compromiso) : undefined,
          modulos: new Map(),
          totalModulos: 0,
          modulosIniciados: 0,
          modulosCompletados: 0,
          tiempoTotalSegundos: 0,
          porcentajeGeneral: 0,
          fichajesAbiertos: 0,
          operariosActivos: new Set(),
          estadoMaterial: pedidoInfo?.Recibido === -1 ? 'Completo' : 
                         pedidoInfo?.Recibido === 0 ? 'Pendiente' : 'Parcial',
        });
      }

      const analisis = pedidosMap.get(pedido)!;
      const modulo = normalizeModulo(record.Modulo);

      if (!analisis.modulos.has(modulo)) {
        analisis.modulos.set(modulo, {
          modulo,
          tareasRealizadas: new Set(),
          tareasTotales: 0,
          porcentajeCompletado: 0,
          tiempoTotalSegundos: 0,
          operarios: new Set(),
          fichajesAbiertos: 0,
        });
        analisis.totalModulos++;
      }

      const moduloAnalisis = analisis.modulos.get(modulo)!;
      const tarea = normalizeTarea(record.CodigoTarea);
      moduloAnalisis.tareasRealizadas.add(tarea);

      const tiempo = calculateAdjustedTime(record);
      moduloAnalisis.tiempoTotalSegundos += tiempo;
      analisis.tiempoTotalSegundos += tiempo;

      if (record.OperarioNombre) {
        moduloAnalisis.operarios.add(record.OperarioNombre);
        analisis.operariosActivos.add(record.OperarioNombre);
      }

      if (record.Abierta === 1) {
        moduloAnalisis.fichajesAbiertos++;
        analisis.fichajesAbiertos++;
      }

      if (record.FechaInicio && record.HoraInicio) {
        const fechaInicio = `${record.FechaInicio} ${record.HoraInicio}`;
        if (!moduloAnalisis.ultimaActividad || fechaInicio > moduloAnalisis.ultimaActividad) {
          moduloAnalisis.ultimaActividad = fechaInicio;
        }
      }
    });

    // Obtener tareas totales por módulo desde backend y calcular porcentajes
    // Nota: Esta operación es asíncrona pero no bloquea el renderizado inicial
    pedidosMap.forEach(async (analisis, pedido) => {
      try {
        const requestBody = { codigoPresupuesto: pedido };
        
        const res = await fetch(`${API_URL}/control-pedido/info-para-terminales-costes`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(requestBody)
        });
        
        if (res.ok) {
          const info: InfoParaTerminalesResponse = await res.json();
          
          if (info.status === 'ok' && info.modulos) {
            // Actualizar total de módulos reales desde backend
            analisis.totalModulos = info.modulos.length;
            
            analisis.modulos.forEach((moduloAnalisis, modulo) => {
              // Cada módulo tiene una cantidad estimada de tareas
              // Basado en análisis de logs: promedio de 8 tareas por módulo
              const tareasEstimadas = 8;
              moduloAnalisis.tareasTotales = tareasEstimadas;
              moduloAnalisis.porcentajeCompletado = 
                (moduloAnalisis.tareasRealizadas.size / tareasEstimadas) * 100;
              
              if (moduloAnalisis.tareasRealizadas.size > 0) {
                analisis.modulosIniciados++;
              }
              if (moduloAnalisis.porcentajeCompletado >= 100) {
                analisis.modulosCompletados++;
              }
            });

            // Calcular porcentaje general
            if (analisis.totalModulos > 0) {
              analisis.porcentajeGeneral = 
                (analisis.modulosCompletados / analisis.totalModulos) * 100;
            }
          }
        }
      } catch (error) {
        console.error(`❌ Error al obtener info de tareas para ${pedido}:`, error);
      }
    });

    return pedidosMap;
  }, [records, pedidosData]);

  // ===================== PROYECCIÓN Y ANÁLISIS =====================

  const calculateProyeccion = (analisis: PedidoAnalysis): ProyeccionAnalysis => {
    const ahora = new Date();
    const diasRestantes = analisis.fechaCompromiso 
      ? Math.ceil((analisis.fechaCompromiso.getTime() - ahora.getTime()) / (1000 * 60 * 60 * 24))
      : Infinity;

    // Horas disponibles (6.5 horas por día laboral)
    const horasPorDia = 6.5;
    const horasDisponibles = diasRestantes * horasPorDia * analisis.operariosActivos.size;

    // Calcular trabajo restante basado en promedios
    let horasRestantesEstimadas = 0;
    const tareasCriticas: string[] = [];

    analisis.modulos.forEach(moduloAnalisis => {
      const tareasRestantes = moduloAnalisis.tareasTotales - moduloAnalisis.tareasRealizadas.size;
      
      // Por cada tarea restante, usar el tiempo promedio
      moduloAnalisis.tareasRealizadas.forEach(tarea => {
        const stats = tareaStatsGlobal.get(tarea);
        if (stats && tareasRestantes > 0) {
          const tiempoPromedioHoras = stats.tiempoPromedioSegundos / 3600;
          horasRestantesEstimadas += tiempoPromedioHoras * tareasRestantes;
          
          // Identificar tareas críticas (tardan mucho)
          if (tiempoPromedioHoras > 2) {
            tareasCriticas.push(tarea);
          }
        }
      });
    });

    const cumpliraCompromiso = horasRestantesEstimadas <= horasDisponibles;
    const requierePersonalAdicional = !cumpliraCompromiso && diasRestantes > 0;

    let personalSugerido = 0;
    if (requierePersonalAdicional) {
      const horasDeficit = horasRestantesEstimadas - horasDisponibles;
      personalSugerido = Math.ceil(horasDeficit / (diasRestantes * horasPorDia));
    }

    let razon = '';
    if (diasRestantes < 0) {
      razon = 'Fecha de compromiso vencida';
    } else if (cumpliraCompromiso) {
      razon = 'Se estima cumplimiento en tiempo';
    } else {
      razon = `Se requiere ${personalSugerido} operario(s) adicional(es) para cumplir`;
    }

    return {
      cumpliraCompromiso,
      diasRestantes,
      horasRestantesEstimadas,
      horasDisponibles,
      requierePersonalAdicional,
      personalSugerido,
      tareasCriticas: Array.from(new Set(tareasCriticas)),
      razon,
    };
  };

  // ===================== FILTRADO =====================

  const pedidosFiltrados = useMemo(() => {
    let pedidos = Array.from(analyzePedidos.values());

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      pedidos = pedidos.filter(p => 
        p.pedido.toLowerCase().includes(q) ||
        p.cliente.toLowerCase().includes(q)
      );
    }

    return pedidos.sort((a, b) => {
      if (!a.fechaCompromiso) return 1;
      if (!b.fechaCompromiso) return -1;
      return a.fechaCompromiso.getTime() - b.fechaCompromiso.getTime();
    });
  }, [analyzePedidos, searchQuery]);

  // ===================== FUNCIONES DE TOGGLE =====================

  const togglePedido = (pedido: string) => {
    setExpandedPedidos(prev => {
      const newSet = new Set(prev);
      if (newSet.has(pedido)) {
        newSet.delete(pedido);
      } else {
        newSet.add(pedido);
      }
      return newSet;
    });
  };

  const toggleModulo = (key: string) => {
    setExpandedModulos(prev => {
      const newSet = new Set(prev);
      if (newSet.has(key)) {
        newSet.delete(key);
      } else {
        newSet.add(key);
      }
      return newSet;
    });
  };

  const toggleTarea = (key: string) => {
    setExpandedTareas(prev => {
      const newSet = new Set(prev);
      if (newSet.has(key)) {
        newSet.delete(key);
      } else {
        newSet.add(key);
      }
      return newSet;
    });
  };

  // ===================== RENDERIZADO =====================

  const renderPedidoItem = ({ item: analisis }: { item: PedidoAnalysis }) => {
    const expanded = expandedPedidos.has(analisis.pedido);
    const proyeccion = vistaActiva === 'analisis' ? calculateProyeccion(analisis) : null;

    return (
      <View style={styles.pedidoCard}>
        {/* Cabecera del pedido */}
        <TouchableOpacity 
          style={styles.pedidoHeader}
          onPress={() => togglePedido(analisis.pedido)}
        >
          <View style={styles.pedidoHeaderLeft}>
            <Ionicons 
              name={expanded ? 'chevron-down' : 'chevron-forward'} 
              size={24} 
              color="#2e78b7" 
            />
            <View style={styles.pedidoHeaderText}>
              <Text style={styles.pedidoNumero}>{analisis.pedido}</Text>
              <Text style={styles.pedidoCliente}>{analisis.cliente}</Text>
            </View>
          </View>
          <View style={styles.pedidoHeaderRight}>
            {analisis.fichajesAbiertos > 0 && (
              <View style={styles.badgeActive}>
                <Text style={styles.badgeText}>
                  {analisis.fichajesAbiertos} activo(s)
                </Text>
              </View>
            )}
            <Text style={styles.pedidoPorcentaje}>
              {Math.round(analisis.porcentajeGeneral)}%
            </Text>
          </View>
        </TouchableOpacity>

        {/* Información adicional del pedido */}
        {expanded && (
          <View style={styles.pedidoContent}>
            {/* Información básica */}
            <View style={styles.infoRow}>
              <Ionicons name="calendar-outline" size={16} color="#6b7280" />
              <Text style={styles.infoText}>
                Compromiso: {analisis.fechaCompromiso 
                  ? formatDateForDisplay(analisis.fechaCompromiso.toISOString())
                  : 'Sin fecha'}
              </Text>
            </View>

            <View style={styles.infoRow}>
              <Ionicons name="cube-outline" size={16} color="#6b7280" />
              <Text style={styles.infoText}>
                Módulos: {analisis.modulosIniciados}/{analisis.totalModulos} iniciados, {' '}
                {analisis.modulosCompletados} completados
              </Text>
            </View>

            <View style={styles.infoRow}>
              <Ionicons name="people-outline" size={16} color="#6b7280" />
              <Text style={styles.infoText}>
                Operarios activos: {analisis.operariosActivos.size}
              </Text>
            </View>

            <View style={styles.infoRow}>
              <Ionicons name="time-outline" size={16} color="#6b7280" />
              <Text style={styles.infoText}>
                Tiempo total: {formatDurationHM(analisis.tiempoTotalSegundos)}
              </Text>
            </View>

            {analisis.estadoMaterial && (
              <View style={styles.infoRow}>
                <Ionicons name="list-outline" size={16} color="#6b7280" />
                <Text style={styles.infoText}>
                  Material: {analisis.estadoMaterial}
                </Text>
              </View>
            )}

            {/* Proyección (solo en vista análisis) */}
            {vistaActiva === 'analisis' && proyeccion && (
              <View style={[
                styles.proyeccionCard,
                proyeccion.cumpliraCompromiso ? styles.proyeccionOk : styles.proyeccionWarning
              ]}>
                <View style={styles.proyeccionHeader}>
                  <Ionicons 
                    name={proyeccion.cumpliraCompromiso ? 'checkmark-circle' : 'alert-circle'} 
                    size={20} 
                    color={proyeccion.cumpliraCompromiso ? '#059669' : '#dc2626'} 
                  />
                  <Text style={styles.proyeccionTitle}>Proyección</Text>
                </View>
                
                <Text style={styles.proyeccionRazon}>{proyeccion.razon}</Text>
                
                <View style={styles.proyeccionStats}>
                  <Text style={styles.proyeccionStat}>
                    📅 {proyeccion.diasRestantes} días restantes
                  </Text>
                  <Text style={styles.proyeccionStat}>
                    ⏱️ {Math.round(proyeccion.horasRestantesEstimadas)}h estimadas / {' '}
                    {Math.round(proyeccion.horasDisponibles)}h disponibles
                  </Text>
                  
                  {proyeccion.requierePersonalAdicional && (
                    <Text style={styles.proyeccionAlertText}>
                      ⚠️ Se sugiere {proyeccion.personalSugerido} operario(s) adicional(es)
                    </Text>
                  )}
                  
                  {proyeccion.tareasCriticas.length > 0 && (
                    <Text style={styles.proyeccionCriticas}>
                      🔴 Tareas críticas: {proyeccion.tareasCriticas.join(', ')}
                    </Text>
                  )}
                </View>
              </View>
            )}

            {/* Barra de progreso */}
            <View style={styles.progressBarContainer}>
              <View 
                style={[
                  styles.progressBar, 
                  { width: `${analisis.porcentajeGeneral}%` }
                ]} 
              />
            </View>

            {/* Módulos */}
            {renderModulos(analisis)}
          </View>
        )}
      </View>
    );
  };

  const renderModulos = (analisis: PedidoAnalysis) => {
    return Array.from(analisis.modulos.entries()).map(([modulo, moduloAnalisis]) => {
      const moduloKey = `${analisis.pedido}_${modulo}`;
      const expandedModulo = expandedModulos.has(moduloKey);

      return (
        <View key={moduloKey} style={styles.moduloCard}>
          <TouchableOpacity 
            style={styles.moduloHeader}
            onPress={() => toggleModulo(moduloKey)}
          >
            <View style={styles.moduloHeaderLeft}>
              <View style={styles.branchLine} />
              <Ionicons 
                name={expandedModulo ? 'chevron-down' : 'chevron-forward'} 
                size={20} 
                color="#059669" 
              />
              <Text style={styles.moduloNombre}>{modulo}</Text>
            </View>
            <View style={styles.moduloHeaderRight}>
              {moduloAnalisis.fichajesAbiertos > 0 && (
                <View style={styles.badgeActiveSmall}>
                  <Text style={styles.badgeTextSmall}>
                    {moduloAnalisis.fichajesAbiertos} activo
                  </Text>
                </View>
              )}
              <Text style={styles.moduloPorcentaje}>
                {Math.round(moduloAnalisis.porcentajeCompletado)}%
              </Text>
            </View>
          </TouchableOpacity>

          {expandedModulo && (
            <View style={styles.moduloContent}>
              <View style={styles.moduloStats}>
                <Text style={styles.moduloStat}>
                  ✓ Tareas: {moduloAnalisis.tareasRealizadas.size}/{moduloAnalisis.tareasTotales}
                </Text>
                <Text style={styles.moduloStat}>
                  👷 Operarios: {moduloAnalisis.operarios.size}
                </Text>
                <Text style={styles.moduloStat}>
                  ⏱️ Tiempo: {formatDurationHM(moduloAnalisis.tiempoTotalSegundos)}
                </Text>
                {moduloAnalisis.ultimaActividad && (
                  <Text style={styles.moduloStat}>
                    🕐 Última: {moduloAnalisis.ultimaActividad}
                  </Text>
                )}
              </View>

              {/* Tareas */}
              {renderTareas(analisis.pedido, modulo, moduloAnalisis)}
            </View>
          )}
        </View>
      );
    });
  };

  const renderTareas = (pedido: string, modulo: string, moduloAnalisis: ModuloAnalysis) => {
    const tareasArray = Array.from(moduloAnalisis.tareasRealizadas);

    return tareasArray.map(tarea => {
      const tareaKey = `${pedido}_${modulo}_${tarea}`;
      const expandedTarea = expandedTareas.has(tareaKey);
      
      // Obtener stats de la tarea
      const stats = tareaStatsGlobal.get(tarea);
      
      // Obtener registros de esta tarea en este módulo
      const tareaRecords = records.filter(r => 
        normalizePedido(r.NumeroManual || r.Fabricacion) === pedido &&
        normalizeModulo(r.Modulo) === modulo &&
        normalizeTarea(r.CodigoTarea) === tarea
      );

      return (
        <View key={tareaKey} style={styles.tareaCard}>
          <TouchableOpacity 
            style={styles.tareaHeader}
            onPress={() => toggleTarea(tareaKey)}
          >
            <View style={styles.tareaHeaderLeft}>
              <View style={styles.branchLine2} />
              <Ionicons 
                name={expandedTarea ? 'chevron-down' : 'chevron-forward'} 
                size={18} 
                color="#ea580c" 
              />
              <Text style={styles.tareaNombre}>{tarea}</Text>
            </View>
            <View style={styles.tareaHeaderRight}>
              <Text style={styles.tareaFichajes}>
                {tareaRecords.length} fichaje(s)
              </Text>
            </View>
          </TouchableOpacity>

          {expandedTarea && (
            <View style={styles.tareaContent}>
              {stats && (
                <View style={styles.tareaStats}>
                  <Text style={styles.tareaStat}>
                    ⏱️ Promedio global: {formatDurationHM(stats.tiempoPromedioSegundos)}
                  </Text>
                  <Text style={styles.tareaStat}>
                    📊 Total fichajes: {stats.totalFichajes}
                  </Text>
                </View>
              )}

              {/* Operarios */}
              {renderOperarios(tareaRecords)}
            </View>
          )}
        </View>
      );
    });
  };

  const renderOperarios = (tareaRecords: TiempoRealRecord[]) => {
    // Agrupar por operario
    const operariosMap = new Map<string, TiempoRealRecord[]>();
    
    tareaRecords.forEach(record => {
      const operario = record.OperarioNombre || 'Sin nombre';
      if (!operariosMap.has(operario)) {
        operariosMap.set(operario, []);
      }
      operariosMap.get(operario)!.push(record);
    });

    return Array.from(operariosMap.entries()).map(([operario, registros]) => {
      const tiempoTotal = registros.reduce((sum, r) => sum + calculateAdjustedTime(r), 0);
      const abiertos = registros.filter(r => r.Abierta === 1).length;

      return (
        <View key={operario} style={styles.operarioCard}>
          <View style={styles.operarioHeader}>
            <View style={styles.branchLine3} />
            <Ionicons name="person" size={16} color="#6366f1" />
            <Text style={styles.operarioNombre}>{operario}</Text>
          </View>
          <View style={styles.operarioStats}>
            <Text style={styles.operarioStat}>
              ⏱️ {formatDurationHM(tiempoTotal)}
            </Text>
            <Text style={styles.operarioStat}>
              📝 {registros.length} fichaje(s)
            </Text>
            {abiertos > 0 && (
              <Text style={styles.operarioStatActive}>
                🔴 {abiertos} activo(s)
              </Text>
            )}
          </View>
        </View>
      );
    });
  };

  // ===================== RENDER PRINCIPAL =====================

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#2e78b7" />
        <Text style={styles.loadingText}>Cargando datos de producción...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        {/* Header */}
        <AppHeader
          titleOverride="Producción Fábrica"
          count={pedidosFiltrados.length}
          userNameProp={userName}
          roleProp={userRole}
          serverReachableOverride={!!serverReachable}
          onRefresh={fetchData}
          onUserPress={({ userName, role }) => {
            setModalUser({ userName, role });
            setUserModalVisible(true);
          }}
        />

        <ModalHeader
          visible={userModalVisible}
          onClose={() => setUserModalVisible(false)}
          userName={modalUser.userName || userName}
          role={modalUser.role || userRole}
        />

        {/* Filtros de fecha */}
        <View style={styles.filtersContainer}>
          {/* Date Pickers */}
          <View style={styles.dateFilters}>
            <TouchableOpacity 
              style={styles.dateInputContainer} 
              onPress={() => setShowFromPicker(true)}
            >
              <Text style={styles.dateLabel}>Desde:</Text>
              <View style={styles.dateDisplayBox}>
                <Text style={styles.dateDisplayText}>
                  {formatDateForDisplay(fechaDesde.toISOString())}
                </Text>
              </View>
            </TouchableOpacity>
            
            {showFromPicker && (
              <DateTimePicker
                value={fechaDesde}
                mode="date"
                display={Platform.OS === 'ios' ? 'spinner' : 'calendar'}
                onChange={(event, selectedDate) => {
                  setShowFromPicker(false);
                  if (selectedDate) {
                    const year = selectedDate.getFullYear();
                    const month = selectedDate.getMonth();
                    const day = selectedDate.getDate();
                    const normalized = new Date(year, month, day, 12, 0, 0, 0);
                    setFechaDesde(normalized);
                  }
                }}
              />
            )}

            <TouchableOpacity 
              style={styles.dateInputContainer} 
              onPress={() => setShowToPicker(true)}
            >
              <Text style={styles.dateLabel}>Hasta:</Text>
              <View style={styles.dateDisplayBox}>
                <Text style={styles.dateDisplayText}>
                  {formatDateForDisplay(fechaHasta.toISOString())}
                </Text>
              </View>
            </TouchableOpacity>
            
            {showToPicker && (
              <DateTimePicker
                value={fechaHasta}
                mode="date"
                display={Platform.OS === 'ios' ? 'spinner' : 'calendar'}
                onChange={(event, selectedDate) => {
                  setShowToPicker(false);
                  if (selectedDate) {
                    const year = selectedDate.getFullYear();
                    const month = selectedDate.getMonth();
                    const day = selectedDate.getDate();
                    const normalized = new Date(year, month, day, 12, 0, 0, 0);
                    setFechaHasta(normalized);
                  }
                }}
              />
            )}

            {/* Botón de buscar/recargar */}
            <TouchableOpacity
              style={styles.searchButton}
              onPress={fetchData}
            >
              <Ionicons name="search" size={20} color="#fff" />
              <Text style={styles.searchButtonText}>Buscar</Text>
            </TouchableOpacity>
          </View>

          {/* Buscador */}
          <View style={styles.searchContainer}>
            <Ionicons name="search" size={20} color="#6b7280" />
            <TextInput
              style={styles.searchInput}
              placeholder="Buscar pedido o cliente..."
              value={searchQuery}
              onChangeText={setSearchQuery}
            />
          </View>

          {/* Botones de agrupación */}
          <View style={styles.groupButtons}>
            <TouchableOpacity
              style={[
                styles.groupButton,
                vistaActiva === 'tiempo-real' && styles.groupButtonActive
              ]}
              onPress={() => setVistaActiva('tiempo-real')}
            >
              <Ionicons 
                name="time-outline" 
                size={20} 
                color={vistaActiva === 'tiempo-real' ? '#fff' : '#2e78b7'} 
              />
              <Text style={[
                styles.groupButtonText,
                vistaActiva === 'tiempo-real' && styles.groupButtonTextActive
              ]}>
                Tiempo Real
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.groupButton,
                vistaActiva === 'analisis' && styles.groupButtonActive
              ]}
              onPress={() => setVistaActiva('analisis')}
            >
              <Ionicons 
                name="analytics-outline" 
                size={20} 
                color={vistaActiva === 'analisis' ? '#fff' : '#2e78b7'} 
              />
              <Text style={[
                styles.groupButtonText,
                vistaActiva === 'analisis' && styles.groupButtonTextActive
              ]}>
                Análisis
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Lista de pedidos */}
        <FlatList
          data={pedidosFiltrados}
          renderItem={renderPedidoItem}
          keyExtractor={item => item.pedido}
          contentContainerStyle={styles.listContent}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Ionicons name="folder-open-outline" size={64} color="#9ca3af" />
              <Text style={styles.emptyText}>
                No se encontraron pedidos con los filtros aplicados
              </Text>
            </View>
          }
        />
      </SafeAreaView>
    </View>
  );
}

// ===================== ESTILOS =====================

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f3f4f6',
  },
  safeArea: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f3f4f6',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#6b7280',
  },
  filtersContainer: {
    backgroundColor: '#fff',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  dateFilters: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 12,
  },
  dateInputContainer: {
    flex: 1,
  },
  dateLabel: {
    fontSize: 12,
    color: '#6b7280',
    marginBottom: 4,
    fontWeight: '600',
  },
  dateInput: {
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 8,
    padding: 10,
    fontSize: 14,
    color: '#111827',
  },
  dateDisplayBox: {
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 8,
    padding: 10,
    backgroundColor: '#f9fafb',
  },
  dateDisplayText: {
    fontSize: 14,
    color: '#111827',
  },
  searchButton: {
    backgroundColor: '#2e78b7',
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  searchButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f9fafb',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 12,
  },
  searchInput: {
    flex: 1,
    marginLeft: 8,
    fontSize: 14,
    color: '#111827',
  },
  groupButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  groupButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: '#2e78b7',
    backgroundColor: '#fff',
  },
  groupButtonActive: {
    backgroundColor: '#2e78b7',
  },
  groupButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#2e78b7',
  },
  groupButtonTextActive: {
    color: '#fff',
  },
  listContent: {
    padding: 16,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 48,
  },
  emptyText: {
    marginTop: 16,
    fontSize: 16,
    color: '#6b7280',
    textAlign: 'center',
  },

  // Estilos de Pedido
  pedidoCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    marginBottom: 16,
    overflow: 'hidden',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  pedidoHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    backgroundColor: '#eff6ff',
    borderLeftWidth: 4,
    borderLeftColor: '#2e78b7',
  },
  pedidoHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  pedidoHeaderText: {
    marginLeft: 8,
    flex: 1,
  },
  pedidoNumero: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1e40af',
  },
  pedidoCliente: {
    fontSize: 13,
    color: '#6b7280',
    marginTop: 2,
  },
  pedidoHeaderRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  pedidoPorcentaje: {
    fontSize: 18,
    fontWeight: '700',
    color: '#059669',
  },
  badgeActive: {
    backgroundColor: '#fef3c7',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#d97706',
  },
  pedidoContent: {
    padding: 16,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  infoText: {
    fontSize: 13,
    color: '#374151',
  },
  proyeccionCard: {
    marginTop: 12,
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
  },
  proyeccionOk: {
    backgroundColor: '#f0fdf4',
    borderColor: '#86efac',
  },
  proyeccionWarning: {
    backgroundColor: '#fef2f2',
    borderColor: '#fca5a5',
  },
  proyeccionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  proyeccionTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#111827',
  },
  proyeccionRazon: {
    fontSize: 13,
    color: '#374151',
    marginBottom: 8,
    fontWeight: '600',
  },
  proyeccionStats: {
    gap: 4,
  },
  proyeccionStat: {
    fontSize: 12,
    color: '#6b7280',
  },
  proyeccionAlertText: {
    fontSize: 12,
    color: '#dc2626',
    fontWeight: '600',
  },
  proyeccionCriticas: {
    fontSize: 12,
    color: '#ea580c',
    fontWeight: '600',
  },
  progressBarContainer: {
    height: 8,
    backgroundColor: '#e5e7eb',
    borderRadius: 4,
    marginTop: 12,
    overflow: 'hidden',
  },
  progressBar: {
    height: '100%',
    backgroundColor: '#059669',
  },

  // Estilos de Módulo
  moduloCard: {
    marginTop: 12,
    marginLeft: 16,
    backgroundColor: '#f9fafb',
    borderRadius: 8,
    overflow: 'hidden',
  },
  moduloHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 12,
    backgroundColor: '#f0fdf4',
  },
  moduloHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  branchLine: {
    width: 2,
    height: '100%',
    backgroundColor: '#d1d5db',
    marginRight: 8,
  },
  moduloNombre: {
    fontSize: 14,
    fontWeight: '600',
    color: '#059669',
    marginLeft: 8,
  },
  moduloHeaderRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  badgeActiveSmall: {
    backgroundColor: '#fef3c7',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
  },
  badgeTextSmall: {
    fontSize: 10,
    fontWeight: '600',
    color: '#d97706',
  },
  moduloPorcentaje: {
    fontSize: 14,
    fontWeight: '700',
    color: '#059669',
  },
  moduloContent: {
    padding: 12,
  },
  moduloStats: {
    gap: 6,
    marginBottom: 8,
  },
  moduloStat: {
    fontSize: 12,
    color: '#6b7280',
  },

  // Estilos de Tarea
  tareaCard: {
    marginTop: 8,
    marginLeft: 16,
    backgroundColor: '#fff',
    borderRadius: 6,
    overflow: 'hidden',
  },
  tareaHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 10,
    backgroundColor: '#fff7ed',
  },
  tareaHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  branchLine2: {
    width: 2,
    height: '100%',
    backgroundColor: '#d1d5db',
    marginRight: 6,
  },
  tareaNombre: {
    fontSize: 13,
    fontWeight: '600',
    color: '#ea580c',
    marginLeft: 6,
  },
  tareaHeaderRight: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  tareaFichajes: {
    fontSize: 12,
    color: '#6b7280',
  },
  tareaContent: {
    padding: 10,
  },
  tareaStats: {
    gap: 4,
    marginBottom: 8,
  },
  tareaStat: {
    fontSize: 11,
    color: '#6b7280',
  },

  // Estilos de Operario
  operarioCard: {
    marginTop: 6,
    marginLeft: 16,
    backgroundColor: '#f9fafb',
    borderRadius: 6,
    padding: 10,
  },
  operarioHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  branchLine3: {
    width: 2,
    height: '100%',
    backgroundColor: '#d1d5db',
    marginRight: 6,
  },
  operarioNombre: {
    fontSize: 12,
    fontWeight: '600',
    color: '#6366f1',
    marginLeft: 6,
  },
  operarioStats: {
    flexDirection: 'row',
    gap: 12,
    flexWrap: 'wrap',
  },
  operarioStat: {
    fontSize: 11,
    color: '#6b7280',
  },
  operarioStatActive: {
    fontSize: 11,
    color: '#dc2626',
    fontWeight: '600',
  },
});
