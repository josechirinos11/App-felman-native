// 🧪 EJEMPLO DE USO: Control de Producción con Logs Detallados

/**
 * FLUJO DE DATOS:
 * 
 * 1. Usuario selecciona rango de fechas (Desde → Hasta)
 * 2. fetchTiempoReal() consulta el endpoint /production-analytics
 * 3. Backend devuelve registros individuales de partes de trabajo:
 *    {
 *      data: [
 *        { Fecha, CodigoOperario, OperarioNombre, CodigoTarea, 
 *          NumeroManual, Modulo, TiempoDedicado, ... }
 *      ]
 *    }
 * 4. computeGroups() agrupa registros según el filtro activo:
 *    - operador → Agrupa por primer nombre del operario
 *    - tarea → Agrupa por código de tarea
 *    - pedido → Agrupa por número de pedido manual
 * 5. Usuario hace click en una tarjeta
 * 6. Se filtran los registros de ese grupo
 * 7. createHierarchicalStructure() crea la jerarquía:
 *    Pedido → Módulo → Tarea → Operario → [Registros individuales]
 * 8. Se renderiza el modal con la vista jerárquica correspondiente
 */

// ============================================
// EJEMPLO 1: Agrupar por Operador
// ============================================

/**
 * Input (tiempoRecords):
 * [
 *   { OperarioNombre: "JUAN PEREZ", CodigoTarea: "CORTE", NumeroManual: "PED001", 
 *     Modulo: "V01.01", TiempoDedicado: 3600 },
 *   { OperarioNombre: "JUAN PEREZ", CodigoTarea: "ARMADO", NumeroManual: "PED001", 
 *     Modulo: "V01.01", TiempoDedicado: 5400 },
 *   { OperarioNombre: "PEDRO GOMEZ", CodigoTarea: "CORTE", NumeroManual: "PED002", 
 *     Modulo: "V02.01", TiempoDedicado: 7200 }
 * ]
 * 
 * Output (groupedList en modo 'operador'):
 * [
 *   {
 *     key: "JUAN",
 *     items: [registro1, registro2],
 *     totalTiempo: 9000,  // 2h 30m
 *     count: 2,
 *     minFecha: "2025-10-07",
 *     maxFecha: "2025-10-08"
 *   },
 *   {
 *     key: "PEDRO",
 *     items: [registro3],
 *     totalTiempo: 7200,  // 2h
 *     count: 1,
 *     minFecha: "2025-10-08",
 *     maxFecha: "2025-10-08"
 *   }
 * ]
 * 
 * Logs esperados:
 * [computeGroups] 🔄 Agrupando 3 registros por: operador
 * [computeGroups] 📊 Grupos encontrados: 2
 * [computeGroups] ✅ Top 5 grupos: [
 *   { key: 'JUAN', count: 2, tiempo: '2h 30m' },
 *   { key: 'PEDRO', count: 1, tiempo: '2h 00m' }
 * ]
 */

// ============================================
// EJEMPLO 2: Click en Tarjeta de JUAN
// ============================================

/**
 * Al hacer click en la tarjeta "JUAN":
 * 
 * 1. Se filtran registros:
 *    const all = tiempoRecords.filter(r => 
 *      operarioFirstNameKey(r.OperarioNombre) === "JUAN"
 *    );
 *    // all = [registro1, registro2]
 * 
 * 2. createHierarchicalStructure(all) crea:
 * {
 *   "PED001": {
 *     pedido: "PED001",
 *     totalTime: 9000,
 *     operarios: Set(["JUAN"]),
 *     fechas: Set(["2025-10-07", "2025-10-08"]),
 *     modulos: {
 *       "V01.01": {
 *         modulo: "V01.01",
 *         totalTime: 9000,
 *         operarios: Set(["JUAN"]),
 *         fechas: Set(["2025-10-07", "2025-10-08"]),
 *         tareas: {
 *           "CORTE": [
 *             {
 *               pedido: "PED001",
 *               modulo: "V01.01",
 *               tarea: "CORTE",
 *               operario: "JUAN",
 *               records: [registro1],
 *               totalTime: 3600,
 *               fechas: ["2025-10-07"]
 *             }
 *           ],
 *           "ARMADO": [
 *             {
 *               pedido: "PED001",
 *               modulo: "V01.01",
 *               tarea: "ARMADO",
 *               operario: "JUAN",
 *               records: [registro2],
 *               totalTime: 5400,
 *               fechas: ["2025-10-08"]
 *             }
 *           ]
 *         }
 *       }
 *     }
 *   }
 * }
 * 
 * 3. Se renderiza:
 *    📋 Pedido: PED001
 *       Tiempo: 2h 30m · Operarios: 1 · Fechas: 2025-10-07, 2025-10-08
 *       
 *       🔧 Módulo: V01.01
 *          Tiempo: 2h 30m · Operarios: 1
 *          
 *          ⚙️ Tarea: CORTE
 *             👤 JUAN
 *             Registros: 1 · Tiempo: 1h 00m · Fechas: 2025-10-07
 *             📅 07/10/2025 · 🕐 08:00:00 → 09:00:00 · ⏱ 1h 00m
 *          
 *          ⚙️ Tarea: ARMADO
 *             👤 JUAN
 *             Registros: 1 · Tiempo: 1h 30m · Fechas: 2025-10-08
 *             📅 08/10/2025 · 🕐 10:00:00 → 11:30:00 · ⏱ 1h 30m
 * 
 * Logs esperados:
 * [Card Click] 👆 Modo: operador, Key: JUAN
 * [Card Click] 📊 Registros filtrados: 2
 * [renderOperarioHierarchy] 🎨 Renderizando 2 registros
 * [createHierarchicalStructure] 🏗️ Creando jerarquía con 2 registros
 * [createHierarchicalStructure] ✅ Pedidos creados: 1
 *   📋 PED001: 1 módulos, 2h 30m tiempo total
 */

