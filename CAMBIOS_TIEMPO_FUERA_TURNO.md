# Cambios: Visualización y Descuento de Tiempos Fuera de Turno

## 📋 Resumen

Se han implementado mejoras para visualizar y descontar automáticamente los tiempos de fichajes realizados fuera del horario laboral en **todas las vistas** del componente `control-produccion-sonnet.tsx`.

---

## 🎯 Objetivos Cumplidos

1. ✅ **Indicador visual en tarjetas principales**: Triángulo rojo de advertencia en las tarjetas de la lista
2. ✅ **Descuento automático de tiempos**: Los tiempos fuera de turno se descuentan de todos los totales
3. ✅ **Visibilidad en todas las vistas**: Indicadores presentes en vistas por Operador, Tarea y Pedido
4. ✅ **Información detallada**: Muestra exactamente cuánto tiempo está fuera de turno

---

## 🔧 Cambios Técnicos

### 1. Interfaces Actualizadas

Se agregaron tres nuevos campos a las interfaces para almacenar los tiempos calculados:

```typescript
interface HierarchicalRecord {
  // ... campos existentes
  totalTime: number;           // Tiempo total registrado
  totalValidTime: number;      // Tiempo dentro de horario laboral (descontado)
  totalOutsideTime: number;    // Tiempo fuera de turno
}

interface ModuloGroup {
  // ... campos existentes
  totalTime: number;
  totalValidTime: number;
  totalOutsideTime: number;
}

interface PedidoGroup {
  // ... campos existentes
  totalTime: number;
  totalValidTime: number;
  totalOutsideTime: number;
}
```

### 2. Función `computeGroups` Mejorada

Ahora calcula automáticamente los tiempos válidos:

```typescript
const computeGroups = (records: TiempoRealRecord[], mode: 'operador' | 'tarea' | 'pedido') => {
  // ... agrupación
  
  for (const [k, arr] of map) {
    const totalTiempo = arr.reduce((s, x) => s + (x.TiempoDedicado ?? 0), 0);
    
    // ✅ NUEVO: Calcular tiempo fuera de turno
    let totalOutsideTime = 0;
    for (const r of arr) {
      totalOutsideTime += calculateOutsideWorkTime(r);
    }
    const totalValidTime = Math.max(0, totalTiempo - totalOutsideTime);
    
    groups.push({
      key: k,
      items: arr,
      totalTiempo,
      totalValidTime,      // ✅ Tiempo válido (descontado)
      totalOutsideTime,    // ✅ Tiempo fuera de turno
      count: arr.length,
      minFecha: formatDateOnly(minFecha),
      maxFecha: formatDateOnly(maxFecha)
    });
  }
  
  // ✅ Ordenar por tiempo válido (no por tiempo total)
  groups.sort((a, b) => b.totalValidTime - a.totalValidTime);
}
```

### 3. Función `createHierarchicalStructure` Mejorada

Calcula tiempos válidos en toda la jerarquía:

```typescript
const createHierarchicalStructure = (records: TiempoRealRecord[]): Map<string, PedidoGroup> => {
  for (const record of records) {
    const tiempo = Math.max(0, Number(record.TiempoDedicado) || 0);
    const tiempoFuera = calculateOutsideWorkTime(record);      // ✅ Calcular tiempo fuera
    const tiempoValido = Math.max(0, tiempo - tiempoFuera);   // ✅ Descontar
    
    // Acumular en operario
    hr.totalTime += tiempo;
    hr.totalValidTime += tiempoValido;        // ✅
    hr.totalOutsideTime += tiempoFuera;       // ✅
    
    // Acumular en módulo
    moduloGroup.totalTime += tiempo;
    moduloGroup.totalValidTime += tiempoValido;    // ✅
    moduloGroup.totalOutsideTime += tiempoFuera;   // ✅
    
    // Acumular en pedido
    pedidoGroup.totalTime += tiempo;
    pedidoGroup.totalValidTime += tiempoValido;    // ✅
    pedidoGroup.totalOutsideTime += tiempoFuera;   // ✅
  }
}
```

---

## 🎨 Cambios Visuales

### 1. Tarjetas Principales (Lista)

**Antes:**
```
┌────────────────────────────┐
│ SANDRA              8h 30m │
│ 45 registros               │
└────────────────────────────┘
```

**Ahora (solo fichaje abierto):**
```
┌────────────────────────────┐
│ SANDRA ⚠️            7h 15m │  ← Tiempo válido (descontado)
│ 45 registros               │
│ ⚠️ 🔴 Fichaje abierto      │  ← Advertencia visible
└────────────────────────────┘
```

