# 📊 Guía de Logs de Diagnóstico - Sistema de Módulos Personalizados

## 🎯 Objetivo
Sistema completo de logging para diagnosticar problemas de conexión a bases de datos, consultas SQL y configuración de módulos personalizados.

## 📁 Archivos Modificados

### 1. `app/modulos/[id].tsx` - Carga y Visualización de Datos
### 2. `app/modulos/agregarModulo.tsx` - Creación de Módulos
### 3. `app/modulos/configurarModulo.tsx` - Edición de Módulos

---

## 🔍 Logs en `[id].tsx` - Carga de Datos

### Inicio del Proceso
```
🔵 ========================================
🔵 INICIO DE CARGA DE DATOS DEL MÓDULO
🔵 ========================================
📋 Nombre del módulo: [nombre]
🆔 ID del módulo: [id]
🔌 Tipo de conexión: api | db
🌐 URL API: [url]
📝 Consulta SQL: [query]
```

### Conexión API REST
```
✅ Usando CONEXIÓN API REST
📤 Request Body (API REST):
{
  "query": "SELECT * FROM tabla"
}
📥 Response Status: 200
📥 Response OK: true
```

### Conexión Directa a BD
```
✅ Usando CONEXIÓN DIRECTA A BASE DE DATOS
💾 Tipo de BD: mysql | postgresql | sqlserver | oracle
💾 Host: localhost
💾 Puerto: 3306
💾 Base de Datos: nombre_bd
💾 Usuario: usuario
💾 Contraseña: ***oculta***
📤 Request Body (BD Directa):
{
  "query": "SELECT...",
  "dbConfig": {
    "tipo": "mysql",
    "host": "localhost",
    ...
  }
}
📥 Response Status: 200
📥 Response OK: true
```

### Procesamiento de Respuesta
```
📦 Respuesta recibida del servidor
📦 Tipo de respuesta: object
📦 Es array?: false
📦 Keys disponibles: ['data', 'message']
📦 resultado.data existe, tipo: object, es array?: true
✅ Procesando respuesta: resultado.data
📊 Total de registros obtenidos: 25
📋 Columnas detectadas: id, nombre, fecha, estado
📋 Total de columnas: 4
🔍 Muestra del primer registro:
   id: 1
   nombre: Ejemplo
   fecha: 2025-10-14
   estado: activo
```

### Finalización Exitosa
```
✅ ========================================
✅ CARGA COMPLETADA EXITOSAMENTE
✅ Registros cargados: 25
✅ ========================================
🔵 ========================================
🔵 FIN DEL PROCESO DE CARGA
🔵 ========================================
```

### Errores Comunes

#### Error de Conexión
```
❌ ========================================
❌ ERROR AL CARGAR DATOS
❌ ========================================
❌ Tipo de error: TypeError
❌ Mensaje: Failed to fetch
❌ Stack trace: [stack]
🔴 Error de conexión - posibles causas:
   1. URL incorrecta o inaccesible
   2. Backend no está corriendo
   3. Problema de CORS
   4. Red no disponible
```

#### Error de Parseo JSON
```
❌ Tipo de error: SyntaxError
❌ Mensaje: Unexpected token < in JSON
🔴 Error al parsear JSON - posibles causas:
   1. Backend devolvió HTML en lugar de JSON
   2. Respuesta vacía del servidor
   3. Formato de respuesta incorrecto
```

#### Error HTTP
```
❌ ERROR HTTP
❌ Status Code: 500
❌ Status Text: Internal Server Error
❌ Response Body: {"error": "Database connection failed"}
```

#### Configuración Inválida
```
❌ CONFIGURACIÓN DE CONEXIÓN INVÁLIDA
❌ tipoConexion: undefined
❌ dbConfig existe: false
```

#### Sin Resultados
```
⚠️ No se obtuvieron registros. La consulta no devolvió resultados.
```

#### Estructura de Respuesta No Reconocida
```
⚠️ No se encontró un array de datos en la respuesta
⚠️ Estructura recibida:
{
  "status": "success",
  "info": {...}
}
```

---

## 🟢 Logs en `agregarModulo.tsx` - Creación de Módulos

### Inicio del Guardado
```
🟢 ========================================
🟢 GUARDANDO NUEVO MÓDULO
🟢 ========================================
🆔 ID generado: module_1697234567890
```

### Información del Módulo
```
📋 Información Básica:
   Nombre: Reporte de Ventas
   Icono: bar-chart-outline
   Tipo Conexión: api
   Roles Permitidos: Administrador, Gerente
📝 Consulta SQL:
   SELECT * FROM ventas WHERE fecha > '2025-01-01'
🌐 URL API: https://api.ejemplo.com/consulta
```

### Configuración de BD (si aplica)
```
💾 Configuración de Base de Datos:
   Tipo: mysql
   Host: localhost
   Puerto: 3306
   Base de Datos: produccion
   Usuario: admin
   Contraseña: ***configurada***
```

