# Sistema de Módulos Personalizados

## 📋 Descripción General

Este sistema permite a los usuarios crear módulos dinámicos personalizados que se conectan a una API REST y ejecutan consultas SQL para visualizar datos en tiempo real.

## 🏗️ Arquitectura del Sistema

### Estructura de Archivos

```
app/
├── (tabs)/
│   └── index.tsx                      # Pantalla principal con menú dinámico
└── modulos/
    ├── agregarModulo.tsx              # Formulario para crear nuevos módulos
    └── [id].tsx                       # Vista dinámica de datos del módulo
```

### Componentes Principales

#### 1. **index.tsx** (Pantalla Principal)
- Muestra el menú principal con módulos base y personalizados
- Carga módulos personalizados desde AsyncStorage al obtener el foco
- Botón flotante "+" para agregar nuevos módulos
- Combina `menuItemsBase` con módulos personalizados dinámicamente

#### 2. **agregarModulo.tsx** (Formulario de Creación)
- Formulario para crear nuevos módulos con:
  - **Nombre del Módulo**: Título que aparecerá en el menú
  - **Icono**: Selector visual con 25+ iconos prediseñados
  - **Consulta SQL**: Query que se ejecutará en el backend
  - **API REST URL**: Endpoint donde se enviará la consulta
- Validación de campos obligatorios y formato de URL
- Almacenamiento en AsyncStorage

#### 3. **[id].tsx** (Vista de Datos)
- Pantalla dinámica que muestra los datos del módulo
- Realiza petición POST a la API con la consulta SQL
- Visualiza datos en tarjetas con todos los campos
- Funciones:
  - Pull to refresh para recargar datos
  - Botón para eliminar el módulo
  - Manejo de errores y estados de carga

## 💾 Almacenamiento de Datos

### AsyncStorage
Los módulos se guardan en AsyncStorage con la clave `'customModules'`:

```typescript
interface CustomModule {
  id: string;              // Identificador único (module_timestamp)
  nombre: string;          // Nombre del módulo
  icono: IconName;         // Nombre del icono de Ionicons
  consultaSQL: string;     // Consulta SQL a ejecutar
  apiRestUrl: string;      // URL del endpoint de la API
  fechaCreacion: string;   // Fecha ISO de creación
}
```

### Persistencia
- **Móvil**: AsyncStorage nativo de React Native
- **Web**: LocalStorage del navegador
- Los datos persisten entre sesiones
- Se cargan automáticamente al abrir la app

## 🔌 Integración con Backend

### Estructura de la Petición

Cada módulo envía una petición POST a su `apiRestUrl` configurada:

```javascript
POST {apiRestUrl}
Content-Type: application/json

{
  "query": "SELECT * FROM tabla WHERE..."
}
```

### Formatos de Respuesta Soportados

El sistema soporta múltiples formatos de respuesta del backend:

```javascript
// Formato 1: Array directo
[
  { id: 1, nombre: "Item 1" },
  { id: 2, nombre: "Item 2" }
]

// Formato 2: Objeto con propiedad 'data'
{
  "data": [
    { id: 1, nombre: "Item 1" }
  ]
}

// Formato 3: Objeto con propiedad 'rows'
{
  "rows": [
    { id: 1, nombre: "Item 1" }
  ]
}

// Formato 4: Objeto con propiedad 'results'
{
  "results": [
    { id: 1, nombre: "Item 1" }
  ]
}
```

## 🎨 Diseño y Estilos

El sistema utiliza los mismos estilos del componente principal:

- **Colores principales**:
  - Primario: `#2e78b7`
  - Fondo: `#f3f4f6`
  - Blanco: `#fff`
  - Error: `#e53e3e`

- **Componentes**:
  - Tarjetas con bordes redondeados (12px)
  - Sombras para profundidad
  - Diseño responsive (2 columnas en menú)
  - Botones flotantes con sombras

## 📱 Flujo de Usuario

### Crear un Módulo
1. Usuario presiona el botón flotante "+" en la pantalla principal
2. Se abre el formulario `agregarModulo`
3. Completa los campos requeridos:
   - Nombre del módulo
   - Selecciona un icono
   - Escribe la consulta SQL
   - Ingresa la URL de la API
4. Presiona "Guardar Módulo"
5. El módulo se guarda en AsyncStorage
6. Regresa automáticamente al menú principal
7. El nuevo módulo aparece en el menú

### Usar un Módulo
1. Usuario toca el módulo en el menú principal
2. Se navega a `/modulos/[id]`
3. El componente carga la configuración desde AsyncStorage
4. Realiza la petición a la API con la consulta SQL
5. Muestra los datos en tarjetas
6. Usuario puede:
   - Ver todos los registros
   - Hacer pull to refresh para recargar
   - Eliminar el módulo

### Eliminar un Módulo
1. Usuario abre el módulo personalizado
2. Presiona el icono de papelera en el header
3. Confirma la eliminación
4. El módulo se elimina de AsyncStorage
5. Regresa al menú principal
6. El módulo ya no aparece en el menú

