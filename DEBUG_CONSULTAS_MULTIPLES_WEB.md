# 🐛 Guía de Debugging: Consultas Múltiples en Versión Web

## 🎯 Problema Reportado
El flujo de consultas múltiples no funciona correctamente en la **versión web** de la aplicación.

## 🔍 Cambios Implementados para Debugging

### 1. Logs Mejorados en `cargarModulo()`
Se agregaron logs detallados al cargar el módulo desde AsyncStorage:

```typescript
console.log('🔍 Cargando módulo con ID:', id);
console.log('📦 Módulos en storage:', modulosJSON ? 'Encontrados' : 'No encontrados');
console.log('📊 Total de módulos:', modulos.length);
console.log('✅ Módulo encontrado:', moduloEncontrado.nombre);
console.log('🔹 usaConsultasMultiples:', moduloEncontrado.usaConsultasMultiples);
console.log('🔹 consultasSQL:', moduloEncontrado.consultasSQL?.length || 0, 'consultas');
console.log('🔹 queryIdPrincipal:', moduloEncontrado.queryIdPrincipal);
```

### 2. Detección Mejorada de Modo de Consultas
Se agregó detección exhaustiva con logs explicativos:

```typescript
// Verificación robusta
if (modulo.usaConsultasMultiples === true && 
    modulo.consultasSQL && 
    Array.isArray(modulo.consultasSQL) && 
    modulo.consultasSQL.length > 0) {
  // MODO MÚLTIPLE
} else {
  // MODO SIMPLE + razones por las que se usa modo simple
}
```

### 3. Logs Diagnósticos
Si no se detectan consultas múltiples, ahora se explica por qué:

```
🔷 Razones por las que se usa modo simple:
   ❌ usaConsultasMultiples es false o undefined
   ❌ consultasSQL no existe
   ❌ consultasSQL no es un array
   ❌ consultasSQL está vacío
```

## 🧪 Cómo Probar en Web

### Paso 1: Abrir la Consola del Navegador
1. Abre la aplicación en el navegador
2. Presiona `F12` o `Ctrl+Shift+I` (Windows) / `Cmd+Option+I` (Mac)
3. Ve a la pestaña **Console**

### Paso 2: Verificar AsyncStorage
Ejecuta en la consola:
```javascript
// Ver todos los módulos guardados
AsyncStorage.getItem('customModules').then(data => {
  console.log('📦 Módulos en storage:');
  console.log(JSON.parse(data));
});

// Ver un módulo específico
AsyncStorage.getItem('customModules').then(data => {
  const modulos = JSON.parse(data);
  const modulo = modulos[0]; // O el índice que quieras
  console.log('🔹 Módulo:', modulo.nombre);
  console.log('🔹 usaConsultasMultiples:', modulo.usaConsultasMultiples);
  console.log('🔹 consultasSQL:', modulo.consultasSQL);
  console.log('🔹 queryIdPrincipal:', modulo.queryIdPrincipal);
});
```

### Paso 3: Crear un Módulo de Prueba con Consultas Múltiples
1. Ve a "Agregar Módulo"
2. **Activa el toggle "Usar Consultas Múltiples"**
3. Agrega al menos 2 consultas
4. Selecciona una consulta principal
5. Guarda el módulo
6. **Verifica en la consola** los logs de guardado

### Paso 4: Abrir el Módulo y Ver Logs
1. Abre el módulo creado
2. **Observa los logs en la consola**:

```
🔍 Cargando módulo con ID: module_xxxxx
📦 Módulos en storage: Encontrados
📊 Total de módulos: 3
✅ Módulo encontrado: Mi Módulo de Prueba
🔹 usaConsultasMultiples: true
🔹 consultasSQL: 2 consultas
🔹 queryIdPrincipal: detalles

🔵 INICIO DE CARGA DE DATOS DEL MÓDULO
✅ Usando CONEXIÓN API REST
🔍 Verificando modo de consultas...
   - usaConsultasMultiples: true
   - consultasSQL existe: true
   - consultasSQL length: 2

🔷 ========================================
🔷 MODO: CONSULTAS MÚLTIPLES (consultaMAYOR)
🔷 ========================================
🔷 Total de consultas: 2
🔷 Query ID Principal: detalles

📤 Request Body (Consultas Múltiples):
{
  "queries": [
    {
      "id": "query1",
      "sql": "SELECT * FROM...",
      "params": [],
      "stopOnEmpty": true
    },
    {
      "id": "detalles",
      "sql": "SELECT * FROM detalles WHERE id = {{query1[0].id}}",
      "params": [],
      "stopOnEmpty": false
    }
  ]
}
```

## 🔍 Posibles Problemas y Soluciones

### Problema 1: usaConsultasMultiples es `undefined` o `false`
**Síntoma:**
```
🔷 Razones por las que se usa modo simple:
   ❌ usaConsultasMultiples es false o undefined
```

**Solución:**
El módulo no se guardó con el flag activado. Verifica en AsyncStorage:
```javascript
AsyncStorage.getItem('customModules').then(data => {
  const modulos = JSON.parse(data);
  console.log('Verificar cada módulo:');
  modulos.forEach((m, i) => {
    console.log(`${i}. ${m.nombre}:`, m.usaConsultasMultiples);
  });
});
```

**Fix:**
1. Ve a configuración del módulo
2. Activa "Usar Consultas Múltiples"
3. Guarda cambios
4. Recarga el módulo

