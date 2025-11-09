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
  tareasRequeridas: Set<string>; // Tareas requeridas desde el backend
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

// Nueva interfaz para tareas del backend
interface TareaBackend {
  CodigoSerie: string;
  CodigoNumero: number;
  Linea: number;
  Descripcion: string;
}

// ===================== CONSTANTES =====================

// Mapeo de tareas del backend a tareas estándar
const TASK_MAPPING: Record<string, string> = {
  'HERRAJE': 'HERRAJE',
  'HER_HDER': 'HERRAJE',
  'HER_HIZQ': 'HERRAJE',
  'HOJA_ACT': 'HERRAJE',
  'HOJA_ACT_HERRAJE': 'HERRAJE',
  'MATRIMONIO': 'MATRIMONIO',
  'MONOBLOK': 'COMPACTO',
  'MONOBLOCK': 'COMPACTO',
  'JAMBA': 'COMPACTO',
  'VIDRIOS': 'ACRISTALADO',
  'ACRISTALAMIENTO': 'ACRISTALADO',
  'MARCOS': 'ARMADO',
};

// Tareas indispensables que deben verificarse
const TAREAS_INDISPENSABLES = new Set([
  'HERRAJE',
  'MATRIMONIO',
  'COMPACTO',
  'ACRISTALADO',
  'ARMADO',
]);

// ===================== UTILIDADES =====================

/**
 * Mapea el nombre de una tarea del backend a la tarea estándar
 * Retorna null si la tarea no necesita verificación
 */
