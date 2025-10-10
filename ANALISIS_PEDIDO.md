# 📊 Análisis Detallado de Pedido

## Descripción General

Se ha implementado un sistema completo de análisis profundo para pedidos en el módulo de control de producción. Al hacer clic en cualquier pedido desde la vista principal, se despliega un modal con un dashboard interactivo que muestra métricas detalladas, desgloses y estadísticas.

## Características Implementadas

### 1. **Interface de Datos (PedidoAnalysis)**
Se creó una interface completa que captura:
- Totales generales (registros, tiempos, anomalías)
- Módulos detallados con porcentajes y métricas
- Operarios con análisis individual
- Tareas con distribución de tiempo
- Fechas y días trabajados
- Métricas de eficiencia

### 2. **Función de Análisis (analyzePedidoDetailed)**
Función que procesa todos los registros del pedido y calcula:

#### Agrupaciones:
- Por módulos (con operarios y tareas por módulo)
- Por operarios (con módulos y tareas por operario)
- Por tareas (con operarios y módulos por tarea)

#### Cálculos de Tiempo:
- **Tiempo Total Real**: Suma de todos los tiempos ajustados (sin fichajes abiertos)
- **Tiempo Total Válido**: Tiempo real menos tiempo fuera de turno
- **Tiempo Fuera de Turno**: Trabajo realizado fuera del horario laboral
- **Fichajes Abiertos**: Detección de fichajes que cruzaron medianoche

#### Métricas de Eficiencia:
- **Eficiencia Promedio**: `(Tiempo Válido / Tiempo Total) × 100`
- **Tiempo Promedio por Operario**: Distribución equitativa del tiempo
- **Tiempo Promedio por Tarea**: Distribución por tipo de trabajo

### 3. **Diseño Visual (Dashboard Style)**

#### Header Principal:
- Icono de documento
- Título "Análisis de Pedido"
- Número de pedido destacado
- Rango de fechas con días trabajados

#### Grid de Métricas (4 tarjetas):
1. **Tiempo Válido** (azul)
   - Icono de reloj
   - Formato HH:MM
   - Indica tiempo productivo neto

2. **Eficiencia** (azul claro)
   - Icono de velocímetro
   - Porcentaje con un decimal
   - Relación tiempo válido/total

3. **Operarios** (verde)
   - Icono de personas
   - Número total de operarios
   - Involucrados en el pedido

4. **Módulos** (amarillo)
   - Icono de construcción
   - Número total de módulos
   - Componentes del pedido

#### Alertas de Anomalías:
Si existen problemas, se muestra tarjeta roja con:
- Tiempo trabajado fuera de horario (con emoji ⚠️)
- Fichajes abiertos detectados (con emoji 🔴)
- Indicación de que fueron descontados/ajustados

#### Estadísticas Generales:
Tarjeta con 4 métricas en 2 filas:
- Registros totales
- Tareas diferentes
- Tiempo real invertido
- Promedio por operario

#### Desglose por Módulos:
Lista completa con para cada módulo:
- **Nombre del módulo** (título destacado)
- **Subtexto**: X operarios · Y tareas · Z registros
- **Tiempo válido** (formato HH:MM)
- **Barra de progreso** (visual del porcentaje)
- **Porcentaje** del tiempo total

Ordenado de mayor a menor tiempo válido.

#### Desglose por Operarios:
Lista completa con para cada operario:
- **Nombre del operario** (título destacado)
- **Badge de anomalía** (⚠️) si tiene problemas
- **Subtexto**: X módulos · Y tareas · Z registros
- **Tiempo válido** (formato HH:MM)
- **Barra de progreso verde** (visual del porcentaje)
- **Porcentaje** del tiempo total

Ordenado de mayor a menor tiempo válido.

#### Desglose por Tareas:
Lista completa con para cada tarea:
- **Código de tarea** (título destacado)
- **Subtexto**: X operarios · Y módulos · Z registros
- **Tiempo válido** (formato HH:MM)
- **Barra de progreso morada** (visual del porcentaje)
- **Porcentaje** del tiempo total

Ordenado de mayor a menor tiempo válido.

#### Resumen Final:
Tarjeta verde con:
- Icono de checkmark
- Mensaje: "Análisis completado: X registros procesados con Y% de eficiencia"

## Flujo de Uso

1. Usuario navega a la sección de "Pedidos" (botón de filtro en la parte superior)
2. Ve la lista de pedidos con tiempos totales
3. **Hace clic en cualquier pedido**
4. Se abre el modal de análisis detallado
5. Puede **scrollear** para ver todas las secciones
6. Cierra el modal con el botón X o gesto de swipe

