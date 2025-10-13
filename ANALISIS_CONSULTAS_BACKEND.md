# 🔍 Análisis de Consultas Backend - Control Producción

## 📡 Consultas al Backend

Este componente realiza **2 consultas principales** al backend:

### 1️⃣ `/control-terminales/production-analytics`

**Propósito**: Obtener todos los registros de tiempo/fichajes de los operarios.

**Parámetros**:
- `start`: Fecha de inicio (formato: YYYY-MM-DD)
- `end`: Fecha de fin (formato: YYYY-MM-DD)

**Respuesta esperada**:
```json
{
  "data": [
    {
      "Fecha": "2025-01-13",
      "CodigoOperario": "OP001",
      "OperarioNombre": "Juan Pérez",
      "FechaInicio": "2025-01-13",
      "HoraInicio": "08:00:00",
      "FechaFin": "2025-01-13",
      "HoraFin": "10:30:00",
      "CodigoTarea": "TAREA_01",
      "NumeroManual": "2025_40_812",
      "Modulo": "MOD-001",
      "TiempoDedicado": 150,
      "Abierta": 0,
      "CodigoPuesto": "PUESTO_01",
      "Serie1Desc": null,
      "ClienteNombre": null,
      "Fabricacion": null
    }
  ],
  "pagination": { ... }
}
```

**Campos importantes**:
- `NumeroManual`: Código del pedido
- `Modulo`: Código del módulo
- `Serie1Desc`: Serie del módulo (puede venir null)
- `ClienteNombre`: Nombre del cliente (puede venir null)
- `Fabricacion`: Código de fabricación (puede venir null)

**⚠️ PROBLEMA IDENTIFICADO**: 
- Esta consulta **SOLO devuelve registros de módulos que tienen fichajes**
- Los módulos del pedido que no han sido iniciados **NO aparecen aquí**

---

### 2️⃣ `/control-pedido/info-para-terminales`

**Propósito**: Obtener información completa de **TODOS los módulos** de un pedido.

**Parámetros**:
```json
{
  "codigoPresupuesto": "2025_40_812"
}
```

**Respuesta esperada**:
```json
{
  "status": "ok",
  "clienteNombre": "CLIENTE EJEMPLO S.L.",
  "modulos": [
    {
      "Modulo": "MOD-001",
      "Serie1Desc": "SERIE_A",
      "CodigoSerie": "SA",
      "CodigoNumero": "12345"
    },
    {
      "Modulo": "MOD-002",
      "Serie1Desc": "SERIE_A",
      "CodigoSerie": "SA",
      "CodigoNumero": "12346"
    },
    {
      "Modulo": "MOD-003",
      "Serie1Desc": "SERIE_B",
      "CodigoSerie": "SB",
      "CodigoNumero": "67890"
    }
  ]
}
```

**✅ VENTAJA**: 
- Esta consulta devuelve **TODOS los módulos** del pedido
- Incluye módulos con y sin fichajes
- Proporciona información adicional: cliente, serie, fabricación

---

## 🔍 Logs Implementados

### En `fetchTiempoReal` (production-analytics)

```javascript
// Log inicial
[FECHA-DEBUG] 🚀 fetchTiempoReal llamado: { from, to }
[FECHA-DEBUG] 🌐 URL completa: ${API_URL}/control-terminales/production-analytics?start=${from}&end=${to}

// Response
[ProduccionAnalytics] 📊 Response status: 200
[ProduccionAnalytics] 📦 Data received: {
  hasData: true,
  dataLength: 150,
  sample: { ... }
}

// Registros cargados
[ProduccionAnalytics] ✅ Records loaded: 150

// 🆕 Análisis de estructura
[ProduccionAnalytics] 📋 Estructura del primer registro: { ... }

// 🆕 Resumen de pedidos en registros
[ProduccionAnalytics] 📊 Resumen de pedidos en registros: {
  totalPedidos: 15,
  top5Pedidos: [
    {
      pedido: "2025_40_812",
      registros: 45,
      modulosUnicos: 3,  // ⚠️ SOLO módulos con fichajes
      modulos: ["MOD-001", "MOD-002", "MOD-003"]
    }
  ]
}
```

### En `enrichRecordsWithTerminalesInfo` (info-para-terminales)