const mapearTareaBackend = (descripcionTarea: string): string | null => {
  const descripcionUpper = descripcionTarea.toUpperCase().trim();
  
  // Si existe un mapeo directo, usarlo
  if (TASK_MAPPING[descripcionUpper]) {
    return TASK_MAPPING[descripcionUpper];
  }
  
  // Si la descripción no está en el mapeo, no es una tarea indispensable
  return null;
};

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
      console.log(`\n� ============ FETCH TIEMPO REAL ============`);
      console.log(`📤 URL: ${url}`);
      console.log(`📅 Rango: ${from} → ${to}`);
      
      const res = await fetch(url);
      console.log(`📡 Status: ${res.status} ${res.statusText}`);
      
      if (res.ok) {
        const json = await res.json();
        
        console.log(`📦 Tipo de respuesta:`, typeof json);
        console.log(`📦 Es array json:`, Array.isArray(json));
        console.log(`📦 Tiene json.data:`, !!json?.data);
        console.log(`📦 Es array json.data:`, Array.isArray(json?.data));
        
        // El backend devuelve { data: [...], pagination: {...} }
        let data = Array.isArray(json?.data) ? json.data : (Array.isArray(json) ? json : []);
        
        console.log(`✅ Registros totales: ${data.length}`);
        
        if (data.length > 0) {
          console.log(`📋 Primer registro (muestra):`, JSON.stringify(data[0], null, 2));
          console.log(`📋 Últimos registro (muestra):`, JSON.stringify(data[data.length - 1], null, 2));
        }
        
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
      console.error('❌ Error al obtener tiempo real:', error);
      setRecords([]);
    }
  };

  const fetchPedidosData = async () => {
    try {
      console.log(`\n🔵 ============ FETCH PEDIDOS COMERCIALES ============`);
      console.log(`📤 URL: ${API_URL}/control-access/pedidosComerciales`);
      
      const res = await fetch(`${API_URL}/control-access/pedidosComerciales`);
      console.log(`📡 Status: ${res.status} ${res.statusText}`);
      
      if (res.ok) {
        const data = await res.json();
        
        console.log(`📦 Tipo de respuesta:`, typeof data);
        console.log(`📦 Es array:`, Array.isArray(data));
        console.log(`✅ Total pedidos: ${Array.isArray(data) ? data.length : 0}`);
        
        if (Array.isArray(data) && data.length > 0) {
          console.log(`📋 Primer pedido (muestra):`, JSON.stringify(data[0], null, 2));
          
          // Analizar cuántos tienen fecha de compromiso
          const conCompromiso = data.filter((p: Pedido) => p.Compromiso).length;
          console.log(`📅 Pedidos con fecha compromiso: ${conCompromiso}/${data.length}`);
          
          if (conCompromiso < data.length) {
            const sinCompromiso = data.filter((p: Pedido) => !p.Compromiso).slice(0, 3);
            console.log(`⚠️ Ejemplos sin compromiso:`, sinCompromiso.map((p: Pedido) => p.NoPedido));
          }
        }
        
        setPedidosData(Array.isArray(data) ? data : []);
      }
    } catch (error) {
      console.error('❌ Error al obtener pedidos:', error);
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

  /**
   * Obtiene las tareas requeridas para un módulo desde el backend
   * y las mapea a tareas estándar indispensables
   */
  const fetchTareasRequeridas = async (codigoSerie: string, codigoNumero: number): Promise<Set<string>> => {
    try {
      const url = `${API_URL}/control-pedido/tareas?codigoserie=${codigoSerie}&codigonumero=${codigoNumero}`;
      console.log(`\n� [TAREAS] Consultando: ${codigoSerie}-${codigoNumero}`);
      console.log(`📤 URL: ${url}`);
      
      const response = await fetch(url);
      console.log(`📡 Status: ${response.status} ${response.statusText}`);
      
      if (!response.ok) {
        console.warn(`⚠️ No se pudieron obtener tareas para ${codigoSerie}-${codigoNumero}`);
        return new Set();
      }

      const tareas: TareaBackend[] = await response.json();
      
      console.log(`📦 Tipo respuesta:`, typeof tareas);
      console.log(`📦 Es array:`, Array.isArray(tareas));
      console.log(`✅ Total tareas: ${Array.isArray(tareas) ? tareas.length : 0}`);
      
      if (!Array.isArray(tareas) || tareas.length === 0) {
        console.warn(`⚠️ Sin tareas para ${codigoSerie}-${codigoNumero}`);
        return new Set();
      }

      if (tareas.length > 0) {
        console.log(`� Primera tarea (muestra):`, JSON.stringify(tareas[0], null, 2));
      }

      // Mapear tareas del backend a tareas estándar
      const tareasRequeridas = new Set<string>();
      
      tareas.forEach(tarea => {
        const tareaEstandar = mapearTareaBackend(tarea.Descripcion);
        if (tareaEstandar) {
          tareasRequeridas.add(tareaEstandar);
          console.log(`  ✅ "${tarea.Descripcion}" → ${tareaEstandar} (INDISPENSABLE)`);
        } else {
          console.log(`  ⚪ "${tarea.Descripcion}" → (no indispensable, ignorada)`);
        }
      });

      console.log(`📊 Resultado: ${tareasRequeridas.size} tareas indispensables de ${tareas.length} totales`);
      console.log(`📋 Tareas indispensables:`, Array.from(tareasRequeridas));
      
      return tareasRequeridas;

    } catch (error) {
      console.error(`❌ Error al obtener tareas para ${codigoSerie}-${codigoNumero}:`, error);
      return new Set();
    }
  };

  const enrichRecordsWithModuleInfo = async (records: TiempoRealRecord[]): Promise<TiempoRealRecord[]> => {
    try {
      console.log(`\n🔵 ============ ENRIQUECIMIENTO DE REGISTROS ============`);
      
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

      console.log(`📋 Total pedidos únicos a enriquecer: ${pedidosMap.size}`);
      console.log(`📋 Pedidos:`, Array.from(pedidosMap.keys()).slice(0, 5));

      // Obtener información de cada pedido del backend
      const enrichPromises = Array.from(pedidosMap.entries()).map(async ([pedido, pedidoRecords]) => {
        try {
          const requestBody = { codigoPresupuesto: pedido };
          
          console.log(`\n🔵 [ENRICH] Pedido: ${pedido}`);
          console.log(`📤 URL: ${API_URL}/control-pedido/info-para-terminales-costes`);
          console.log(`📤 Body:`, JSON.stringify(requestBody));
          
          const response = await fetch(`${API_URL}/control-pedido/info-para-terminales-costes`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(requestBody)
          });

          console.log(`📡 Status: ${response.status} ${response.statusText}`);

          if (!response.ok) {
            console.warn(`⚠️ No se pudo obtener info para pedido ${pedido}`);
            return;
          }

          const data: InfoParaTerminalesResponse = await response.json();

          console.log(`📦 Response status: ${data.status}`);
          console.log(`📦 Cliente: ${data.clienteNombre}`);
          console.log(`📦 Módulos count: ${data.modulos?.length || 0}`);
          
          if (data.modulos && data.modulos.length > 0) {
            console.log(`� Primer módulo (muestra):`, JSON.stringify(data.modulos[0], null, 2));
          }

          if (data.status !== 'ok' || !data.modulos || data.modulos.length === 0) {
            return;
          }

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
            console.log(`⚠️ [Pedido ${pedido}] ${modulosSinFichajes.length} módulos sin fichajes:`, modulosSinFichajes.slice(0, 3));
          }

          console.log(`✅ [Pedido ${pedido}] ${enriquecidos}/${pedidoRecords.length} registros enriquecidos`);

        } catch (error) {
          console.error(`❌ Error enriqueciendo pedido ${pedido}:`, error);
        }
      });

      await Promise.all(enrichPromises);

      console.log(`\n✅ ============ ENRIQUECIMIENTO COMPLETADO ============`);
      console.log(`📊 Total registros procesados: ${records.length}`);
      return records;

    } catch (error) {
      console.error('❌ Error en enrichRecords:', error);
      return records;
    }
  };

  // ===================== ANÁLISIS DE PEDIDOS =====================

  const analyzePedidos = useMemo(() => {
    console.log(`\n🔵 ============ ANÁLISIS DE PEDIDOS ============`);
    console.log(`📊 Total records a analizar: ${records.length}`);
    console.log(`📊 Total pedidosData disponibles: ${pedidosData.length}`);
    
    const pedidosMap = new Map<string, PedidoAnalysis>();

    records.forEach(record => {
      // Usar NumeroManual como clave principal del pedido
      const pedido = normalizePedido(record.NumeroManual || record.Fabricacion);
      if (pedido === 'SIN_PEDIDO') return;

      if (!pedidosMap.has(pedido)) {
        // Buscar info de pedido en pedidosData
        const pedidoInfo = pedidosData.find(p => p.NoPedido === pedido);
        
        console.log(`\n📦 Analizando pedido: ${pedido}`);
        console.log(`  Cliente record: ${record.ClienteNombre}`);
        console.log(`  PedidoInfo encontrado:`, pedidoInfo ? 'SÍ' : 'NO');
        if (pedidoInfo) {
          console.log(`  Cliente pedidoInfo: ${pedidoInfo.Cliente}`);
          console.log(`  Compromiso: ${pedidoInfo.Compromiso}`);
          console.log(`  Recibido: ${pedidoInfo.Recibido}`);
        }
        
        const fechaCompromiso = pedidoInfo?.Compromiso ? new Date(pedidoInfo.Compromiso) : undefined;
        console.log(`  FechaCompromiso final:`, fechaCompromiso ? fechaCompromiso.toISOString() : 'undefined');
        
        pedidosMap.set(pedido, {
          pedido,
          cliente: record.ClienteNombre || pedidoInfo?.Cliente || 'Cliente desconocido',
          fechaCompromiso,
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
          tareasRequeridas: new Set(), // Inicializar vacío, se llenará después
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
            
            // Procesar cada módulo: obtener tareas requeridas y calcular estadísticas
            const moduloPromises = info.modulos.map(async (moduloInfo) => {
              const modulo = moduloInfo.Modulo;
              const moduloAnalisis = analisis.modulos.get(modulo);
              
              if (moduloAnalisis) {
                // 🔍 Obtener tareas requeridas desde el backend
                const tareasRequeridas = await fetchTareasRequeridas(
                  moduloInfo.CodigoSerie, 
                  moduloInfo.CodigoNumero
                );
                
                moduloAnalisis.tareasRequeridas = tareasRequeridas;
                
                // Calcular tareas totales basado en tareas requeridas + tareas realizadas
                const todasLasTareas = new Set([
                  ...Array.from(tareasRequeridas),
                  ...Array.from(moduloAnalisis.tareasRealizadas)
                ]);
                
                moduloAnalisis.tareasTotales = todasLasTareas.size || 8; // Fallback a 8 si no hay tareas
                moduloAnalisis.porcentajeCompletado = 
                  moduloAnalisis.tareasTotales > 0 
                    ? (moduloAnalisis.tareasRealizadas.size / moduloAnalisis.tareasTotales) * 100 
                    : 0;
                
                if (moduloAnalisis.tareasRealizadas.size > 0) {
                  analisis.modulosIniciados++;
                }
                if (moduloAnalisis.porcentajeCompletado >= 100) {
                  analisis.modulosCompletados++;
                }
              }
            });
            
            await Promise.all(moduloPromises);

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

    console.log(`\n✅ ============ ANÁLISIS COMPLETADO ============`);
    console.log(`📊 Total pedidos analizados: ${pedidosMap.size}`);
    
    // Resumen de fechas de compromiso
    let conFechaCompromiso = 0;
    let sinFechaCompromiso = 0;
    pedidosMap.forEach((analisis, pedido) => {
      if (analisis.fechaCompromiso) {
        conFechaCompromiso++;
      } else {
        sinFechaCompromiso++;
        console.log(`  ⚠️ SIN FECHA: ${pedido} (${analisis.cliente})`);
      }
    });
    
    console.log(`📅 Con fecha compromiso: ${conFechaCompromiso}`);
    console.log(`⚠️ Sin fecha compromiso: ${sinFechaCompromiso}`);

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

  // ===================== RENDERIZADO PLANO (SIN COLLAPSIBLES) =====================

  const renderPedidoItem = ({ item: analisis }: { item: PedidoAnalysis }) => {
    const proyeccion = vistaActiva === 'analisis' ? calculateProyeccion(analisis) : null;
    
    // Calcular días restantes para mostrar
    const diasRestantes = analisis.fechaCompromiso 
      ? Math.ceil((analisis.fechaCompromiso.getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24))
      : null;

    return (
      <View style={styles.pedidoCardFlat}>
        {/* 📦 CABECERA DEL PEDIDO */}
        <View style={styles.pedidoHeaderFlat}>
          <Text style={styles.pedidoTitleFlat}>
            📦 PEDIDO {analisis.pedido}
            {analisis.cliente && ` (Cliente: ${analisis.cliente})`}
          </Text>
        </View>

        {/* 📊 INFO RÁPIDA DEL PEDIDO */}
        <View style={styles.pedidoInfoFlat}>
          <Text style={styles.pedidoInfoText}>
            ├─ 📊 Progreso: {Math.round(analisis.porcentajeGeneral)}% | Tiempo dedicado: {formatDurationHM(analisis.tiempoTotalSegundos)}
          </Text>
          
          {analisis.fechaCompromiso && (
            <Text style={[
              styles.pedidoInfoText,
              diasRestantes !== null && diasRestantes < 0 && styles.pedidoInfoDanger
            ]}>
              ├─ 📅 Compromiso: {formatDateForDisplay(analisis.fechaCompromiso.toISOString())}
              {diasRestantes !== null && ` (${diasRestantes} ${diasRestantes === 1 ? 'día' : 'días'} ${diasRestantes < 0 ? 'vencido' : 'restantes'})`}
            </Text>
          )}

          {!analisis.fechaCompromiso && (
            <Text style={[styles.pedidoInfoText, styles.pedidoInfoWarning]}>
              ├─ ⚠️ Sin fecha de compromiso
            </Text>
          )}
          
          <Text style={styles.pedidoSeparator}>│</Text>
        </View>

        {/* 📁 MÓDULOS (SIEMPRE VISIBLES) */}
        {renderModulosFlat(analisis)}
      </View>
    );
  };

  const renderModulosFlat = (analisis: PedidoAnalysis) => {
    const modulosArray = Array.from(analisis.modulos.entries());
    
    return modulosArray.map(([modulo, moduloAnalisis], index) => {
      const isLast = index === modulosArray.length - 1;
      const prefix = isLast ? '└─' : '├─';

      return (
        <View key={modulo} style={styles.moduloContainerFlat}>
          {/* NOMBRE DEL MÓDULO */}
          <Text style={styles.moduloTitleFlat}>
            {prefix} 📁 MÓDULO {modulo}
          </Text>

          {/* TAREAS DEL MÓDULO (SIEMPRE VISIBLES) */}
          {renderTareasFlat(analisis.pedido, modulo, moduloAnalisis, isLast)}
        </View>
      );
    });
  };

  const renderTareasFlat = (
    pedido: string, 
    modulo: string, 
    moduloAnalisis: ModuloAnalysis,
    isLastModulo: boolean
  ) => {
    // Combinar tareas realizadas y requeridas
    const todasLasTareas = new Set([
      ...Array.from(moduloAnalisis.tareasRealizadas),
      ...Array.from(moduloAnalisis.tareasRequeridas)
    ]);

    const tareasArray = Array.from(todasLasTareas).sort();

    return tareasArray.map((tarea, index) => {
      const isLastTarea = index === tareasArray.length - 1;
      const tareaRealizada = moduloAnalisis.tareasRealizadas.has(tarea);
      const tareaRequerida = moduloAnalisis.tareasRequeridas.has(tarea);
      
      // Obtener registros de esta tarea
      const tareaRecords = records.filter(r => 
        normalizePedido(r.NumeroManual || r.Fabricacion) === pedido &&
        normalizeModulo(r.Modulo) === modulo &&
        normalizeTarea(r.CodigoTarea) === tarea
      );

      // Determinar estado y operario
      let estado = '';
      let operarioInfo = '';
      let tiempoInfo = '';
      let estadoIcon = '';
      let estadoStyle = styles.tareaTextNormal;

      if (tareaRequerida && !tareaRealizada) {
        // PENDIENTE (indispensable sin fichar)
        estado = 'Pendiente - No fichada';
        estadoIcon = '⚠️';
        estadoStyle = styles.tareaTextPendiente;
      } else if (tareaRealizada) {
        // Obtener info del último fichaje
        const ultimoFichaje = tareaRecords.length > 0 ? tareaRecords[tareaRecords.length - 1] : null;
        const tiempoTotal = tareaRecords.reduce((sum, r) => sum + calculateAdjustedTime(r), 0);
        const hayAbiertos = tareaRecords.some(r => r.Abierta === 1);

        if (hayAbiertos) {
          estado = 'En proceso';
          estadoIcon = '🔴';
          estadoStyle = styles.tareaTextEnProceso;
        } else {
          estado = 'Completada';
          estadoIcon = '✅';
          estadoStyle = styles.tareaTextCompletada;
        }

        // Información del operario
        if (ultimoFichaje?.OperarioNombre) {
          operarioInfo = ` - ${ultimoFichaje.OperarioNombre}`;
        }

        // Información del tiempo
        if (tiempoTotal > 0) {
          tiempoInfo = ` - ${formatDurationHM(tiempoTotal)}`;
        }
      }

      const indent = isLastModulo ? '    ' : '│   ';
      const tareaPrefix = isLastTarea ? '└─' : '├─';

      return (
        <Text key={tarea} style={[styles.tareaLineFlat, estadoStyle]}>
          {indent}{tareaPrefix} {estadoIcon} {tarea} ({estado}{operarioInfo}{tiempoInfo})
        </Text>
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

  // Estilos para tareas pendientes
  tareaCardPendiente: {
    backgroundColor: '#fee2e2', // Fondo rojo claro
    borderWidth: 1,
    borderColor: '#fca5a5',
  },
  tareaNombrePendiente: {
    color: '#dc2626',
    fontWeight: '700',
  },
  tareaFichajesPendiente: {
    color: '#dc2626',
    fontWeight: '600',
  },
  badgePendiente: {
    backgroundColor: '#dc2626',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
    marginLeft: 8,
  },
  badgePendienteText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '700',
  },
  tareaStatsPendiente: {
    gap: 6,
    backgroundColor: '#fef2f2',
    padding: 10,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#fecaca',
  },
  tareaStatPendiente: {
    fontSize: 11,
    color: '#991b1b',
    fontWeight: '500',
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

  // ===================== ESTILOS FLAT VIEW =====================
  pedidoCardFlat: {
    backgroundColor: '#fff',
    marginHorizontal: 16,
    marginVertical: 8,
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  pedidoHeaderFlat: {
    marginBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
    paddingBottom: 12,
  },
  pedidoTitleFlat: {
    fontSize: 16,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 8,
  },
  pedidoInfoFlat: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  pedidoInfoText: {
    fontSize: 13,
    color: '#6b7280',
    marginLeft: 4,
  },
  pedidoInfoDanger: {
    fontSize: 13,
    color: '#dc2626',
    fontWeight: '600',
    marginLeft: 4,
  },
  pedidoInfoWarning: {
    fontSize: 13,
    color: '#f59e0b',
    fontWeight: '600',
    marginLeft: 4,
  },
  pedidoSeparator: {
    fontSize: 13,
    color: '#d1d5db',
    marginVertical: 8,
  },
  moduloContainerFlat: {
    marginLeft: 8,
    marginTop: 8,
  },
  moduloTitleFlat: {
    fontSize: 14,
    fontWeight: '600',
    color: '#2563eb',
    marginBottom: 6,
  },
  tareaLineFlat: {
    marginLeft: 24,
    marginBottom: 4,
  },
  tareaTextNormal: {
    fontSize: 12,
    color: '#6b7280',
    lineHeight: 18,
  },
  tareaTextPendiente: {
    fontSize: 12,
    color: '#dc2626',
    fontWeight: '600',
    lineHeight: 18,
  },
  tareaTextEnProceso: {
    fontSize: 12,
    color: '#f59e0b',
    fontWeight: '600',
    lineHeight: 18,
  },
  tareaTextCompletada: {
    fontSize: 12,
    color: '#10b981',
    lineHeight: 18,
  },
});
