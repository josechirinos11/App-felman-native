# 📦 Sistema de Módulos Personalizados - Resumen Ejecutivo

## ✅ ¿Qué se ha creado?

### 1. **Componentes React Native**
- ✅ `app/modulos/agregarModulo.tsx` - Formulario para crear módulos
- ✅ `app/modulos/[id].tsx` - Vista dinámica de datos del módulo
- ✅ Modificaciones en `app/(tabs)/index.tsx` - Integración con el menú principal

### 2. **Utilidades**
- ✅ `utils/modulosManager.ts` - Gestor de módulos con funciones CRUD

### 3. **Documentación**
- ✅ `SISTEMA_MODULOS_PERSONALIZADOS.md` - Documentación completa
- ✅ `EJEMPLO_BACKEND_MODULOS.js` - Ejemplos de implementación backend

## 🎯 Funcionalidad Implementada

### ¿Qué puede hacer el usuario?

1. **Crear Módulos Personalizados**
   - Hacer clic en el botón flotante "+"
   - Llenar formulario con:
     - Nombre del módulo
     - Icono (25+ opciones)
     - Consulta SQL
     - URL de la API REST
   - El módulo se guarda automáticamente

2. **Ver Módulos en el Menú**
   - Los módulos aparecen automáticamente en el menú principal
   - Se muestran junto a los módulos predefinidos (Moncada, Almassera, etc.)
   - Cada módulo tiene su icono y nombre personalizado

3. **Visualizar Datos**
   - Al hacer clic en un módulo personalizado:
     - Se ejecuta la consulta SQL en el backend
     - Los datos se muestran en tarjetas organizadas
     - Pull to refresh para recargar datos
     - Manejo de errores y estados de carga

4. **Eliminar Módulos**
   - Desde la vista del módulo, icono de papelera
   - Confirmación antes de eliminar
   - Se elimina de AsyncStorage automáticamente

## 🔧 ¿Qué necesitas configurar en el backend?

### Información Esencial

Tu backend DEBE tener un endpoint que:

1. **Reciba peticiones POST** con este formato:
```json
{
  "query": "SELECT * FROM tabla WHERE condicion"
}
```

2. **Retorne datos** en uno de estos formatos:
```json
// Opción A: Array directo
[
  { "id": 1, "nombre": "Item 1" },
  { "id": 2, "nombre": "Item 2" }
]

// Opción B: Objeto con 'data'
{
  "data": [...]
}

// Opción C: Objeto con 'rows'
{
  "rows": [...]
}

// Opción D: Objeto con 'results'
{
  "results": [...]
}
```

3. **Implemente seguridad**:
   - ⚠️ Solo permitir consultas SELECT
   - ⚠️ Validar y sanitizar la consulta SQL
   - ⚠️ Implementar timeout (máx 5-10 segundos)
   - ⚠️ Limitar registros retornados (máx 1000)
   - ⚠️ Verificar autenticación del usuario
   - ⚠️ Registrar todas las consultas (auditoría)

### Ejemplo Mínimo de Endpoint (Node.js)

```javascript
app.post('/api/ejecutar-consulta', async (req, res) => {
  const { query } = req.body;
  
  // 1. Validar que sea SELECT
  if (!query.toUpperCase().startsWith('SELECT')) {
    return res.status(400).json({ error: 'Solo SELECT' });
  }
  
  // 2. Ejecutar consulta
  const results = await database.query(query);
  
  // 3. Retornar datos
  res.json({ data: results.rows });
});
```

## 📊 Almacenamiento de Datos

### AsyncStorage (Móvil/Web)

Los módulos se guardan localmente con la clave `'customModules'`:

```javascript
// Estructura de un módulo guardado
{
  id: "module_1697302400000",
  nombre: "Control de Inventario",
  icono: "cube-outline",
  consultaSQL: "SELECT * FROM inventario WHERE stock < 10",
  apiRestUrl: "https://api.tuempresa.com/ejecutar-consulta",
  fechaCreacion: "2025-10-14T12:00:00.000Z"
}
```