```javascript
// Inicio del enriquecimiento
🚀 [enrichRecords] INICIO - Procesando 150 registros

// Agrupación por pedido
🔍 [enrichRecords] Agrupación: {
  totalRegistros: 150,
  registrosSinPedido: 5,
  pedidosUnicos: 15,
  pedidos: ["2025_40_812", "2025_40_813", ...]
}

// Request por cada pedido
📤 [info-terminales] Request pedido 2025_40_812

// 🆕 Estructura completa del pedido
📦 [info-terminales] Pedido 2025_40_812 - Estructura completa: {
  status: "ok",
  clienteNombre: "CLIENTE EJEMPLO S.L.",
  totalModulos: 8,  // ⚠️ TODOS los módulos del pedido
  modulos: [
    {
      Modulo: "MOD-001",
      Serie1Desc: "SERIE_A",
      CodigoSerie: "SA",
      CodigoNumero: "12345"
    },
    // ... más módulos
  ]
}

// 🆕 Mapa de módulos creado
🗺️ [info-terminales] Pedido 2025_40_812 - Mapa de módulos creado: {
  totalModulos: 8,
  modulos: [
    {
      modulo: "MOD-001",
      serie: "SERIE_A",
      fabricacion: "SA-12345"
    },
    // ... más módulos
  ]
}

// 🆕 Comparación de módulos (CLAVE PARA DETECTAR EL PROBLEMA)
🔍 [info-terminales] Pedido 2025_40_812 - Comparación de módulos: {
  modulosEnRegistros: ["MOD-001", "MOD-002", "MOD-003"],  // Módulos con fichajes
  totalEnRegistros: 3,
  modulosDelBackend: ["MOD-001", "MOD-002", "MOD-003", "MOD-004", "MOD-005", "MOD-006", "MOD-007", "MOD-008"],  // TODOS los módulos
  totalEnBackend: 8,
  modulosSoloEnBackend: ["MOD-004", "MOD-005", "MOD-006", "MOD-007", "MOD-008"],  // Módulos SIN fichajes
  modulosSinFichajes: 5  // ⚠️ 5 módulos pendientes
}

// Enriquecimiento de registros
✅ [info-terminales] Pedido 2025_40_812: 45/45 enriquecidos

// Resumen final
🎯 [enrichRecords] FINAL: 145/150 enriquecidos (96%)
```

---

## 🎯 Conclusiones y Próximos Pasos

### ✅ Lo que ya funciona:

1. **Carga de registros**: Se obtienen correctamente todos los registros con fichajes
2. **Enriquecimiento**: Se añade información de cliente, serie y fabricación
3. **Logs detallados**: Ahora podemos ver exactamente qué módulos tienen fichajes y cuáles no

### ⚠️ Problema identificado:

El análisis de pedidos **solo muestra módulos con fichajes** porque:
1. Los registros de `production-analytics` solo incluyen módulos fichados
2. El análisis trabaja sobre esos registros
3. Los módulos sin fichajes no están en los registros iniciales

### 🔧 Solución propuesta:

**Opción 1: Crear registros virtuales** (Recomendada)
- En `enrichRecordsWithTerminalesInfo`, cuando detectemos módulos sin fichajes
- Crear registros "virtuales" para esos módulos
- Marcarlos con un flag especial `_sinFichajes: true`
- El análisis los incluirá y mostrará como "pendientes"

**Opción 2: Consulta adicional en el análisis**
- Cuando se analiza un pedido específico
- Hacer una nueva llamada a `info-para-terminales`
- Comparar con los módulos en registros
- Agregar módulos faltantes al análisis

**Opción 3: Estado global de módulos**
- Mantener un estado global con todos los módulos de cada pedido
- Consultado durante el enriquecimiento
- Usar en el análisis para completar la información

---

## 📊 Ejemplo Real: Pedido 2025_40_812

### Situación Actual (SIN la corrección):

```
Análisis de Pedido: 2025_40_812
├─ Módulos mostrados: 3
│  ├─ MOD-001 ✅ (con fichajes)
│  ├─ MOD-002 ✅ (con fichajes)
│  └─ MOD-003 ✅ (con fichajes)
└─ Módulos ocultos: 5 ⚠️
   ├─ MOD-004 ❌ (sin fichajes - NO VISIBLE)
   ├─ MOD-005 ❌ (sin fichajes - NO VISIBLE)
   ├─ MOD-006 ❌ (sin fichajes - NO VISIBLE)
   ├─ MOD-007 ❌ (sin fichajes - NO VISIBLE)
   └─ MOD-008 ❌ (sin fichajes - NO VISIBLE)
```

### Situación Deseada (CON la corrección):

```
Análisis de Pedido: 2025_40_812
├─ ⚠️ 5 módulos sin fichajes
├─ Módulos con fichajes (3):
│  ├─ MOD-001 ✅ 8h 30m [VERDE]
│  ├─ MOD-002 ✅ 5h 15m [VERDE]
│  └─ MOD-003 ✅ 3h 45m [VERDE]
└─ Módulos sin fichajes (5):
   ├─ MOD-004 🔴 Pendiente [ROJO]
   ├─ MOD-005 🔴 Pendiente [ROJO]
   ├─ MOD-006 🔴 Pendiente [ROJO]
   ├─ MOD-007 🔴 Pendiente [ROJO]
   └─ MOD-008 🔴 Pendiente [ROJO]
```

---

## 🚀 Implementación Recomendada

Con los logs ahora implementados, podemos ver claramente:
- Qué módulos están en los registros (con fichajes)
- Qué módulos están en el backend (todos)
- La diferencia (módulos sin fichajes)

**Siguiente paso**: Usar esta información para crear registros virtuales y mostrarlos en el análisis.

---

**Fecha de análisis**: 2025-01-13  
**Estado**: ✅ Logs implementados - Listo para implementar solución
