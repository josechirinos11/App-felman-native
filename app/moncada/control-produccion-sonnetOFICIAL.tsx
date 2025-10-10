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
// ✅ Tipo actualizado según el endpoint /production-analytics
type TiempoRealRecord = {
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
};

interface UserData {
  id: number;
  nombre?: string;
  rol?: string;
  name?: string;
  role?: string;
}

interface HierarchicalRecord {
  pedido: string;
  modulo: string;
  tarea: string;
  operario: string;
  records: TiempoRealRecord[];
  totalTime: number;
  totalValidTime: number;
  totalOutsideTime: number;
  fechas: string[];
}

interface ModuloGroup {
  modulo: string;
  tareas: Map<string, HierarchicalRecord[]>;
  totalTime: number;
  totalValidTime: number;
  totalOutsideTime: number;
  operarios: Set<string>;
  fechas: Set<string>;
}

interface PedidoGroup {
  pedido: string;
  modulos: Map<string, ModuloGroup>;
  totalTime: number;
  totalValidTime: number;
  totalOutsideTime: number;
  operarios: Set<string>;
  fechas: Set<string>;
}

// ✅ Interface para análisis detallado de pedido
interface PedidoAnalysis {
  pedido: string;
  // Totales generales
  totalRegistros: number;
  tiempoTotalReal: number;
  tiempoTotalValido: number;
  tiempoFueraTurno: number;
  fichajesAbiertos: number;

  // Módulos
  totalModulos: number;
  modulosDetalle: Array<{
    nombre: string;
    tiempo: number;
    tiempoValido: number;
    registros: number;
    operarios: number;
    tareas: number;
    porcentaje: number;
  }>;

  // Operarios
  totalOperarios: number;
  operariosDetalle: Array<{
    nombre: string;
    tiempo: number;
    tiempoValido: number;
    registros: number;
    modulos: number;
    tareas: number;
    porcentaje: number;
    tieneAnomalias: boolean;
  }>;

  // Tareas
  totalTareas: number;
  tareasDetalle: Array<{
    codigo: string;
    tiempo: number;
    tiempoValido: number;
    registros: number;
    operarios: number;
    modulos: number;
    porcentaje: number;
  }>;

  // Fechas
  fechaInicio: string;
  fechaFin: string;
  diasTrabajados: number;

  // Eficiencia
  eficienciaPromedio: number; // % de tiempo válido sobre tiempo total
  tiempoPromedioPorOperario: number;
  tiempoPromedioPorTarea: number;
}

// ✅ Interface para análisis detallado de tarea
interface TareaAnalysis {
  tarea: string;
  // Totales generales
  totalRegistros: number;
  tiempoTotalReal: number;
  tiempoTotalValido: number;
  tiempoFueraTurno: number;
  fichajesAbiertos: number;

  // Pedidos
  totalPedidos: number;
  pedidosDetalle: Array<{
    nombre: string;
    tiempo: number;
    tiempoValido: number;
    registros: number;
    operarios: number;
    modulos: number;
    porcentaje: number;
  }>;

  // Módulos
  totalModulos: number;
  modulosDetalle: Array<{
    nombre: string;
    tiempo: number;
    tiempoValido: number;
    registros: number;
    operarios: number;
    pedidos: number;
    porcentaje: number;
  }>;

  // Operarios
  totalOperarios: number;
  operariosDetalle: Array<{
    nombre: string;
    tiempo: number;
    tiempoValido: number;
    registros: number;
    modulos: number;
    pedidos: number;
    porcentaje: number;
    tieneAnomalias: boolean;
  }>;

  // Fechas
  fechaInicio: string;
  fechaFin: string;
  diasTrabajados: number;

  // Eficiencia
  eficienciaPromedio: number;
  tiempoPromedioPorOperario: number;
  tiempoPromedioPorPedido: number;
}

// ✅ Interface para análisis detallado de operario
interface OperarioAnalysis {
  operario: string;
  // Totales generales
  totalRegistros: number;
  tiempoTotalReal: number;
  tiempoTotalValido: number;
  tiempoFueraTurno: number;
  fichajesAbiertos: number;

  // Pedidos
  totalPedidos: number;
  pedidosDetalle: Array<{
    nombre: string;
    tiempo: number;
    tiempoValido: number;
    registros: number;
    modulos: number;
    tareas: number;
    porcentaje: number;
  }>;

  // Módulos
  totalModulos: number;
  modulosDetalle: Array<{
    nombre: string;
    tiempo: number;
    tiempoValido: number;
    registros: number;
    pedidos: number;
    tareas: number;
    porcentaje: number;
  }>;

  // Tareas
  totalTareas: number;
  tareasDetalle: Array<{
    codigo: string;
    tiempo: number;
    tiempoValido: number;
    registros: number;
    pedidos: number;
    modulos: number;
    porcentaje: number;
  }>;

  // Fechas
  fechaInicio: string;
  fechaFin: string;
  diasTrabajados: number;

  // Eficiencia
  eficienciaPromedio: number;
  tiempoPromedioPorPedido: number;
  tiempoPromedioPorTarea: number;
}

// ===================== Utilidades =====================
// ✅ Función getLastMonday eliminada - ya no se usa

