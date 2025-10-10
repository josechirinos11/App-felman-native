# 📱 Ejemplo Visual: Detección de Fichajes Fuera de Turno

## 🎯 Vista Principal - Tarjeta de Operario

Cuando haces click en un operario desde la lista principal, verás:

```
┌──────────────────────────────────────────────────────────────┐
│  ← Operario: JUAN                                         ✕  │
├──────────────────────────────────────────────────────────────┤
│                                                              │
│  📋 Pedido: PED001                                          │
│  Tiempo: 8h 30m · Operarios: 1 · Fechas: 07/10, 08/10      │
│                                                              │
│  ┌────────────────────────────────────────────────────┐    │
│  │ 🔧 Módulo: V01.01                                   │    │
│  │ Tiempo: 8h 30m · Operarios: 1                       │    │
│  │                                                      │    │
│  │ ┌──────────────────────────────────────────────┐   │    │
│  │ │ ⚙️ Tarea: CORTE                               │   │    │
│  │ │                                                │   │    │
│  │ │ ┌──────────────────────────────────────────┐ │   │    │
│  │ │ │ 👤 JUAN  [⚠️ 1h 30m fuera de turno]     │ │   │    │
│  │ │ │                                          │ │   │    │
│  │ │ │ Registros: 3 · Tiempo: 4h 15m           │ │   │    │
│  │ │ │ Fechas: 07/10/2025, 08/10/2025          │ │   │    │
│  │ │ │                                          │ │   │    │
│  │ │ │ ┏━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┓ │ │   │    │
│  │ │ │ ┃ 📅 07/10/2025                  🔴 ┃ │ │   │    │
│  │ │ │ ┃ 🕐 05:00:00 → 08:00:00            ┃ │ │   │    │
│  │ │ │ ┃ ⏱ 3h 00m                          ┃ │ │   │    │
│  │ │ │ ┃                                   ┃ │ │   │    │
│  │ │ │ ┃ ⚠️ 1h 30m fuera del horario      ┃ │ │   │    │
│  │ │ │ ┃    laboral (6:30-9:30, 10:30-    ┃ │ │   │    │
│  │ │ │ ┃    14:30)                         ┃ │ │   │    │
│  │ │ │ ┃                                   ┃ │ │   │    │
│  │ │ │ ┃ Puesto: SIERRA                    ┃ │ │   │    │
│  │ │ │ ┗━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┛ │ │   │    │
│  │ │ │                                    │ │   │    │
│  │ │ │ ┌──────────────────────────────────┐ │ │   │    │
│  │ │ │ │ 📅 07/10/2025              🔴    │ │ │   │    │
│  │ │ │ │ 🕐 09:00:00 → 11:00:00           │ │ │   │    │
│  │ │ │ │ ⏱ 2h 00m                         │ │ │   │    │
│  │ │ │ │                                  │ │ │   │    │
│  │ │ │ │ Puesto: SIERRA                   │ │ │   │    │
│  │ │ │ └──────────────────────────────────┘ │ │   │    │
│  │ │ │                                    │ │   │    │
│  │ │ │ ┌──────────────────────────────────┐ │ │   │    │
│  │ │ │ │ 📅 08/10/2025                    │ │ │   │    │
│  │ │ │ │ 🕐 11:00:00 → 13:15:00           │ │ │   │    │
│  │ │ │ │ ⏱ 2h 15m                         │ │ │   │    │
│  │ │ │ │                                  │ │ │   │    │
│  │ │ │ │ Puesto: SIERRA                   │ │ │   │    │
│  │ │ │ └──────────────────────────────────┘ │ │   │    │
│  │ │ └──────────────────────────────────────┘ │   │    │
│  │ └──────────────────────────────────────────────┘   │    │
│  └────────────────────────────────────────────────────┘    │
│                                                              │
└──────────────────────────────────────────────────────────────┘
```

**Leyenda:**
- 🔴 = Icono de alerta rojo
- ┏━━┓ = Borde rojo para registro fuera de turno
- [⚠️ 1h 30m fuera de turno] = Badge rojo en el nombre

---

## 📊 Vista Resumida - Por Pedido

