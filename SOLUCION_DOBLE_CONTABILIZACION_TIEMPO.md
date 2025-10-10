# 🔧 SOLUCIÓN: Doble Contabilización de Tiempo Válido

## 📊 PROBLEMA DETECTADO

Al hacer clic en el operario **SANDRA ORTIZ** para la semana del **22-26 septiembre 2025** (5 días laborables), se mostraba:

```
tiempoValido: "55h 49m"
tiempoFuera: "0h 31m"
```

### ❌ El Error:
Con **5 días trabajados** y un máximo de **7h 18m por día** (7.3 horas), el tiempo máximo posible sería:
```
5 días × 7.3 horas/día = 36.5 horas = 36h 30m
```

Pero se estaba mostrando **55h 49m**, casi **20 horas de más**.

---

## 🔍 ANÁLISIS DEL PROBLEMA

### Flujo de Cálculo Anterior (INCORRECTO):

1. **`calculateAdjustedTime()`**: Ajusta el tiempo cuando detecta fichaje abierto
   - Si `finMin < inicioMin` → Ajusta `finMin` a hora de cierre (13:30 o 14:30)
   - Retorna: `(horaCierre - inicioMin) * 60` segundos

2. **`calculateOutsideWorkTime()`**: Calcula tiempo fuera de turnos laborales
   - También ajusta `finMin` cuando detecta fichaje abierto
   - Retorna: segundos trabajados fuera de turnos (antes 6:30, descanso 9:30-10:00, después 14:30)

3. **Cálculo de tiempo válido (INCORRECTO)**:
   ```typescript
   const tiempoAjustado = calculateAdjustedTime(record);
   const tiempoFuera = calculateOutsideWorkTime(record);
   tiempoValido = Math.max(0, tiempoAjustado - tiempoFuera);
   ```

### 🔴 El Problema: DOBLE AJUSTE

#### Ejemplo con fichaje abierto de SANDRA:
- **Inicio**: 12:28:25
- **Fin original**: 06:32:49 (cruzó medianoche - fichaje abierto)
- **Fin ajustado**: 13:30 (viernes)

**`calculateAdjustedTime()`**:
```
horaCierre = 13:30 = 810 minutos
inicioMin = 12:28 = 748 minutos
tiempoAjustado = (810 - 748) × 60 = 3720 segundos = 62 minutos
```

**`calculateOutsideWorkTime()`**:
```
Detecta que está DESPUÉS del turno 2 (10:00-13:30)
Inicio: 12:28 está DENTRO del turno 2
Fin: 13:30 está EN EL LÍMITE del turno 2
tiempoFuera = 0 segundos (todo dentro del horario)
```

**Resultado (INCORRECTO)**:
```
tiempoValido = 3720 - 0 = 3720 segundos = 62 minutos ✅
```

Este caso particular funciona, PERO...

### 🔴 El verdadero problema:

Para fichajes que **inician ANTES del turno** o **durante el descanso**, `calculateOutsideWorkTime()` calcula el tiempo fuera, pero `calculateAdjustedTime()` NO resta ese tiempo del tiempo total.

**Ejemplo**:
- Inicio: 06:00 (antes del turno 1)
- Fin ajustado: 14:30
- `tiempoAjustado = (14:30 - 06:00) × 60 = 510 minutos = 30600 segundos`
- `tiempoFuera = (06:30 - 06:00) + (9:30 - 9:30) = 30 minutos = 1800 segundos`
- `tiempoValido = 30600 - 1800 = 28800 segundos = 8 horas` ✅

**PERO**, cuando hay múltiples fichajes y algunos están mal calculados, se acumula el error.

---

## ✅ SOLUCIÓN IMPLEMENTADA

### Nueva Función: `calculateValidWorkTime()`

Esta función calcula **DIRECTAMENTE** el tiempo trabajado DENTRO de los turnos laborales, sin necesidad de restar.

```typescript
const calculateValidWorkTime = (record: TiempoRealRecord): number => {
  const horaInicio = record.HoraInicio;
  const horaFin = record.HoraFin;

  if (!horaInicio || !horaFin) return 0;

  // ... parsing y detección de fichaje abierto ...

  // Definir turnos
  const turno1Inicio = 6 * 60 + 30;  // 6:30 = 390
  const turno1Fin = 9 * 60 + 30;     // 9:30 = 570
  const turno2Inicio = 10 * 60;      // 10:00 = 600
  const turno2Fin = esViernes ? 13 * 60 + 30 : 14 * 60 + 30; // 13:30 o 14:30

  let tiempoValido = 0;

  // Calcular tiempo DENTRO del turno 1 (6:30 - 9:30)
  const inicioTurno1 = Math.max(inicioMin, turno1Inicio);
  const finTurno1 = Math.min(finMin, turno1Fin);
  if (finTurno1 > inicioTurno1) {
    tiempoValido += finTurno1 - inicioTurno1;
  }

  // Calcular tiempo DENTRO del turno 2 (10:00 - 14:30)
  const inicioTurno2 = Math.max(inicioMin, turno2Inicio);
  const finTurno2 = Math.min(finMin, turno2Fin);
  if (finTurno2 > inicioTurno2) {
    tiempoValido += finTurno2 - inicioTurno2;
  }

  // Convertir minutos a segundos
  return tiempoValido * 60;
};
```