### Persistencia
- ✅ Los datos persisten entre sesiones
- ✅ Compatibles con iOS, Android y Web
- ✅ Se cargan automáticamente al abrir la app
- ✅ Se actualizan cuando vuelves a la pantalla principal

## 🎨 Interfaz de Usuario

### Botones Flotantes (Pantalla Principal)
```
┌─────────────────────────┐
│                         │
│  [Módulos del Menú]     │
│                         │
│                    [+]  │  ← Agregar módulo (arriba)
│                    [⚙]  │  ← Configuración (abajo)
└─────────────────────────┘
```

### Formulario de Creación
```
┌─────────────────────────────────┐
│  ← Agregar Módulo              │
├─────────────────────────────────┤
│  Nombre del Módulo *            │
│  [___________________________]  │
│                                 │
│  Icono *                        │
│  [ 📦 Cubo           ▼ ]        │
│                                 │
│  Consulta SQL *                 │
│  [___________________________]  │
│  [___________________________]  │
│                                 │
│  Dirección API REST *           │
│  [___________________________]  │
│                                 │
│  [Cancelar]  [Guardar Módulo]   │
└─────────────────────────────────┘
```

### Vista de Datos
```
┌─────────────────────────────────┐
│  ← 📦 Control Inventario    🗑   │
├─────────────────────────────────┤
│  Total de registros: 45         │
│                                 │
│  ┌─ Registro #1 ─────────────┐ │
│  │ id: 1                      │ │
│  │ nombre: Producto A         │ │
│  │ stock: 5                   │ │
│  │ precio: 100.00             │ │
│  └────────────────────────────┘ │
│                                 │
│  ┌─ Registro #2 ─────────────┐ │
│  │ id: 2                      │ │
│  │ nombre: Producto B         │ │
│  │ ...                        │ │
└─────────────────────────────────┘
```

## 🚀 Flujo Completo de Uso

### Crear un Módulo
1. Usuario abre la app
2. Ve el menú principal con módulos base
3. Presiona el botón flotante "+" (arriba a la derecha)
4. Se abre el formulario `agregarModulo`
5. Completa los campos:
   - Nombre: "Control de Stock"
   - Icono: Selecciona 📦 (cube-outline)
   - SQL: `SELECT * FROM productos WHERE stock < 10`
   - API: `https://api.empresa.com/ejecutar`
6. Presiona "Guardar Módulo"
7. El sistema:
   - Valida los datos
   - Crea un ID único
   - Guarda en AsyncStorage
   - Muestra confirmación
   - Regresa al menú principal
8. El nuevo módulo "Control de Stock" aparece en el menú

### Usar un Módulo
1. Usuario ve el módulo "Control de Stock" en el menú
2. Hace clic en el módulo
3. Se navega a `/modulos/module_xxxxx`
4. El sistema:
   - Carga la configuración del módulo
   - Hace POST a la API con la consulta SQL
   - Muestra loading mientras espera
   - Recibe los datos del backend
   - Muestra los datos en tarjetas
5. Usuario puede:
   - Ver todos los datos
   - Hacer pull down para refrescar
   - Eliminar el módulo

## ⚡ Funciones Disponibles

### En `utils/modulosManager.ts`

```typescript
// Obtener todos los módulos
const modulos = await obtenerModulos();

// Obtener un módulo específico
const modulo = await obtenerModuloPorId('module_123');

// Guardar un nuevo módulo
const nuevo = await guardarModulo({
  nombre: 'Mi Módulo',
  icono: 'apps-outline',
  consultaSQL: 'SELECT * FROM...',
  apiRestUrl: 'https://...'
});

// Actualizar un módulo
await actualizarModulo('module_123', {
  nombre: 'Nuevo Nombre'
});

// Eliminar un módulo
await eliminarModulo('module_123');

// Exportar módulos a JSON
const json = await exportarModulos();

// Importar módulos desde JSON
await importarModulos(jsonString, false);

// Obtener estadísticas
const stats = await obtenerEstadisticas();

// Buscar módulos
const resultados = await buscarModulos('inventario');
```