**Ahora (tiempo fuera + fichaje abierto):**
```
┌────────────────────────────┐
│ JUAN ⚠️              7h 15m │  ← Tiempo válido (descontado)
│ 45 registros               │
│ ⚠️ 🔴 Fichaje abierto ·    │  ← Advertencias combinadas
│    1h 15m fuera de turno   │
└────────────────────────────┘
```

**Código:**
```typescript
<View style={styles.cardHeader}>
  <View style={styles.cardTitleContainer}>
    <Text style={styles.cardTitle}>{item.key}</Text>
    {(item.totalOutsideTime > 0 || item.hasOpenShift) && (  // ✅ Detecta ambos
      <View style={styles.cardOutsideBadge}>
        <Ionicons name="warning" size={14} color="#dc2626" />
      </View>
    )}
  </View>
  <View style={styles.cardStats}>
    <Text style={styles.cardTime}>{formatHM(item.totalValidTime)}</Text>  {/* ✅ Tiempo válido */}
    <Text style={styles.cardCount}>{item.count} registros</Text>
  </View>
</View>

{(item.totalOutsideTime > 0 || item.hasOpenShift) && (  // ✅ Muestra si hay cualquiera
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
```

### 2. Vista Jerárquica - Nivel Pedido

**Antes:**
```
📋 Pedido: 2024/001
Tiempo: 25h 30m · Operarios: 3
```

**Ahora:**
```
📋 Pedido: 2024/001  ⚠️ 2h 15m
Tiempo válido: 23h 15m · Operarios: 3
```

**Código:**
```typescript
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
    Tiempo válido: {formatDurationLong(pedido.totalValidTime)} · Operarios: {pedido.operarios.size}
  </Text>
</View>
```

### 3. Vista Jerárquica - Nivel Módulo

**Ahora:**
```
🔧 Módulo: MOD-001  ⚠️ 45m
Tiempo válido: 8h 15m · Operarios: 2
```

**Código:**
```typescript
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
  <Text style={styles.moduloSubtitle}>
    Tiempo válido: {formatDurationLong(mod.totalValidTime)} · Operarios: {mod.operarios.size}
  </Text>
</View>
```

### 4. Vista Jerárquica - Nivel Operario

**Ahora (con tiempo fuera de turno):**
```
👤 JUAN  ⚠️ 1h 15m fuera de turno
Registros: 12 · Tiempo válido: 7h 15m · Fechas: 2025-01-10
```

**Ahora (con fichaje abierto):**
```
👤 SANDRA  ⚠️ 🔴 1 abierto
Registros: 1 · Tiempo válido: 2h 18m · Fechas: 2025-10-06
```

**Ahora (con ambos):**
```
👤 JUAN  ⚠️ 🔴 1h 15m + 1 abierto
Registros: 13 · Tiempo válido: 8h 30m · Fechas: 2025-10-06, 2025-10-07
```

**Código:**
```typescript
<View style={styles.operarioHeader}>
  <Text style={styles.operarioTitle}>👤 {hr.operario}</Text>
  {outsideAnalysis.hasOutsideTime && (
    <View style={styles.outsideTimeBadge}>
      <Ionicons name="warning" size={12} color="#dc2626" />
      <Text style={styles.outsideTimeText}>
        {outsideAnalysis.hasOpenShift && '🔴 '}
        {outsideAnalysis.totalOutsideTime > 0 && formatHM(outsideAnalysis.totalOutsideTime)}
        {outsideAnalysis.hasOpenShift && outsideAnalysis.totalOutsideTime > 0 && ' + '}
        {outsideAnalysis.hasOpenShift && `${outsideAnalysis.openShiftCount} abierto${outsideAnalysis.openShiftCount > 1 ? 's' : ''}`}
      </Text>
    </View>
  )}
</View>
<Text style={styles.operarioStats}>
  Registros: {hr.records.length} · Tiempo válido: {formatDurationLong(hr.totalValidTime)}
</Text>
```

---

## 📊 Estilos Agregados

```typescript
// Estilos para tarjetas principales
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

// Estilos para vistas jerárquicas
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
```

---

## 🔍 Vistas Afectadas

### ✅ Vista por Operador (`renderOperarioHierarchy`)
- Tarjetas principales muestran indicador ⚠️ y tiempo válido
- Pedidos muestran tiempo válido y badge
- Módulos muestran tiempo válido y badge
- Tareas y operarios muestran tiempo válido
- Registros individuales mantienen indicadores detallados

### ✅ Vista por Pedido (`renderPedidoHierarchy`)
- Tarjetas principales con indicador y tiempo válido
- Pedidos con badge y tiempo válido
- Módulos, tareas y operarios con tiempo válido

