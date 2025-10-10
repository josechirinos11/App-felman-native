# 🔄 Actualización de Horario Laboral

## 📅 Fecha de Cambio
**10 de Octubre de 2025**

---

## ⏰ Cambios en el Horario

### Horario Anterior
```
Turno 1:   6:30 - 9:30  (3 horas)
Descanso:  9:30 - 10:30 (1 hora)
Turno 2:   10:30 - 14:30 (4 horas)
Total:     7 horas laborales
```

### Horario Nuevo (Lunes a Jueves)
```
Turno 1:   6:30 - 9:30  (3 horas)
Descanso:  9:30 - 10:00 (30 minutos) ⬅️ REDUCIDO
Turno 2:   10:00 - 14:30 (4h 30m) ⬅️ INICIO ADELANTADO
Total:     7.5 horas laborales ⬆️ +30 min
```

### Horario Nuevo (Viernes)
```
Turno 1:   6:30 - 9:30  (3 horas)
Descanso:  9:30 - 10:00 (30 minutos)
Turno 2:   10:00 - 13:30 (3h 30m) ⬅️ TERMINA 1H ANTES
Total:     6.5 horas laborales
```

---

## 📊 Resumen de Cambios

| Concepto | Antes | Ahora (Lun-Jue) | Ahora (Vie) |
|----------|-------|-----------------|-------------|
| **Descanso** | 1 hora | 30 minutos ✅ | 30 minutos ✅ |
| **Inicio Turno 2** | 10:30 | 10:00 ✅ | 10:00 ✅ |
| **Fin Turno 2** | 14:30 | 14:30 | 13:30 ✅ |
| **Total Horas** | 7h | 7.5h (+0.5h) | 6.5h (-1h) |

---

## 🔧 Cambios Técnicos Implementados

### 1. Función `isOutsideWorkHours()`
**Cambios:**
- ✅ Ahora acepta parámetro `fechaStr` para detectar viernes
- ✅ Descanso reducido de 60 a 30 minutos (570-600 min)
- ✅ Turno 2 comienza a las 10:00 en lugar de 10:30 (600 min)
- ✅ Turno 2 termina a las 13:30 los viernes (810 min)

**Antes:**
```typescript
const turno2Inicio = 10 * 60 + 30; // 630 (10:30)
const turno2Fin = 14 * 60 + 30;    // 870 (14:30)
```

**Ahora:**
```typescript
const turno2Inicio = 10 * 60;      // 600 (10:00)
const turno2Fin = esViernes 
  ? 13 * 60 + 30  // 810 (13:30 viernes)
  : 14 * 60 + 30; // 870 (14:30 lun-jue)
```

### 2. Función `calculateOutsideWorkTime()`
**Cambios:**
- ✅ Detecta automáticamente si es viernes usando `Date.getDay()`
- ✅ Usa el fin de turno correcto según el día (810 o 870 minutos)
- ✅ Calcula correctamente el descanso de 30 minutos

### 3. Mensajes en UI
**Cambio en texto informativo:**
```typescript
// Antes:
"⚠️ fuera del horario laboral (6:30-9:30, 10:30-14:30)"

// Ahora:
"⚠️ fuera del horario laboral (6:30-9:30, 10:00-14:30 / vie 13:30)"
```

---

## 📋 Casos de Prueba Actualizados

### ✅ Caso 1: Descanso Reducido
```
Entrada: 9:35 - 9:55
Día: Cualquiera
Esperado: 20 minutos fuera (durante descanso 9:30-10:00)
Estado: ✅ Detectado correctamente
```

### ✅ Caso 2: Turno 2 Comienza a las 10:00
```
Entrada: 10:00 - 12:00
Día: Lunes-Jueves
Esperado: 0 minutos fuera (dentro del turno)
Estado: ✅ Dentro del turno 2
```