### Almacenamiento
```
💾 Módulos existentes: 5
✅ Módulo guardado exitosamente en AsyncStorage
✅ Total de módulos ahora: 6
✅ ========================================
```

### Errores
```
❌ ========================================
❌ ERROR AL GUARDAR MÓDULO
❌ ========================================
❌ Tipo de error: Error
❌ Mensaje: Storage quota exceeded
❌ Stack: [stack trace]
❌ ========================================
```

### Validaciones Fallidas
```
⚠️ Validación del formulario falló
```

---

## 🟡 Logs en `configurarModulo.tsx` - Edición de Módulos

### Inicio de Actualización
```
🟡 ========================================
🟡 ACTUALIZANDO MÓDULO EXISTENTE
🟡 ========================================
🆔 ID del módulo: module_1697234567890
📋 Datos originales del módulo: Reporte de Ventas
```

### Validaciones
```
✅ Todas las validaciones pasaron
```

o

```
⚠️ Validación falló: Nombre vacío
⚠️ Validación falló: Consulta SQL vacía
⚠️ Validación falló: URL API vacía
⚠️ Validación falló: Campos de BD incompletos
⚠️ Validación falló: No hay roles seleccionados
```

### Búsqueda del Módulo
```
💾 Total de módulos en storage: 6
📍 Módulo encontrado en índice: 2
```

### Cambios Aplicados
```
📝 Cambios a aplicar:
   Nombre: Reporte de Ventas → Reporte de Ventas Mensual
   Consulta SQL actualizada: SELECT * FROM ventas WHERE MONTH(fecha) = MONTH(...
   Tipo Conexión: api
   URL API: https://api.ejemplo.com/consulta
   Roles: Administrador, Gerente, Supervisor
```

### Configuración BD Actualizada
```
💾 Configuración BD actualizada:
   Tipo: mysql
   Host: 192.168.1.100
   Puerto: 3306
   Database: produccion_new
   Usuario: admin
```

### Configuración de Vista
```
👁️ Configuración de vista:
   Columnas visibles: 8
   Registros por página: 50
```

### Finalización
```
✅ Módulo actualizado exitosamente en AsyncStorage
✅ ========================================
```

### Errores
```
❌ ========================================
❌ ERROR AL ACTUALIZAR MÓDULO
❌ ========================================
❌ Tipo de error: TypeError
❌ Mensaje: Cannot read property 'id' of undefined
❌ Stack: [stack trace]
❌ ========================================
```

```
❌ No hay módulo cargado
❌ No se encontraron módulos en AsyncStorage
❌ Módulo no encontrado en el array. ID buscado: module_xyz
```

---

## 🔧 Cómo Usar los Logs para Diagnóstico

### 1. **Problema: No se cargan los datos**

#### Paso 1: Revisar logs de inicio
Buscar en consola:
```
🔵 INICIO DE CARGA DE DATOS DEL MÓDULO
```

#### Paso 2: Verificar configuración
```
🔌 Tipo de conexión: [verificar que sea correcto]
🌐 URL API: [verificar que sea accesible]
📝 Consulta SQL: [verificar sintaxis]
```

#### Paso 3: Revisar request
```
📤 Request Body: [verificar estructura]
```

#### Paso 4: Verificar response
```
📥 Response Status: [debe ser 200]
📥 Response OK: [debe ser true]
```

#### Paso 5: Analizar estructura de respuesta
```
📦 Keys disponibles: [verificar que tenga data/rows/results]
```

### 2. **Problema: Error de conexión a BD**

Buscar:
```
💾 Tipo de BD: [verificar]
💾 Host: [debe ser accesible]
💾 Puerto: [debe ser correcto]
💾 Base de Datos: [debe existir]
💾 Usuario: [debe tener permisos]
💾 Contraseña: [debe estar configurada]
```

Verificar en backend que pueda conectarse con esas credenciales.

### 3. **Problema: Consulta SQL no retorna datos**

Buscar:
```
📝 Consulta SQL: [copiar y probar en cliente SQL]
📊 Total de registros obtenidos: 0
⚠️ No se obtuvieron registros
```

Probar la consulta directamente en la base de datos.

### 4. **Problema: Error al guardar módulo**

Buscar:
```
❌ ERROR AL GUARDAR MÓDULO
❌ Mensaje: [leer mensaje específico]
```

Posibles causas:
- Storage lleno
- Datos mal formateados
- Permisos de AsyncStorage

### 5. **Problema: Módulo no se encuentra al editar**

Buscar:
```
❌ Módulo no encontrado en el array
🆔 ID buscado: [verificar ID]
💾 Total de módulos en storage: [verificar cantidad]
```

El módulo pudo haber sido eliminado o el ID es incorrecto.

---

## 🎨 Códigos de Color en Logs

