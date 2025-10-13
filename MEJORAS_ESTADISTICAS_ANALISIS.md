# Mejoras en Estadísticas de Análisis - Control de Producción

## Resumen de Cambios Implementados

Se han actualizado las interfaces y funciones de análisis para incluir estadísticas avanzadas en cada modal de análisis (Serie, Pedido, Tarea, Operario).

### 1. Nuevas Métricas en SerieAnalysis

```typescript
// 🆕 Estadísticas Avanzadas
tiempoPromedioPorModulo: number;      // Tiempo promedio de fabricación por módulo
tiempoPromedioPorPedido: number;       // Tiempo promedio por pedido
tiempoPromedioPorRegistro: number;     // Tiempo promedio por registro
tiempoPromedioDiario: number;          // Tiempo promedio trabajado por día

// Productividad
registrosPorOperario: number;          // Promedio de registros por operario
modulosPorOperario: number;            // Promedio de módulos trabajados por operario
tareasPorOperario: number;             // Promedio de tareas distintas por operario
operariosPorModulo: number;            // Promedio de operarios que trabajan en cada módulo

// Distribución de trabajo
tasaUtilizacionOperarios: number;      // % de tiempo que los operarios están ocupados
concentracionTrabajo: number;          // Desviación estándar (indica balance de carga)

// Calidad y consistencia
tasaFichajesCorrectos: number;         // % de registros sin fichajes abiertos
tasaDentroHorario: number;             // % de tiempo dentro del horario laboral
```

### 2. Nuevas Métricas en PedidoAnalysis

```typescript
// 🆕 Estadísticas Avanzadas
tiempoPromedioPorModulo: number;
tiempoPromedioPorRegistro: number;
tiempoPromedioDiario: number;

// Productividad del pedido
registrosPorOperario: number;
modulosPorOperario: number;
tareasPorOperario: number;
operariosPorModulo: number;
tareasPorModulo: number;

// Eficiencia y calidad
tasaFichajesCorrectos: number;
tasaDentroHorario: number;
velocidadProduccion: number;          // Módulos producidos por hora
concentracionTrabajo: number;         // Balance de carga entre operarios
```

### 3. Nuevas Métricas en TareaAnalysis

```typescript
// 🆕 Estadísticas Avanzadas
tiempoPromedioPorModulo: number;
tiempoPromedioPorRegistro: number;
tiempoPromedioDiario: number;

// Productividad de la tarea
registrosPorOperario: number;
pedidosPorOperario: number;
modulosPorOperario: number;
operariosPorPedido: number;

// Eficiencia de ejecución
tasaFichajesCorrectos: number;
tasaDentroHorario: number;
velocidadEjecucion: number;           // Registros completados por hora
concentracionTrabajo: number;
```

### 4. Nuevas Métricas en OperarioAnalysis

```typescript
// 🆕 Estadísticas Avanzadas del Operario
tiempoPromedioPorModulo: number;
tiempoPromedioPorRegistro: number;
tiempoPromedioDiario: number;

// Productividad personal
registrosPorDia: number;
tareasPorDia: number;
modulosPorDia: number;
pedidosPorDia: number;

// Versatilidad y polivalencia
diversidadTareas: number;             // Número de tareas distintas
diversidadModulos: number;            // Número de módulos distintos
tareasPorPedido: number;

// Calidad del trabajo
tasaFichajesCorrectos: number;
tasaDentroHorario: number;
consistenciaDiaria: number;           // Desviación estándar del tiempo por día
velocidadProduccion: number;          // Registros por hora
```

## Indicadores Clave por Tipo de Análisis

### Serie
- **Tiempo promedio por módulo**: KPI principal para estimar tiempos de producción
- **Utilización de operarios**: Mide eficiencia del uso de recursos humanos
- **Balance de carga**: Indica si el trabajo está equilibrado entre operarios
- **Tasa de fichajes correctos**: Calidad de los registros

### Pedido
- **Velocidad de producción**: Módulos/hora, indica ritmo de producción
- **Tareas por módulo**: Complejidad promedio de cada módulo
- **Balance de carga**: Distribución equitativa del trabajo