## 🔧 Configuración del Backend

### Requisitos Mínimos

Tu backend debe tener un endpoint que:
1. Acepte peticiones POST
2. Reciba un JSON con la propiedad `query`
3. Execute la consulta SQL de forma segura
4. Retorne los resultados en uno de los formatos soportados

### Ejemplo de Endpoint (Node.js/Express)

```javascript
app.post('/api/execute-query', async (req, res) => {
  try {
    const { query } = req.body;
    
    // IMPORTANTE: Validar y sanitizar la consulta
    // Solo permitir SELECT, no permitir DROP, DELETE, etc.
    if (!query.trim().toUpperCase().startsWith('SELECT')) {
      return res.status(400).json({ error: 'Solo se permiten consultas SELECT' });
    }
    
    // Ejecutar la consulta
    const results = await database.query(query);
    
    // Retornar resultados
    res.json({
      data: results.rows,
      count: results.rows.length
    });
  } catch (error) {
    console.error('Error ejecutando consulta:', error);
    res.status(500).json({ error: 'Error ejecutando consulta' });
  }
});
```

### Seguridad Importante ⚠️

**ADVERTENCIA**: Ejecutar consultas SQL dinámicas es un riesgo de seguridad. Implementa:

1. **Autenticación**: Verifica el token del usuario
2. **Autorización**: Valida que el usuario tenga permisos
3. **Validación**: Solo permite consultas SELECT
4. **Sanitización**: Limpia la entrada para prevenir SQL Injection
5. **Rate Limiting**: Limita las peticiones por usuario
6. **Logging**: Registra todas las consultas ejecutadas
7. **Timeout**: Establece un tiempo máximo de ejecución

```javascript
// Ejemplo de validación básica
const validarConsulta = (query) => {
  const queryUpper = query.trim().toUpperCase();
  
  // Solo SELECT
  if (!queryUpper.startsWith('SELECT')) {
    throw new Error('Solo se permiten consultas SELECT');
  }
  
  // Blacklist de palabras peligrosas
  const palabrasPeligrosas = ['DROP', 'DELETE', 'UPDATE', 'INSERT', 'ALTER', 'CREATE', 'TRUNCATE'];
  for (const palabra of palabrasPeligrosas) {
    if (queryUpper.includes(palabra)) {
      throw new Error('Consulta no permitida');
    }
  }
  
  return true;
};
```

## 🚀 Próximas Mejoras

### Funcionalidades Sugeridas

1. **Editor de módulos**: Permitir editar módulos existentes
2. **Exportar/Importar**: Compartir módulos entre usuarios
3. **Plantillas**: Módulos predefinidos para casos comunes
4. **Filtros**: Agregar filtros dinámicos a las vistas
5. **Gráficos**: Visualización de datos en gráficos
6. **Paginación**: Para grandes volúmenes de datos
7. **Búsqueda**: Buscar dentro de los resultados
8. **Ordenamiento**: Ordenar por columnas
9. **Sincronización**: Guardar módulos en el backend
10. **Permisos**: Control de acceso por rol de usuario

### Estructura Extendida

Para implementar carpetas individuales por módulo:

```
app/
└── modulos/
    ├── agregarModulo.tsx
    ├── [id].tsx
    └── data/                          # Nueva carpeta
        ├── {moduleId}/                # Carpeta por módulo
        │   ├── config.json            # Configuración
        │   ├── cache.json             # Datos en caché
        │   └── metadata.json          # Metadatos
        └── index.ts                   # Gestor de módulos
```

## 📝 Notas Adicionales

- Los módulos se cargan cada vez que la pantalla principal obtiene el foco (useFocusEffect)
- El sistema es compatible con iOS, Android y Web
- Los iconos provienen de @expo/vector-icons (Ionicons)
- El diseño es responsive y se adapta a diferentes tamaños de pantalla
- Los datos se actualizan con "pull to refresh"

## 🐛 Solución de Problemas

### El módulo no aparece en el menú
- Verifica que se haya guardado correctamente en AsyncStorage
- Regresa a la pantalla principal para forzar la recarga
- Revisa la consola para errores

### Error al cargar datos
- Verifica que la URL de la API sea correcta
- Confirma que el backend esté funcionando
- Revisa que la consulta SQL sea válida
- Verifica la conexión a internet

### Los datos no se muestran correctamente
- Confirma que el backend retorne datos en un formato soportado
- Verifica que la respuesta sea un array de objetos
- Revisa la consola para ver la estructura de datos recibida

## 📚 Recursos

- [Ionicons](https://ionic.io/ionicons): Biblioteca de iconos
- [AsyncStorage](https://react-native-async-storage.github.io/async-storage/): Almacenamiento local
- [Expo Router](https://expo.github.io/router/docs/): Navegación
- [React Native](https://reactnative.dev/): Framework base