// ============================================
// EJEMPLO 3: Búsqueda
// ============================================

/**
 * Usuario escribe "CORTE" en el buscador:
 * 
 * filteredGroupedList filtra grupos donde:
 * - El key del grupo contiene "corte", O
 * - Algún registro del grupo contiene:
 *   - NumeroManual con "corte"
 *   - CodigoTarea con "corte"
 *   - OperarioNombre con "corte"
 *   - Modulo con "corte"
 * 
 * Si el filtro actual es "operador" y búsqueda es "CORTE":
 * - JUAN tiene un registro con tarea "CORTE" → Se muestra
 * - PEDRO tiene un registro con tarea "CORTE" → Se muestra
 * 
 * Log esperado:
 * [filteredGroupedList] 🔍 Query: "corte" → Resultados: 2/2
 */

// ============================================
// EJEMPLO 4: Agrupar por Tarea
// ============================================

/**
 * Usuario cambia a filtro "Tareas":
 * 
 * groupedList ahora agrupa por CodigoTarea:
 * [
 *   {
 *     key: "CORTE",
 *     items: [registro1, registro3],
 *     totalTiempo: 10800,  // 3h
 *     count: 2,
 *     ...
 *   },
 *   {
 *     key: "ARMADO",
 *     items: [registro2],
 *     totalTiempo: 5400,  // 1h 30m
 *     count: 1,
 *     ...
 *   }
 * ]
 * 
 * Al hacer click en "CORTE", renderTareaHierarchy() agrupa:
 * 
 * ⚙️ Tarea: CORTE
 *    
 *    📋 PED001
 *       🔧 V01.01
 *          👤 JUAN
 *          Registros: 1 · Tiempo: 1h 00m
 *    
 *    📋 PED002
 *       🔧 V02.01
 *          👤 PEDRO
 *          Registros: 1 · Tiempo: 2h 00m
 * 
 * Logs esperados:
 * [useEffect] 🔄 Recomputando grupos - Modo: tarea, Registros: 3
 * [computeGroups] 🔄 Agrupando 3 registros por: tarea
 * [computeGroups] 📊 Grupos encontrados: 2
 * [Card Click] 👆 Modo: tarea, Key: CORTE
 * [Card Click] 📊 Registros filtrados: 2
 * [renderTareaHierarchy] 🎨 Renderizando 2 registros
 */

// ============================================
// EJEMPLO 5: Agrupar por Pedido
// ============================================

/**
 * Usuario cambia a filtro "Pedidos":
 * 
 * groupedList ahora agrupa por NumeroManual:
 * [
 *   {
 *     key: "PED001",
 *     items: [registro1, registro2],
 *     totalTiempo: 9000,  // 2h 30m
 *     count: 2,
 *     ...
 *   },
 *   {
 *     key: "PED002",
 *     items: [registro3],
 *     totalTiempo: 7200,  // 2h
 *     count: 1,
 *     ...
 *   }
 * ]
 * 
 * Al hacer click en "PED001", renderPedidoHierarchy() muestra:
 * 
 * 📋 Pedido: PED001
 *    Tiempo: 2h 30m · Operarios: 1 · Módulos: 1
 *    
 *    🔧 V01.01
 *       
 *       ⚙️ Tarea: CORTE
 *          👤 JUAN
 *          Registros: 1 · Tiempo: 1h 00m
 *       
 *       ⚙️ Tarea: ARMADO
 *          👤 JUAN
 *          Registros: 1 · Tiempo: 1h 30m
 * 
 * Logs esperados:
 * [useEffect] 🔄 Recomputando grupos - Modo: pedido, Registros: 3
 * [computeGroups] 🔄 Agrupando 3 registros por: pedido
 * [computeGroups] 📊 Grupos encontrados: 2
 * [Card Click] 👆 Modo: pedido, Key: PED001
 * [Card Click] 📊 Registros filtrados: 2
 * [renderPedidoHierarchy] 🎨 Renderizando 2 registros
 */

// ============================================
// NOTAS IMPORTANTES
// ============================================

/**
 * 1. NORMALIZACIÓN:
 *    - Operarios: "JUAN PEREZ" → "JUAN"
 *    - Tareas: "  corte  " → "CORTE"
 *    - Pedidos: "PED001" → "PED001"
 * 
 * 2. MANEJO DE NULOS:
 *    - operarioFirstNameKey(null) → "SIN_OPERARIO"
 *    - normalizeTareaKey(undefined) → "SIN_TAREA"
 *    - normalizePedidoKey("") → "SIN_PEDIDO"
 * 
 * 3. FECHAS:
 *    - Prioriza FechaInicio sobre Fecha
 *    - Ignora fechas "0000-00-00"
 *    - Ordena registros por timestamp (más reciente primero)
 * 
 * 4. TIEMPOS:
 *    - TiempoDedicado en segundos
 *    - formatDurationLong: "2 días - 5h - 30m"
 *    - formatHM: "5h 30m"
 *    - Math.max(0, ...) previene tiempos negativos
 * 
 * 5. PERFORMANCE:
 *    - useMemo para filteredGroupedList
 *    - useEffect con dependencias [tiempoRecords, filterMode]
 *    - FlatList con keyExtractor optimizado
 * 
 * 6. DEBUGGING:
 *    - Todos los console.log tienen prefijo identificable
 *    - Logs en cada transformación de datos
 *    - Información de contadores y resultados
 */

export { };