| Emoji | Significado | Uso |
|-------|-------------|-----|
| 🔵 | Info / Proceso | Inicio/fin de procesos |
| 🟢 | Crear | Creación de nuevos módulos |
| 🟡 | Actualizar | Edición de módulos existentes |
| ✅ | Éxito | Operación completada |
| ⚠️ | Advertencia | Problemas no críticos |
| ❌ | Error | Errores críticos |
| 🔴 | Error Crítico | Errores con diagnóstico |
| 📋 | Información | Datos del módulo |
| 🆔 | Identificador | IDs de módulos |
| 🔌 | Conexión | Tipo de conexión |
| 🌐 | URL | URLs de APIs |
| 📝 | SQL | Consultas SQL |
| 💾 | Base de Datos | Config de BD |
| 📤 | Request | Datos enviados |
| 📥 | Response | Datos recibidos |
| 📦 | Datos | Estructura de datos |
| 📊 | Resultados | Cantidad de registros |
| 👁️ | Vista | Configuración visual |
| 🔍 | Detalle | Información detallada |

---

## 📱 Cómo Ver los Logs

### En Desarrollo (Expo)

#### Metro Bundler
Los logs aparecerán automáticamente en la terminal donde ejecutas:
```bash
npx expo start
```

#### React Native Debugger
1. Abrir Chrome DevTools: Shake device → "Debug"
2. O usar React Native Debugger standalone
3. Console tab mostrará todos los logs

#### Expo Go App
1. Shake device
2. "Show Dev Menu"
3. "Enable Remote JS Debugging"
4. Abrir Chrome en `localhost:19000/debugger-ui`

### En Producción

#### Android (via ADB)
```bash
adb logcat | grep ReactNativeJS
```

#### iOS (via Console.app)
1. Abrir Console.app
2. Conectar dispositivo
3. Filtrar por "Your App Name"

---

## 🚀 Tips de Diagnóstico Rápido

### Checklist para Problemas de Conexión

- [ ] ✅ URL API es correcta y accesible
- [ ] ✅ Backend está corriendo
- [ ] ✅ Tipo de conexión coincide (api vs db)
- [ ] ✅ Formato de request es correcto
- [ ] ✅ Backend devuelve JSON válido
- [ ] ✅ Estructura de respuesta es reconocida
- [ ] ✅ Consulta SQL es válida
- [ ] ✅ Credenciales de BD son correctas (si aplica)
- [ ] ✅ BD existe y está accesible (si aplica)
- [ ] ✅ Usuario tiene permisos (si aplica)

### Comandos Útiles

#### Ver todos los logs del módulo
```bash
# En terminal donde corre Expo
# Los logs aparecerán automáticamente con emojis de color
```

#### Filtrar solo errores
```bash
# Buscar líneas que empiecen con ❌
```

#### Copiar configuración de módulo
```javascript
// En navegación, ejecutar:
AsyncStorage.getItem('customModules').then(console.log)
```

---

## 📚 Ejemplos de Escenarios Reales

### Escenario 1: Backend Caído
```
🔵 INICIO DE CARGA DE DATOS DEL MÓDULO
🌐 URL API: https://api.ejemplo.com/consulta
❌ ERROR AL CARGAR DATOS
❌ Tipo de error: TypeError
❌ Mensaje: Failed to fetch
🔴 Error de conexión - posibles causas:
   2. Backend no está corriendo ← ESTE ES EL PROBLEMA
```

**Solución**: Iniciar el backend.

### Escenario 2: SQL Incorrecto
```
📝 Consulta SQL: SELECT * FORM ventas  ← Error de sintaxis
📥 Response Status: 500
❌ Response Body: {"error": "SQL syntax error"}
```

**Solución**: Corregir "FORM" → "FROM" en configuración del módulo.

### Escenario 3: Credenciales Incorrectas
```
💾 Tipo de BD: mysql
💾 Host: localhost
💾 Usuario: admin
💾 Contraseña: ***configurada***
❌ Response Body: {"error": "Access denied for user 'admin'@'localhost'"}
```

**Solución**: Verificar usuario y contraseña en configuración BD.

### Escenario 4: Respuesta No Estándar
```
📦 Keys disponibles: ['status', 'info', 'payload']
⚠️ No se encontró un array de datos en la respuesta
```

**Solución**: Backend debe devolver `{ data: [...] }` o array directo.

---

## ✅ Resultado Final

Ahora tienes un sistema completo de logging que te permite:

1. ✅ **Diagnosticar problemas de conexión** a la BD
2. ✅ **Ver qué consultas SQL se están ejecutando**
3. ✅ **Verificar configuración de módulos** (tipo, URL, credenciales)
4. ✅ **Identificar errores en respuestas** del backend
5. ✅ **Rastrear el flujo completo** de creación/edición/carga
6. ✅ **Obtener información detallada** de cada paso del proceso

Todo con logs codificados por color (emojis) para identificación rápida visual.

---

**Fecha de implementación**: 14 de octubre de 2025  
**Archivos modificados**: 3 (`[id].tsx`, `agregarModulo.tsx`, `configurarModulo.tsx`)  
**Estado**: ✅ Completado
