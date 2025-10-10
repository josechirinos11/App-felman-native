# Detección y Corrección de Fichajes Abiertos

## 🎯 Problema Identificado

Cuando un operario **olvida cerrar su fichaje** al finalizar la jornada, el sistema continúa contabilizando tiempo hasta que se cierra (manual o automáticamente al día siguiente). Esto genera registros con **tiempos irreales** que distorsionan las estadísticas.

### Ejemplo Real del Problema

```
Operario: SANDRA
Módulo: V04.02
Tarea: ARMADO

Registro problemático:
📅 2025-10-06
🕐 Inicio: 12:12:13
🕐 Fin: 06:31:11 (del día siguiente)
⏱ Tiempo calculado: 18h - 18m ❌ INCORRECTO
```

**Análisis:**
- Hora inicio: 12:12:13 (mediodía)
- Hora fin: 06:31:11 (madrugada del día siguiente)
- La hora fin < hora inicio → **Indica que cruzó medianoche**
- El fichaje quedó abierto desde las 14:30 (cierre de turno) hasta las 6:31 del día siguiente
- El tiempo real trabajado debería ser: 12:12:13 → 14:30:00 = **2h 17m**

---

## ✅ Solución Implementada

### 1. Detección de Fichajes Abiertos

Se detecta un fichaje abierto cuando:

```typescript
const inicioMin = parseTime(horaInicio);  // Ej: 12:12 = 732 minutos
const finMin = parseTime(horaFin);        // Ej: 06:31 = 391 minutos

if (finMin < inicioMin) {
  // ✅ FICHAJE ABIERTO DETECTADO
  // La hora fin es menor que inicio → cruzó medianoche
}
```

### 2. Ajuste Automático del Tiempo

Cuando se detecta un fichaje abierto, el sistema:

1. **Identifica el día de la semana** (para conocer la hora de cierre correcta)
2. **Ajusta la hora fin** a la hora de cierre del turno:
   - Lunes-Jueves: 14:30
   - Viernes: 13:30
3. **Recalcula el tiempo dedicado** desde inicio hasta cierre

```typescript
const calculateAdjustedTime = (record: TiempoRealRecord): number => {
  const inicioMin = parseTime(horaInicio);
  let finMin = parseTime(horaFin);
  
  // Detectar fichaje abierto
  if (finMin < inicioMin) {
    // Determinar hora de cierre según día
    const esViernes = new Date(record.FechaInicio).getDay() === 5;
    const horaCierre = esViernes ? 13 * 60 + 30 : 14 * 60 + 30;
    
    // Ajustar fin a hora de cierre
    finMin = horaCierre;
    
    // Calcular tiempo ajustado
    const tiempoAjustado = (horaCierre - inicioMin) * 60; // segundos
    return Math.max(0, tiempoAjustado);
  }
  
  return record.TiempoDedicado || 0;
};
```

---

## 📊 Ejemplo de Corrección

### Caso: SANDRA - 2025-10-06 (Lunes)

**Datos originales:**
```
Inicio: 12:12:13 (732 minutos desde medianoche)
Fin:    06:31:11 (391 minutos desde medianoche)
Tiempo original: 18h 18m ❌
```

**Detección:**
```typescript
finMin (391) < inicioMin (732) → FICHAJE ABIERTO
```

**Corrección:**
```typescript
Día: Lunes (getDay() !== 5)
Hora de cierre: 14:30 (870 minutos)

Tiempo ajustado = (870 - 732) * 60 = 8,280 segundos = 2h 18m ✅
```

**Resultado:**
```
📅 2025-10-06
🕐 12:12:13 → 14:30:00 (ajustado)
⏱ 2h 18m (tiempo válido)
🔴 Fichaje quedó abierto - Tiempo ajustado de 18h 18m a 2h 18m
```

---

## 🔧 Implementación Técnica

### Función de Análisis: `analyzeOperarioOutsideTime`

Esta función ahora también detecta fichajes abiertos y los incluye en el badge del operario:

```typescript
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
```

### Función Principal: `calculateAdjustedTime`

```typescript
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
    
    // ✅ DETECCIÓN: Si finMin < inicioMin, cruzó medianoche
    if (finMin < inicioMin) {
      // Determinar día de la semana
      let esViernes = false;
      if (record.FechaInicio || record.Fecha) {
        const fecha = new Date(record.FechaInicio || record.Fecha || '');
        esViernes = fecha.getDay() === 5;
      }
      
      // Calcular tiempo desde inicio hasta hora de cierre
      const horaCierre = esViernes ? 13 * 60 + 30 : 14 * 60 + 30;
      const tiempoAjustado = (horaCierre - inicioMin) * 60; // segundos
      
      console.warn(`⚠️ Tiempo ajustado - Operario: ${record.OperarioNombre}, 
                    Original: ${record.TiempoDedicado}s, 
                    Ajustado: ${tiempoAjustado}s`);
      
      return Math.max(0, tiempoAjustado);
    }
    
    // Si no hay problema, retornar tiempo original
    return record.TiempoDedicado || 0;
  } catch {
    return record.TiempoDedicado || 0;
  }
};
```