const formatDateOnly = (dateStr?: string | null) => {
  if (!dateStr) return '-';
  const s = String(dateStr).trim();
  if (!s) return '-';
  if (s.includes('T')) return s.split('T')[0];
  try {
    // ✅ Intentar parsear como UTC
    const d = new Date(s);
    if (!isNaN(d.getTime())) {
      return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}-${String(d.getUTCDate()).padStart(2, '0')}`;
    }
    return s.slice(0, 10);
  } catch {
    return s.slice(0, 10);
  }
};


// ✅ Función para formatear fechas locales
const formatDateLocal = (date: Date): string => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const formatted = `${year}-${month}-${day}`;

  console.log('[FECHA-DEBUG] 📅 formatDateLocal:', {
    input: date.toISOString(),
    inputLocal: date.toString(),
    year, month, day,
    output: formatted,
    getDate: date.getDate(),
    getMonth: date.getMonth(),
    getFullYear: date.getFullYear()
  });

  return formatted;
};
// ✅ Función para formatear fechas en UTC (sin conversión de zona horaria)
const formatDateUTC = (date: Date): string => {
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, '0');
  const day = String(date.getUTCDate()).padStart(2, '0');
  const formatted = `${year}-${month}-${day}`;
  console.log('[FECHA-DEBUG] 📅 formatDateUTC:', {
    input: date.toISOString(),
    year,
    month,
    day,
    output: formatted,
    getUTCDate: date.getUTCDate(),
    getUTCMonth: date.getUTCMonth(),
    getUTCFullYear: date.getUTCFullYear()
  });
  return formatted;
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

const recordTimestamp = (r: TiempoRealRecord) => {
  try {
    const fecha = r.FechaInicio || r.Fecha || r.FechaFin;
    let hora = r.HoraInicio || r.HoraFin || '00:00:00';

    if (!fecha) return 0;

    if (/^\d{1,2}:\d{2}$/.test(hora)) hora = `${hora}:00`;

    // Asumir que la fecha y hora están en zona horaria local de España
    const dateStr = formatDateOnly(fecha);
    const localDate = new Date(`${dateStr}T${hora}`);

    return isNaN(localDate.getTime()) ? 0 : localDate.getTime();
  } catch {
    return 0;
  }
};

const operarioFirstNameKey = (val?: string | null) => {
  if (!val) return 'SIN_OPERARIO';
  const trimmed = String(val).trim();
  if (!trimmed) return 'SIN_OPERARIO';
  // Dividir por espacios o barras y tomar el primer nombre
  const first = trimmed.split(/[\s\/]+/)[0];
  return first ? first.toUpperCase() : 'SIN_OPERARIO';
};

// ✅ Normalizar códigos de tarea
const normalizeTareaKey = (val?: string | null) => {
  if (!val) return 'SIN_TAREA';
  return String(val).trim().toUpperCase() || 'SIN_TAREA';
};

// ✅ Normalizar pedidos
const normalizePedidoKey = (val?: string | null) => {
  if (!val) return 'SIN_PEDIDO';
  return String(val).trim() || 'SIN_PEDIDO';
};

// ✅ Detectar si una hora está fuera del horario laboral
// Horario: 6:30-9:30, descanso 9:30-10:00, 10:00-14:30 (viernes hasta 13:30)
const isOutsideWorkHours = (horaStr?: string | null, fechaStr?: string | null): boolean => {
  if (!horaStr) return false;

  try {
    // Extraer horas y minutos de formato HH:MM:SS o HH:MM
    const parts = String(horaStr).trim().split(':');
    if (parts.length < 2) return false;

    const hora = parseInt(parts[0]);
    const minutos = parseInt(parts[1]);

    if (isNaN(hora) || isNaN(minutos)) return false;

    const totalMinutos = hora * 60 + minutos;

    // Determinar si es viernes
    let esViernes = false;
    if (fechaStr) {
      try {
        const fecha = new Date(fechaStr);
        esViernes = fecha.getDay() === 5; // 5 = Viernes
      } catch {
        esViernes = false;
      }
    }

    // Horario laboral:
    // Turno 1: 6:30 (390 min) - 9:30 (570 min)
    // Descanso: 9:30 (570 min) - 10:00 (600 min)
    // Turno 2: 10:00 (600 min) - 14:30 (870 min) / 13:30 (810 min) viernes

    const turno1Inicio = 6 * 60 + 30;   // 390
    const turno1Fin = 9 * 60 + 30;      // 570
    const turno2Inicio = 10 * 60;       // 600 (ahora es 10:00)
    const turno2Fin = esViernes ? 13 * 60 + 30 : 14 * 60 + 30; // 810 viernes, 870 resto

    // Fuera de turno si está antes de 6:30, entre 9:30-10:00, o después de 14:30 (o 13:30 viernes)
    const dentroTurno1 = totalMinutos >= turno1Inicio && totalMinutos <= turno1Fin;
    const dentroTurno2 = totalMinutos >= turno2Inicio && totalMinutos <= turno2Fin;

    return !(dentroTurno1 || dentroTurno2);
  } catch {
    return false;
  }
};

// ✅ Calcular tiempo trabajado fuera de horario para un registro
const calculateOutsideWorkTime = (record: TiempoRealRecord): number => {
  const horaInicio = record.HoraInicio;
  const horaFin = record.HoraFin;

  if (!horaInicio || !horaFin) return 0;

  try {
    // Convertir horas a minutos totales
    const parseTime = (timeStr: string): number => {
      const parts = timeStr.trim().split(':');
      if (parts.length < 2) return 0;
      const h = parseInt(parts[0]);
      const m = parseInt(parts[1]);
      return isNaN(h) || isNaN(m) ? 0 : h * 60 + m;
    };

    const inicioMin = parseTime(horaInicio);
    let finMin = parseTime(horaFin);

    if (inicioMin === 0 || finMin === 0) return 0;

    // ✅ DETECTAR FICHAJE ABIERTO: Si finMin < inicioMin, significa que cruzó la medianoche
    // En este caso, el fichaje quedó abierto y debemos limitar al horario de cierre
    if (finMin < inicioMin) {
      // Determinar si es viernes para saber la hora de cierre
      let esViernes = false;
      if (record.FechaInicio || record.Fecha) {
        try {
          const fecha = new Date(record.FechaInicio || record.Fecha || '');
          esViernes = fecha.getDay() === 5;
        } catch {
          esViernes = false;
        }
      }

      // Ajustar finMin a la hora de cierre del turno 2
      const horaCierre = esViernes ? 13 * 60 + 30 : 14 * 60 + 30; // 13:30 viernes, 14:30 resto
      finMin = horaCierre;

      console.warn(`⚠️ [calculateOutsideWorkTime] Fichaje abierto detectado - Operario: ${record.OperarioNombre}, Inicio: ${horaInicio}, Fin original: ${horaFin}, Fin ajustado: ${Math.floor(finMin / 60)}:${String(finMin % 60).padStart(2, '0')}`);
    }

    if (finMin <= inicioMin) return 0;

    // Determinar si es viernes
    let esViernes = false;
    if (record.FechaInicio || record.Fecha) {
      try {
        const fecha = new Date(record.FechaInicio || record.Fecha || '');
        esViernes = fecha.getDay() === 5; // 5 = Viernes
      } catch {
        esViernes = false;
      }
    }

    // Definir turnos (actualizado)
    const turno1Inicio = 6 * 60 + 30;  // 6:30 = 390
    const turno1Fin = 9 * 60 + 30;     // 9:30 = 570
    const turno2Inicio = 10 * 60;      // 10:00 = 600 (cambiado de 10:30)
    const turno2Fin = esViernes ? 13 * 60 + 30 : 14 * 60 + 30; // 13:30 (810) viernes, 14:30 (870) resto

    let tiempoFueraTurno = 0;

    // Calcular minutos fuera de turno
    // Caso 1: Todo el registro antes del turno 1
    if (finMin <= turno1Inicio) {
      tiempoFueraTurno = finMin - inicioMin;
    }
    // Caso 2: Comienza antes del turno 1 y termina dentro
    else if (inicioMin < turno1Inicio && finMin > turno1Inicio && finMin <= turno1Fin) {
      tiempoFueraTurno = turno1Inicio - inicioMin;
    }
    // Caso 3: Comienza antes del turno 1 y termina después
    else if (inicioMin < turno1Inicio && finMin > turno1Fin) {
      tiempoFueraTurno = turno1Inicio - inicioMin;
      // Agregar tiempo en el descanso si aplica
      if (finMin > turno1Fin && finMin <= turno2Inicio) {
        tiempoFueraTurno += finMin - turno1Fin;
      } else if (finMin > turno2Inicio) {
        tiempoFueraTurno += turno2Inicio - turno1Fin;
      }
    }
    // Caso 4: Dentro del turno 1 pero termina en descanso
    else if (inicioMin >= turno1Inicio && inicioMin <= turno1Fin && finMin > turno1Fin) {
      if (finMin <= turno2Inicio) {
        tiempoFueraTurno = finMin - turno1Fin;
      } else {
        tiempoFueraTurno = turno2Inicio - turno1Fin;
      }
    }
    // Caso 5: En el descanso (9:30 - 10:30)
    else if (inicioMin >= turno1Fin && finMin <= turno2Inicio) {
      tiempoFueraTurno = finMin - inicioMin;
    }
    // Caso 6: Comienza en descanso y termina en turno 2
    else if (inicioMin >= turno1Fin && inicioMin < turno2Inicio && finMin > turno2Inicio) {
      tiempoFueraTurno = turno2Inicio - inicioMin;
    }
    // Caso 7: Dentro del turno 2 pero termina después
    else if (inicioMin >= turno2Inicio && inicioMin <= turno2Fin && finMin > turno2Fin) {
      tiempoFueraTurno = finMin - turno2Fin;
    }
    // Caso 8: Todo después del turno 2
    else if (inicioMin >= turno2Fin) {
      tiempoFueraTurno = finMin - inicioMin;
    }

    // Convertir minutos a segundos
    return tiempoFueraTurno * 60;
  } catch {
    return 0;
  }
};

// ✅ Calcular tiempo dedicado ajustado (sin fichajes abiertos)
const calculateAdjustedTime = (record: TiempoRealRecord): number => {
  const horaInicio = record.HoraInicio;
  const horaFin = record.HoraFin;

  if (!horaInicio || !horaFin) return record.TiempoDedicado || 0;

  try {
    const parseTime = (timeStr: string): number => {
      const parts = timeStr.trim().split(':');
      if (parts.length < 2) return 0;
      const h = parseInt(parts[0]);
      const m = parseInt(parts[1]);
      return isNaN(h) || isNaN(m) ? 0 : h * 60 + m;
    };

    const inicioMin = parseTime(horaInicio);
    let finMin = parseTime(horaFin);

    if (inicioMin === 0 || finMin === 0) return record.TiempoDedicado || 0;

    // ✅ Si finMin < inicioMin, el fichaje cruzó medianoche (fichaje abierto)
    if (finMin < inicioMin) {
      // Determinar si es viernes
      let esViernes = false;
      if (record.FechaInicio || record.Fecha) {
        try {
          const fecha = new Date(record.FechaInicio || record.Fecha || '');
          esViernes = fecha.getDay() === 5;
        } catch {
          esViernes = false;
        }
      }

      // Calcular tiempo desde inicio hasta hora de cierre
      const horaCierre = esViernes ? 13 * 60 + 30 : 14 * 60 + 30;
      const tiempoAjustado = (horaCierre - inicioMin) * 60; // convertir a segundos

      console.warn(`⚠️ [calculateAdjustedTime] Tiempo ajustado - Operario: ${record.OperarioNombre}, Original: ${record.TiempoDedicado}s, Ajustado: ${tiempoAjustado}s`);

      return Math.max(0, tiempoAjustado);
    }

    // Si no hay problema, retornar el tiempo original
    return record.TiempoDedicado || 0;
  } catch {
    return record.TiempoDedicado || 0;
  }
};

// ✅ Analizar tiempos fuera de turno para un operario (incluye fichajes abiertos)
const analyzeOperarioOutsideTime = (records: TiempoRealRecord[]): {
  totalOutsideTime: number;
  hasOutsideTime: boolean;
  outsideRecordsCount: number;
  hasOpenShift: boolean;
  openShiftCount: number;
} => {
  let totalOutsideTime = 0;
  let outsideRecordsCount = 0;
  let openShiftCount = 0;

  const parseTime = (timeStr: string): number => {
    const parts = timeStr.trim().split(':');
    if (parts.length < 2) return 0;
    const h = parseInt(parts[0]);
    const m = parseInt(parts[1]);
    return isNaN(h) || isNaN(m) ? 0 : h * 60 + m;
  };

  for (const record of records) {
    const outsideTime = calculateOutsideWorkTime(record);
    if (outsideTime > 0) {
      totalOutsideTime += outsideTime;
      outsideRecordsCount++;
    }

    // ✅ Detectar fichajes abiertos
    if (record.HoraInicio && record.HoraFin) {
      const inicioMin = parseTime(record.HoraInicio);
      const finMin = parseTime(record.HoraFin);
      if (inicioMin > 0 && finMin > 0 && finMin < inicioMin) {
        openShiftCount++;
      }
    }
  }

  return {
    totalOutsideTime,
    hasOutsideTime: totalOutsideTime > 0 || openShiftCount > 0,
    outsideRecordsCount,
    hasOpenShift: openShiftCount > 0,
    openShiftCount
  };
};

// ✅ Analizar pedido en profundidad
const analyzePedidoDetailed = (records: TiempoRealRecord[]): PedidoAnalysis => {
  console.log(`[analyzePedidoDetailed] 📊 Analizando ${records.length} registros`);

  const parseTime = (timeStr: string): number => {
    const parts = timeStr.trim().split(':');
    if (parts.length < 2) return 0;
    const h = parseInt(parts[0]);
    const m = parseInt(parts[1]);
    return isNaN(h) || isNaN(m) ? 0 : h * 60 + m;
  };

  // Agrupar por módulos
  const modulosMap = new Map<string, TiempoRealRecord[]>();
  const operariosMap = new Map<string, TiempoRealRecord[]>();
  const tareasMap = new Map<string, TiempoRealRecord[]>();
  const fechasSet = new Set<string>();

  let tiempoTotalReal = 0;
  let tiempoTotalValido = 0;
  let tiempoFueraTurno = 0;
  let fichajesAbiertos = 0;

  for (const record of records) {
    const modulo = record.Modulo?.trim() || 'SIN_MODULO';
    const operario = operarioFirstNameKey(record.OperarioNombre || record.CodigoOperario);
    const tarea = normalizeTareaKey(record.CodigoTarea);
    const fecha = formatDateOnly(record.FechaInicio || record.Fecha);

    // Agrupar
    if (!modulosMap.has(modulo)) modulosMap.set(modulo, []);
    if (!operariosMap.has(operario)) operariosMap.set(operario, []);
    if (!tareasMap.has(tarea)) tareasMap.set(tarea, []);

    modulosMap.get(modulo)!.push(record);
    operariosMap.get(operario)!.push(record);
    tareasMap.get(tarea)!.push(record);
    fechasSet.add(fecha);

    // Calcular tiempos
    const tiempoAjustado = calculateAdjustedTime(record);
    const tiempoFuera = calculateOutsideWorkTime(record);

    tiempoTotalReal += tiempoAjustado;
    tiempoTotalValido += Math.max(0, tiempoAjustado - tiempoFuera);
    tiempoFueraTurno += tiempoFuera;

    // Detectar fichajes abiertos
    if (record.HoraInicio && record.HoraFin) {
      const inicioMin = parseTime(record.HoraInicio);
      const finMin = parseTime(record.HoraFin);
      if (inicioMin > 0 && finMin > 0 && finMin < inicioMin) {
        fichajesAbiertos++;
      }
    }
  }

  // Analizar módulos
  const modulosDetalle = Array.from(modulosMap.entries()).map(([nombre, recs]) => {
    const operariosSet = new Set<string>();
    const tareasSet = new Set<string>();
    let tiempo = 0;
    let tiempoValido = 0;

    for (const r of recs) {
      operariosSet.add(operarioFirstNameKey(r.OperarioNombre || r.CodigoOperario));
      tareasSet.add(normalizeTareaKey(r.CodigoTarea));
      const t = calculateAdjustedTime(r);
      const tf = calculateOutsideWorkTime(r);
      tiempo += t;
      tiempoValido += Math.max(0, t - tf);
    }

    return {
      nombre,
      tiempo,
      tiempoValido,
      registros: recs.length,
      operarios: operariosSet.size,
      tareas: tareasSet.size,
      porcentaje: tiempoTotalReal > 0 ? (tiempo / tiempoTotalReal) * 100 : 0
    };
  }).sort((a, b) => b.tiempoValido - a.tiempoValido);

  // Analizar operarios
  const operariosDetalle = Array.from(operariosMap.entries()).map(([nombre, recs]) => {
    const modulosSet = new Set<string>();
    const tareasSet = new Set<string>();
    let tiempo = 0;
    let tiempoValido = 0;

    for (const r of recs) {
      modulosSet.add(r.Modulo?.trim() || 'SIN_MODULO');
      tareasSet.add(normalizeTareaKey(r.CodigoTarea));
      const t = calculateAdjustedTime(r);
      const tf = calculateOutsideWorkTime(r);
      tiempo += t;
      tiempoValido += Math.max(0, t - tf);
    }

    const analysis = analyzeOperarioOutsideTime(recs);

    return {
      nombre,
      tiempo,
      tiempoValido,
      registros: recs.length,
      modulos: modulosSet.size,
      tareas: tareasSet.size,
      porcentaje: tiempoTotalReal > 0 ? (tiempo / tiempoTotalReal) * 100 : 0,
      tieneAnomalias: analysis.hasOutsideTime
    };
  }).sort((a, b) => b.tiempoValido - a.tiempoValido);

  // Analizar tareas
  const tareasDetalle = Array.from(tareasMap.entries()).map(([codigo, recs]) => {
    const operariosSet = new Set<string>();
    const modulosSet = new Set<string>();
    let tiempo = 0;
    let tiempoValido = 0;

    for (const r of recs) {
      operariosSet.add(operarioFirstNameKey(r.OperarioNombre || r.CodigoOperario));
      modulosSet.add(r.Modulo?.trim() || 'SIN_MODULO');
      const t = calculateAdjustedTime(r);
      const tf = calculateOutsideWorkTime(r);
      tiempo += t;
      tiempoValido += Math.max(0, t - tf);
    }

    return {
      codigo,
      tiempo,
      tiempoValido,
      registros: recs.length,
      operarios: operariosSet.size,
      modulos: modulosSet.size,
      porcentaje: tiempoTotalReal > 0 ? (tiempo / tiempoTotalReal) * 100 : 0
    };
  }).sort((a, b) => b.tiempoValido - a.tiempoValido);

  // Fechas
  const fechasArray = Array.from(fechasSet).sort();
  const fechaInicio = fechasArray.length > 0 ? fechasArray[0] : '-';
  const fechaFin = fechasArray.length > 0 ? fechasArray[fechasArray.length - 1] : '-';

  // Eficiencia
  const eficienciaPromedio = tiempoTotalReal > 0 ? (tiempoTotalValido / tiempoTotalReal) * 100 : 0;
  const tiempoPromedioPorOperario = operariosDetalle.length > 0 ? tiempoTotalValido / operariosDetalle.length : 0;
  const tiempoPromedioPorTarea = tareasDetalle.length > 0 ? tiempoTotalValido / tareasDetalle.length : 0;

  const pedido = records.length > 0 ? normalizePedidoKey(records[0].NumeroManual) : 'SIN_PEDIDO';

  return {
    pedido,
    totalRegistros: records.length,
    tiempoTotalReal,
    tiempoTotalValido,
    tiempoFueraTurno,
    fichajesAbiertos,
    totalModulos: modulosDetalle.length,
    modulosDetalle,
    totalOperarios: operariosDetalle.length,
    operariosDetalle,
    totalTareas: tareasDetalle.length,
    tareasDetalle,
    fechaInicio,
    fechaFin,
    diasTrabajados: fechasArray.length,
    eficienciaPromedio,
    tiempoPromedioPorOperario,
    tiempoPromedioPorTarea
  };
};

// ✅ Análisis detallado de Tarea
const analyzeTareaDetailed = (records: TiempoRealRecord[]): TareaAnalysis => {
  console.log(`[analyzeTareaDetailed] 📊 Analizando ${records.length} registros`);

  const parseTime = (timeStr: string): number => {
    const parts = timeStr.trim().split(':');
    if (parts.length < 2) return 0;
    const h = parseInt(parts[0]);
    const m = parseInt(parts[1]);
    return isNaN(h) || isNaN(m) ? 0 : h * 60 + m;
  };

  // Agrupar por pedidos, módulos y operarios
  const pedidosMap = new Map<string, TiempoRealRecord[]>();
  const modulosMap = new Map<string, TiempoRealRecord[]>();
  const operariosMap = new Map<string, TiempoRealRecord[]>();
  const fechasSet = new Set<string>();

  let tiempoTotalReal = 0;
  let tiempoTotalValido = 0;
  let tiempoFueraTurno = 0;
  let fichajesAbiertos = 0;

  for (const record of records) {
    const pedido = normalizePedidoKey(record.NumeroManual);
    const modulo = record.Modulo?.trim() || 'SIN_MODULO';
    const operario = operarioFirstNameKey(record.OperarioNombre || record.CodigoOperario);
    const fecha = formatDateOnly(record.FechaInicio || record.Fecha);

    // Agrupar
    if (!pedidosMap.has(pedido)) pedidosMap.set(pedido, []);
    if (!modulosMap.has(modulo)) modulosMap.set(modulo, []);
    if (!operariosMap.has(operario)) operariosMap.set(operario, []);

    pedidosMap.get(pedido)!.push(record);
    modulosMap.get(modulo)!.push(record);
    operariosMap.get(operario)!.push(record);
    fechasSet.add(fecha);

    // Calcular tiempos
    const tiempoAjustado = calculateAdjustedTime(record);
    const tiempoFuera = calculateOutsideWorkTime(record);

    tiempoTotalReal += tiempoAjustado;
    tiempoTotalValido += Math.max(0, tiempoAjustado - tiempoFuera);
    tiempoFueraTurno += tiempoFuera;

    // Detectar fichajes abiertos
    if (record.HoraInicio && record.HoraFin) {
      const inicioMin = parseTime(record.HoraInicio);
      const finMin = parseTime(record.HoraFin);
      if (inicioMin > 0 && finMin > 0 && finMin < inicioMin) {
        fichajesAbiertos++;
      }
    }
  }

  // Analizar pedidos
  const pedidosDetalle = Array.from(pedidosMap.entries()).map(([nombre, recs]) => {
    const operariosSet = new Set<string>();
    const modulosSet = new Set<string>();
    let tiempo = 0;
    let tiempoValido = 0;

    for (const r of recs) {
      operariosSet.add(operarioFirstNameKey(r.OperarioNombre || r.CodigoOperario));
      modulosSet.add(r.Modulo?.trim() || 'SIN_MODULO');
      const t = calculateAdjustedTime(r);
      const tf = calculateOutsideWorkTime(r);
      tiempo += t;
      tiempoValido += Math.max(0, t - tf);
    }

    return {
      nombre,
      tiempo,
      tiempoValido,
      registros: recs.length,
      operarios: operariosSet.size,
      modulos: modulosSet.size,
      porcentaje: tiempoTotalReal > 0 ? (tiempo / tiempoTotalReal) * 100 : 0
    };
  }).sort((a, b) => b.tiempoValido - a.tiempoValido);

  // Analizar módulos
  const modulosDetalle = Array.from(modulosMap.entries()).map(([nombre, recs]) => {
    const operariosSet = new Set<string>();
    const pedidosSet = new Set<string>();
    let tiempo = 0;
    let tiempoValido = 0;

    for (const r of recs) {
      operariosSet.add(operarioFirstNameKey(r.OperarioNombre || r.CodigoOperario));
      pedidosSet.add(normalizePedidoKey(r.NumeroManual));
      const t = calculateAdjustedTime(r);
      const tf = calculateOutsideWorkTime(r);
      tiempo += t;
      tiempoValido += Math.max(0, t - tf);
    }

    return {
      nombre,
      tiempo,
      tiempoValido,
      registros: recs.length,
      operarios: operariosSet.size,
      pedidos: pedidosSet.size,
      porcentaje: tiempoTotalReal > 0 ? (tiempo / tiempoTotalReal) * 100 : 0
    };
  }).sort((a, b) => b.tiempoValido - a.tiempoValido);

  // Analizar operarios
  const operariosDetalle = Array.from(operariosMap.entries()).map(([nombre, recs]) => {
    const modulosSet = new Set<string>();
    const pedidosSet = new Set<string>();
    let tiempo = 0;
    let tiempoValido = 0;

    for (const r of recs) {
      modulosSet.add(r.Modulo?.trim() || 'SIN_MODULO');
      pedidosSet.add(normalizePedidoKey(r.NumeroManual));
      const t = calculateAdjustedTime(r);
      const tf = calculateOutsideWorkTime(r);
      tiempo += t;
      tiempoValido += Math.max(0, t - tf);
    }

    const analysis = analyzeOperarioOutsideTime(recs);

    return {
      nombre,
      tiempo,
      tiempoValido,
      registros: recs.length,
      modulos: modulosSet.size,
      pedidos: pedidosSet.size,
      porcentaje: tiempoTotalReal > 0 ? (tiempo / tiempoTotalReal) * 100 : 0,
      tieneAnomalias: analysis.hasOutsideTime
    };
  }).sort((a, b) => b.tiempoValido - a.tiempoValido);

  // Fechas
  const fechasArray = Array.from(fechasSet).sort();
  const fechaInicio = fechasArray.length > 0 ? fechasArray[0] : '-';
  const fechaFin = fechasArray.length > 0 ? fechasArray[fechasArray.length - 1] : '-';

  // Eficiencia
  const eficienciaPromedio = tiempoTotalReal > 0 ? (tiempoTotalValido / tiempoTotalReal) * 100 : 0;
  const tiempoPromedioPorOperario = operariosDetalle.length > 0 ? tiempoTotalValido / operariosDetalle.length : 0;
  const tiempoPromedioPorPedido = pedidosDetalle.length > 0 ? tiempoTotalValido / pedidosDetalle.length : 0;

  const tarea = records.length > 0 ? normalizeTareaKey(records[0].CodigoTarea) : 'SIN_TAREA';

  return {
    tarea,
    totalRegistros: records.length,
    tiempoTotalReal,
    tiempoTotalValido,
    tiempoFueraTurno,
    fichajesAbiertos,
    totalPedidos: pedidosDetalle.length,
    pedidosDetalle,
    totalModulos: modulosDetalle.length,
    modulosDetalle,
    totalOperarios: operariosDetalle.length,
    operariosDetalle,
    fechaInicio,
    fechaFin,
    diasTrabajados: fechasArray.length,
    eficienciaPromedio,
    tiempoPromedioPorOperario,
    tiempoPromedioPorPedido
  };
};

// ✅ Análisis detallado de Operario
const analyzeOperarioDetailed = (records: TiempoRealRecord[]): OperarioAnalysis => {
  console.log(`[analyzeOperarioDetailed] 📊 Analizando ${records.length} registros`);

  const parseTime = (timeStr: string): number => {
    const parts = timeStr.trim().split(':');
    if (parts.length < 2) return 0;
    const h = parseInt(parts[0]);
    const m = parseInt(parts[1]);
    return isNaN(h) || isNaN(m) ? 0 : h * 60 + m;
  };

  // Agrupar por pedidos, módulos y tareas
  const pedidosMap = new Map<string, TiempoRealRecord[]>();
  const modulosMap = new Map<string, TiempoRealRecord[]>();
  const tareasMap = new Map<string, TiempoRealRecord[]>();
  const fechasSet = new Set<string>();

  let tiempoTotalReal = 0;
  let tiempoTotalValido = 0;
  let tiempoFueraTurno = 0;
  let fichajesAbiertos = 0;

  for (const record of records) {
    const pedido = normalizePedidoKey(record.NumeroManual);
    const modulo = record.Modulo?.trim() || 'SIN_MODULO';
    const tarea = normalizeTareaKey(record.CodigoTarea);
    const fecha = formatDateOnly(record.FechaInicio || record.Fecha);

    // Agrupar
    if (!pedidosMap.has(pedido)) pedidosMap.set(pedido, []);
    if (!modulosMap.has(modulo)) modulosMap.set(modulo, []);
    if (!tareasMap.has(tarea)) tareasMap.set(tarea, []);

    pedidosMap.get(pedido)!.push(record);
    modulosMap.get(modulo)!.push(record);
    tareasMap.get(tarea)!.push(record);
    fechasSet.add(fecha);

    // Calcular tiempos
    const tiempoAjustado = calculateAdjustedTime(record);
    const tiempoFuera = calculateOutsideWorkTime(record);

    tiempoTotalReal += tiempoAjustado;
    tiempoTotalValido += Math.max(0, tiempoAjustado - tiempoFuera);
    tiempoFueraTurno += tiempoFuera;

    // Detectar fichajes abiertos
    if (record.HoraInicio && record.HoraFin) {
      const inicioMin = parseTime(record.HoraInicio);
      const finMin = parseTime(record.HoraFin);
      if (inicioMin > 0 && finMin > 0 && finMin < inicioMin) {
        fichajesAbiertos++;
      }
    }
  }

  // Analizar pedidos
  const pedidosDetalle = Array.from(pedidosMap.entries()).map(([nombre, recs]) => {
    const modulosSet = new Set<string>();
    const tareasSet = new Set<string>();
    let tiempo = 0;
    let tiempoValido = 0;

    for (const r of recs) {
      modulosSet.add(r.Modulo?.trim() || 'SIN_MODULO');
      tareasSet.add(normalizeTareaKey(r.CodigoTarea));
      const t = calculateAdjustedTime(r);
      const tf = calculateOutsideWorkTime(r);
      tiempo += t;
      tiempoValido += Math.max(0, t - tf);
    }

    return {
      nombre,
      tiempo,
      tiempoValido,
      registros: recs.length,
      modulos: modulosSet.size,
      tareas: tareasSet.size,
      porcentaje: tiempoTotalReal > 0 ? (tiempo / tiempoTotalReal) * 100 : 0
    };
  }).sort((a, b) => b.tiempoValido - a.tiempoValido);

  // Analizar módulos
  const modulosDetalle = Array.from(modulosMap.entries()).map(([nombre, recs]) => {
    const pedidosSet = new Set<string>();
    const tareasSet = new Set<string>();
    let tiempo = 0;
    let tiempoValido = 0;

    for (const r of recs) {
      pedidosSet.add(normalizePedidoKey(r.NumeroManual));
      tareasSet.add(normalizeTareaKey(r.CodigoTarea));
      const t = calculateAdjustedTime(r);
      const tf = calculateOutsideWorkTime(r);
      tiempo += t;
      tiempoValido += Math.max(0, t - tf);
    }

    return {
      nombre,
      tiempo,
      tiempoValido,
      registros: recs.length,
      pedidos: pedidosSet.size,
      tareas: tareasSet.size,
      porcentaje: tiempoTotalReal > 0 ? (tiempo / tiempoTotalReal) * 100 : 0
    };
  }).sort((a, b) => b.tiempoValido - a.tiempoValido);

  // Analizar tareas
  const tareasDetalle = Array.from(tareasMap.entries()).map(([codigo, recs]) => {
    const pedidosSet = new Set<string>();
    const modulosSet = new Set<string>();
    let tiempo = 0;
    let tiempoValido = 0;

    for (const r of recs) {
      pedidosSet.add(normalizePedidoKey(r.NumeroManual));
      modulosSet.add(r.Modulo?.trim() || 'SIN_MODULO');
      const t = calculateAdjustedTime(r);
      const tf = calculateOutsideWorkTime(r);
      tiempo += t;
      tiempoValido += Math.max(0, t - tf);
    }

    return {
      codigo,
      tiempo,
      tiempoValido,
      registros: recs.length,
      pedidos: pedidosSet.size,
      modulos: modulosSet.size,
      porcentaje: tiempoTotalReal > 0 ? (tiempo / tiempoTotalReal) * 100 : 0
    };
  }).sort((a, b) => b.tiempoValido - a.tiempoValido);

  // Fechas
  const fechasArray = Array.from(fechasSet).sort();
  const fechaInicio = fechasArray.length > 0 ? fechasArray[0] : '-';
  const fechaFin = fechasArray.length > 0 ? fechasArray[fechasArray.length - 1] : '-';

  // Eficiencia
  const eficienciaPromedio = tiempoTotalReal > 0 ? (tiempoTotalValido / tiempoTotalReal) * 100 : 0;
  const tiempoPromedioPorPedido = pedidosDetalle.length > 0 ? tiempoTotalValido / pedidosDetalle.length : 0;
  const tiempoPromedioPorTarea = tareasDetalle.length > 0 ? tiempoTotalValido / tareasDetalle.length : 0;

  const operario = records.length > 0 ? operarioFirstNameKey(records[0].OperarioNombre || records[0].CodigoOperario) : 'SIN_OPERARIO';

  return {
    operario,
    totalRegistros: records.length,
    tiempoTotalReal,
    tiempoTotalValido,
    tiempoFueraTurno,
    fichajesAbiertos,
    totalPedidos: pedidosDetalle.length,
    pedidosDetalle,
    totalModulos: modulosDetalle.length,
    modulosDetalle,
    totalTareas: tareasDetalle.length,
    tareasDetalle,
    fechaInicio,
    fechaFin,
    diasTrabajados: fechasArray.length,
    eficienciaPromedio,
    tiempoPromedioPorPedido,
    tiempoPromedioPorTarea
  };
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
  const [loadingTiempo, setLoadingTiempo] = useState(false);

  const [filterMode, setFilterMode] = useState<'operador' | 'tarea' | 'pedido'>('operador');
  const [groupedList, setGroupedList] = useState<any[]>([]);
  const [counts, setCounts] = useState({ operador: 0, tarea: 0, pedido: 0 });

  const [searchQuery, setSearchQuery] = useState('');

  // ✅ Estado para modal de análisis de pedido
  const [pedidoAnalysisVisible, setPedidoAnalysisVisible] = useState(false);
  const [pedidoAnalysisData, setPedidoAnalysisData] = useState<PedidoAnalysis | null>(null);

  // ✅ Estado para modal de análisis de tarea
  const [tareaAnalysisVisible, setTareaAnalysisVisible] = useState(false);
  const [tareaAnalysisData, setTareaAnalysisData] = useState<TareaAnalysis | null>(null);

  // ✅ Estado para modal de análisis de operario
  const [operarioAnalysisVisible, setOperarioAnalysisVisible] = useState(false);
  const [operarioAnalysisData, setOperarioAnalysisData] = useState<OperarioAnalysis | null>(null);

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

  // ✅ Fecha inicial: hoy (current date)
  const today = new Date();
  today.setHours(12, 0, 0, 0); // ✅ Usar hora local en lugar de UTC
  console.log('[FECHA-DEBUG] 🔷 Inicialización de fechas:', {
    today: today.toISOString(),
    todayLocal: today.toString(),
    todayFormattedUTC: formatDateUTC(today),
    todayFormattedLocal: formatDateLocal(today)
  });
  const [fromDate, setFromDate] = useState<Date>(today);
  const [toDate, setToDate] = useState<Date>(today);
  const [showFromPicker, setShowFromPicker] = useState(false);
  const [showToPicker, setShowToPicker] = useState(false);

  // ✅ Carga inicial solamente (no automática al cambiar fechas)
  // ✅ Carga inicial solamente (no automática al cambiar fechas)
  useEffect(() => {
    console.log('[FECHA-DEBUG] 🔷 useEffect inicial - Fechas antes de enviar:', {
      fromDate: fromDate.toISOString(),
      fromDateLocal: fromDate.toString(),
      toDate: toDate.toISOString(),
      toDateLocal: toDate.toString(),
      formattedFrom: formatDateLocal(fromDate),
      formattedTo: formatDateLocal(toDate)
    });
    fetchTiempoReal(formatDateLocal(fromDate), formatDateLocal(toDate));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // ⚠️ Solo se ejecuta al montar el componente

  async function fetchTiempoReal(from: string, to: string) {
    try {
      setLoadingTiempo(true);
      console.log('[FECHA-DEBUG] 🚀 fetchTiempoReal llamado:', { from, to });
      console.log('[FECHA-DEBUG] 🌐 URL completa:', `${API_URL}/control-terminales/production-analytics?start=${from}&end=${to}`);
      console.log(`[ProduccionAnalytics] � Fechas solicitadas: Desde=${from}, Hasta=${to}`);
      console.log(`[ProduccionAnalytics] �📡 Fetching: ${API_URL}/control-terminales/production-analytics?start=${from}&end=${to}`);

      const res = await fetch(`${API_URL}/control-terminales/production-analytics?start=${from}&end=${to}`);

      console.log(`[ProduccionAnalytics] 📊 Response status: ${res.status}`);

      if (!res.ok) {
        console.warn('[ProduccionAnalytics] ⚠️ Response no OK');
        setTiempoRecords([]);
        return;
      }

      const json = await res.json();
      console.log('[ProduccionAnalytics] 📦 Data received:', {
        hasData: !!json?.data,
        dataLength: json?.data?.length,
        sample: json?.data?.[0]
      });

      // El backend devuelve { data: [...], pagination: {...} }
      const records = Array.isArray(json?.data) ? json.data : (Array.isArray(json) ? json : []);

      console.log(`[ProduccionAnalytics] ✅ Records loaded: ${records.length}`);
      setTiempoRecords(records as TiempoRealRecord[]);
    } catch (err) {
      console.error('[ProduccionAnalytics] ❌ Error:', err);
      setTiempoRecords([]);
    } finally {
      setLoadingTiempo(false);
    }
  }

  // ✅ Agrupar por modo con logs detallados
  const computeGroups = (records: TiempoRealRecord[], mode: 'operador' | 'tarea' | 'pedido') => {
    console.log(`[computeGroups] 🔄 Agrupando ${records.length} registros por: ${mode}`);

    const map = new Map<string, TiempoRealRecord[]>();

    for (const r of records) {
      let key = 'SIN';

      if (mode === 'operador') {
        key = operarioFirstNameKey(r.OperarioNombre || r.CodigoOperario);
      } else if (mode === 'tarea') {
        key = normalizeTareaKey(r.CodigoTarea);
      } else {
        key = normalizePedidoKey(r.NumeroManual);
      }

      const arr = map.get(key) || [];
      arr.push(r);
      map.set(key, arr);
    }

    console.log(`[computeGroups] 📊 Grupos encontrados: ${map.size}`);

    const parseTime = (timeStr: string): number => {
      const parts = timeStr.trim().split(':');
      if (parts.length < 2) return 0;
      const h = parseInt(parts[0]);
      const m = parseInt(parts[1]);
      return isNaN(h) || isNaN(m) ? 0 : h * 60 + m;
    };

    const groups: any[] = [];
    for (const [k, arr] of map) {
      // ✅ Usar tiempo ajustado (sin fichajes abiertos)
      let totalTiempo = 0;
      let totalOutsideTime = 0;
      let hasOpenShift = false;

      for (const r of arr) {
        const tiempoAjustado = calculateAdjustedTime(r);
        totalTiempo += tiempoAjustado;
        totalOutsideTime += calculateOutsideWorkTime(r);

        // ✅ Detectar fichajes abiertos
        if (r.HoraInicio && r.HoraFin) {
          const inicioMin = parseTime(r.HoraInicio);
          const finMin = parseTime(r.HoraFin);
          if (inicioMin > 0 && finMin > 0 && finMin < inicioMin) {
            hasOpenShift = true;
          }
        }
      }

      const totalValidTime = Math.max(0, totalTiempo - totalOutsideTime);

      // Obtener fechas de FechaInicio o Fecha
      const fechas = arr
        .map(x => x.FechaInicio || x.Fecha)
        .filter(f => f && f !== '0000-00-00')
        .sort();

      const minFecha = fechas.length > 0 ? fechas[0] : '0000-00-00';
      const maxFecha = fechas.length > 0 ? fechas[fechas.length - 1] : '0000-00-00';

      groups.push({
        key: k,
        items: arr,
        totalTiempo,
        totalValidTime,
        totalOutsideTime,
        hasOpenShift,
        count: arr.length,
        minFecha: formatDateOnly(minFecha),
        maxFecha: formatDateOnly(maxFecha)
      });
    }

    groups.sort((a, b) => b.totalValidTime - a.totalValidTime);

    console.log(`[computeGroups] ✅ Top 5 grupos:`,
      groups.slice(0, 5).map(g => ({
        key: g.key,
        count: g.count,
        tiempoValido: formatHM(g.totalValidTime),
        tiempoFuera: formatHM(g.totalOutsideTime)
      }))
    );

    return groups;
  };

  // ✅ Recompute grouped list + counts con logs
  useEffect(() => {
    console.log(`[useEffect] 🔄 Recomputando grupos - Modo: ${filterMode}, Registros: ${tiempoRecords.length}`);

    setGroupedList(computeGroups(tiempoRecords, filterMode));

    const operadorSet = new Set<string>();
    const tareaSet = new Set<string>();
    const pedidoSet = new Set<string>();

    for (const r of tiempoRecords) {
      operadorSet.add(operarioFirstNameKey(r.OperarioNombre || r.CodigoOperario));
      tareaSet.add(normalizeTareaKey(r.CodigoTarea));
      pedidoSet.add(normalizePedidoKey(r.NumeroManual));
    }

    const newCounts = {
      operador: operadorSet.size,
      tarea: tareaSet.size,
      pedido: pedidoSet.size
    };

    console.log('[useEffect] 📊 Contadores actualizados:', newCounts);
    setCounts(newCounts);
  }, [tiempoRecords, filterMode]);

  const filteredGroupedList = useMemo(() => {
    const q = (searchQuery || '').trim().toLowerCase();
    if (!q) return groupedList;

    const filtered = groupedList.filter((g) =>
      g.key.toLowerCase().includes(q) ||
      g.items.some((r: TiempoRealRecord) =>
        normalizePedidoKey(r.NumeroManual).toLowerCase().includes(q) ||
        normalizeTareaKey(r.CodigoTarea).toLowerCase().includes(q) ||
        operarioFirstNameKey(r.OperarioNombre || r.CodigoOperario).toLowerCase().includes(q) ||
        String(r.Modulo || '').toLowerCase().includes(q)
      )
    );

    console.log(`[filteredGroupedList] 🔍 Query: "${q}" → Resultados: ${filtered.length}/${groupedList.length}`);
    return filtered;
  }, [groupedList, searchQuery]);

  // ✅ Renderizar análisis detallado de pedido
  const renderPedidoAnalysis = (analysis: PedidoAnalysis) => {
    return (
      <FlatList
        data={[analysis]}
        keyExtractor={() => 'analysis'}
        contentContainerStyle={{ paddingBottom: 24 }}
        showsVerticalScrollIndicator={true}
        nestedScrollEnabled={true}
        renderItem={() => (
          <View style={styles.analysisContainer}>
            {/* Header del Pedido */}
            <View style={styles.analysisHeaderCard}>
              <View style={styles.analysisHeaderTitle}>
                <Ionicons name="document-text" size={32} color={COLORS.primary} />
                <View style={{ flex: 1, marginLeft: 12 }}>
                  <Text style={styles.analysisMainTitle}>Análisis de Pedido</Text>
                  <Text style={styles.analysisPedidoNumber}>{analysis.pedido}</Text>
                </View>
              </View>
              <View style={styles.analysisDateRange}>
                <Ionicons name="calendar-outline" size={16} color="#6b7280" />
                <Text style={styles.analysisDateText}>
                  {analysis.fechaInicio} → {analysis.fechaFin} ({analysis.diasTrabajados} día{analysis.diasTrabajados !== 1 ? 's' : ''})
                </Text>
              </View>
            </View>

            {/* Métricas Principales */}
            <View style={styles.metricsGrid}>
              <View style={styles.metricCard}>
                <View style={styles.metricIconContainer}>
                  <Ionicons name="time" size={24} color="#3b82f6" />
                </View>
                <Text style={styles.analysisMetricValue}>{formatHM(analysis.tiempoTotalValido)}</Text>
                <Text style={styles.analysisMetricLabel}>Tiempo Válido</Text>
              </View>

              <View style={styles.metricCard}>
                <View style={[styles.metricIconContainer, { backgroundColor: '#dbeafe' }]}>
                  <Ionicons name="speedometer" size={24} color="#3b82f6" />
                </View>
                <Text style={styles.analysisMetricValue}>{analysis.eficienciaPromedio.toFixed(1)}%</Text>
                <Text style={styles.analysisMetricLabel}>Eficiencia</Text>
              </View>

              <View style={styles.metricCard}>
                <View style={[styles.metricIconContainer, { backgroundColor: '#dcfce7' }]}>
                  <Ionicons name="people" size={24} color="#10b981" />
                </View>
                <Text style={styles.analysisMetricValue}>{analysis.totalOperarios}</Text>
                <Text style={styles.analysisMetricLabel}>Operarios</Text>
              </View>

              <View style={styles.metricCard}>
                <View style={[styles.metricIconContainer, { backgroundColor: '#fef3c7' }]}>
                  <Ionicons name="construct" size={24} color="#f59e0b" />
                </View>
                <Text style={styles.analysisMetricValue}>{analysis.totalModulos}</Text>
                <Text style={styles.analysisMetricLabel}>Módulos</Text>
              </View>
            </View>

            {/* Alertas si hay anomalías */}
            {(analysis.tiempoFueraTurno > 0 || analysis.fichajesAbiertos > 0) && (
              <View style={styles.alertCard}>
                <View style={styles.alertHeader}>
                  <Ionicons name="warning" size={20} color="#dc2626" />
                  <Text style={styles.alertTitle}>Anomalías Detectadas</Text>
                </View>
                {analysis.tiempoFueraTurno > 0 && (
                  <Text style={styles.alertText}>
                    ⚠️ {formatHM(analysis.tiempoFueraTurno)} trabajado fuera de horario (descontado)
                  </Text>
                )}
                {analysis.fichajesAbiertos > 0 && (
                  <Text style={styles.alertText}>
                    🔴 {analysis.fichajesAbiertos} fichaje{analysis.fichajesAbiertos > 1 ? 's' : ''} abierto{analysis.fichajesAbiertos > 1 ? 's' : ''} (ajustado{analysis.fichajesAbiertos > 1 ? 's' : ''})
                  </Text>
                )}
              </View>
            )}

            {/* Estadísticas Generales */}
            <View style={styles.sectionCard}>
              <View style={styles.sectionHeader}>
                <Ionicons name="stats-chart" size={20} color={COLORS.primary} />
                <Text style={styles.sectionTitle}>Estadísticas Generales</Text>
              </View>
              <View style={styles.statsRow}>
                <View style={styles.statItem}>
                  <Text style={styles.statLabel}>Registros totales</Text>
                  <Text style={styles.statValue}>{analysis.totalRegistros}</Text>
                </View>
                <View style={styles.statItem}>
                  <Text style={styles.statLabel}>Tareas diferentes</Text>
                  <Text style={styles.statValue}>{analysis.totalTareas}</Text>
                </View>
              </View>
              <View style={styles.statsRow}>
                <View style={styles.statItem}>
                  <Text style={styles.statLabel}>Tiempo real invertido</Text>
                  <Text style={styles.statValue}>{formatDurationLong(analysis.tiempoTotalReal)}</Text>
                </View>
                <View style={styles.statItem}>
                  <Text style={styles.statLabel}>Promedio por operario</Text>
                  <Text style={styles.statValue}>{formatHM(analysis.tiempoPromedioPorOperario)}</Text>
                </View>
              </View>
            </View>

            {/* Desglose por Módulos */}
            <View style={styles.sectionCard}>
              <View style={styles.sectionHeader}>
                <Ionicons name="cube" size={20} color="#f59e0b" />
                <Text style={styles.sectionTitle}>Desglose por Módulos ({analysis.totalModulos})</Text>
              </View>
              {analysis.modulosDetalle.map((mod, idx) => (
                <View key={idx} style={styles.detailRow}>
                  <View style={styles.detailLeft}>
                    <Text style={styles.detailName}>{mod.nombre}</Text>
                    <Text style={styles.detailSubtext}>
                      {mod.operarios} operario{mod.operarios !== 1 ? 's' : ''} · {mod.tareas} tarea{mod.tareas !== 1 ? 's' : ''} · {mod.registros} reg.
                    </Text>
                  </View>
                  <View style={styles.detailRight}>
                    <Text style={styles.detailTime}>{formatHM(mod.tiempoValido)}</Text>
                    <View style={styles.progressBarContainer}>
                      <View style={[styles.progressBar, { width: `${mod.porcentaje}%` }]} />
                    </View>
                    <Text style={styles.detailPercentage}>{mod.porcentaje.toFixed(1)}%</Text>
                  </View>
                </View>
              ))}
            </View>

            {/* Desglose por Operarios */}
            <View style={styles.sectionCard}>
              <View style={styles.sectionHeader}>
                <Ionicons name="people" size={20} color="#10b981" />
                <Text style={styles.sectionTitle}>Desglose por Operarios ({analysis.totalOperarios})</Text>
              </View>
              {analysis.operariosDetalle.map((op, idx) => (
                <View key={idx} style={styles.detailRow}>
                  <View style={styles.detailLeft}>
                    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                      <Text style={styles.detailName}>{op.nombre}</Text>
                      {op.tieneAnomalias && (
                        <View style={styles.anomalyBadge}>
                          <Ionicons name="warning" size={12} color="#dc2626" />
                        </View>
                      )}
                    </View>
                    <Text style={styles.detailSubtext}>
                      {op.modulos} módulo{op.modulos !== 1 ? 's' : ''} · {op.tareas} tarea{op.tareas !== 1 ? 's' : ''} · {op.registros} reg.
                    </Text>
                  </View>
                  <View style={styles.detailRight}>
                    <Text style={styles.detailTime}>{formatHM(op.tiempoValido)}</Text>
                    <View style={styles.progressBarContainer}>
                      <View style={[styles.progressBar, { width: `${op.porcentaje}%`, backgroundColor: '#10b981' }]} />
                    </View>
                    <Text style={styles.detailPercentage}>{op.porcentaje.toFixed(1)}%</Text>
                  </View>
                </View>
              ))}
            </View>

            {/* Desglose por Tareas */}
            <View style={styles.sectionCard}>
              <View style={styles.sectionHeader}>
                <Ionicons name="list" size={20} color="#8b5cf6" />
                <Text style={styles.sectionTitle}>Desglose por Tareas ({analysis.totalTareas})</Text>
              </View>
              {analysis.tareasDetalle.map((tarea, idx) => (
                <View key={idx} style={styles.detailRow}>
                  <View style={styles.detailLeft}>
                    <Text style={styles.detailName}>{tarea.codigo}</Text>
                    <Text style={styles.detailSubtext}>
                      {tarea.operarios} operario{tarea.operarios !== 1 ? 's' : ''} · {tarea.modulos} módulo{tarea.modulos !== 1 ? 's' : ''} · {tarea.registros} reg.
                    </Text>
                  </View>
                  <View style={styles.detailRight}>
                    <Text style={styles.detailTime}>{formatHM(tarea.tiempoValido)}</Text>
                    <View style={styles.progressBarContainer}>
                      <View style={[styles.progressBar, { width: `${tarea.porcentaje}%`, backgroundColor: '#8b5cf6' }]} />
                    </View>
                    <Text style={styles.detailPercentage}>{tarea.porcentaje.toFixed(1)}%</Text>
                  </View>
                </View>
              ))}
            </View>

            {/* Resumen Final */}
            <View style={styles.summaryFinalCard}>
              <Ionicons name="checkmark-circle" size={24} color="#10b981" />
              <Text style={styles.summaryFinalText}>
                Análisis completado: {analysis.totalRegistros} registros procesados con {analysis.eficienciaPromedio.toFixed(1)}% de eficiencia
              </Text>
            </View>
          </View>
        )}
      />
    );
  };

  // ✅ Renderizar análisis detallado de tarea
  const renderTareaAnalysis = (analysis: TareaAnalysis) => {
    return (
      <FlatList
        data={[analysis]}
        keyExtractor={() => 'analysis'}
        contentContainerStyle={{ paddingBottom: 24 }}
        showsVerticalScrollIndicator={true}
        nestedScrollEnabled={true}
        renderItem={() => (
          <View style={styles.analysisContainer}>
            {/* Header de la Tarea */}
            <View style={styles.analysisHeaderCard}>
              <View style={styles.analysisHeaderTitle}>
                <Ionicons name="construct" size={32} color="#8b5cf6" />
                <View style={{ flex: 1, marginLeft: 12 }}>
                  <Text style={styles.analysisMainTitle}>Análisis de Tarea</Text>
                  <Text style={styles.analysisPedidoNumber}>{analysis.tarea}</Text>
                </View>
              </View>
              <View style={styles.analysisDateRange}>
                <Ionicons name="calendar-outline" size={16} color="#6b7280" />
                <Text style={styles.analysisDateText}>
                  {analysis.fechaInicio} → {analysis.fechaFin} ({analysis.diasTrabajados} día{analysis.diasTrabajados !== 1 ? 's' : ''})
                </Text>
              </View>
            </View>

            {/* Métricas Principales */}
            <View style={styles.metricsGrid}>
              <View style={styles.metricCard}>
                <View style={styles.metricIconContainer}>
                  <Ionicons name="time" size={24} color="#3b82f6" />
                </View>
                <Text style={styles.analysisMetricValue}>{formatHM(analysis.tiempoTotalValido)}</Text>
                <Text style={styles.analysisMetricLabel}>Tiempo Válido</Text>
              </View>

              <View style={styles.metricCard}>
                <View style={[styles.metricIconContainer, { backgroundColor: '#dbeafe' }]}>
                  <Ionicons name="speedometer" size={24} color="#3b82f6" />
                </View>
                <Text style={styles.analysisMetricValue}>{analysis.eficienciaPromedio.toFixed(1)}%</Text>
                <Text style={styles.analysisMetricLabel}>Eficiencia</Text>
              </View>

              <View style={styles.metricCard}>
                <View style={[styles.metricIconContainer, { backgroundColor: '#dcfce7' }]}>
                  <Ionicons name="people" size={24} color="#10b981" />
                </View>
                <Text style={styles.analysisMetricValue}>{analysis.totalOperarios}</Text>
                <Text style={styles.analysisMetricLabel}>Operarios</Text>
              </View>

              <View style={styles.metricCard}>
                <View style={[styles.metricIconContainer, { backgroundColor: '#fee2e2' }]}>
                  <Ionicons name="document-text" size={24} color="#ef4444" />
                </View>
                <Text style={styles.analysisMetricValue}>{analysis.totalPedidos}</Text>
                <Text style={styles.analysisMetricLabel}>Pedidos</Text>
              </View>
            </View>

            {/* Alertas si hay anomalías */}
            {(analysis.tiempoFueraTurno > 0 || analysis.fichajesAbiertos > 0) && (
              <View style={styles.alertCard}>
                <View style={styles.alertHeader}>
                  <Ionicons name="warning" size={20} color="#dc2626" />
                  <Text style={styles.alertTitle}>Anomalías Detectadas</Text>
                </View>
                {analysis.tiempoFueraTurno > 0 && (
                  <Text style={styles.alertText}>
                    ⚠️ {formatHM(analysis.tiempoFueraTurno)} trabajado fuera de horario (descontado)
                  </Text>
                )}
                {analysis.fichajesAbiertos > 0 && (
                  <Text style={styles.alertText}>
                    🔴 {analysis.fichajesAbiertos} fichaje{analysis.fichajesAbiertos > 1 ? 's' : ''} abierto{analysis.fichajesAbiertos > 1 ? 's' : ''} (ajustado{analysis.fichajesAbiertos > 1 ? 's' : ''})
                  </Text>
                )}
              </View>
            )}

            {/* Estadísticas Generales */}
            <View style={styles.sectionCard}>
              <View style={styles.sectionHeader}>
                <Ionicons name="stats-chart" size={20} color={COLORS.primary} />
                <Text style={styles.sectionTitle}>Estadísticas Generales</Text>
              </View>
              <View style={styles.statsRow}>
                <View style={styles.statItem}>
                  <Text style={styles.statLabel}>Registros totales</Text>
                  <Text style={styles.statValue}>{analysis.totalRegistros}</Text>
                </View>
                <View style={styles.statItem}>
                  <Text style={styles.statLabel}>Módulos diferentes</Text>
                  <Text style={styles.statValue}>{analysis.totalModulos}</Text>
                </View>
              </View>
              <View style={styles.statsRow}>
                <View style={styles.statItem}>
                  <Text style={styles.statLabel}>Tiempo real invertido</Text>
                  <Text style={styles.statValue}>{formatDurationLong(analysis.tiempoTotalReal)}</Text>
                </View>
                <View style={styles.statItem}>
                  <Text style={styles.statLabel}>Promedio por operario</Text>
                  <Text style={styles.statValue}>{formatHM(analysis.tiempoPromedioPorOperario)}</Text>
                </View>
              </View>
            </View>

            {/* Desglose por Pedidos */}
            <View style={styles.sectionCard}>
              <View style={styles.sectionHeader}>
                <Ionicons name="document-text" size={20} color="#ef4444" />
                <Text style={styles.sectionTitle}>Desglose por Pedidos ({analysis.totalPedidos})</Text>
              </View>
              {analysis.pedidosDetalle.map((ped, idx) => (
                <View key={idx} style={styles.detailRow}>
                  <View style={styles.detailLeft}>
                    <Text style={styles.detailName}>{ped.nombre}</Text>
                    <Text style={styles.detailSubtext}>
                      {ped.operarios} operario{ped.operarios !== 1 ? 's' : ''} · {ped.modulos} módulo{ped.modulos !== 1 ? 's' : ''} · {ped.registros} reg.
                    </Text>
                  </View>
                  <View style={styles.detailRight}>
                    <Text style={styles.detailTime}>{formatHM(ped.tiempoValido)}</Text>
                    <View style={styles.progressBarContainer}>
                      <View style={[styles.progressBar, { width: `${ped.porcentaje}%`, backgroundColor: '#ef4444' }]} />
                    </View>
                    <Text style={styles.detailPercentage}>{ped.porcentaje.toFixed(1)}%</Text>
                  </View>
                </View>
              ))}
            </View>

            {/* Desglose por Operarios */}
            <View style={styles.sectionCard}>
              <View style={styles.sectionHeader}>
                <Ionicons name="people" size={20} color="#10b981" />
                <Text style={styles.sectionTitle}>Desglose por Operarios ({analysis.totalOperarios})</Text>
              </View>
              {analysis.operariosDetalle.map((op, idx) => (
                <View key={idx} style={styles.detailRow}>
                  <View style={styles.detailLeft}>
                    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                      <Text style={styles.detailName}>{op.nombre}</Text>
                      {op.tieneAnomalias && (
                        <View style={styles.anomalyBadge}>
                          <Ionicons name="warning" size={12} color="#dc2626" />
                        </View>
                      )}
                    </View>
                    <Text style={styles.detailSubtext}>
                      {op.modulos} módulo{op.modulos !== 1 ? 's' : ''} · {op.pedidos} pedido{op.pedidos !== 1 ? 's' : ''} · {op.registros} reg.
                    </Text>
                  </View>
                  <View style={styles.detailRight}>
                    <Text style={styles.detailTime}>{formatHM(op.tiempoValido)}</Text>
                    <View style={styles.progressBarContainer}>
                      <View style={[styles.progressBar, { width: `${op.porcentaje}%`, backgroundColor: '#10b981' }]} />
                    </View>
                    <Text style={styles.detailPercentage}>{op.porcentaje.toFixed(1)}%</Text>
                  </View>
                </View>
              ))}
            </View>

            {/* Resumen Final */}
            <View style={styles.summaryFinalCard}>
              <Ionicons name="checkmark-circle" size={24} color="#10b981" />
              <Text style={styles.summaryFinalText}>
                Análisis completado: {analysis.totalRegistros} registros procesados con {analysis.eficienciaPromedio.toFixed(1)}% de eficiencia
              </Text>
            </View>
          </View>
        )}
      />
    );
  };

  // ✅ Renderizar análisis detallado de operario
  const renderOperarioAnalysis = (analysis: OperarioAnalysis) => {
    return (
      <FlatList
        data={[analysis]}
        keyExtractor={() => 'analysis'}
        contentContainerStyle={{ paddingBottom: 24 }}
        showsVerticalScrollIndicator={true}
        nestedScrollEnabled={true}
        renderItem={() => (
          <View style={styles.analysisContainer}>
            {/* Header del Operario */}
            <View style={styles.analysisHeaderCard}>
              <View style={styles.analysisHeaderTitle}>
                <Ionicons name="person" size={32} color="#10b981" />
                <View style={{ flex: 1, marginLeft: 12 }}>
                  <Text style={styles.analysisMainTitle}>Análisis de Operario</Text>
                  <Text style={styles.analysisPedidoNumber}>{analysis.operario}</Text>
                </View>
              </View>
              <View style={styles.analysisDateRange}>
                <Ionicons name="calendar-outline" size={16} color="#6b7280" />
                <Text style={styles.analysisDateText}>
                  {analysis.fechaInicio} → {analysis.fechaFin} ({analysis.diasTrabajados} día{analysis.diasTrabajados !== 1 ? 's' : ''})
                </Text>
              </View>
            </View>

            {/* Métricas Principales */}
            <View style={styles.metricsGrid}>
              <View style={styles.metricCard}>
                <View style={styles.metricIconContainer}>
                  <Ionicons name="time" size={24} color="#3b82f6" />
                </View>
                <Text style={styles.analysisMetricValue}>{formatHM(analysis.tiempoTotalValido)}</Text>
                <Text style={styles.analysisMetricLabel}>Tiempo Válido</Text>
              </View>

              <View style={styles.metricCard}>
                <View style={[styles.metricIconContainer, { backgroundColor: '#dbeafe' }]}>
                  <Ionicons name="speedometer" size={24} color="#3b82f6" />
                </View>
                <Text style={styles.analysisMetricValue}>{analysis.eficienciaPromedio.toFixed(1)}%</Text>
                <Text style={styles.analysisMetricLabel}>Eficiencia</Text>
              </View>

              <View style={styles.metricCard}>
                <View style={[styles.metricIconContainer, { backgroundColor: '#fee2e2' }]}>
                  <Ionicons name="document-text" size={24} color="#ef4444" />
                </View>
                <Text style={styles.analysisMetricValue}>{analysis.totalPedidos}</Text>
                <Text style={styles.analysisMetricLabel}>Pedidos</Text>
              </View>

              <View style={styles.metricCard}>
                <View style={[styles.metricIconContainer, { backgroundColor: '#e0e7ff' }]}>
                  <Ionicons name="construct" size={24} color="#8b5cf6" />
                </View>
                <Text style={styles.analysisMetricValue}>{analysis.totalTareas}</Text>
                <Text style={styles.analysisMetricLabel}>Tareas</Text>
              </View>
            </View>

            {/* Alertas si hay anomalías */}
            {(analysis.tiempoFueraTurno > 0 || analysis.fichajesAbiertos > 0) && (
              <View style={styles.alertCard}>
                <View style={styles.alertHeader}>
                  <Ionicons name="warning" size={20} color="#dc2626" />
                  <Text style={styles.alertTitle}>Anomalías Detectadas</Text>
                </View>
                {analysis.tiempoFueraTurno > 0 && (
                  <Text style={styles.alertText}>
                    ⚠️ {formatHM(analysis.tiempoFueraTurno)} trabajado fuera de horario (descontado)
                  </Text>
                )}
                {analysis.fichajesAbiertos > 0 && (
                  <Text style={styles.alertText}>
                    🔴 {analysis.fichajesAbiertos} fichaje{analysis.fichajesAbiertos > 1 ? 's' : ''} abierto{analysis.fichajesAbiertos > 1 ? 's' : ''} (ajustado{analysis.fichajesAbiertos > 1 ? 's' : ''})
                  </Text>
                )}
              </View>
            )}

            {/* Estadísticas Generales */}
            <View style={styles.sectionCard}>
              <View style={styles.sectionHeader}>
                <Ionicons name="stats-chart" size={20} color={COLORS.primary} />
                <Text style={styles.sectionTitle}>Estadísticas Generales</Text>
              </View>
              <View style={styles.statsRow}>
                <View style={styles.statItem}>
                  <Text style={styles.statLabel}>Registros totales</Text>
                  <Text style={styles.statValue}>{analysis.totalRegistros}</Text>
                </View>
                <View style={styles.statItem}>
                  <Text style={styles.statLabel}>Módulos diferentes</Text>
                  <Text style={styles.statValue}>{analysis.totalModulos}</Text>
                </View>
              </View>
              <View style={styles.statsRow}>
                <View style={styles.statItem}>
                  <Text style={styles.statLabel}>Tiempo real invertido</Text>
                  <Text style={styles.statValue}>{formatDurationLong(analysis.tiempoTotalReal)}</Text>
                </View>
                <View style={styles.statItem}>
                  <Text style={styles.statLabel}>Promedio por pedido</Text>
                  <Text style={styles.statValue}>{formatHM(analysis.tiempoPromedioPorPedido)}</Text>
                </View>
              </View>
            </View>

            {/* Desglose por Pedidos */}
            <View style={styles.sectionCard}>
              <View style={styles.sectionHeader}>
                <Ionicons name="document-text" size={20} color="#ef4444" />
                <Text style={styles.sectionTitle}>Desglose por Pedidos ({analysis.totalPedidos})</Text>
              </View>
              {analysis.pedidosDetalle.map((ped, idx) => (
                <View key={idx} style={styles.detailRow}>
                  <View style={styles.detailLeft}>
                    <Text style={styles.detailName}>{ped.nombre}</Text>
                    <Text style={styles.detailSubtext}>
                      {ped.modulos} módulo{ped.modulos !== 1 ? 's' : ''} · {ped.tareas} tarea{ped.tareas !== 1 ? 's' : ''} · {ped.registros} reg.
                    </Text>
                  </View>
                  <View style={styles.detailRight}>
                    <Text style={styles.detailTime}>{formatHM(ped.tiempoValido)}</Text>
                    <View style={styles.progressBarContainer}>
                      <View style={[styles.progressBar, { width: `${ped.porcentaje}%`, backgroundColor: '#ef4444' }]} />
                    </View>
                    <Text style={styles.detailPercentage}>{ped.porcentaje.toFixed(1)}%</Text>
                  </View>
                </View>
              ))}
            </View>

            {/* Desglose por Tareas */}
            <View style={styles.sectionCard}>
              <View style={styles.sectionHeader}>
                <Ionicons name="list" size={20} color="#8b5cf6" />
                <Text style={styles.sectionTitle}>Desglose por Tareas ({analysis.totalTareas})</Text>
              </View>
              {analysis.tareasDetalle.map((tarea, idx) => (
                <View key={idx} style={styles.detailRow}>
                  <View style={styles.detailLeft}>
                    <Text style={styles.detailName}>{tarea.codigo}</Text>
                    <Text style={styles.detailSubtext}>
                      {tarea.pedidos} pedido{tarea.pedidos !== 1 ? 's' : ''} · {tarea.modulos} módulo{tarea.modulos !== 1 ? 's' : ''} · {tarea.registros} reg.
                    </Text>
                  </View>
                  <View style={styles.detailRight}>
                    <Text style={styles.detailTime}>{formatHM(tarea.tiempoValido)}</Text>
                    <View style={styles.progressBarContainer}>
                      <View style={[styles.progressBar, { width: `${tarea.porcentaje}%`, backgroundColor: '#8b5cf6' }]} />
                    </View>
                    <Text style={styles.detailPercentage}>{tarea.porcentaje.toFixed(1)}%</Text>
                  </View>
                </View>
              ))}
            </View>

            {/* Resumen Final */}
            <View style={styles.summaryFinalCard}>
              <Ionicons name="checkmark-circle" size={24} color="#10b981" />
              <Text style={styles.summaryFinalText}>
                Análisis completado: {analysis.totalRegistros} registros procesados con {analysis.eficienciaPromedio.toFixed(1)}% de eficiencia
              </Text>
            </View>
          </View>
        )}
      />
    );
  };

  // ===================== Jerarquías =====================
  const createHierarchicalStructure = (records: TiempoRealRecord[]): Map<string, PedidoGroup> => {
    console.log(`[createHierarchicalStructure] 🏗️ Creando jerarquía con ${records.length} registros`);

    const pedidosMap = new Map<string, PedidoGroup>();

    for (const record of records) {
      const pedido = normalizePedidoKey(record.NumeroManual);
      const modulo = record.Modulo?.trim() || 'SIN_MODULO';
      const tarea = normalizeTareaKey(record.CodigoTarea);
      const operario = operarioFirstNameKey(record.OperarioNombre || record.CodigoOperario);
      // ✅ Usar tiempo ajustado (detecta fichajes abiertos)
      const tiempo = calculateAdjustedTime(record);
      const tiempoFuera = calculateOutsideWorkTime(record);
      const tiempoValido = Math.max(0, tiempo - tiempoFuera);
      const fecha = formatDateOnly(record.FechaInicio || record.Fecha);

      // Crear pedido si no existe
      if (!pedidosMap.has(pedido)) {
        pedidosMap.set(pedido, {
          pedido,
          modulos: new Map<string, ModuloGroup>(),
          totalTime: 0,
          totalValidTime: 0,
          totalOutsideTime: 0,
          operarios: new Set<string>(),
          fechas: new Set<string>()
        });
      }
      const pedidoGroup = pedidosMap.get(pedido)!;

      // Crear módulo si no existe
      if (!pedidoGroup.modulos.has(modulo)) {
        pedidoGroup.modulos.set(modulo, {
          modulo,
          tareas: new Map<string, HierarchicalRecord[]>(),
          totalTime: 0,
          totalValidTime: 0,
          totalOutsideTime: 0,
          operarios: new Set<string>(),
          fechas: new Set<string>()
        });
      }
      const moduloGroup = pedidoGroup.modulos.get(modulo)!;

      // Crear tarea si no existe
      if (!moduloGroup.tareas.has(tarea)) {
        moduloGroup.tareas.set(tarea, []);
      }
      const lista = moduloGroup.tareas.get(tarea)!;

      // Buscar o crear registro de operario
      let hr = lista.find(x => x.operario === operario);
      if (!hr) {
        hr = {
          pedido,
          modulo,
          tarea,
          operario,
          records: [],
          totalTime: 0,
          totalValidTime: 0,
          totalOutsideTime: 0,
          fechas: []
        };
        lista.push(hr);
      }

      // Añadir registro
      hr.records.push(record);
      hr.totalTime += tiempo;
      hr.totalValidTime += tiempoValido;
      hr.totalOutsideTime += tiempoFuera;
      if (!hr.fechas.includes(fecha)) hr.fechas.push(fecha);

      // Actualizar totales
      moduloGroup.totalTime += tiempo;
      moduloGroup.totalValidTime += tiempoValido;
      moduloGroup.totalOutsideTime += tiempoFuera;
      moduloGroup.operarios.add(operario);
      moduloGroup.fechas.add(fecha);

      pedidoGroup.totalTime += tiempo;
      pedidoGroup.totalValidTime += tiempoValido;
      pedidoGroup.totalOutsideTime += tiempoFuera;
      pedidoGroup.operarios.add(operario);
      pedidoGroup.fechas.add(fecha);
    }

    console.log(`[createHierarchicalStructure] ✅ Pedidos creados: ${pedidosMap.size}`);
    pedidosMap.forEach((p, key) => {
      console.log(`  📋 ${key}: ${p.modulos.size} módulos, ${formatHM(p.totalValidTime)} tiempo válido (${formatHM(p.totalOutsideTime)} fuera)`);
    });

    return pedidosMap;
  };

  const renderOperarioHierarchy = (records: TiempoRealRecord[]) => {
    console.log(`[renderOperarioHierarchy] 🎨 Renderizando ${records.length} registros`);

    if (records.length === 0) {
      return (
        <View style={styles.center}>
          <Text style={styles.emptyText}>No hay registros para mostrar</Text>
        </View>
      );
    }

    // ✅ Calcular totales globales
    const parseTime = (timeStr: string): number => {
      const parts = timeStr.trim().split(':');
      if (parts.length < 2) return 0;
      const h = parseInt(parts[0]);
      const m = parseInt(parts[1]);
      return isNaN(h) || isNaN(m) ? 0 : h * 60 + m;
    };

    let totalOutsideTimeGlobal = 0;
    let totalOpenShiftsGlobal = 0;
    let operariosConProblemasCount = 0;
    const operariosConProblemas = new Set<string>();

    for (const record of records) {
      const outsideTime = calculateOutsideWorkTime(record);
      if (outsideTime > 0) {
        totalOutsideTimeGlobal += outsideTime;
      }

      if (record.HoraInicio && record.HoraFin) {
        const inicioMin = parseTime(record.HoraInicio);
        const finMin = parseTime(record.HoraFin);
        if (inicioMin > 0 && finMin > 0 && finMin < inicioMin) {
          totalOpenShiftsGlobal++;
          const operario = operarioFirstNameKey(record.OperarioNombre || record.CodigoOperario);
          operariosConProblemas.add(operario);
        }
      }

      if (outsideTime > 0) {
        const operario = operarioFirstNameKey(record.OperarioNombre || record.CodigoOperario);
        operariosConProblemas.add(operario);
      }
    }

    operariosConProblemasCount = operariosConProblemas.size;

    const hierarchy = createHierarchicalStructure(records);
    const pedidos = Array.from(hierarchy.values()).sort((a, b) => a.pedido.localeCompare(b.pedido));

    console.log(`[renderOperarioHierarchy] 📊 Pedidos a renderizar: ${pedidos.length}`);
    console.log(`[renderOperarioHierarchy] ⚠️ Totales - Tiempo fuera: ${formatHM(totalOutsideTimeGlobal)}, Fichajes abiertos: ${totalOpenShiftsGlobal}, Operarios afectados: ${operariosConProblemasCount}`);

    return (
      <View style={{ flex: 1 }}>
        {/* ✅ Resumen de anomalías */}
        {(totalOutsideTimeGlobal > 0 || totalOpenShiftsGlobal > 0) && (
          <View style={styles.summaryContainer}>
            <View style={styles.summaryHeader}>
              <Ionicons name="alert-circle" size={20} color="#dc2626" />
              <Text style={styles.summaryTitle}>Resumen de Anomalías</Text>
            </View>
            <View style={styles.summaryContent}>
              {totalOutsideTimeGlobal > 0 && (
                <View style={styles.summaryItem}>
                  <Ionicons name="time-outline" size={16} color="#dc2626" />
                  <View style={{ flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap' }}>
                    <Text style={styles.summaryBold}>{formatHM(totalOutsideTimeGlobal)}</Text>
                    <Text style={styles.summaryText}> fuera de turno</Text>
                  </View>
                </View>
              )}
              {totalOpenShiftsGlobal > 0 && (
                <View style={styles.summaryItem}>
                  <Text style={styles.summaryEmoji}>🔴</Text>
                  <View style={{ flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap' }}>
                    <Text style={styles.summaryBold}>{totalOpenShiftsGlobal}</Text>
                    <Text style={styles.summaryText}> fichaje{totalOpenShiftsGlobal > 1 ? 's' : ''} abierto{totalOpenShiftsGlobal > 1 ? 's' : ''}</Text>
                  </View>
                </View>
              )}
              <View style={styles.summaryItem}>
                <Ionicons name="people-outline" size={16} color="#dc2626" />
                <View style={{ flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap' }}>
                  <Text style={styles.summaryBold}>{operariosConProblemasCount}</Text>
                  <Text style={styles.summaryText}> operario{operariosConProblemasCount > 1 ? 's' : ''} afectado{operariosConProblemasCount > 1 ? 's' : ''}</Text>
                </View>
              </View>
            </View>
          </View>
        )}
        <FlatList
          data={pedidos}
          keyExtractor={(p) => p.pedido}
          renderItem={({ item: pedido }) => (
            <View style={styles.hierarchyContainer}>
              <View style={styles.hierarchyHeader}>
                <View style={styles.hierarchyTitleRow}>
                  <Text style={styles.hierarchyTitle}>📋 Pedido: {pedido.pedido}</Text>
                  {pedido.totalOutsideTime > 0 && (
                    <View style={styles.outsideTimeBadge}>
                      <Ionicons name="warning" size={12} color="#dc2626" />
                      <Text style={styles.outsideTimeText}>{formatHM(pedido.totalOutsideTime)}</Text>
                    </View>
                  )}
                </View>
                <Text style={styles.hierarchySubtitle}>
                  Tiempo válido: {formatDurationLong(pedido.totalValidTime)} · Operarios: {pedido.operarios.size} · Fechas: {Array.from(pedido.fechas).sort().join(', ')}
                </Text>
              </View>

              {Array.from(pedido.modulos.values())
                .sort((a, b) => a.modulo.localeCompare(b.modulo))
                .map((mod) => (
                  <View key={mod.modulo} style={styles.moduloContainer}>
                    <View style={styles.moduloHeader}>
                      <View style={styles.moduloTitleRow}>
                        <Text style={styles.moduloTitle}>🔧 Módulo: {mod.modulo}</Text>
                        {mod.totalOutsideTime > 0 && (
                          <View style={styles.outsideTimeBadge}>
                            <Ionicons name="warning" size={10} color="#dc2626" />
                            <Text style={styles.outsideTimeText}>{formatHM(mod.totalOutsideTime)}</Text>
                          </View>
                        )}
                      </View>
                      <Text style={styles.moduloSubtitle}></Text>
                      <Text style={styles.moduloSubtitle}>
                        Tiempo válido: {formatDurationLong(mod.totalValidTime)} · Operarios: {mod.operarios.size}
                      </Text>
                    </View>
                    {Array.from(mod.tareas.entries())
                      .sort((a, b) => a[0].localeCompare(b[0]))
                      .map(([tareaKey, lista]) => (
                        <View key={tareaKey} style={styles.tareaContainer}>
                          <Text style={styles.tareaTitle}>⚙️ Tarea: {tareaKey}</Text>
                          {lista
                            .sort((a, b) => a.operario.localeCompare(b.operario))
                            .map((hr) => {
                              const outsideAnalysis = analyzeOperarioOutsideTime(hr.records);
                              return (
                                <View key={`${tareaKey}-${hr.operario}`} style={styles.operarioRecord}>
                                  <View style={styles.operarioHeader}>
                                    <Text style={styles.operarioTitle}>👤 {hr.operario}</Text>
                                    {outsideAnalysis.hasOutsideTime && (
                                      <View style={styles.outsideTimeBadge}>
                                        <Ionicons name="warning" size={14} color="#dc2626" />
                                        <Text style={styles.outsideTimeText}>
                                          {outsideAnalysis.hasOpenShift ? '🔴 ' : ''}
                                          {outsideAnalysis.totalOutsideTime > 0 ? formatHM(outsideAnalysis.totalOutsideTime) : ''}
                                          {outsideAnalysis.hasOpenShift && outsideAnalysis.totalOutsideTime > 0 ? ' + ' : ''}
                                          {outsideAnalysis.hasOpenShift ? `${outsideAnalysis.openShiftCount} abierto${outsideAnalysis.openShiftCount > 1 ? 's' : ''}` : ''}
                                        </Text>
                                      </View>
                                    )}
                                  </View>
                                  <Text style={styles.operarioStats}>
                                    Registros: {hr.records.length} · Tiempo válido: {formatDurationLong(hr.totalValidTime)} · Fechas: {hr.fechas.join(', ')}
                                  </Text>
                                  <View style={styles.recordsContainer}>
                                    {hr.records
                                      .sort((a, b) => recordTimestamp(a) - recordTimestamp(b))
                                      .map((r, idx) => {
                                        const outsideTime = calculateOutsideWorkTime(r);
                                        const hasOutside = outsideTime > 0;

                                        // ✅ Detectar fichaje abierto
                                        const parseTime = (timeStr: string): number => {
                                          const parts = timeStr.trim().split(':');
                                          if (parts.length < 2) return 0;
                                          const h = parseInt(parts[0]);
                                          const m = parseInt(parts[1]);
                                          return isNaN(h) || isNaN(m) ? 0 : h * 60 + m;
                                        };

                                        const inicioMin = r.HoraInicio ? parseTime(r.HoraInicio) : 0;
                                        const finMin = r.HoraFin ? parseTime(r.HoraFin) : 0;
                                        const fichajeAbierto = inicioMin > 0 && finMin > 0 && finMin < inicioMin;
                                        const tiempoAjustado = calculateAdjustedTime(r);

                                        return (
                                          <View
                                            key={idx}
                                            style={[
                                              styles.individualRecord,
                                              (hasOutside || fichajeAbierto) && styles.individualRecordOutside
                                            ]}
                                          >
                                            <View style={styles.recordRow}>
                                              <Text style={styles.recordText}>
                                                📅 {formatDateOnly(r.FechaInicio || r.Fecha)} · 🕐 {r.HoraInicio || '-'} → {r.HoraFin || '-'} · ⏱ {formatDurationLong(tiempoAjustado)}
                                              </Text>
                                              {(hasOutside || fichajeAbierto) && (
                                                <View style={styles.outsideIndicator}>
                                                  <Ionicons name="alert-circle" size={16} color="#dc2626" />
                                                </View>
                                              )}
                                            </View>
                                            {fichajeAbierto && (
                                              <Text style={styles.outsideTimeDetail}>
                                                🔴 Fichaje quedó abierto - Tiempo ajustado de {formatDurationLong(r.TiempoDedicado)} a {formatDurationLong(tiempoAjustado)}
                                              </Text>
                                            )}
                                            {hasOutside && !fichajeAbierto && (
                                              <Text style={styles.outsideTimeDetail}>
                                                ⚠️ {formatDurationLong(outsideTime)} fuera del horario laboral (6:30-9:30, 10:00-14:30 / vie 13:30)
                                              </Text>
                                            )}
                                            {!!r.CodigoPuesto && <Text style={styles.recordMeta}>Puesto: {r.CodigoPuesto}</Text>}
                                          </View>
                                        );
                                      })}
                                  </View>
                                </View>
                              );
                            })}
                        </View>
                      ))}
                  </View>
                ))}
            </View>
          )}
        />
      </View>
    );
  };

  const renderPedidoHierarchy = (records: TiempoRealRecord[]) => {
    console.log(`[renderPedidoHierarchy] 🎨 Renderizando ${records.length} registros`);

    if (records.length === 0) {
      return (
        <View style={styles.center}>
          <Text style={styles.emptyText}>No hay registros para mostrar</Text>
        </View>
      );
    }

    const hierarchy = createHierarchicalStructure(records);
    const pedidos = Array.from(hierarchy.values()).sort((a, b) => a.pedido.localeCompare(b.pedido));

    return (
      <FlatList
        data={pedidos}
        keyExtractor={(p) => p.pedido}
        renderItem={({ item: pedido }) => (
          <View style={styles.hierarchyContainer}>
            <View style={styles.hierarchyHeader}>
              <View style={styles.hierarchyTitleRow}>
                <Text style={styles.hierarchyTitle}>📋 Pedido: {pedido.pedido}</Text>
                {pedido.totalOutsideTime > 0 && (
                  <View style={styles.outsideTimeBadge}>
                    <Ionicons name="warning" size={12} color="#dc2626" />
                    <Text style={styles.outsideTimeText}>{formatHM(pedido.totalOutsideTime)}</Text>
                  </View>
                )}
              </View>
              <Text style={styles.hierarchySubtitle}>
                Tiempo válido: {formatDurationLong(pedido.totalValidTime)} · Operarios: {pedido.operarios.size} · Módulos: {pedido.modulos.size}
              </Text>
            </View>

            {Array.from(pedido.modulos.values()).map((mod) => (
              <View key={mod.modulo} style={styles.moduloContainer}>
                <Text style={styles.moduloTitle}>🔧 {mod.modulo}</Text>
                {Array.from(mod.tareas.entries()).map(([tareaKey, lista]) => (
                  <View key={tareaKey} style={styles.tareaContainer}>
                    <Text style={styles.tareaTitle}>⚙️ Tarea: {tareaKey}</Text>
                    {lista.map((hr) => {
                      const outsideAnalysis = analyzeOperarioOutsideTime(hr.records);
                      return (
                        <View key={`${tareaKey}-${hr.operario}`} style={styles.operarioRecord}>
                          <View style={styles.operarioHeader}>
                            <Text style={styles.operarioTitle}>👤 {hr.operario}</Text>
                            {outsideAnalysis.hasOutsideTime && (
                              <View style={styles.outsideTimeBadge}>
                                <Ionicons name="warning" size={12} color="#dc2626" />
                                <Text style={styles.outsideTimeText}>
                                  {outsideAnalysis.hasOpenShift ? '🔴 ' : ''}
                                  {outsideAnalysis.totalOutsideTime > 0 ? formatHM(outsideAnalysis.totalOutsideTime) : ''}
                                  {outsideAnalysis.hasOpenShift && outsideAnalysis.totalOutsideTime > 0 ? ' + ' : ''}
                                  {outsideAnalysis.hasOpenShift ? `${outsideAnalysis.openShiftCount} abierto${outsideAnalysis.openShiftCount > 1 ? 's' : ''}` : ''}
                                </Text>
                              </View>
                            )}
                          </View>
                          <Text style={styles.operarioStats}>
                            Registros: {hr.records.length} · Tiempo válido: {formatDurationLong(hr.totalValidTime)}
                          </Text>
                        </View>
                      );
                    })}
                  </View>
                ))}
              </View>
            ))}
          </View>
        )}
      />
    );
  };

  const renderTareaHierarchy = (records: TiempoRealRecord[]) => {
    console.log(`[renderTareaHierarchy] 🎨 Renderizando ${records.length} registros`);

    if (records.length === 0) {
      return (
        <View style={styles.center}>
          <Text style={styles.emptyText}>No hay registros para mostrar</Text>
        </View>
      );
    }

    // Agrupar por tarea primero
    const tareaMap = new Map<string, Map<string, PedidoGroup>>();

    for (const r of records) {
      const tarea = normalizeTareaKey(r.CodigoTarea);

      if (!tareaMap.has(tarea)) {
        tareaMap.set(tarea, new Map<string, PedidoGroup>());
      }

      const pedMap = tareaMap.get(tarea)!;
      const partial = createHierarchicalStructure([r]);

      for (const [pedidoKey, pedGroup] of partial.entries()) {
        if (!pedMap.has(pedidoKey)) {
          pedMap.set(pedidoKey, {
            pedido: pedidoKey,
            modulos: new Map<string, ModuloGroup>(),
            totalTime: 0,
            totalValidTime: 0,
            totalOutsideTime: 0,
            operarios: new Set<string>(),
            fechas: new Set<string>()
          });
        }

        const target = pedMap.get(pedidoKey)!;
        target.totalTime += pedGroup.totalTime;
        target.totalValidTime += pedGroup.totalValidTime;
        target.totalOutsideTime += pedGroup.totalOutsideTime;
        pedGroup.operarios.forEach(o => target.operarios.add(o));
        pedGroup.fechas.forEach(f => target.fechas.add(f));

        for (const [modKey, modGroup] of pedGroup.modulos.entries()) {
          if (!target.modulos.has(modKey)) {
            target.modulos.set(modKey, {
              modulo: modKey,
              tareas: new Map<string, HierarchicalRecord[]>(),
              totalTime: 0,
              totalValidTime: 0,
              totalOutsideTime: 0,
              operarios: new Set<string>(),
              fechas: new Set<string>()
            });
          }

          const tgtMod = target.modulos.get(modKey)!;
          tgtMod.totalTime += modGroup.totalTime;
          tgtMod.totalValidTime += modGroup.totalValidTime;
          tgtMod.totalOutsideTime += modGroup.totalOutsideTime;
          modGroup.operarios.forEach(o => tgtMod.operarios.add(o));
          modGroup.fechas.forEach(f => tgtMod.fechas.add(f));

          for (const [tKey, hrs] of modGroup.tareas.entries()) {
            if (!tgtMod.tareas.has(tKey)) tgtMod.tareas.set(tKey, []);
            tgtMod.tareas.get(tKey)!.push(...hrs);
          }
        }
      }
    }

    const tareas = Array.from(tareaMap.entries()).sort((a, b) => a[0].localeCompare(b[0]));
    console.log(`[renderTareaHierarchy] 📊 Tareas a renderizar: ${tareas.length}`);

    return (
      <FlatList
        data={tareas}
        keyExtractor={([t]) => t}
        renderItem={({ item: [tareaKey, pedMap] }) => (
          <View style={styles.hierarchyContainer}>
            <View style={styles.hierarchyHeader}>
              <Text style={styles.hierarchyTitle}>⚙️ Tarea: {tareaKey}</Text>
            </View>
            {Array.from(pedMap.values()).map((pedido) => (
              <View key={pedido.pedido} style={styles.pedidoInTareaContainer}>
                <Text style={styles.pedidoInTareaTitle}>📋 {pedido.pedido}</Text>
                {Array.from(pedido.modulos.values()).map((mod) => (
                  <View key={mod.modulo} style={styles.moduloContainer}>
                    <Text style={styles.moduloTitle}>🔧 {mod.modulo}</Text>
                    {(mod.tareas.get(tareaKey) || []).map((hr, hrIndex) => {
                      const outsideAnalysis = analyzeOperarioOutsideTime(hr.records);
                      return (
                        <View key={`${pedido.pedido}-${mod.modulo}-${tareaKey}-${hr.operario}-${hrIndex}`} style={styles.operarioRecord}>
                          <View style={styles.operarioHeader}>
                            <Text style={styles.operarioTitle}>👤 {hr.operario}</Text>
                            {outsideAnalysis.hasOutsideTime && (
                              <View style={styles.outsideTimeBadge}>
                                <Ionicons name="warning" size={12} color="#dc2626" />
                                <Text style={styles.outsideTimeText}>
                                  {outsideAnalysis.hasOpenShift ? '🔴 ' : ''}
                                  {outsideAnalysis.totalOutsideTime > 0 ? formatHM(outsideAnalysis.totalOutsideTime) : ''}
                                  {outsideAnalysis.hasOpenShift && outsideAnalysis.totalOutsideTime > 0 ? ' + ' : ''}
                                  {outsideAnalysis.hasOpenShift ? `${outsideAnalysis.openShiftCount} abierto${outsideAnalysis.openShiftCount > 1 ? 's' : ''}` : ''}
                                </Text>
                              </View>
                            )}
                          </View>
                          <Text style={styles.operarioStats}>
                            Registros: {hr.records.length} · Tiempo válido: {formatDurationLong(hr.totalValidTime)}
                          </Text>
                        </View>
                      );
                    })}
                  </View>
                ))}
              </View>
            ))}
          </View>
        )}
      />
    );
  };

  // ===================== Render principal =====================
  if (authLoading || loadingTiempo) {
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
        count={tiempoRecords.length}
        userNameProp={userData?.nombre || userData?.name || '—'}
        roleProp={userData?.rol || userData?.role || '—'}
        serverReachableOverride={!!authenticated}
        onRefresh={() => fetchTiempoReal(formatDateUTC(fromDate), formatDateUTC(toDate))}
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
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <Text style={[styles.dateLabel, { marginRight: 8 }]}>Desde</Text>
              <input
                type="date"
                style={{
                  padding: 12,
                  borderRadius: 8,
                  border: `1px solid ${COLORS.border}`,
                  backgroundColor: COLORS.background,
                  color: COLORS.text,
                  fontSize: 16,
                  fontFamily: 'inherit',
                  width: 'auto',
                }}
                value={formatDateUTC(fromDate)}
                onChange={(e) => {
                  const v = e.target.value;
                  if (v) {
                    console.log('[FECHA-DEBUG] 💻 DatePicker Web DESDE - Usuario seleccionó:', v);
                    // ✅ Crear fecha en hora local evitando conversión timezone
                    const [year, month, day] = v.split('-').map(Number);
                    console.log('[FECHA-DEBUG] 💻 DatePicker Web DESDE - Parseado:', { year, month, day });
                    const newDate = new Date(year, month - 1, day, 12, 0, 0); // Usar mediodía para evitar cambios de día
                    console.log('[FECHA-DEBUG] 💻 DatePicker Web DESDE - Fecha creada:', {
                      newDate: newDate.toISOString(),
                      newDateLocal: newDate.toString(),
                      formatDateUTC: formatDateUTC(newDate)
                    });
                    setFromDate(newDate);
                  }
                }}
              />
            </View>
            <View style={{ width: 16 }} />
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <Text style={[styles.dateLabel, { marginRight: 8 }]}>Hasta</Text>
              <input
                type="date"
                style={{
                  padding: 12,
                  borderRadius: 8,
                  border: `1px solid ${COLORS.border}`,
                  backgroundColor: COLORS.background,
                  color: COLORS.text,
                  fontSize: 16,
                  fontFamily: 'inherit',
                  width: 'auto',
                }}
                value={formatDateUTC(toDate)}
                onChange={(e) => {
                  const v = e.target.value;
                  if (v) {
                    console.log('[FECHA-DEBUG] 💻 DatePicker Web HASTA - Usuario seleccionó:', v);
                    // ✅ Crear fecha en hora local evitando conversión timezone
                    const [year, month, day] = v.split('-').map(Number);
                    console.log('[FECHA-DEBUG] 💻 DatePicker Web HASTA - Parseado:', { year, month, day });
                    const newDate = new Date(year, month - 1, day, 12, 0, 0); // Usar mediodía para evitar cambios de día
                    console.log('[FECHA-DEBUG] 💻 DatePicker Web HASTA - Fecha creada:', {
                      newDate: newDate.toISOString(),
                      newDateLocal: newDate.toString(),
                      formatDateUTC: formatDateUTC(newDate)
                    });
                    setToDate(newDate);
                  }
                }}
              />
            </View>
          </>
        ) : (
          <>
            <TouchableOpacity style={{ flex: 1 }} onPress={() => setShowFromPicker(true)}>
              <Text style={styles.dateLabel}>Desde</Text>
              <View style={styles.dateInput}><Text style={{ color: COLORS.text }}>{formatDateUTC(fromDate)}</Text></View>
            </TouchableOpacity>
            {showFromPicker && (
              <DateTimePicker
                value={fromDate}
                mode="date"
                display="calendar"
                onChange={(event, selectedDate) => {
                  setShowFromPicker(false);
                  if (selectedDate) {
                    console.log('[FECHA-DEBUG] 📱 DateTimePicker DESDE - Usuario seleccionó:', {
                      selectedDate: selectedDate.toISOString(),
                      selectedDateLocal: selectedDate.toString(),
                      getDate: selectedDate.getDate(),
                      getMonth: selectedDate.getMonth(),
                      getFullYear: selectedDate.getFullYear()
                    });
                    // ✅ SOLUCIÓN: Extraer los componentes de fecha LOCALES que el usuario VE
                    // y crear una nueva fecha con esos valores explícitos
                    const year = selectedDate.getFullYear();
                    const month = selectedDate.getMonth();
                    const day = selectedDate.getDate();
                    const normalized = new Date(year, month, day, 12, 0, 0, 0);
                    console.log('[FECHA-DEBUG] 📱 DateTimePicker DESDE - Después de normalizar:', {
                      extracted: { year, month, day },
                      normalized: normalized.toISOString(),
                      normalizedLocal: normalized.toString(),
                      formatDateUTC: formatDateUTC(normalized)
                    });
                    setFromDate(normalized);
                  }
                }}
              />
            )}
            <TouchableOpacity style={{ flex: 1 }} onPress={() => setShowToPicker(true)}>
              <Text style={styles.dateLabel}>Hasta</Text>
              <View style={styles.dateInput}><Text style={{ color: COLORS.text }}>{formatDateUTC(toDate)}</Text></View>
            </TouchableOpacity>
            {showToPicker && (
              <DateTimePicker
                value={toDate}
                mode="date"
                display="calendar"
                onChange={(event, selectedDate) => {
                  setShowToPicker(false);
                  if (selectedDate) {
                    console.log('[FECHA-DEBUG] 📱 DateTimePicker HASTA - Usuario seleccionó:', {
                      selectedDate: selectedDate.toISOString(),
                      selectedDateLocal: selectedDate.toString(),
                      getDate: selectedDate.getDate(),
                      getMonth: selectedDate.getMonth(),
                      getFullYear: selectedDate.getFullYear()
                    });
                    // ✅ SOLUCIÓN: Extraer los componentes de fecha LOCALES que el usuario VE
                    // y crear una nueva fecha con esos valores explícitos
                    const year = selectedDate.getFullYear();
                    const month = selectedDate.getMonth();
                    const day = selectedDate.getDate();
                    const normalized = new Date(year, month, day, 12, 0, 0, 0);
                    console.log('[FECHA-DEBUG] 📱 DateTimePicker HASTA - Después de normalizar:', {
                      extracted: { year, month, day },
                      normalized: normalized.toISOString(),
                      normalizedLocal: normalized.toString(),
                      formatDateUTC: formatDateUTC(normalized)
                    });
                    setToDate(normalized);
                  }
                }}
              />
            )}
          </>
        )}
        <TouchableOpacity
          style={[
            styles.refreshButton,
            Platform.OS === 'web' && {
              borderWidth: 1,
              borderColor: COLORS.primary,
              backgroundColor: COLORS.surface,
              shadowColor: '#000',
              shadowOffset: { width: 0, height: 2 },
              shadowOpacity: 0.15,
              shadowRadius: 4,
            }
          ]}
          onPress={() => {
            console.log('[FECHA-DEBUG] 🔄 Botón REFRESH presionado');
            console.log('[FECHA-DEBUG] 🔄 Fechas actuales en estado:', {
              fromDate: fromDate.toISOString(),
              fromDateLocal: fromDate.toString(),
              toDate: toDate.toISOString(),
              toDateLocal: toDate.toString()
            });
            const formattedFrom = formatDateLocal(fromDate);
            const formattedTo = formatDateLocal(toDate);
            console.log('[FECHA-DEBUG] 🔄 Fechas formateadas a enviar:', { formattedFrom, formattedTo });
            fetchTiempoReal(formattedFrom, formattedTo);
          }}
        >
          <Ionicons name="refresh-outline" size={22} color={COLORS.primary} />
        </TouchableOpacity>
      </View>

      {/* Búsqueda */}
      <View style={styles.searchContainer}>
        <Ionicons name="search-outline" size={20} color="#757575" />
        <TextInput
          style={styles.searchInput}
          placeholder="Buscar operario / pedido / tarea / módulo"
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
      </View>

      {/* Filtros */}
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

      {/* Lista */}
      <FlatList
        data={filteredGroupedList}
        keyExtractor={(item) => item.key}
        style={styles.flatList}
        contentContainerStyle={{ paddingBottom: 24 }}
        renderItem={({ item }) => (
          <TouchableOpacity
            style={styles.card}
            onPress={() => {
              console.log(`[Card Click] 👆 Modo: ${filterMode}, Key: ${item.key}`);

              const all = tiempoRecords.filter((r) => {
                if (filterMode === 'operador') {
                  return operarioFirstNameKey(r.OperarioNombre || r.CodigoOperario) === item.key;
                }
                if (filterMode === 'tarea') {
                  return normalizeTareaKey(r.CodigoTarea) === item.key;
                }
                return normalizePedidoKey(r.NumeroManual) === item.key;
              });

              console.log(`[Card Click] 📊 Registros filtrados: ${all.length}`);

              // ✅ Mostrar análisis detallado según el modo
              if (filterMode === 'pedido') {
                const analysis = analyzePedidoDetailed(all);
                setPedidoAnalysisData(analysis);
                setPedidoAnalysisVisible(true);
              } else if (filterMode === 'tarea') {
                const analysis = analyzeTareaDetailed(all);
                setTareaAnalysisData(analysis);
                setTareaAnalysisVisible(true);
              } else if (filterMode === 'operador') {
                const analysis = analyzeOperarioDetailed(all);
                setOperarioAnalysisData(analysis);
                setOperarioAnalysisVisible(true);
              }
            }}
          >
            <View style={styles.cardHeader}>
              <View style={styles.cardTitleContainer}>
                <Text style={styles.cardTitle}>{item.key}</Text>
                {(item.totalOutsideTime > 0 || item.hasOpenShift) && (
                  <View style={styles.cardOutsideBadge}>
                    <Ionicons name="warning" size={14} color="#dc2626" />
                  </View>
                )}
              </View>
              <View style={styles.cardStats}>
                <Text style={styles.cardTime}>{formatHM(item.totalValidTime)}</Text>
                <Text style={styles.cardCount}>{item.count} registros</Text>
              </View>
            </View>

            {(item.totalOutsideTime > 0 || item.hasOpenShift) && (
              <View style={styles.cardOutsideWarning}>
                <Ionicons name="alert-circle" size={14} color="#dc2626" />
                <Text style={styles.cardOutsideText}>
                  {item.hasOpenShift && '🔴 Fichaje abierto detectado'}
                  {item.hasOpenShift && item.totalOutsideTime > 0 && ' · '}
                  {item.totalOutsideTime > 0 && `${formatHM(item.totalOutsideTime)} fuera de turno`}
                  {(item.hasOpenShift || item.totalOutsideTime > 0) && ' (descontado del total)'}
                </Text>
              </View>
            )}

            <View style={styles.cardMetrics}>
              <View style={styles.metricItem}>
                <Text style={styles.metricLabel}>Fechas</Text>
                <Text style={styles.metricValue}>{item.minFecha} — {item.maxFecha}</Text>
              </View>
              <View style={styles.metricItem}>
                <Text style={styles.metricLabel}>
                  {filterMode !== 'pedido' ? 'Pedido(s)' : 'Tarea(s)'}
                </Text>
                <Text style={styles.metricValue}>
                  {filterMode !== 'pedido'
                    ? new Set(item.items.map((r: TiempoRealRecord) => normalizePedidoKey(r.NumeroManual))).size
                    : new Set(item.items.map((r: TiempoRealRecord) => normalizeTareaKey(r.CodigoTarea))).size}
                </Text>
              </View>
              <View style={styles.metricItem}>
                <Text style={styles.metricLabel}>
                  {filterMode === 'operador' ? 'Tarea(s)' : 'Operario(s)'}
                </Text>
                <Text style={styles.metricValue}>
                  {filterMode === 'operador'
                    ? new Set(item.items.map((r: TiempoRealRecord) => normalizeTareaKey(r.CodigoTarea))).size
                    : new Set(item.items.map((r: TiempoRealRecord) => operarioFirstNameKey(r.OperarioNombre || r.CodigoOperario))).size}
                </Text>
              </View>
            </View>

            <View style={styles.statsButton}>
              <Text style={styles.statsButtonText}>Ver detalle</Text>
              <Ionicons name="stats-chart-outline" size={16} color={COLORS.primary} />
            </View>
          </TouchableOpacity>
        )}
      />

      {/* ✅ Modal de Análisis de Pedido */}
      <Modal
        visible={pedidoAnalysisVisible}
        animationType="slide"
        onRequestClose={() => setPedidoAnalysisVisible(false)}
      >
        <SafeAreaView style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Análisis Detallado de Pedido</Text>
            <TouchableOpacity onPress={() => setPedidoAnalysisVisible(false)} style={styles.closeButton}>
              <Ionicons name="close" size={24} color={COLORS.primary} />
            </TouchableOpacity>
          </View>

          {pedidoAnalysisData && renderPedidoAnalysis(pedidoAnalysisData)}
        </SafeAreaView>
      </Modal>

      {/* ✅ Modal de Análisis de Tarea */}
      <Modal
        visible={tareaAnalysisVisible}
        animationType="slide"
        onRequestClose={() => setTareaAnalysisVisible(false)}
      >
        <SafeAreaView style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Análisis Detallado de Tarea</Text>
            <TouchableOpacity onPress={() => setTareaAnalysisVisible(false)} style={styles.closeButton}>
              <Ionicons name="close" size={24} color={COLORS.primary} />
            </TouchableOpacity>
          </View>

          {tareaAnalysisData && renderTareaAnalysis(tareaAnalysisData)}
        </SafeAreaView>
      </Modal>

      {/* ✅ Modal de Análisis de Operario */}
      <Modal
        visible={operarioAnalysisVisible}
        animationType="slide"
        onRequestClose={() => setOperarioAnalysisVisible(false)}
      >
        <SafeAreaView style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Análisis Detallado de Operario</Text>
            <TouchableOpacity onPress={() => setOperarioAnalysisVisible(false)} style={styles.closeButton}>
              <Ionicons name="close" size={24} color={COLORS.primary} />
            </TouchableOpacity>
          </View>

          {operarioAnalysisData && renderOperarioAnalysis(operarioAnalysisData)}
        </SafeAreaView>
      </Modal>

      {/* SQL Debug (opcional) */}
      {sqlVisible && <SQLModal visible={sqlVisible} onClose={() => setSqlVisible(false)} />}
    </SafeAreaView>
  );
}

// ===================== Estilos =====================
// Basados en tu archivo adjunto (mismos tokens y look&feel) + clases nuevas para jerarquías
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
  emptyText: {
    color: COLORS.textSecondary, fontSize: 14, textAlign: 'center', marginTop: 20,
  },

  // Fecha / filtros
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
    color: COLORS.text, // Asegura contraste en modo claro/oscuro
  },
  refreshButton: {
    padding: 8, borderRadius: 8, backgroundColor: COLORS.surface, elevation: 2,
  },

  // Búsqueda
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

  // Botones filtro
  filterContainer: {
    flexDirection: 'row', paddingHorizontal: 12, paddingVertical: 8, justifyContent: 'space-between', gap: 8,
  },
  filterButton: {
    flex: 1, paddingHorizontal: 16, paddingVertical: 10, borderRadius: 20,
    backgroundColor: '#f5f5f5', borderWidth: 1, borderColor: '#ddd',
  },
  filterButtonActive: {
    backgroundColor: COLORS.primary, borderColor: COLORS.primary,
  },
  filterText: {
    fontSize: 13, fontWeight: '600', color: '#666', textAlign: 'center',
  },
  filterTextActive: { color: '#fff' },

  // Lista / tarjeta
  flatList: { flex: 1, paddingHorizontal: 12 },
  card: {
    backgroundColor: '#fff', marginVertical: 6, padding: 16, borderRadius: 12,
    elevation: 3, shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1, shadowRadius: 4,
  },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 },
  cardTitle: { fontSize: 18, fontWeight: 'bold', color: COLORS.primary, flex: 1, marginRight: 8 },
  cardStats: { alignItems: 'flex-end' },
  cardTime: { fontSize: 16, fontWeight: 'bold', color: '#2d3748' },
  cardCount: { fontSize: 12, color: '#718096', marginTop: 2 },
  cardMetrics: {
    flexDirection: 'row', justifyContent: 'space-between', marginBottom: 12, paddingTop: 12,
    borderTopWidth: 1, borderTopColor: '#f0f0f0',
  },
  metricItem: { alignItems: 'center', flex: 1 },
  metricLabel: { fontSize: 11, color: '#718096', fontWeight: '600', marginBottom: 2 },
  metricValue: { fontSize: 14, fontWeight: 'bold', color: '#2d3748' },
  statsButton: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    paddingVertical: 8, borderTopWidth: 1, borderTopColor: '#f0f0f0', marginTop: 8,
  },
  statsButtonText: { color: COLORS.primary, fontWeight: '600', marginRight: 4 },

  // Modal genérico
  modalContainer: { flex: 1, backgroundColor: COLORS.background },
  modalHeader: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0', backgroundColor: COLORS.surface,
  },
  modalTitle: { fontSize: 18, fontWeight: 'bold', color: COLORS.primary },
  closeButton: { padding: 8 },

  // Jerarquías
  hierarchyContainer: {
    backgroundColor: '#fff', margin: 12, borderRadius: 12, padding: 12,
    elevation: 2, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 3, shadowOffset: { width: 0, height: 1 },
  },
  hierarchyHeader: { borderBottomWidth: 1, borderBottomColor: '#f0f0f0', paddingBottom: 8, marginBottom: 8 },
  hierarchyTitle: { fontSize: 16, fontWeight: 'bold', color: '#2d3748' },
  hierarchySubtitle: { fontSize: 12, color: '#4a5568', marginTop: 2 },

  moduloContainer: { backgroundColor: '#f8f9fa', borderRadius: 8, padding: 10, marginTop: 8 },
  moduloHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  moduloTitle: { fontWeight: '700', color: COLORS.primary },
  moduloSubtitle: { color: '#4a5568' },

  tareaContainer: { marginTop: 8, backgroundColor: '#ffffff', borderRadius: 8, padding: 10, borderWidth: 1, borderColor: '#eef2f7' },
  tareaTitle: { fontWeight: '700', color: '#1f2937', marginBottom: 6 },

  operarioRecord: { paddingVertical: 8, borderTopWidth: 1, borderTopColor: '#f0f0f0' },
  operarioHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 },
  operarioTitle: { fontWeight: '700', color: '#374151', flex: 1 },
  operarioStats: { color: '#4b5563', marginTop: 2 },

  // Estilos para indicador de tiempo fuera de turno
  outsideTimeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fee2e2',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 4,
  },
  outsideTimeText: {
    color: '#dc2626',
    fontSize: 11,
    fontWeight: '600',
  },

  recordsContainer: { marginTop: 6, backgroundColor: '#f9fafb', borderRadius: 6, padding: 8 },
  individualRecord: { paddingVertical: 6, borderBottomWidth: 1, borderBottomColor: '#e5e7eb' },
  individualRecordOutside: {
    backgroundColor: '#fef2f2',
    borderLeftWidth: 3,
    borderLeftColor: '#dc2626',
    paddingLeft: 8,
    marginLeft: -8,
    marginRight: -8,
    paddingRight: 8,
  },
  recordRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  recordText: { color: '#111827', flex: 1 },
  recordMeta: { color: '#6b7280', marginTop: 2 },
  outsideIndicator: {
    marginLeft: 8,
  },
  outsideTimeDetail: {
    color: '#dc2626',
    fontSize: 11,
    marginTop: 4,
    fontStyle: 'italic',
  },

  pedidoInTareaContainer: { backgroundColor: '#fff', borderRadius: 8, padding: 10, marginTop: 8, borderWidth: 1, borderColor: '#eef2f7' },
  pedidoInTareaTitle: { fontWeight: '700', color: COLORS.primary, marginBottom: 6 },

  // Estilos para las tarjetas principales
  cardTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: 8,
  },
  cardOutsideBadge: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#fee2e2',
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 8,
  },
  cardOutsideWarning: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fef2f2',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    marginBottom: 12,
    gap: 6,
    borderLeftWidth: 3,
    borderLeftColor: '#dc2626',
  },
  cardOutsideText: {
    color: '#dc2626',
    fontSize: 12,
    fontWeight: '600',
    flex: 1,
  },

  // Estilos para las vistas jerárquicas
  hierarchyTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  moduloTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },

  // Estilos para el resumen de anomalías
  summaryContainer: {
    backgroundColor: '#fef2f2',
    marginHorizontal: 12,
    marginTop: 12,
    marginBottom: 8,
    padding: 16,
    borderRadius: 12,
    borderLeftWidth: 4,
    borderLeftColor: '#dc2626',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  summaryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    gap: 8,
  },
  summaryTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#dc2626',
  },
  summaryContent: {
    gap: 8,
  },
  summaryItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  summaryText: {
    fontSize: 14,
    color: '#991b1b',
  },
  summaryBold: {
    fontWeight: 'bold',
    color: '#dc2626',
  },
  summaryEmoji: {
    fontSize: 16,
  },

  // ✅ Estilos para análisis de pedido
  analysisContainer: {
    flex: 1,
    padding: 16,
    backgroundColor: '#f9fafb',
  },
  analysisHeaderCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  analysisHeaderTitle: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  analysisMainTitle: {
    fontSize: 14,
    color: '#6b7280',
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  analysisPedidoNumber: {
    fontSize: 24,
    fontWeight: 'bold',
    color: COLORS.primary,
    marginTop: 2,
  },
  analysisDateRange: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  analysisDateText: {
    fontSize: 14,
    color: '#6b7280',
  },
  metricsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 16,
  },
  metricCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    flex: 1,
    minWidth: '47%',
    alignItems: 'center',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 3,
  },
  metricIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#dbeafe',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  analysisMetricValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#111827',
    marginBottom: 4,
  },
  analysisMetricLabel: {
    fontSize: 12,
    color: '#6b7280',
    textAlign: 'center',
  },
  alertCard: {
    backgroundColor: '#fef2f2',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderLeftWidth: 4,
    borderLeftColor: '#dc2626',
  },
  alertHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  alertTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#dc2626',
  },
  alertText: {
    fontSize: 14,
    color: '#991b1b',
    marginBottom: 4,
  },
  sectionCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 3,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 16,
    paddingBottom: 12,
    borderBottomWidth: 2,
    borderBottomColor: '#f3f4f6',
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#111827',
  },
  statsRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 8,
  },
  statItem: {
    flex: 1,
  },
  statLabel: {
    fontSize: 12,
    color: '#6b7280',
    marginBottom: 4,
  },
  statValue: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  detailLeft: {
    flex: 1,
    marginRight: 16,
  },
  detailName: {
    fontSize: 15,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 4,
  },
  detailSubtext: {
    fontSize: 12,
    color: '#6b7280',
  },
  detailRight: {
    alignItems: 'flex-end',
    minWidth: 100,
  },
  detailTime: {
    fontSize: 16,
    fontWeight: 'bold',
    color: COLORS.primary,
    marginBottom: 6,
  },
  progressBarContainer: {
    width: '100%',
    height: 6,
    backgroundColor: '#e5e7eb',
    borderRadius: 3,
    overflow: 'hidden',
    marginBottom: 4,
  },
  progressBar: {
    height: '100%',
    backgroundColor: '#3b82f6',
    borderRadius: 3,
  },
  detailPercentage: {
    fontSize: 11,
    color: '#6b7280',
  },
  anomalyBadge: {
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: '#fee2e2',
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 6,
  },
  summaryFinalCard: {
    backgroundColor: '#f0fdf4',
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginTop: 8,
    borderLeftWidth: 4,
    borderLeftColor: '#10b981',
  },
  summaryFinalText: {
    flex: 1,
    fontSize: 14,
    color: '#065f46',
    fontWeight: '600',
  },
});
