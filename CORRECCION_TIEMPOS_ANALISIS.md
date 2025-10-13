# Corrección de Tiempos en Análisis Detallado

## Problema Identificado

En el modal de **Análisis Detallado de Operario** (y otros modales similares) se detectaron dos inconsistencias:

### 1. Diferencia entre "Tiempo Real Invertido" y "Tiempo Válido"

**Ejemplo del problema:**
- Tiempo válido mostrado: **5h 56m**
- Tiempo real invertido mostrado: **8h 24m**
- Suma de desgloses (tareas/pedidos): **5h 56m** ✓

**Causa:**
- `tiempoTotalReal` se calculaba usando `calculateAdjustedTime()` que incluye todo el tiempo ajustado (incluyendo tiempo fuera de horario antes de descontarlo)
- `tiempoTotalValido` se calcula usando `calculateValidWorkTime()` que SOLO cuenta tiempo dentro de los turnos laborales
- Los desgloses (pedidos, módulos, tareas) usan `calculateValidWorkTime()` correctamente

**Diferencia entre las funciones:**

```typescript
// calculateAdjustedTime(): 
// - Ajusta fichajes abiertos (cruzan medianoche)
// - INCLUYE tiempo fuera de horario
// - Resultado: tiempo "bruto" ajustado

// calculateValidWorkTime():
// - Ajusta fichajes abiertos
// - SOLO cuenta tiempo DENTRO de turnos (6:30-9:30 y 10:00-14:30)
// - Resultado: tiempo "neto" válido
```

### 2. "Promedio por pedido" debería ser "Promedio por módulo" en análisis de Operario

En el contexto de un operario, es más relevante ver el tiempo promedio por módulo que por pedido.

## Solución Implementada

### 1. Cambiar "Tiempo Real Invertido" → "Tiempo Total Válido"

✅ **Modal de Operario**
```tsx
// ANTES:
<Text style={styles.statLabel}>Tiempo real invertido</Text>
<Text style={styles.statValue}>{formatDurationLong(analysis.tiempoTotalReal)}</Text>

// DESPUÉS:
<Text style={styles.statLabel}>Tiempo total válido</Text>
<Text style={styles.statValue}>{formatDurationLong(analysis.tiempoTotalValido)}</Text>
```

✅ **Modal de Pedido** - Igual cambio

✅ **Modal de Tarea** - Igual cambio

✅ **Modal de Serie** - Cambio a "Tiempo total válido" + "Tiempo promedio diario"

### 2. Cambiar "Promedio por pedido" → "Promedio por módulo" en Operario

✅ **Modal de Operario**
```tsx
// ANTES:
<Text style={styles.statLabel}>Promedio por pedido</Text>
<Text style={styles.statValue}>{formatHM(analysis.tiempoPromedioPorPedido)}</Text>

// DESPUÉS:
<Text style={styles.statLabel}>Promedio por módulo</Text>
<Text style={styles.statValue}>{formatHM(analysis.tiempoPromedioPorModulo)}</Text>
```

## Explicación de los Tiempos

### tiempoTotalReal (deprecated en UI)
- Suma de `calculateAdjustedTime()` para todos los registros
- Incluye fichajes ajustados
- Puede incluir tiempo fuera de horario
- **Ya NO se muestra en el UI**

### tiempoTotalValido ✓ (ahora principal)
- Suma de `calculateValidWorkTime()` para todos los registros
- Solo cuenta tiempo dentro de turnos laborales:
  - **Turno 1**: 6:30 - 9:30 (3 horas)
  - **Descanso**: 9:30 - 10:00 (30 minutos - NO cuenta)
  - **Turno 2**: 10:00 - 14:30 (4.5 horas) o 13:30 viernes (3.5 horas)
- Ajusta fichajes abiertos automáticamente
- **Es el valor que se muestra ahora en "Tiempo total válido"**

### tiempoFueraTurno
- Tiempo trabajado fuera de los turnos laborales
- Se descuenta del tiempo válido
- Se muestra en alertas si es > 0

### Desgloses (pedidos, módulos, tareas, operarios)
- Cada detalle usa `tiempoValido` calculado con `calculateValidWorkTime()`
- La suma de todos los `tiempoValido` de los desgloses **debe ser igual** a `tiempoTotalValido`
- Los porcentajes se calculan sobre `tiempoTotalReal` (esto está bien porque mantiene la proporción)

## Verificación

Para verificar que los tiempos son correctos:

1. **Tiempo total válido** en el header
2. **Suma de tiempos válidos** en desglose por tareas
3. **Suma de tiempos válidos** en desglose por pedidos
4. **Suma de tiempos válidos** en desglose por módulos

✅ Todos estos valores deberían **coincidir** ahora.

## Archivos Modificados

- `app/moncada/control-produccion-sonnet.tsx`:
  - `renderOperarioAnalysis()`: Cambiado a "Tiempo total válido" y "Promedio por módulo"
  - `renderPedidoAnalysis()`: Cambiado a "Tiempo total válido"
  - `renderTareaAnalysis()`: Cambiado a "Tiempo total válido"
  - `renderSerieAnalysis()`: Cambiado a "Tiempo total válido" y "Tiempo promedio diario"

## Notas Técnicas

- `tiempoTotalReal` sigue existiendo en las interfaces por compatibilidad
- Se usa para calcular `eficienciaPromedio = (tiempoTotalValido / tiempoTotalReal) * 100`
- Los porcentajes en desgloses usan `tiempoTotalReal` como denominador (correcto)
- Solo cambiamos lo que se **muestra** en el UI para evitar confusión

## Métricas Corregidas por Modal

### Operario
- ✅ Tiempo total válido (era: Tiempo real invertido)
- ✅ Promedio por módulo (era: Promedio por pedido)

### Pedido
- ✅ Tiempo total válido (era: Tiempo real invertido)
- ⚠️ Mantiene: Promedio por operario (correcto en este contexto)

### Tarea
- ✅ Tiempo total válido (era: Tiempo real invertido)
- ⚠️ Mantiene: Promedio por operario (correcto en este contexto)

### Serie
- ✅ Tiempo total válido (era: Tiempo real invertido)
- ✅ Tiempo promedio diario (era: Promedio por operario)
