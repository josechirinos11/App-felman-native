# Análisis del Flujo de Fechas - Control de Producción

## 🎯 Objetivo
Detectar dónde ocurre el desfase entre la fecha que introduce el usuario y la fecha que se envía al backend.

## 📊 Flujo Completo de Fechas

### 1️⃣ **Inicialización de Fechas** (Líneas ~1213-1226)
```typescript
const today = new Date();
const lastMonday = getLastMonday(today);
const [fromDate, setFromDate] = useState<Date>(lastMonday);
const [toDate, setToDate] = useState<Date>(today);
```

**LOG AGREGADO:**
```typescript
console.log('[FECHA-DEBUG] 🔷 Inicialización de fechas:', {
  today: today.toISOString(),
  todayLocal: formatDateLocal(today),
  lastMonday: lastMonday.toISOString(),
  lastMondayLocal: formatDateLocal(lastMonday),
  todayTimezone: today.toString(),
  lastMondayTimezone: lastMonday.toString()
});
```

**¿Qué verificar?**
- ✅ Si las fechas iniciales se crean correctamente en hora local
- ✅ Si hay conversión a UTC que cambia el día

---

### 2️⃣ **Función formatDateLocal** (Líneas ~280-297)
Esta función convierte un objeto `Date` a formato string `YYYY-MM-DD`.

```typescript
const formatDateLocal = (date: Date): string => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};
```

**LOG AGREGADO:**
```typescript
console.log('[FECHA-DEBUG] 📅 formatDateLocal:', {
  input: date.toISOString(),
  inputLocal: date.toString(),
  year,
  month,
  day,
  output: formatted,
  getDate: date.getDate(),
  getMonth: date.getMonth(),
  getFullYear: date.getFullYear()
});
```

**¿Qué verificar?**
- ✅ Si `getDate()` devuelve el día correcto
- ✅ Si hay cambio de día por timezone (ej: 23:00 del día X se convierte en 00:00 del día X+1)

---

### 3️⃣ **Input Web - Campo DESDE** (Líneas ~2543-2566)
Cuando el usuario escribe una fecha en el input web.

```typescript
onChangeText={(v) => {
  if (v) {
    console.log('[FECHA-DEBUG] 💻 Input Web DESDE - Usuario escribió:', v);
    const [year, month, day] = v.split('-').map(Number);
    console.log('[FECHA-DEBUG] 💻 Input Web DESDE - Parseado:', { year, month, day });
    const newDate = new Date(year, month - 1, day, 12, 0, 0);
    console.log('[FECHA-DEBUG] 💻 Input Web DESDE - Fecha creada:', {
      newDate: newDate.toISOString(),
      newDateLocal: newDate.toString(),
      formatDateLocal: formatDateLocal(newDate)
    });
    setFromDate(newDate);
  }
}}
```

**¿Qué verificar?**
- ✅ Si el valor que escribe el usuario es correcto
- ✅ Si al crear `new Date(year, month - 1, day, 12, 0, 0)` se respeta la hora local
- ✅ Si `formatDateLocal` devuelve la misma fecha que escribió el usuario

---

### 4️⃣ **Input Web - Campo HASTA** (Líneas ~2568-2591)
Similar al campo DESDE.

```typescript
onChangeText={(v) => {
  if (v) {
    console.log('[FECHA-DEBUG] 💻 Input Web HASTA - Usuario escribió:', v);
    const [year, month, day] = v.split('-').map(Number);
    console.log('[FECHA-DEBUG] 💻 Input Web HASTA - Parseado:', { year, month, day });
    const newDate = new Date(year, month - 1, day, 12, 0, 0);
    console.log('[FECHA-DEBUG] 💻 Input Web HASTA - Fecha creada:', {
      newDate: newDate.toISOString(),
      newDateLocal: newDate.toString(),
      formatDateLocal: formatDateLocal(newDate)
    });
    setToDate(newDate);
  }
}}
```

---

### 5️⃣ **DateTimePicker - Campo DESDE** (Líneas ~2593-2618)
Cuando el usuario selecciona una fecha en el picker móvil.