## Código Clave

### Estado:
```typescript
const [pedidoAnalysisVisible, setPedidoAnalysisVisible] = useState(false);
const [pedidoAnalysisData, setPedidoAnalysisData] = useState<PedidoAnalysis | null>(null);
```

### Detección de clic en pedido:
```typescript
if (filterMode === 'pedido') {
  const analysis = analyzePedidoDetailed(all);
  setPedidoAnalysisData(analysis);
  setPedidoAnalysisVisible(true);
}
```

### Modal:
```typescript
<Modal visible={pedidoAnalysisVisible} animationType="slide">
  <SafeAreaView style={styles.modalContainer}>
    <View style={styles.modalHeader}>
      <Text style={styles.modalTitle}>Análisis Detallado de Pedido</Text>
      <TouchableOpacity onPress={() => setPedidoAnalysisVisible(false)}>
        <Ionicons name="close" size={24} />
      </TouchableOpacity>
    </View>
    {pedidoAnalysisData && renderPedidoAnalysis(pedidoAnalysisData)}
  </SafeAreaView>
</Modal>
```

## Colores y Paleta

- **Azul** (#3b82f6): Tiempo, eficiencia
- **Verde** (#10b981): Operarios, éxito
- **Amarillo** (#f59e0b): Módulos, advertencias
- **Morado** (#8b5cf6): Tareas
- **Rojo** (#dc2626): Anomalías, alertas
- **Gris** (#6b7280): Texto secundario
- **Fondo** (#f9fafb): Background general

## Estilos Agregados

Total de 29 nuevos estilos específicos para el análisis:
- `analysisContainer`: Contenedor principal
- `analysisHeaderCard`: Tarjeta de header
- `metricsGrid`: Grid de 2x2 para métricas
- `metricCard`: Tarjeta individual de métrica
- `alertCard`: Tarjeta de anomalías
- `sectionCard`: Tarjetas de secciones
- `detailRow`: Filas de desglose
- `progressBarContainer` y `progressBar`: Barras de progreso
- `summaryFinalCard`: Tarjeta de resumen final

## Ventajas del Sistema

1. **Visión Completa**: Toda la información del pedido en un solo lugar
2. **Métricas Calculadas**: Eficiencia, promedios, porcentajes automáticos
3. **Detección de Anomalías**: Alerta visual de problemas
4. **Navegación Intuitiva**: Scroll suave, diseño limpio
5. **Datos Precisos**: Usa las mismas funciones de cálculo existentes
6. **Responsive**: Funciona en móvil y web
7. **Performance**: Lista virtualizada con FlatList
8. **Profesional**: Diseño tipo dashboard moderno

## Casos de Uso

### Gerente de Producción:
- Ver eficiencia real de un pedido
- Identificar qué módulos consumen más tiempo
- Detectar operarios con anomalías
- Comparar distribución de tareas

### Supervisor:
- Revisar tiempo dedicado por operario
- Ver distribución de trabajo por módulo
- Identificar cuellos de botella
- Validar tiempos reportados

### Analista:
- Extraer métricas de eficiencia
- Comparar pedidos similares
- Generar informes detallados
- Auditar tiempos y registros

## Próximas Mejoras Sugeridas

1. **Exportar a PDF**: Botón para generar reporte imprimible
2. **Comparación**: Comparar 2 pedidos lado a lado
3. **Gráficos**: Charts.js para visualizar distribuciones
4. **Filtros**: Filtrar por fecha, operario, módulo dentro del análisis
5. **Histórico**: Ver evolución del pedido día a día
6. **Notificaciones**: Alertas automáticas si eficiencia < 80%

## Testing

Para probar la funcionalidad:

1. Iniciar la app: `npx expo start`
2. Navegar a "Control de Producción"
3. Cambiar filtro a "Pedidos"
4. Hacer clic en cualquier pedido
5. Verificar que se muestra el análisis completo
6. Probar scroll en todas las secciones
7. Cerrar modal y repetir con otro pedido

## Logs de Depuración

La función de análisis genera logs:
```
[analyzePedidoDetailed] 📊 Analizando X registros
```

Buscar en consola para verificar que se procesan correctamente.

## Conclusión

El sistema de análisis de pedidos proporciona una herramienta profesional y completa para supervisar, auditar y optimizar la producción. Toda la información crítica está disponible en un diseño visual moderno y fácil de entender.
