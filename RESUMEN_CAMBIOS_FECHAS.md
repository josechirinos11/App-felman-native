# Resumen de Cambios: Detección de Desfase de Fechas

## 📋 Cambios Realizados

Se agregaron logs detallados en el archivo `control-produccion-sonnet.tsx` para rastrear el flujo completo de las fechas desde que el usuario las introduce hasta que se envían al backend.

## 🎯 Archivos Modificados

- ✅ `app/moncada/control-produccion-sonnet.tsx` - Logs agregados en 9 puntos clave
- ✅ `ANALISIS_FLUJO_FECHAS.md` - Documentación completa del flujo (NUEVO)

## 📍 Puntos de Log Agregados

### 1. Inicialización de fechas (línea ~1213)
```typescript
console.log('[FECHA-DEBUG] 🔷 Inicialización de fechas:', {...});
```

### 2. useEffect inicial (línea ~1230)
```typescript
console.log('[FECHA-DEBUG] 🔷 useEffect inicial - Fechas antes de enviar:', {...});
```

### 3. Función formatDateLocal (línea ~280)
```typescript
console.log('[FECHA-DEBUG] 📅 formatDateLocal:', {...});
```

### 4. Input Web DESDE (línea ~2543)
```typescript
console.log('[FECHA-DEBUG] 💻 Input Web DESDE - Usuario escribió:', v);
console.log('[FECHA-DEBUG] 💻 Input Web DESDE - Parseado:', {...});
console.log('[FECHA-DEBUG] 💻 Input Web DESDE - Fecha creada:', {...});
```

### 5. Input Web HASTA (línea ~2568)
```typescript
console.log('[FECHA-DEBUG] 💻 Input Web HASTA - Usuario escribió:', v);
console.log('[FECHA-DEBUG] 💻 Input Web HASTA - Parseado:', {...});
console.log('[FECHA-DEBUG] 💻 Input Web HASTA - Fecha creada:', {...});
```

### 6. DateTimePicker DESDE (línea ~2593)
```typescript
console.log('[FECHA-DEBUG] 📱 DateTimePicker DESDE - Usuario seleccionó:', {...});
console.log('[FECHA-DEBUG] 📱 DateTimePicker DESDE - Después de normalizar:', {...});
```

### 7. DateTimePicker HASTA (línea ~2628)
```typescript
console.log('[FECHA-DEBUG] 📱 DateTimePicker HASTA - Usuario seleccionó:', {...});
console.log('[FECHA-DEBUG] 📱 DateTimePicker HASTA - Después de normalizar:', {...});
```

### 8. Botón Refresh (línea ~2660)
```typescript
console.log('[FECHA-DEBUG] 🔄 Botón REFRESH presionado');
console.log('[FECHA-DEBUG] 🔄 Fechas actuales en estado:', {...});
console.log('[FECHA-DEBUG] 🔄 Fechas formateadas a enviar:', {...});
```

### 9. Función fetchTiempoReal (línea ~1243)
```typescript
console.log('[FECHA-DEBUG] 🚀 fetchTiempoReal llamado:', { from, to });
console.log('[FECHA-DEBUG] 🌐 URL completa:', {...});
```

## 🔍 Qué Información Proporciona Cada Log

Cada log muestra:
- **Fecha ISO**: `date.toISOString()` - Formato UTC
- **Fecha Local**: `date.toString()` - Con timezone local
- **Componentes**: `year`, `month`, `day`
- **Métodos locales**: `getDate()`, `getMonth()`, `getFullYear()`
- **Formato final**: Resultado de `formatDateLocal()`

## 🚀 Cómo Usar

### 1. Ejecutar la aplicación
```bash
npx expo start
```

### 2. Interactuar con el componente
- Cambiar la fecha DESDE
- Cambiar la fecha HASTA
- Presionar el botón Refresh

### 3. Revisar la consola
Buscar logs con el prefijo `[FECHA-DEBUG]` y comparar:
- ✅ Fecha que introduce el usuario
- ✅ Fecha después de procesarla
- ✅ Fecha formateada
- ✅ Fecha enviada al backend

### 4. Identificar el desfase
Comparar las fechas en cada paso para encontrar dónde cambia el día.

## 🎨 Iconos de Referencia

| Icono | Ubicación |
|-------|-----------|
| 🔷 | Inicialización / useEffect |
| 📅 | Función formatDateLocal |
| 💻 | Input web |
| 📱 | DateTimePicker móvil |
| 🔄 | Botón refresh |
| 🚀 | fetchTiempoReal |
| 🌐 | URL backend |

## 📊 Ejemplo de Salida Esperada

```
[FECHA-DEBUG] 💻 Input Web DESDE - Usuario escribió: 2024-10-10
[FECHA-DEBUG] 💻 Input Web DESDE - Parseado: { year: 2024, month: 10, day: 10 }
[FECHA-DEBUG] 💻 Input Web DESDE - Fecha creada: {
  newDate: "2024-10-10T17:00:00.000Z",
  newDateLocal: "Thu Oct 10 2024 12:00:00 GMT-0500",
  formatDateLocal: "2024-10-10"
}
[FECHA-DEBUG] 🔄 Botón REFRESH presionado
[FECHA-DEBUG] 🔄 Fechas actuales en estado: {
  fromDate: "2024-10-10T17:00:00.000Z",
  fromDateLocal: "Thu Oct 10 2024 12:00:00 GMT-0500",
  toDate: "2024-10-15T17:00:00.000Z",
  toDateLocal: "Tue Oct 15 2024 12:00:00 GMT-0500"
}
[FECHA-DEBUG] 📅 formatDateLocal: {
  input: "2024-10-10T17:00:00.000Z",
  inputLocal: "Thu Oct 10 2024 12:00:00 GMT-0500",
  year: 2024,
  month: "10",
  day: "10",
  output: "2024-10-10",
  getDate: 10,
  getMonth: 9,
  getFullYear: 2024
}
[FECHA-DEBUG] 🔄 Fechas formateadas a enviar: {
  formattedFrom: "2024-10-10",
  formattedTo: "2024-10-15"
}
[FECHA-DEBUG] 🚀 fetchTiempoReal llamado: { from: "2024-10-10", to: "2024-10-15" }
[FECHA-DEBUG] 🌐 URL completa: https://api.example.com/control-terminales/production-analytics?start=2024-10-10&end=2024-10-15
```

## ⚠️ Posibles Problemas a Buscar

1. **Desfase en inicialización**: Si `today` o `lastMonday` muestran un día diferente en `formatDateLocal`
2. **Desfase en input web**: Si el usuario escribe "2024-10-10" pero `newDate` crea "2024-10-09"
3. **Desfase en DateTimePicker**: Si el picker devuelve una fecha pero `normalized` es diferente
4. **Desfase en formatDateLocal**: Si `getDate()` devuelve un día diferente al esperado
5. **Desfase en backend**: Si la URL final tiene fechas diferentes a las del estado

## 📚 Documentación Adicional

Ver `ANALISIS_FLUJO_FECHAS.md` para:
- Explicación detallada de cada paso
- Posibles causas del desfase
- Soluciones aplicadas
- Checklist completo de verificación

## ✅ Estado

- [x] Logs agregados en todos los puntos críticos
- [x] Documentación creada
- [x] Sin errores de compilación
- [ ] Pendiente: Ejecutar y verificar logs en la consola