```
┌──────────────────────────────────────────────────────────────┐
│  ← Pedido: PED001                                         ✕  │
├──────────────────────────────────────────────────────────────┤
│                                                              │
│  📋 Pedido: PED001                                          │
│  Tiempo: 15h 45m · Operarios: 3 · Módulos: 2               │
│                                                              │
│  ┌────────────────────────────────────────────────────┐    │
│  │ 🔧 V01.01                                           │    │
│  │                                                      │    │
│  │ ┌──────────────────────────────────────────────┐   │    │
│  │ │ ⚙️ Tarea: CORTE                               │   │    │
│  │ │                                                │   │    │
│  │ │ 👤 JUAN  [⚠️ 1h 30m]                         │   │    │
│  │ │ Registros: 3 · Tiempo: 4h 15m                │   │    │
│  │ │                                                │   │    │
│  │ │ 👤 PEDRO                                       │   │    │
│  │ │ Registros: 2 · Tiempo: 3h 00m                │   │    │
│  │ └──────────────────────────────────────────────┘   │    │
│  │                                                      │    │
│  │ ┌──────────────────────────────────────────────┐   │    │
│  │ │ ⚙️ Tarea: ARMADO                              │   │    │
│  │ │                                                │   │    │
│  │ │ 👤 JUAN  [⚠️ 45m]                            │   │    │
│  │ │ Registros: 2 · Tiempo: 2h 30m                │   │    │
│  │ │                                                │   │    │
│  │ │ 👤 MARIA  [⚠️ 2h 15m]                        │   │    │
│  │ │ Registros: 4 · Tiempo: 6h 00m                │   │    │
│  │ └──────────────────────────────────────────────┘   │    │
│  └────────────────────────────────────────────────────┘    │
│                                                              │
│  ┌────────────────────────────────────────────────────┐    │
│  │ 🔧 V02.01                                           │    │
│  │                                                      │    │
│  │ ┌──────────────────────────────────────────────┐   │    │
│  │ │ ⚙️ Tarea: HERRAJE                             │   │    │
│  │ │                                                │   │    │
│  │ │ 👤 PEDRO  [⚠️ 30m]                           │   │    │
│  │ │ Registros: 1 · Tiempo: 1h 45m                │   │    │
│  │ └──────────────────────────────────────────────┘   │    │
│  └────────────────────────────────────────────────────┘    │
│                                                              │
└──────────────────────────────────────────────────────────────┘
```

---

## 🎨 Detalles de Diseño

### Badge de Tiempo Fuera de Turno

```
┌─────────────────────────────┐
│  ⚠️ 1h 30m fuera de turno   │  ← Fondo: #fee2e2 (rojo claro)
└─────────────────────────────┘     Texto: #dc2626 (rojo fuerte)
```

### Registro Normal vs Fuera de Turno

**Registro Normal:**
```
┌──────────────────────────────────┐
│ 📅 08/10/2025                    │  ← Fondo blanco
│ 🕐 11:00:00 → 13:00:00           │
│ ⏱ 2h 00m                         │
│ Puesto: SIERRA                   │
└──────────────────────────────────┘
```

**Registro Fuera de Turno:**
```
┏━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┓
┃ 📅 08/10/2025              🔴   ┃  ← Fondo: #fef2f2 (rosa claro)
┃ 🕐 05:00:00 → 08:00:00          ┃     Borde izq: #dc2626 (rojo)
┃ ⏱ 3h 00m                        ┃
┃                                 ┃
┃ ⚠️ 1h 30m fuera del horario     ┃  ← Texto rojo italic
┃    laboral (6:30-9:30, 10:30-   ┃
┃    14:30)                        ┃
┃                                 ┃
┃ Puesto: SIERRA                  ┃
┗━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┛
```

---

## 📈 Ejemplos de Casos Reales

### Caso 1: Operario que Llega Temprano
```
┌────────────────────────────────────────────────────┐
│ 👤 JUAN  [⚠️ 1h 30m fuera de turno]              │
│                                                    │
│ Registros: 5 · Tiempo: 8h 15m · Fechas: 07/10    │
│                                                    │
│ ┏━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┓   │
│ ┃ 📅 07/10/2025 · 🕐 05:00 → 09:00    🔴   ┃   │
│ ┃ ⏱ 4h 00m                                  ┃   │
│ ┃                                           ┃   │
│ ┃ ⚠️ 1h 30m fuera del horario laboral      ┃   │
│ ┗━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┛   │
│                                                    │
│ ┌──────────────────────────────────────────────┐ │
│ │ 📅 07/10/2025 · 🕐 10:30 → 14:30            │ │
│ │ ⏱ 4h 00m                                    │ │
│ └──────────────────────────────────────────────┘ │
└────────────────────────────────────────────────────┘

Análisis:
- Entrada: 5:00 (1h 30m antes de inicio)
- Turno regular: 6:30 - 9:00 (2h 30m)
- Total turno 1: 4h (1h 30m fuera + 2h 30m dentro)
- Turno 2: 10:30 - 14:30 (4h normales)
```