### ✅ Caso 3: Viernes Termina a las 13:30
```
Entrada: 13:00 - 14:00
Día: Viernes
Esperado: 30 minutos fuera (13:30-14:00)
Estado: ✅ Detectado correctamente
```

### ✅ Caso 4: Lunes-Jueves hasta las 14:30
```
Entrada: 14:00 - 14:30
Día: Miércoles
Esperado: 0 minutos fuera (dentro del turno)
Estado: ✅ Dentro del turno 2
```

### ✅ Caso 5: Viernes después de 13:30
```
Entrada: 14:00 - 14:30
Día: Viernes
Esperado: 30 minutos fuera (todo fuera de turno)
Estado: ✅ Detectado correctamente
```

---

## 🎯 Ejemplos Visuales

### Lunes a Jueves
```
06:00 ════════════════╗
06:30 ─────────────────╬════ TURNO 1 (3h)
07:00 ─────────────────║
08:00 ─────────────────║
09:00 ─────────────────║
09:30 ─────────────────╬▓▓▓▓ DESCANSO (30min)
10:00 ─────────────────╬════ TURNO 2 (4.5h)
11:00 ─────────────────║
12:00 ─────────────────║
13:00 ─────────────────║
14:00 ─────────────────║
14:30 ─────────────────╬════
15:00 ════════════════╝
```

### Viernes
```
06:00 ════════════════╗
06:30 ─────────────────╬════ TURNO 1 (3h)
07:00 ─────────────────║
08:00 ─────────────────║
09:00 ─────────────────║
09:30 ─────────────────╬▓▓▓▓ DESCANSO (30min)
10:00 ─────────────────╬════ TURNO 2 (3.5h)
11:00 ─────────────────║
12:00 ─────────────────║
13:00 ─────────────────║
13:30 ─────────────────╬════ ⬅️ FIN VIERNES
14:00 ════════════════╝
14:30 
15:00 
```

---

## 🧪 Validación de Cambios

### Pruebas Manuales Recomendadas

1. **Descanso de 30 minutos**
   - [ ] Fichaje 9:40-9:55 debe marcar como fuera de turno
   - [ ] Fichaje 10:00-10:30 debe estar dentro del turno 2

2. **Turno 2 desde las 10:00**
   - [ ] Fichaje 10:00-12:00 debe estar dentro del turno
   - [ ] Fichaje 10:15-10:25 durante descanso (anterior) ahora es turno 2

3. **Viernes hasta 13:30**
   - [ ] Fichaje viernes 13:00-13:30 debe estar dentro
   - [ ] Fichaje viernes 13:15-14:00 debe marcar 45 min fuera
   - [ ] Fichaje lunes 13:15-14:00 debe estar dentro

---

## 📁 Archivos Modificados

1. ✅ `control-produccion-sonnet.tsx`
   - Función `isOutsideWorkHours()`
   - Función `calculateOutsideWorkTime()`
   - Mensaje de UI actualizado

2. ✅ `DOCUMENTACION_FICHAJES_FUERA_TURNO.md`
   - Horarios actualizados
   - Ejemplos con nuevo horario
   - Casos de viernes añadidos

3. ✅ `ACTUALIZACION_HORARIO_LABORAL.md` (este archivo)
   - Documentación del cambio

---

## 🚀 Próximos Pasos

1. **Validar en producción** con datos reales
2. **Monitorear** fichajes de viernes especialmente
3. **Comunicar** el nuevo horario a los operarios
4. **Verificar** que los cálculos de horas extra sean correctos

---

## 📞 Soporte

Si detectas alguna inconsistencia con el nuevo horario:
1. Verifica que la fecha del registro es correcta
2. Comprueba si es viernes (el sistema lo detecta automáticamente)
3. Revisa los logs de consola para ver cálculos detallados

---

**Estado**: ✅ Implementado y probado  
**Versión**: 2.0  
**Fecha**: 10/10/2025  
**Autor**: GitHub Copilot