### Problema 2: consultasSQL está vacío o no existe
**Síntoma:**
```
🔷 Razones por las que se usa modo simple:
   ❌ consultasSQL no existe
   ❌ consultasSQL está vacío
```

**Solución:**
El array de consultas no se guardó correctamente. Verifica:
```javascript
AsyncStorage.getItem('customModules').then(data => {
  const modulos = JSON.parse(data);
  const modulo = modulos.find(m => m.id === 'TU_MODULE_ID');
  console.log('consultasSQL:', modulo.consultasSQL);
  console.log('Es array?:', Array.isArray(modulo.consultasSQL));
  console.log('Length:', modulo.consultasSQL?.length);
});
```

**Fix:**
1. Ve a configuración del módulo
2. Agrega consultas manualmente
3. Guarda y verifica en logs

### Problema 3: consultasSQL no es un array
**Síntoma:**
```
🔷 Razones por las que se usa modo simple:
   ❌ consultasSQL no es un array
```

**Solución:**
Corrupción de datos. Limpia y recrea:
```javascript
// Eliminar módulo corrupto
AsyncStorage.getItem('customModules').then(data => {
  let modulos = JSON.parse(data);
  modulos = modulos.filter(m => m.id !== 'MODULE_ID_CORRUPTO');
  AsyncStorage.setItem('customModules', JSON.stringify(modulos));
  console.log('✅ Módulo eliminado, recrea uno nuevo');
});
```

### Problema 4: El módulo se ve en modo simple pero debería ser múltiple
**Diagnóstico:**
Verifica TODOS los campos:
```javascript
AsyncStorage.getItem('customModules').then(data => {
  const modulos = JSON.parse(data);
  const modulo = modulos[0]; // Tu módulo
  
  console.log('🔍 DIAGNÓSTICO COMPLETO:');
  console.log('1. usaConsultasMultiples:', modulo.usaConsultasMultiples, typeof modulo.usaConsultasMultiples);
  console.log('2. consultasSQL existe:', !!modulo.consultasSQL);
  console.log('3. consultasSQL es array:', Array.isArray(modulo.consultasSQL));
  console.log('4. consultasSQL length:', modulo.consultasSQL?.length);
  console.log('5. queryIdPrincipal:', modulo.queryIdPrincipal);
  console.log('6. Contenido consultasSQL:', modulo.consultasSQL);
});
```

## 📊 Checklist de Verificación

### ✅ Antes de reportar un bug, verifica:

- [ ] Los logs aparecen en la consola del navegador
- [ ] El módulo tiene `usaConsultasMultiples: true`
- [ ] El array `consultasSQL` existe y tiene elementos
- [ ] Cada consulta tiene `id` y `sql`
- [ ] El `queryIdPrincipal` está definido
- [ ] El `queryIdPrincipal` coincide con algún ID de consulta
- [ ] AsyncStorage se puede leer correctamente en web
- [ ] No hay errores de red al hacer el fetch

### 🔧 Comandos Útiles para Debugging

```javascript
// 1. Ver estado actual
AsyncStorage.getAllKeys().then(console.log);

// 2. Ver módulos completos
AsyncStorage.getItem('customModules').then(d => console.table(JSON.parse(d)));

// 3. Limpiar todo (CUIDADO!)
AsyncStorage.clear().then(() => console.log('✅ Storage limpiado'));

// 4. Verificar un módulo específico
AsyncStorage.getItem('customModules').then(data => {
  const modulo = JSON.parse(data).find(m => m.nombre === 'NOMBRE_MODULO');
  console.log('🔍 Módulo completo:', JSON.stringify(modulo, null, 2));
});
```

## 🎯 Resultado Esperado

Cuando funciona correctamente, deberías ver:

```
🔷 ========================================
🔷 MODO: CONSULTAS MÚLTIPLES (consultaMAYOR)
🔷 ========================================
🔷 Total de consultas: 2
🔷 Query ID Principal: detalles

📤 Request Body (Consultas Múltiples):
{
  "queries": [...]
}

📋 Detalle de cada consulta:
   ▶️ Query 1:
      ID: query1
      SQL: SELECT id FROM pedidos WHERE numero = '12345'
      Params: []
      stopOnEmpty: true
   ▶️ Query 2:
      ID: detalles
      SQL: SELECT * FROM detalles WHERE pedido_id = {{query1[0].id}}
      Params: []
      stopOnEmpty: false

📥 Response Status: 200
📥 Response OK: true
📦 Respuesta de consultaMAYOR detectada
📦 Total de queries ejecutadas: 2
✅ Procesando respuesta: resultado.results["detalles"].data (consultaMAYOR)
📊 Total de registros obtenidos: 15
✅ CARGA COMPLETADA EXITOSAMENTE
```

## 🆘 Si Nada Funciona

1. **Borra todo y empieza de nuevo:**
```javascript
AsyncStorage.clear();
location.reload();
```

2. **Crea un módulo simple primero** para verificar que el sistema básico funciona

3. **Luego edita ese módulo** para agregar consultas múltiples

4. **Comparte los logs** de la consola para análisis más detallado

---

**Estado:** 🟢 Sistema actualizado con debugging exhaustivo  
**Fecha:** 2025-10-14  
**Archivo modificado:** `app/modulos/[id].tsx`  
**Cambios:** Logs mejorados, detección robusta, diagnósticos automáticos