### ✅ Vista por Tarea (`renderTareaHierarchy`)
- Tarjetas principales con indicador y tiempo válido
- Agrupación por tarea con cálculo correcto de tiempos válidos
- Pedidos, módulos y operarios dentro de tareas con tiempo válido

---

## 📈 Impacto en Ordenamiento

**Antes:** Las tarjetas se ordenaban por `totalTiempo` (tiempo bruto)

**Ahora:** Las tarjetas se ordenan por `totalValidTime` (tiempo válido)

```typescript
// Antes
groups.sort((a, b) => b.totalTiempo - a.totalTiempo);

// Ahora
groups.sort((a, b) => b.totalValidTime - a.totalValidTime);
```

**Resultado:** Los operarios/tareas/pedidos con más tiempo **productivo real** aparecen primero.

---

## 🧪 Ejemplo de Cálculo

### Escenario:
- Operario JUAN trabaja 10 horas totales
- 1h 15m fue registrada fuera de turno (antes de 6:30, durante descanso 9:30-10:00, o después de 14:30)

### Cálculos:
```typescript
totalTiempo = 10h 0m       // 36000 segundos
totalOutsideTime = 1h 15m  // 4500 segundos
totalValidTime = 8h 45m    // 31500 segundos (36000 - 4500)
```

### Visualización:
```
┌─────────────────────────────────────┐
│ JUAN ⚠️                      8h 45m │  ← Tiempo válido
│ 15 registros                        │
│ ⚠️ 1h 15m fuera de turno           │  ← Advertencia
│   (descontado del total)            │
└─────────────────────────────────────┘
```

---

## 🎯 Horario Laboral

**Lunes a Jueves:**
- Turno 1: 6:30 - 9:30 (3 horas)
- Descanso: 9:30 - 10:00 (30 minutos)
- Turno 2: 10:00 - 14:30 (4.5 horas)
- **Total: 7.5 horas**

**Viernes:**
- Turno 1: 6:30 - 9:30 (3 horas)
- Descanso: 9:30 - 10:00 (30 minutos)
- Turno 2: 10:00 - 13:30 (3.5 horas)
- **Total: 6.5 horas**

**Fuera de turno:**
- Antes de 6:30
- Entre 9:30 - 10:00 (descanso)
- Después de 14:30 (lunes-jueves) o 13:30 (viernes)

---

## ✅ Checklist de Implementación

- [x] Actualizar interfaces con campos de tiempo válido y fuera de turno
- [x] Modificar `computeGroups` para calcular tiempos válidos
- [x] Modificar `createHierarchicalStructure` para calcular tiempos en jerarquía
- [x] Modificar `renderTareaHierarchy` para propagar tiempos válidos
- [x] Actualizar tarjetas principales con indicador ⚠️ y advertencia
- [x] Actualizar vista de pedidos con tiempos válidos
- [x] Actualizar vista de módulos con tiempos válidos
- [x] Actualizar vista de operarios con tiempos válidos
- [x] Actualizar ordenamiento por tiempo válido
- [x] Agregar estilos para nuevos componentes visuales
- [x] Verificar compilación sin errores

---

## 📝 Notas Importantes

1. **Tiempo válido vs tiempo total:**
   - `totalTime`: Suma de todos los `TiempoDedicado` (bruto)
   - `totalValidTime`: `totalTime - totalOutsideTime` (neto, productivo)
   - `totalOutsideTime`: Suma de tiempos fuera del horario laboral

2. **Propagación de tiempos:**
   - Los tiempos se calculan a nivel de registro individual
   - Se propagan hacia arriba: Operario → Tarea → Módulo → Pedido
   - Cada nivel muestra su propio tiempo válido agregado

3. **Indicadores visuales:**
   - 🔺 Badge rojo con ⚠️: Indica presencia de tiempo fuera de turno
   - Barra de advertencia: Muestra cantidad exacta de tiempo fuera
   - Texto "Tiempo válido": Reemplaza "Tiempo" en todas las vistas

4. **Consistencia:**
   - Todos los totales mostrados son **tiempos válidos** (descontados)
   - El indicador ⚠️ aparece solo cuando `totalOutsideTime > 0`
   - Los logs incluyen ambos valores para debugging

---

## 🚀 Próximos Pasos

1. **Probar en producción** con datos reales
2. **Validar cálculos** con operarios que tienen fichajes fuera de turno
3. **Monitorear logs** para verificar cálculos correctos
4. **Considerar alertas** para supervisores cuando hay mucho tiempo fuera de turno
5. **Exportar reportes** con desglose de tiempo válido vs fuera de turno

---

**Fecha de implementación:** 10 de octubre de 2025
**Componente afectado:** `app/moncada/control-produccion-sonnet.tsx`
**Estado:** ✅ Completado y sin errores de compilación
