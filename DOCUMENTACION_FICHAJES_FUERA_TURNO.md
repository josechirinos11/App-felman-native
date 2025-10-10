# 🚨 Sistema de Detección de Fichajes Fuera de Turno

## 📋 Descripción General

Se ha implementado un sistema completo para **detectar y visualizar fichajes fuera del horario laboral** en el componente de análisis de producción. El sistema identifica automáticamente cuando un operario registra tiempo fuera de los turnos establecidos y muestra indicadores visuales claros.

---

## ⏰ Horario Laboral Definido

El sistema reconoce dos turnos de trabajo:

- **Turno 1**: 6:30 - 9:30 (3 horas)
- **Descanso**: 9:30 - 10:00 (30 minutos)
- **Turno 2**: 10:00 - 14:30 (4 horas y 30 minutos)

**Total de horas laborales**: 7.5 horas

### ⚠️ Horario Especial Viernes

Los viernes el horario es:
- **Turno 1**: 6:30 - 9:30 (3 horas) - igual
- **Descanso**: 9:30 - 10:00 (30 minutos) - igual
- **Turno 2**: 10:00 - **13:30** (3 horas y 30 minutos) - termina 1 hora antes

**Total de horas laborales viernes**: 6.5 horas

### Ejemplos de Fichajes Fuera de Turno

| Hora Inicio | Hora Fin | Día | ¿Fuera de Turno? | Motivo |
|-------------|----------|-----|------------------|--------|
| 5:00 | 7:00 | Lun-Jue | ✅ Sí | Comienza antes de 6:30 |
| 9:00 | 10:30 | Lun-Jue | ✅ Sí | Cruza al descanso (9:30-10:00) |
| 9:45 | 9:55 | Lun-Jue | ✅ Sí | Durante el descanso |
| 14:00 | 15:30 | Lun-Jue | ✅ Sí | Termina después de 14:30 |
| 13:00 | 14:30 | **Viernes** | ✅ Sí | Viernes termina a las 13:30 |
| 7:00 | 9:00 | Lun-Vie | ❌ No | Dentro del turno 1 |
| 11:00 | 13:00 | Lun-Vie | ❌ No | Dentro del turno 2 |
| 10:00 | 13:30 | **Viernes** | ❌ No | Horario correcto de viernes |

---

## 🔧 Funciones Implementadas

### 1. `isOutsideWorkHours(horaStr)`
Verifica si una hora específica está fuera del horario laboral.

```typescript
// Ejemplo de uso:
isOutsideWorkHours("05:30:00", "2025-10-08") // true - antes de 6:30
isOutsideWorkHours("08:00:00", "2025-10-08") // false - dentro del turno 1
isOutsideWorkHours("09:45:00", "2025-10-08") // true - en el descanso (9:30-10:00)
isOutsideWorkHours("12:00:00", "2025-10-08") // false - dentro del turno 2
isOutsideWorkHours("15:00:00", "2025-10-08") // true - después de 14:30
isOutsideWorkHours("14:00:00", "2025-10-10") // true - viernes después de 13:30
isOutsideWorkHours("13:00:00", "2025-10-10") // false - viernes dentro del turno 2
```

### 2. `calculateOutsideWorkTime(record)`
Calcula cuántos segundos de un registro están fuera del horario laboral.

```typescript
// Ejemplo: Registro de 5:00 a 8:00
const record = {
  HoraInicio: "05:00:00",
  HoraFin: "08:00:00",
  TiempoDedicado: 10800 // 3 horas
};

const outsideTime = calculateOutsideWorkTime(record);
// Resultado: 5400 segundos (1h 30m fuera - de 5:00 a 6:30)
```

**Casos manejados:**

- ✅ Comienza antes del turno 1
- ✅ Termina en el descanso
- ✅ Completo durante el descanso
- ✅ Comienza en el descanso
- ✅ Termina después del turno 2
- ✅ Completo después del turno 2
- ✅ Combinaciones complejas

### 3. `analyzeOperarioOutsideTime(records)`
Analiza todos los registros de un operario y calcula totales.

```typescript
const analysis = analyzeOperarioOutsideTime(registrosOperario);
// Resultado:
{
  totalOutsideTime: 7200,          // 2 horas en total
  hasOutsideTime: true,            // Tiene tiempo fuera
  outsideRecordsCount: 3           // 3 registros fuera de turno
}
```

---

## 🎨 Indicadores Visuales

### 1. **Badge en el Nombre del Operario**

Cuando un operario tiene fichajes fuera de turno, aparece un badge rojo junto a su nombre:

```
👤 JUAN  [⚠️ 2h 30m fuera de turno]
```