```typescript
onChange={(event, selectedDate) => {
  setShowFromPicker(false);
  if (selectedDate) {
    console.log('[FECHA-DEBUG] 📱 DateTimePicker DESDE - Usuario seleccionó:', {
      selectedDate: selectedDate.toISOString(),
      selectedDateLocal: selectedDate.toString(),
      getDate: selectedDate.getDate(),
      getMonth: selectedDate.getMonth(),
      getFullYear: selectedDate.getFullYear()
    });
    const normalized = new Date(selectedDate);
    normalized.setHours(12, 0, 0, 0);
    console.log('[FECHA-DEBUG] 📱 DateTimePicker DESDE - Después de normalizar:', {
      normalized: normalized.toISOString(),
      normalizedLocal: normalized.toString(),
      formatDateLocal: formatDateLocal(normalized)
    });
    setFromDate(normalized);
  }
}}
```

**¿Qué verificar?**
- ✅ Si `selectedDate` trae la fecha correcta del picker
- ✅ Si al llamar `setHours(12, 0, 0, 0)` se mantiene en hora local
- ✅ Si hay conversión implícita a UTC

---

### 6️⃣ **DateTimePicker - Campo HASTA** (Líneas ~2628-2653)
Similar al DateTimePicker DESDE.

```typescript
onChange={(event, selectedDate) => {
  setShowToPicker(false);
  if (selectedDate) {
    console.log('[FECHA-DEBUG] 📱 DateTimePicker HASTA - Usuario seleccionó:', {
      selectedDate: selectedDate.toISOString(),
      selectedDateLocal: selectedDate.toString(),
      getDate: selectedDate.getDate(),
      getMonth: selectedDate.getMonth(),
      getFullYear: selectedDate.getFullYear()
    });
    const normalized = new Date(selectedDate);
    normalized.setHours(12, 0, 0, 0);
    console.log('[FECHA-DEBUG] 📱 DateTimePicker HASTA - Después de normalizar:', {
      normalized: normalized.toISOString(),
      normalizedLocal: normalized.toString(),
      formatDateLocal: formatDateLocal(normalized)
    });
    setToDate(normalized);
  }
}}
```

---

### 7️⃣ **Botón Refresh** (Líneas ~2660-2675)
Cuando el usuario presiona el botón de refrescar.

```typescript
onPress={() => {
  console.log('[FECHA-DEBUG] 🔄 Botón REFRESH presionado');
  console.log('[FECHA-DEBUG] 🔄 Fechas actuales en estado:', {
    fromDate: fromDate.toISOString(),
    fromDateLocal: fromDate.toString(),
    toDate: toDate.toISOString(),
    toDateLocal: toDate.toString()
  });
  const formattedFrom = formatDateLocal(fromDate);
  const formattedTo = formatDateLocal(toDate);
  console.log('[FECHA-DEBUG] 🔄 Fechas formateadas a enviar:', { formattedFrom, formattedTo });
  fetchTiempoReal(formattedFrom, formattedTo);
}}
```

**¿Qué verificar?**
- ✅ Si las fechas en el estado son correctas
- ✅ Si `formatDateLocal` devuelve las fechas correctas
- ✅ Comparar con lo que se envía al backend

---

### 8️⃣ **Función fetchTiempoReal** (Líneas ~1243-1248)
Función que envía la petición al backend.

```typescript
async function fetchTiempoReal(from: string, to: string) {
  try {
    setLoadingTiempo(true);
    console.log('[FECHA-DEBUG] 🚀 fetchTiempoReal llamado:', { from, to });
    console.log('[FECHA-DEBUG] 🌐 URL completa:', 
      `${API_URL}/control-terminales/production-analytics?start=${from}&end=${to}`);
    // ...resto del código
  }
}
```

**¿Qué verificar?**
- ✅ Si los parámetros `from` y `to` son los correctos
- ✅ Si la URL final tiene las fechas esperadas

---

### 9️⃣ **useEffect Inicial** (Líneas ~1230-1239)
Se ejecuta al montar el componente.

```typescript
useEffect(() => {
  console.log('[FECHA-DEBUG] 🔷 useEffect inicial - Fechas antes de enviar:', {
    fromDate: fromDate.toISOString(),
    fromDateLocal: formatDateLocal(fromDate),
    toDate: toDate.toISOString(),
    toDateLocal: formatDateLocal(toDate),
  });
  fetchTiempoReal(formatDateLocal(fromDate), formatDateLocal(toDate));
}, []);
```