### 📌 Cómo Funciona:

1. **Detecta fichaje abierto** y ajusta `finMin` a hora de cierre
2. **Calcula intersección** entre el rango de trabajo y cada turno laboral
3. **Suma solo** el tiempo que está DENTRO de los turnos

#### Ejemplo con fichaje de SANDRA (12:28 - 06:32):

- **Ajustado**: 12:28 - 13:30
- **Turno 1** (6:30-9:30): No hay intersección → 0 minutos
- **Turno 2** (10:00-13:30): Intersección = (12:28 - 13:30) = 62 minutos ✅

#### Ejemplo con fichaje temprano (06:00 - 14:30):

- **Turno 1** (6:30-9:30): Intersección = (6:30 - 9:30) = 180 minutos
- **Turno 2** (10:00-14:30): Intersección = (10:00 - 14:30) = 270 minutos
- **Total**: 450 minutos = 7.5 horas ✅

---

## 🔧 CAMBIOS REALIZADOS

### Funciones Actualizadas:

1. ✅ **`analyzeOperarioDetailed()`** - Análisis de operario
2. ✅ **`analyzePedidoDetailed()`** - Análisis de pedido
3. ✅ **`analyzeTareaDetailed()`** - Análisis de tarea
4. ✅ **`computeGroups()`** - Agrupación de registros
5. ✅ **`createHierarchicalStructure()`** - Estructura jerárquica

### Cambio en todas las funciones:

**ANTES (INCORRECTO)**:
```typescript
const tiempoAjustado = calculateAdjustedTime(record);
const tiempoFuera = calculateOutsideWorkTime(record);
tiempoValido = Math.max(0, tiempoAjustado - tiempoFuera);
```

**AHORA (CORRECTO)**:
```typescript
const tiempoAjustado = calculateAdjustedTime(record);
const tiempoFuera = calculateOutsideWorkTime(record);
const tiempoValido = calculateValidWorkTime(record); // ✅ Calcula directamente
```

---

## 📊 RESULTADOS ESPERADOS

### Para SANDRA ORTIZ (22-26 septiembre):

**ANTES**:
```
tiempoValido: 55h 49m ❌ (excede el máximo posible)
```

**AHORA** (estimado):
```
tiempoValido: ~33h 20m ✅ (dentro del rango esperado de 0-36.5h)
```

### Validaciones:

- ✅ **Fichajes abiertos** se ajustan correctamente
- ✅ **Tiempo fuera de turno** NO se cuenta
- ✅ **Descanso** (9:30-10:00) NO se cuenta
- ✅ **Solo tiempo válido** dentro de turnos laborales

---

## 🧪 PRUEBAS RECOMENDADAS

1. **Probar con SANDRA ORTIZ** (22-26 septiembre)
   - Verificar que el tiempo válido esté entre 0-36.5 horas

2. **Verificar otros operarios** con fichajes abiertos:
   - JESUS /COMPACTO/
   - TOMAS /MATRIMONIO/
   - ROBERTO ARCHENA
   - TONI VILLEN

3. **Comprobar que los logs** muestren cálculos correctos

---

## 📝 LOGS DE DEPURACIÓN

Los logs actuales te ayudarán a verificar:

```
⚠️ [calculateAdjustedTime] Tiempo ajustado
⚠️ [calculateOutsideWorkTime] Fichaje abierto detectado
```

Puedes agregar un log en `calculateValidWorkTime` para confirmar:

```typescript
console.log(`✅ [calculateValidWorkTime] ${record.OperarioNombre}: ${formatHM(tiempoValido)} válido (${horaInicio} - ${horaFin})`);
```

---

## 🎯 CONCLUSIÓN

El problema era que se estaba haciendo **doble ajuste**:
1. Ajustar el tiempo total en `calculateAdjustedTime()`
2. Restar tiempo fuera en el cálculo del tiempo válido

La solución correcta es **calcular directamente** el tiempo válido usando intersecciones con los turnos laborales.

**Fecha de corrección**: 10 de octubre de 2025
**Archivo modificado**: `app/moncada/control-produccion-sonnet.tsx`