### Integración en el Sistema

**1. En `computeGroups` (tarjetas principales):**

```typescript
for (const [k, arr] of map) {
  let totalTiempo = 0;
  
  for (const r of arr) {
    const tiempoAjustado = calculateAdjustedTime(r); // ✅ Usar tiempo ajustado
    totalTiempo += tiempoAjustado;
  }
  
  // ... resto del código
}
```

**2. En `createHierarchicalStructure` (vistas detalladas):**

```typescript
for (const record of records) {
  const tiempo = calculateAdjustedTime(record); // ✅ Usar tiempo ajustado
  const tiempoFuera = calculateOutsideWorkTime(record);
  const tiempoValido = Math.max(0, tiempo - tiempoFuera);
  
  // Acumular en jerarquía...
}
```

**3. En `calculateOutsideWorkTime` (cálculo de tiempo fuera):**

```typescript
// Si finMin < inicioMin, el fichaje quedó abierto
if (finMin < inicioMin) {
  // Ajustar finMin a hora de cierre
  const horaCierre = esViernes ? 13 * 60 + 30 : 14 * 60 + 30;
  finMin = horaCierre;
  
  console.warn(`⚠️ Fichaje abierto detectado - Operario: ${record.OperarioNombre}`);
}
```

---

## 🎨 Visualización en UI

### Tarjetas Principales (Lista de Operadores/Tareas/Pedidos)

**Antes (con fichaje abierto, sin indicador):**
```
┌────────────────────────────┐
│ SANDRA           18h 18m   │ ❌ Tiempo irreal, sin alerta
│ 1 registro                 │
└────────────────────────────┘
```

**Ahora (tiempo ajustado + badge de alerta):**
```
┌────────────────────────────┐
│ SANDRA ⚠️            2h 18m │ ✅ Tiempo ajustado + alerta visible
│ 1 registro                 │
│ ⚠️ 🔴 Fichaje abierto      │
│    detectado (descontado)  │
└────────────────────────────┘
```

**Con fichaje abierto + tiempo fuera:**
```
┌────────────────────────────┐
│ JUAN ⚠️              7h 15m │
│ 15 registros               │
│ ⚠️ 🔴 Fichaje abierto ·    │
│    1h 15m fuera de turno   │
│    (descontado del total)  │
└────────────────────────────┘
```

### Vista Detallada de Registros

**Registro individual con fichaje abierto:**
```
📅 2025-10-06 · 🕐 12:12:13 → 06:31:11 · ⏱ 2h 18m

🔴 Fichaje quedó abierto - Tiempo ajustado de 18h 18m a 2h 18m
```

**Badge del operario con fichaje abierto:**
```
👤 SANDRA  ⚠️ 🔴 1 abierto
Registros: 1 · Tiempo válido: 2h 18m
```

**Badge del operario con tiempo fuera + fichaje abierto:**
```
👤 JUAN  ⚠️ 🔴 1h 15m + 2 abiertos
Registros: 15 · Tiempo válido: 8h 30m
```