## 🔐 Consideraciones de Seguridad

### ⚠️ ADVERTENCIAS CRÍTICAS

1. **SQL Injection**: Las consultas SQL dinámicas son peligrosas
   - El backend DEBE validar y sanitizar
   - Solo permitir SELECT
   - Blacklist de palabras peligrosas

2. **Autenticación**: Protege el endpoint
   - Verificar token en cada petición
   - Validar permisos del usuario

3. **Rate Limiting**: Limita peticiones
   - Por usuario
   - Por IP
   - Por endpoint

4. **Timeouts**: Evita consultas largas
   - Máximo 5-10 segundos
   - Matar procesos que excedan

5. **Auditoría**: Registra todo
   - Quién ejecutó qué consulta
   - Cuándo y desde dónde
   - Para investigación de seguridad

## 📝 Checklist de Implementación Backend

- [ ] Crear endpoint POST para ejecutar consultas
- [ ] Implementar validación de consultas (solo SELECT)
- [ ] Agregar blacklist de palabras SQL peligrosas
- [ ] Configurar timeout de 5-10 segundos
- [ ] Limitar resultados a 1000-5000 registros
- [ ] Implementar autenticación con tokens
- [ ] Agregar rate limiting
- [ ] Configurar logging/auditoría
- [ ] Manejar errores sin exponer detalles internos
- [ ] Probar con diferentes tipos de consultas
- [ ] Configurar CORS apropiadamente
- [ ] Documentar formato de respuesta
- [ ] Implementar cache opcional
- [ ] Monitoreo y alertas

## 🎓 Próximos Pasos Sugeridos

### Mejoras Futuras
1. **Editor de módulos**: Permitir editar módulos existentes
2. **Compartir módulos**: Export/import entre usuarios
3. **Plantillas**: Módulos predefinidos comunes
4. **Filtros dinámicos**: Agregar filtros a las vistas
5. **Gráficos**: Visualización de datos
6. **Paginación**: Para muchos registros
7. **Búsqueda**: Buscar en resultados
8. **Ordenamiento**: Por columnas
9. **Sincronización en la nube**: Backup automático
10. **Permisos**: Control de acceso por rol

### Optimizaciones
1. Cache de consultas frecuentes
2. Compresión de datos
3. Lazy loading de imágenes
4. Virtual scrolling para listas largas
5. Offline mode con sincronización

## 📞 ¿Necesitas Ayuda?

### Preguntas Comunes

**P: ¿Los módulos se sincronizan entre dispositivos?**
R: No automáticamente. Se guardan localmente en AsyncStorage. Puedes implementar sincronización en la nube usando las funciones exportar/importar.

**P: ¿Cuántos módulos puedo crear?**
R: No hay límite técnico, pero AsyncStorage tiene límites de 6MB en Android y 10MB en iOS.

**P: ¿Puedo ejecutar consultas UPDATE o DELETE?**
R: No, por seguridad solo se permiten SELECT. El backend debe validar esto.

**P: ¿Los datos se actualizan en tiempo real?**
R: No, debes hacer pull to refresh manualmente. Puedes implementar polling o WebSockets.

**P: ¿Funciona sin internet?**
R: No, necesita conexión para ejecutar las consultas en el backend.

## 📚 Recursos Adicionales

- Documentación completa: `SISTEMA_MODULOS_PERSONALIZADOS.md`
- Ejemplos de backend: `EJEMPLO_BACKEND_MODULOS.js`
- Código fuente: `app/modulos/` y `utils/modulosManager.ts`

---

**Estado**: ✅ Sistema completamente funcional
**Versión**: 1.0.0
**Fecha**: 14 de Octubre, 2025