### Caso 2: Trabajo Continuo sin Descanso
```
┌────────────────────────────────────────────────────┐
│ 👤 MARIA  [⚠️ 1h 00m fuera de turno]             │
│                                                    │
│ Registros: 1 · Tiempo: 5h 00m · Fechas: 08/10    │
│                                                    │
│ ┏━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┓   │
│ ┃ 📅 08/10/2025 · 🕐 08:00 → 13:00    🔴   ┃   │
│ ┃ ⏱ 5h 00m                                  ┃   │
│ ┃                                           ┃   │
│ ┃ ⚠️ 1h 00m fuera del horario laboral      ┃   │
│ ┃    (trabajó durante el descanso)          ┃   │
│ ┗━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┛   │
└────────────────────────────────────────────────────┘

Análisis:
- 08:00 - 09:30: 1h 30m (turno 1) ✓
- 09:30 - 10:30: 1h 00m (descanso) ✗ FUERA
- 10:30 - 13:00: 2h 30m (turno 2) ✓
- Total: 5h (4h dentro + 1h fuera)
```

### Caso 3: Horas Extra al Final del Día
```
┌────────────────────────────────────────────────────┐
│ 👤 PEDRO  [⚠️ 2h 00m fuera de turno]             │
│                                                    │
│ Registros: 2 · Tiempo: 9h 00m · Fechas: 08/10    │
│                                                    │
│ ┌──────────────────────────────────────────────┐ │
│ │ 📅 08/10/2025 · 🕐 06:30 → 09:30            │ │
│ │ ⏱ 3h 00m                                    │ │
│ └──────────────────────────────────────────────┘ │
│                                                    │
│ ┏━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┓   │
│ ┃ 📅 08/10/2025 · 🕐 10:30 → 16:30   🔴    ┃   │
│ ┃ ⏱ 6h 00m                                  ┃   │
│ ┃                                           ┃   │
│ ┃ ⚠️ 2h 00m fuera del horario laboral      ┃   │
│ ┃    (continuó después de las 14:30)        ┃   │
│ ┗━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┛   │
└────────────────────────────────────────────────────┘

Análisis:
- Turno 1: 06:30 - 09:30 (3h) ✓
- Turno 2: 10:30 - 14:30 (4h) ✓
- Extra: 14:30 - 16:30 (2h) ✗ FUERA
```

---

## 🔍 Filtros y Búsqueda

El sistema mantiene los indicadores en todas las vistas:

### Vista de Lista Principal
```
┌──────────────────────────────────────────────────────┐
│  🔍 Buscar operario / pedido / tarea / módulo       │
├──────────────────────────────────────────────────────┤
│                                                      │
│  [ Operadores·6 ] [ Tareas·9 ] [ Pedidos·15 ]      │
│                                                      │
│  ┌────────────────────────────────────────────┐    │
│  │ JUAN                             8h 30m    │    │
│  │ 12 registros                     [⚠️]       │    │  ← Indicador pequeño
│  │                                            │    │
│  │ Fechas: 07/10/2025 — 08/10/2025          │    │
│  │ Pedido(s): 3 · Tarea(s): 5                │    │
│  │                                            │    │
│  │                    Ver detalle →           │    │
│  └────────────────────────────────────────────┘    │
│                                                      │
│  ┌────────────────────────────────────────────┐    │
│  │ PEDRO                            7h 15m    │    │
│  │ 8 registros                               │    │
│  │                                            │    │
│  │ Fechas: 07/10/2025 — 08/10/2025          │    │
│  │ Pedido(s): 2 · Tarea(s): 4                │    │
│  │                                            │    │
│  │                    Ver detalle →           │    │
│  └────────────────────────────────────────────┘    │
└──────────────────────────────────────────────────────┘
```

**Nota**: En la vista principal, se podría añadir un indicador pequeño (⚠️) en la tarjeta para identificar rápidamente operarios con fichajes fuera de turno.

---

## 📱 Responsive Design

### En Móvil
- Badge más compacto: `[⚠️ 1h 30m]`
- Detalle del tiempo fuera en 2 líneas
- Iconos más pequeños (12px)

### En Tablet/Web
- Badge completo: `[⚠️ 1h 30m fuera de turno]`
- Detalle del tiempo en 1 línea
- Iconos tamaño normal (14-16px)

---

**Nota**: Los ejemplos visuales usan caracteres ASCII para demostración. En la app real se usan componentes React Native con estilos personalizados.