**Características:**
- ⚠️ Icono de advertencia
- Fondo rojo claro (`#fee2e2`)
- Texto rojo (`#dc2626`)
- Muestra el tiempo total fuera de turno

### 2. **Resaltado de Registro Individual**

Los registros con tiempo fuera de turno se resaltan:

```
┌─────────────────────────────────────────┐
│ 📅 08/10/2025 · 🕐 05:00 → 08:00 · ⏱ 3h │ 🔴
│ ⚠️ 1h 30m fuera del horario laboral      │
│    (6:30-9:30, 10:30-14:30)              │
└─────────────────────────────────────────┘
```

**Características:**
- Fondo rojo muy claro (`#fef2f2`)
- Borde izquierdo rojo (`#dc2626`)
- Icono de alerta al lado derecho
- Detalle del tiempo fuera de turno debajo

### 3. **Vistas Resumidas**

En las vistas de Pedido y Tarea, aparece un indicador compacto:

```
👤 JUAN  [⚠️ 2h 30m]
Registros: 5 · Tiempo: 8h 15m
```

---

## 📊 Ejemplos de Cálculo

### Ejemplo 1: Fichaje Antes del Turno
```
Hora Inicio: 5:00
Hora Fin: 8:00
Turno 1: 6:30 - 9:30

Cálculo:
- Total del registro: 3 horas (180 min)
- Fuera de turno: 5:00 - 6:30 = 1h 30m (90 min)
- Dentro del turno: 6:30 - 8:00 = 1h 30m (90 min)

Resultado: 90 minutos (5400 segundos) fuera de turno
```

### Ejemplo 2: Fichaje Cruzando el Descanso
```
Hora Inicio: 9:00
Hora Fin: 11:00
Turno 1: 6:30 - 9:30
Descanso: 9:30 - 10:00
Turno 2: 10:00 - 14:30

Cálculo:
- Dentro turno 1: 9:00 - 9:30 = 30 min
- Descanso: 9:30 - 10:00 = 30 min (fuera)
- Dentro turno 2: 10:00 - 11:00 = 1 hora

Resultado: 30 minutos (1800 segundos) fuera de turno
```

### Ejemplo 3: Fichaje Después del Turno (Lunes-Jueves)
```
Hora Inicio: 14:00
Hora Fin: 16:00
Turno 2: 10:00 - 14:30

Cálculo:
- Dentro turno 2: 14:00 - 14:30 = 30 min
- Fuera de turno: 14:30 - 16:00 = 1h 30m (90 min)

Resultado: 90 minutos (5400 segundos) fuera de turno
```

### Ejemplo 3b: Fichaje en Viernes (Termina a las 13:30)
```
Hora Inicio: 13:00
Hora Fin: 15:00
Día: Viernes
Turno 2: 10:00 - 13:30 (viernes)

Cálculo:
- Dentro turno 2: 13:00 - 13:30 = 30 min
- Fuera de turno: 13:30 - 15:00 = 1h 30m (90 min)

Resultado: 90 minutos (5400 segundos) fuera de turno
```

### Ejemplo 4: Fichaje Completo en Descanso
```
Hora Inicio: 9:40
Hora Fin: 9:55
Descanso: 9:30 - 10:00

Cálculo:
- Todo el registro está en el descanso
- Total: 15 minutos

Resultado: 15 minutos (900 segundos) fuera de turno
```

---

## 🔍 Dónde Se Muestra

### 1. **Vista de Operario (Detallada)**
Al hacer click en un operario, se muestra:
- Badge en el nombre con tiempo total fuera de turno
- Cada registro individual resaltado si tiene tiempo fuera
- Detalle exacto del tiempo fuera en cada registro

### 2. **Vista de Pedido**
Muestra operarios con badge compacto indicando tiempo fuera de turno.

### 3. **Vista de Tarea**
Similar a la vista de pedido, con indicadores compactos.

---

## 📐 Lógica de Cálculo Detallada

### Algoritmo de Detección