### Tarea
- **Velocidad de ejecución**: Registros/hora, indica eficiencia en la tarea
- **Operarios por pedido**: Nivel de colaboración necesario
- **Tiempo promedio por registro**: Estándar de tiempo para la tarea

### Operario
- **Registros por día**: Productividad diaria
- **Diversidad de tareas**: Indicador de polivalencia
- **Diversidad de módulos**: Versatilidad del operario
- **Consistencia diaria**: Estabilidad en el rendimiento
- **Velocidad de producción**: Eficiencia comparativa

## Cómo Mostrar las Estadísticas en el UI

Para cada modal de análisis, las estadísticas se organizan en 4 secciones:

### 1. Contadores Básicos
- Registros totales, Módulos/Tareas/Operarios, Días trabajados

### 2. Tiempos Promedio de Fabricación ⏱️
- Por módulo, Por pedido, Por tarea, Por registro, Por día

### 3. Productividad y Distribución 👥
- Registros por operario, Módulos por operario, etc.

### 4. Calidad y Eficiencia 📈
- Fichajes correctos (% verde si ≥95%, amarillo si <95%)
- Trabajo en horario (% verde si ≥90%, amarillo si <90%)
- Utilización/Velocidad según contexto
- Balance de carga (✓ Equilibrado, ≈ Moderado, ⚠ Desbalanceado)

## Código de Ejemplo para Renderizar

```tsx
{/* 📊 Promedios de Fabricación */}
<View style={{ marginTop: 12, paddingTop: 12, borderTopWidth: 1, borderTopColor: '#e5e7eb' }}>
  <Text style={[styles.statLabel, { fontWeight: '700', fontSize: 13, marginBottom: 8, color: COLORS.primary }]}>
    ⏱️ Tiempos Promedio de Fabricación
  </Text>
  <View style={styles.statsRow}>
    <View style={styles.statItem}>
      <Text style={styles.statLabel}>Por módulo</Text>
      <Text style={[styles.statValue, { color: '#f59e0b' }]}>
        {formatHM(analysis.tiempoPromedioPorModulo)}
      </Text>
    </View>
    <View style={styles.statItem}>
      <Text style={styles.statLabel}>Por pedido</Text>
      <Text style={[styles.statValue, { color: '#ef4444' }]}>
        {formatHM(analysis.tiempoPromedioPorPedido)}
      </Text>
    </View>
  </View>
</View>
```

## Interpretación de Métricas

### Concentración de Trabajo (Desviación Estándar)
- **< 60 minutos**: ✓ Equilibrado - Trabajo bien distribuido
- **60-120 minutos**: ≈ Moderado - Aceptable pero mejorable
- **> 120 minutos**: ⚠ Desbalanceado - Revisar distribución

### Utilización de Operarios
- **≥ 70%**: Verde - Excelente utilización
- **50-70%**: Amarillo - Utilización moderada
- **< 50%**: Rojo - Baja utilización

### Tasa de Fichajes Correctos
- **≥ 95%**: Verde - Excelente calidad de datos
- **< 95%**: Amarillo - Revisar proceso de fichaje

### Tasa Dentro de Horario
- **≥ 90%**: Verde - Cumplimiento horario excelente
- **< 90%**: Amarillo - Revisar gestión de tiempos

## Próximos Pasos

1. ✅ Actualizar interfaces TypeScript
2. ✅ Implementar cálculos en funciones analyze*Detailed
3. 🔄 Actualizar UI de renderSerieAnalysis (en progreso)
4. ⏳ Actualizar UI de renderPedidoAnalysis
5. ⏳ Actualizar UI de renderTareaAnalysis
6. ⏳ Actualizar UI de renderOperarioAnalysis

## Notas Técnicas

- Todos los tiempos se muestran con `formatHM()` para mantener consistencia
- Los colores se aplican dinámicamente según umbrales definidos
- La desviación estándar se calcula correctamente para indicar variabilidad
- Se mantiene compatibilidad con código existente