---

## 🔍 Puntos Críticos a Verificar

### A) Conversión UTC vs Local Time
El problema más común es cuando:
```javascript
// Usuario está en UTC-5 (por ejemplo)
const fecha = new Date('2024-10-10'); // Se interpreta como 2024-10-10T00:00:00Z (medianoche UTC)
// Pero en la zona horaria local es 2024-10-09T19:00:00 (7pm del día anterior)
fecha.getDate(); // Devuelve 9 en lugar de 10
```

**Solución implementada:**
```javascript
// Crear fecha en hora local (no UTC)
const newDate = new Date(year, month - 1, day, 12, 0, 0); // Mediodía local
```

### B) Función formatDateLocal
Esta función usa métodos locales:
- `getFullYear()` - año local
- `getMonth()` - mes local (0-11)
- `getDate()` - día local

**Si hay desfase aquí**, significa que el objeto `Date` ya tiene la fecha incorrecta.

### C) DateTimePicker nativo
En móvil, el `DateTimePicker` puede devolver fechas en diferentes timezones según la configuración del dispositivo.

---

## 📱 Cómo Usar los Logs

### En desarrollo con Expo:
1. Ejecutar: `npx expo start`
2. Abrir la consola de Metro
3. Buscar logs con el prefijo `[FECHA-DEBUG]`

### Filtrar logs en la consola:
```javascript
// En Chrome DevTools o navegador
console.log = (function(oldLog) {
  return function(...args) {
    if (args[0]?.includes?.('[FECHA-DEBUG]')) {
      oldLog.apply(console, args);
    }
  };
})(console.log);
```

---

## 🎨 Iconos de los Logs

| Icono | Significado |
|-------|------------|
| 🔷 | Inicialización / useEffect |
| 📅 | Función formatDateLocal |
| 💻 | Input web (campo de texto) |
| 📱 | DateTimePicker (selector móvil) |
| 🔄 | Botón refresh |
| 🚀 | Llamada a fetchTiempoReal |
| 🌐 | URL completa al backend |

---

## ✅ Checklist de Verificación

1. [ ] Verificar que las fechas iniciales se crean correctamente
2. [ ] Verificar que `formatDateLocal` no cambia el día
3. [ ] Verificar que el input web crea fechas en hora local
4. [ ] Verificar que el DateTimePicker devuelve fechas correctas
5. [ ] Verificar que el botón refresh usa las fechas correctas del estado
6. [ ] Verificar que `fetchTiempoReal` recibe las fechas correctas
7. [ ] Verificar la URL final que se envía al backend

---

## 🐛 Posibles Causas del Desfase

### 1. Zona horaria negativa (oeste de UTC)
Si estás en UTC-5, una fecha creada a medianoche UTC será del día anterior en tu hora local.

### 2. Función formatDateLocal incorrecta
Si usa `toISOString()` en lugar de métodos locales como `getDate()`.

### 3. DateTimePicker devolviendo fecha UTC
El picker nativo podría devolver fechas en UTC en lugar de hora local.

### 4. Constructor Date con string
```javascript
new Date('2024-10-10') // UTC
new Date(2024, 9, 10, 12, 0, 0) // Local (octubre es mes 9)
```

---

## 🔧 Soluciones Aplicadas

1. ✅ Agregar logs en todos los puntos del flujo
2. ✅ Usar `new Date(year, month - 1, day, 12, 0, 0)` para crear fechas en hora local
3. ✅ Normalizar a mediodía (12:00) para evitar problemas de cambio de día
4. ✅ Usar métodos locales: `getDate()`, `getMonth()`, `getFullYear()`

---

## 📝 Siguiente Paso

Ejecutar la aplicación y revisar los logs para identificar exactamente dónde ocurre el cambio de fecha:

```bash
npx expo start
```

Luego, buscar en la consola los logs `[FECHA-DEBUG]` y comparar:
- Fecha que introduce el usuario
- Fecha después de crear el objeto Date
- Fecha después de formatDateLocal
- Fecha enviada al backend