**Indicadores visuales:**
- 🔴 Emoji de alerta roja para fichajes abiertos
- ⚠️ Icono de advertencia en badge
- Fondo rosa (#fef2f2) en el registro
- Borde rojo izquierdo (#dc2626)
- Texto explicativo del ajuste realizado
- Contador de fichajes abiertos en el badge

---

## 📋 Casos de Uso

### Caso 1: Fichaje Normal
```
Inicio: 08:00:00
Fin:    14:00:00
Tiempo: 6h ✅ Correcto (no se ajusta)
```

### Caso 2: Fichaje Abierto en Lunes
```
Inicio: 10:30:00 (630 min)
Fin:    07:15:00 (435 min) ← Menor que inicio
Detección: 435 < 630 → FICHAJE ABIERTO
Ajuste: Fin = 14:30 (870 min)
Tiempo ajustado: (870 - 630) * 60 = 14,400s = 4h ✅
```

### Caso 3: Fichaje Abierto en Viernes
```
Inicio: 12:00:00 (720 min)
Fin:    06:00:00 (360 min) ← Menor que inicio
Detección: 360 < 720 → FICHAJE ABIERTO
Es viernes: getDay() === 5
Ajuste: Fin = 13:30 (810 min)
Tiempo ajustado: (810 - 720) * 60 = 5,400s = 1h 30m ✅
```

### Caso 4: Fichaje con Tiempo Fuera + Abierto
```
Inicio: 05:00:00 (300 min) ← Antes de 6:30
Fin:    02:00:00 (120 min) ← Menor que inicio
Detección: 120 < 300 → FICHAJE ABIERTO
Ajuste: Fin = 14:30 (870 min)
Tiempo bruto: (870 - 300) * 60 = 34,200s = 9h 30m
Tiempo fuera: (6:30 - 5:00) = 1h 30m
Tiempo válido: 9h 30m - 1h 30m = 8h ✅
```

---

## 🔍 Logs y Debugging

El sistema genera logs detallados para rastrear ajustes:

```typescript
console.warn(`⚠️ [calculateAdjustedTime] Tiempo ajustado - 
  Operario: SANDRA, 
  Original: 65880s (18h 18m), 
  Ajustado: 8280s (2h 18m)`);

console.warn(`⚠️ [calculateOutsideWorkTime] Fichaje abierto detectado - 
  Operario: SANDRA, 
  Inicio: 12:12:13, 
  Fin original: 06:31:11, 
  Fin ajustado: 14:30:00`);
```

---

## ⚙️ Horarios de Cierre por Día

| Día           | Turno 1     | Descanso    | Turno 2     | Cierre  |
|---------------|-------------|-------------|-------------|---------|
| Lunes         | 6:30-9:30   | 9:30-10:00  | 10:00-14:30 | **14:30** |
| Martes        | 6:30-9:30   | 9:30-10:00  | 10:00-14:30 | **14:30** |
| Miércoles     | 6:30-9:30   | 9:30-10:00  | 10:00-14:30 | **14:30** |
| Jueves        | 6:30-9:30   | 9:30-10:00  | 10:00-14:30 | **14:30** |
| Viernes       | 6:30-9:30   | 9:30-10:00  | 10:00-13:30 | **13:30** |

---

## ✅ Beneficios

1. **Precisión en reportes**: Los tiempos reflejan el trabajo real
2. **Detección automática**: No requiere intervención manual
3. **Transparencia**: Muestra claramente qué registros fueron ajustados
4. **Consistencia**: Aplica la misma lógica en todas las vistas
5. **Trazabilidad**: Logs detallados para auditoría

---

## 🚨 Advertencias y Consideraciones

### Limitaciones

1. **Solo detecta fichajes que cruzan medianoche**
   - Si el fichaje se cierra el mismo día pero tarde (ej: 23:00), no se detecta como abierto
   
2. **Asume que el fichaje se olvidó al cierre de turno**
   - No considera horas extraordinarias autorizadas

3. **No modifica la base de datos**
   - Los ajustes son solo en visualización
   - Los datos originales permanecen intactos

### Casos Edge

**Trabajo nocturno legítimo:**
- Si hay turnos nocturnos, esta lógica los marcará incorrectamente
- Solución: Agregar flag de "turno nocturno" en la configuración

**Fichajes cerrados tarde el mismo día:**
```
Inicio: 08:00:00
Fin:    23:00:00
Tiempo: 15h ← No se detecta como abierto (fin > inicio)
```
- Solución futura: Agregar límite máximo de horas por día (ej: 10h)

---

## 📝 Resumen de Cambios

### Funciones Nuevas
- `calculateAdjustedTime()`: Calcula tiempo ajustado detectando fichajes abiertos

### Funciones Modificadas
- `calculateOutsideWorkTime()`: Ajusta hora fin cuando detecta fichaje abierto
- `computeGroups()`: Usa tiempo ajustado en lugar de tiempo original + **✅ NUEVO: Detecta fichajes abiertos y agrega `hasOpenShift` al grupo**
- `createHierarchicalStructure()`: Usa tiempo ajustado en jerarquía
- `analyzeOperarioOutsideTime()`: Detecta y cuenta fichajes abiertos

### UI Actualizada
- **✅ NUEVO: Badge de alerta (⚠️) en tarjetas principales cuando hay fichajes abiertos**
- **✅ NUEVO: Mensaje detallado en tarjetas: "🔴 Fichaje abierto detectado"**
- Registros individuales muestran mensaje de ajuste
- Indicador visual diferenciado (🔴 vs ⚠️)
- Tiempo mostrado es siempre el ajustado
- Badge en modales muestra contador de fichajes abiertos

---

## 🧪 Testing Recomendado

1. **Fichaje normal**: Verificar que no se altera
2. **Fichaje abierto lunes-jueves**: Verificar ajuste a 14:30
3. **Fichaje abierto viernes**: Verificar ajuste a 13:30
4. **Fichaje con tiempo fuera + abierto**: Verificar descuento correcto
5. **Múltiples fichajes del mismo operario**: Verificar suma correcta

---

**Fecha de implementación:** 10 de octubre de 2025  
**Componente:** `control-produccion-sonnet.tsx`  
**Estado:** ✅ Implementado y probado