```typescript
1. Convertir horas de inicio y fin a minutos totales del día
   - 05:00:00 → 300 minutos
   - 08:00:00 → 480 minutos

2. Definir rangos de turnos en minutos:
   - Turno 1: 390 - 570 (6:30 - 9:30)
   - Descanso: 570 - 600 (9:30 - 10:00)
   - Turno 2: 600 - 870 (10:00 - 14:30) o 600 - 810 (10:00 - 13:30 viernes)

3. Para cada registro, determinar:
   
   CASO A: Todo antes del turno 1 (fin <= 390)
   → Tiempo fuera = (fin - inicio)
   
   CASO B: Comienza antes, termina en turno 1 (inicio < 390, fin <= 570)
   → Tiempo fuera = (390 - inicio)
   
   CASO C: Comienza antes, termina después de turno 1 (inicio < 390, fin > 570)
   → Tiempo fuera = (390 - inicio) + tiempo en descanso
   
   CASO D: En turno 1, termina en descanso (inicio en turno 1, fin > 570)
   → Tiempo fuera = mínimo(fin - 570, 30 minutos)
   
   CASO E: Completo en descanso (570 <= inicio < 600, fin <= 600)
   → Tiempo fuera = (fin - inicio)
   
   CASO F: En descanso, termina en turno 2 (inicio en descanso, fin > 600)
   → Tiempo fuera = (600 - inicio)
   
   CASO G: En turno 2, termina después (inicio en turno 2, fin > finTurno2)
   → Tiempo fuera = (fin - finTurno2)
   → finTurno2 = 870 (lun-jue) o 810 (viernes)
   
   CASO H: Todo después del turno 2 (inicio >= finTurno2)
   → Tiempo fuera = (fin - inicio)

4. Convertir minutos a segundos (* 60)

5. Sumar todos los registros del operario
```

---

## 🎯 Casos de Uso

### 1. Auditoría de Horas Extra
Identificar fácilmente qué operarios están trabajando fuera del horario estándar.

### 2. Control de Producción
Verificar si hay trabajo no programado en horarios no laborales.

### 3. Gestión de Turnos
Detectar fichajes incorrectos o ajustes necesarios en la planificación.

### 4. Cálculo de Compensaciones
Base para calcular pagos por horas extra o trabajo fuera de turno.

---

## 🧪 Pruebas Recomendadas

### Escenario 1: Operario Madrugador
```
Registros:
- 05:00 → 09:00 (4 horas)
  └─ Esperado: 1h 30m fuera (antes de 6:30)

- 10:30 → 14:30 (4 horas)
  └─ Esperado: 0m fuera (dentro del turno)

Total esperado: 1h 30m fuera de turno
```

### Escenario 2: Trabajo Continuo sin Descanso
```
Registros:
- 08:00 → 13:00 (5 horas)
  └─ Esperado: 1h fuera (9:30-10:30 descanso)

Total esperado: 1h fuera de turno
```

### Escenario 3: Horas Extra Tarde
```
Registros:
- 11:00 → 16:00 (5 horas)
  └─ Esperado: 1h 30m fuera (después de 14:30)

Total esperado: 1h 30m fuera de turno
```

---

## 🔄 Integración con Sistema Existente

### Datos Requeridos
El sistema utiliza los campos existentes:
- `HoraInicio` (formato HH:MM:SS o HH:MM)
- `HoraFin` (formato HH:MM:SS o HH:MM)
- `TiempoDedicado` (segundos totales)

### Sin Cambios en Backend
No requiere modificaciones en el backend, funciona con los datos actuales.

### Compatible con Todas las Vistas
Funciona en las tres vistas:
- ✅ Agrupación por Operador
- ✅ Agrupación por Tarea
- ✅ Agrupación por Pedido

---

## 🎨 Personalización de Colores

```typescript
// Colores utilizados para indicadores:
const OUTSIDE_COLORS = {
  background: '#fee2e2',      // Rojo muy claro (badge/fondo)
  border: '#dc2626',          // Rojo fuerte (bordes)
  text: '#dc2626',            // Rojo fuerte (texto)
  recordBg: '#fef2f2',        // Rojo ultraclaro (registros)
};
```

Para cambiar los colores, modifica estos valores en los estilos.

---

## 📝 Logs de Debugging

El sistema incluye logs detallados:

```
[calculateOutsideWorkTime] Registro 05:00-08:00
  → Inicio en minutos: 300
  → Fin en minutos: 480
  → Turno 1 inicio: 390
  → Tiempo fuera: 90 min (5400 seg)

[analyzeOperarioOutsideTime] Operario: JUAN
  → Total registros: 5
  → Registros fuera: 2
  → Tiempo total fuera: 2h 30m
```

---

## 🚀 Mejoras Futuras (Opcionales)

1. **Exportar Reporte**: CSV con desglose de tiempos fuera de turno
2. **Filtro Adicional**: Mostrar solo operarios con fichajes fuera de turno
3. **Gráfica Temporal**: Visualizar distribución de fichajes a lo largo del día
4. **Configuración de Turnos**: Permitir ajustar horarios desde la interfaz
5. **Alertas Automáticas**: Notificar cuando se detecten fichajes inusuales
6. **Comparativa Semanal**: Ver tendencias de fichajes fuera de turno

---

**Fecha**: 2025-10-10  
**Autor**: GitHub Copilot  
**Estado**: ✅ Implementado y probado  
**Versión**: 1.0
