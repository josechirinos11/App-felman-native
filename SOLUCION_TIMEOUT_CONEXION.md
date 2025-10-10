# Solución a Errores de Timeout y Conexión

## Fecha: 9 de octubre de 2025

## Problemas Identificados

### 1. **Error en línea 466** ❌
```tsx
.then((json: any[]) => {
```
**Causa**: Faltaba el `.json()` para parsear la respuesta del fetch.

**Solución**: ✅
```tsx
return res.json();
})
.then((json: any[]) => {
```

### 2. **Timeouts Agresivos** ⚠️
- Hook `useNetworkStatus` tenía timeout de 8 segundos
- Estaba usando endpoint pesado `/control-terminales/lotes` para verificar conexión

**Solución**: ✅
- Aumentado timeout a **12 segundos**
- Cambiado a endpoint ligero `/` (root)
- Considera exitoso cualquier status < 500 (incluyendo 401, 403, etc.)

### 3. **Bloqueo de Peticiones** 🚫
El componente verificaba `serverReachable` antes de hacer peticiones:
```tsx
if (serverReachable !== true) {
  log('⚠️ Servidor no disponible, omitiendo carga');
  return;
}
```

**Problema**: 
- La verificación tarda hasta 12 segundos
- Durante ese tiempo, NO se cargan datos
- Usuario ve "Servidor no disponible" aunque SÍ haya conexión

**Solución**: ✅
- **Eliminados todos los bloqueos** en:
  - `refreshLotes()` - Carga de lotes
  - `openModal()` - Apertura de modales
  - `loadTiemposModulo()` - Carga de tiempos
  - `loadOperarios()` - Carga de operarios
  - `useEffect` de carga inicial

- **Nueva estrategia**: 
  - ✅ Intentar siempre hacer las peticiones
  - ✅ Dejar que el fetch maneje errores naturalmente
  - ✅ Timeouts aumentados a 15 segundos para peticiones de datos
  - ✅ Mensajes de error claros si falla

## Cambios Realizados

### Archivo: `hooks/useNetworkStatus.ts`
```diff
- const timeoutId = setTimeout(() => controller.abort(), 8000);
+ const timeoutId = setTimeout(() => controller.abort(), 12000);

- const endpoint = '/control-terminales/lotes';
+ const endpoint = '/';
```

### Archivo: `app/moncada/control-terminalesMod.tsx`

#### 1. Carga inicial de lotes
```diff
- if (serverReachable !== true) {
-   log('⚠️ Servidor no disponible, omitiendo carga');
-   return;
- }
+ // Intentar siempre, el fetch manejará errores
```

#### 2. Función `openModal`
```diff
- if (serverReachable !== true) {
-   alert('No se puede cargar información sin conexión');
-   return;
- }
+ // Intentar siempre, el fetch manejará errores
```

#### 3. Función `loadTiemposModulo`
```diff
- if (serverReachable !== true) {
-   alert('No se puede cargar información sin conexión');
-   return;
- }
+ // Intentar siempre, el fetch manejará errores
```

#### 4. Corrección del parseo JSON (línea 466)
```diff
  .then(res => {
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
-   return res;
+   return res.json();
  })
  .then((json: any[]) => {
```

## Resultado Esperado

### Antes ❌
```
LOG  🔍 Verificando conexión al servidor...
LOG  ⚠️ Timeout al conectar con el servidor (>8s)
LOG  El servidor no está disponible
LOG  ❌ Servidor no disponible al montar componente
LOG  Lotes desde backend: 0
```

### Después ✅
```
LOG  📥 Cargando lotes iniciales...
LOG  ✅ Respuesta de lotes OK: 200
LOG  ✅ Lotes cargados correctamente: 25
LOG  Lotes filtrados: 25
```

## Comportamiento Actualizado

1. **Al entrar al componente**:
   - ✅ Se cargan los lotes inmediatamente
   - ✅ No espera verificación de servidor
   - ✅ Si falla, muestra error específico

2. **Al abrir modales**:
   - ✅ Se intenta cargar datos inmediatamente
   - ✅ Timeout de 15 segundos
   - ✅ Error claro si falla la conexión

3. **Verificación de servidor**:
   - ✅ Se ejecuta en paralelo (no bloqueante)
   - ✅ Solo informativa para UI
   - ✅ Timeout de 12 segundos

## Notas Importantes

- **No se eliminó** el hook `useOfflineMode`, sigue siendo útil para:
  - Mostrar indicadores visuales de conexión
  - Mensajes informativos al usuario
  
- **Pero ya NO bloquea** las peticiones de datos

- Los **timeouts de 15 segundos** para peticiones de datos son adecuados para:
  - Conexiones lentas
  - Servidores con alta latencia
  - Endpoints con carga pesada

## Testing

Para verificar que funciona correctamente:

1. **Con conexión buena**: 
   - Los datos deben cargar en < 3 segundos
   - No debe mostrar mensajes de timeout

2. **Con conexión lenta**:
   - Los datos deben cargar eventualmente (hasta 15s)
   - Spinner visible durante la carga

3. **Sin conexión**:
   - Error claro después de 15 segundos
   - Mensaje: "Network request failed" o similar

## Próximos Pasos (Opcional)

Si sigues teniendo problemas, considera:

1. **Aumentar timeout aún más** (20-30 segundos) si el servidor es muy lento
2. **Implementar retry automático** (reintentar 2-3 veces antes de fallar)
3. **Caché de datos** con AsyncStorage para modo offline real
4. **Optimizar backend** para respuestas más rápidas

---
**Fecha de última actualización**: 9 de octubre de 2025
