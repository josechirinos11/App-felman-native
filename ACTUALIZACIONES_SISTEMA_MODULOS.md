# 🚀 Actualizaciones del Sistema de Módulos Personalizados

## Fecha: 14 de Octubre, 2025

## 📋 Nuevas Funcionalidades Implementadas

### 1. ✅ Tipo de Conexión Dual

El sistema ahora soporta DOS tipos de conexión:

#### A) Conexión vía API REST (Recomendado)
- El frontend envía la consulta SQL al backend
- El backend valida y ejecuta la consulta
- Mayor seguridad y control

#### B) Conexión Directa a Base de Datos
- El frontend se conecta directamente a la BD del cliente
- Requiere credenciales de BD (host, port, usuario, contraseña)
- Útil para clientes con servidores privados
- **⚠️ IMPORTANTE**: Las credenciales se guardan localmente (considerar encriptación)

**Campos agregados al formulario:**
- Radio button para seleccionar tipo de conexión
- Si selecciona "API REST": Campo URL de la API
- Si selecciona "Directa a BD":
  - Tipo de BD: MySQL, PostgreSQL, SQL Server, Oracle
  - Host/Servidor
  - Puerto
  - Nombre de la base de datos
  - Usuario
  - Contraseña

### 2. ✅ Control de Acceso por Roles

Los módulos ahora tienen control de acceso basado en roles.

**Características:**
- Campo `rolesPermitidos` (array de strings)
- Selector múltiple de roles en el formulario
- Solo usuarios con los roles permitidos verán el módulo
- Opción "Todos" para acceso universal

**Roles predefinidos:**
- Administrador
- Gerente
- Supervisor
- Operario
- Logística
- Almacén
- Ventas
- Comercial
- Todos

**Uso:**
```typescript
interface CustomModule {
  // ... otros campos
  rolesPermitidos: string[]; // ['Administrador', 'Gerente']
}
```

### 3. ✅ Configuración de Vista de Datos

Nuevo componente `configurarModulo.tsx` que permite:

**a) Seleccionar Columnas Visibles:**
- Ver todas las columnas disponibles
- Marcar/desmarcar columnas para mostrar
- Al menos una columna debe estar visible

**b) Ordenar Columnas:**
- Botones arriba/abajo para reordenar
- El orden se refleja en la visualización

**c) Opciones de Visualización:**
- Mostrar/ocultar número de registro
- Configurar registros por página (paginación)

**d) Persistencia:**
- La configuración se guarda en AsyncStorage
- Se aplica automáticamente al ver los datos

**Acceso:**
- Botón de engranaje en la vista del módulo
- Ruta: `/modulos/configurarModulo?id={moduleId}`

### 4. ✅ Interfaz CustomModule Extendida

```typescript
interface CustomModule {
  // Campos existentes
  id: string;
  nombre: string;
  icono: IconName;
  consultaSQL: string;
  apiRestUrl: string;
  fechaCreacion: string;
  
  // NUEVOS CAMPOS
  tipoConexion: 'api' | 'directa';
  
  dbConfig?: {
    tipo: 'mysql' | 'postgresql' | 'sqlserver' | 'oracle';
    host: string;
    port: number;
    database: string;
    usuario: string;
    password: string;
  };
  
  rolesPermitidos: string[];
  
  configuracionVista?: {
    columnasVisibles?: string[];
    ordenColumnas?: string[];
    formatoColumnas?: { [key: string]: string };
    mostrarNumeroRegistro?: boolean;
    registrosPorPagina?: number;
  };
}
```

## 📁 Archivos Nuevos/Modificados

### Archivos Creados:
1. ✅ `app/modulos/agregarModulo.tsx` - **ACTUALIZADO**
   - Nuevo UI con secciones organizadas
   - Selector de tipo de conexión
   - Configuración de BD directa
   - Selector múltiple de roles
   - Validaciones mejoradas

2. ✅ `app/modulos/configurarModulo.tsx` - **NUEVO**
   - Configuración de columnas visibles
   - Reordenamiento de columnas
   - Opciones de visualización
   - Guardar preferencias

3. ⏳ `app/modulos/[id].tsx` - **PENDIENTE DE ACTUALIZAR**
   - Agregar botón de configuración en header
   - Aplicar filtro de roles
   - Respetar configuración de vista
   - Soportar ambos tipos de conexión

4. ⏳ `app/(tabs)/index.tsx` - **PENDIENTE DE ACTUALIZAR**
   - Filtrar módulos según rol del usuario
   - Actualizar interfaz CustomModule

## 🎯 Flujo de Uso Actualizado

### Crear Módulo con Conexión Directa

```
1. Usuario presiona botón "+"
2. Completa información básica
3. Selecciona roles permitidos
4. Elige "Conexión Directa a BD"
5. Selecciona tipo de BD: MySQL
6. Ingresa credenciales:
   - Host: 192.168.1.100
   - Port: 3306
   - Database: inventario_db
   - Usuario: user_readonly
   - Contraseña: ••••••••
7. Escribe consulta SQL
8. Guarda módulo
```

### Configurar Vista de Datos

```
1. Usuario abre módulo personalizado
2. Presiona botón engranaje (⚙️) en header
3. Ve lista de columnas disponibles
4. Selecciona cuáles mostrar:
   ☑ id
   ☑ codigo
   ☑ nombre
   ☐ descripcion_larga (oculta)
   ☑ stock
5. Reordena columnas con flechas
6. Configura opciones:
   - Mostrar número: Sí
   - Registros por página: 50
7. Guarda configuración
8. Vuelve a vista de datos
9. Datos se muestran según configuración
```

## 🔒 Seguridad - Consideraciones Importantes

### Conexión Directa a BD

**⚠️ RIESGOS:**
1. Credenciales guardadas en AsyncStorage (texto plano)
2. Consultas ejecutadas desde el cliente
3. Mayor superficie de ataque

**✅ RECOMENDACIONES:**

1. **Encriptar Credenciales:**
```typescript
import * as SecureStore from 'expo-secure-store';

// Guardar password encriptado
await SecureStore.setItemAsync(`db_pass_${moduleId}`, passwordDB);

// Leer password
const password = await SecureStore.getItemAsync(`db_pass_${moduleId}`);
```

2. **Usuario de BD con Permisos Limitados:**
```sql
-- Crear usuario solo con SELECT
CREATE USER 'modulo_readonly'@'%' IDENTIFIED BY 'password';
GRANT SELECT ON database_name.* TO 'modulo_readonly'@'%';
FLUSH PRIVILEGES;
```

3. **Validación del Cliente:**
- Implementar whitelist de IPs permitidas en el servidor de BD
- Usar VPN para conexiones remotas
- Certificados SSL/TLS para conexión cifrada

4. **Limitar Tablas Accesibles:**
```sql
-- Solo permitir SELECT en tablas específicas
GRANT SELECT ON database.productos TO 'modulo_readonly'@'%';
GRANT SELECT ON database.inventario TO 'modulo_readonly'@'%';
```

### Filtrado por Roles

**Implementación en index.tsx:**
```typescript
const cargarModulosPersonalizados = async () => {
  try {
    const modulosJSON = await AsyncStorage.getItem('customModules');
    const userDataJSON = await AsyncStorage.getItem('userData');
    
    if (modulosJSON && userDataJSON) {
      const modulos: CustomModule[] = JSON.parse(modulosJSON);
      const userData = JSON.parse(userDataJSON);
      const rolUsuario = userData.rol || userData.role;
      
      // Filtrar módulos según rol
      const modulosFiltrados = modulos.filter(modulo => {
        return modulo.rolesPermitidos.includes('Todos') ||
               modulo.rolesPermitidos.includes(rolUsuario);
      });
      
      // Convertir a MenuItem
      const menuItemsCustom = modulosFiltrados.map(modulo => ({
        id: modulo.id,
        title: modulo.nombre,
        icon: modulo.icono,
        route: `/modulos/${modulo.id}`,
        isCustom: true,
      }));
      
      setMenuItems([...menuItemsBase, ...menuItemsCustom]);
    }
  } catch (error) {
    console.error('Error:', error);
  }
};
```

## 📊 Estructura de Datos Actualizada

### Ejemplo de Módulo Completo

```json
{
  "id": "module_1697302400000",
  "nombre": "Control de Stock Bajo",
  "icono": "cube-outline",
  "consultaSQL": "SELECT id, codigo, nombre, stock_actual, stock_minimo FROM productos WHERE stock_actual < stock_minimo ORDER BY stock_actual ASC",
  "apiRestUrl": "",
  "fechaCreacion": "2025-10-14T12:00:00.000Z",
  "tipoConexion": "directa",
  "dbConfig": {
    "tipo": "mysql",
    "host": "192.168.1.100",
    "port": 3306,
    "database": "inventario_db",
    "usuario": "modulo_readonly",
    "password": "encrypted_password_here"
  },
  "rolesPermitidos": ["Administrador", "Almacén", "Gerente"],
  "configuracionVista": {
    "columnasVisibles": ["codigo", "nombre", "stock_actual", "stock_minimo"],
    "ordenColumnas": ["codigo", "nombre", "stock_actual", "stock_minimo"],
    "mostrarNumeroRegistro": true,
    "registrosPorPagina": 50
  }
}
```

## 🛠️ Tareas Pendientes

### Alta Prioridad
- [ ] Actualizar `app/modulos/[id].tsx` con:
  - [ ] Botón de configuración en header
  - [ ] Aplicar filtro de columnas visibles
  - [ ] Respetar orden de columnas
  - [ ] Implementar paginación
  - [ ] Soporte para conexión directa a BD

- [ ] Actualizar `app/(tabs)/index.tsx` con:
  - [ ] Filtrar módulos por rol de usuario
  - [ ] Actualizar interfaz CustomModule

### Media Prioridad
- [ ] Implementar encriptación de contraseñas con SecureStore
- [ ] Agregar biblioteca para conexión directa a BD
  - MySQL: `mysql` o `mysql2`
  - PostgreSQL: `pg`
  - SQL Server: `mssql`
- [ ] Testing de conexiones directas
- [ ] Manejo de errores mejorado

### Baja Prioridad
- [ ] Exportar/importar módulos con sus configuraciones
- [ ] Sincronización en la nube (Firebase/Supabase)
- [ ] Historial de consultas ejecutadas
- [ ] Caché de resultados
- [ ] Modo offline con sincronización

## 📚 Dependencias Adicionales Requeridas

### Para Conexión Directa a BD

```bash
# Para MySQL
npm install mysql2

# Para PostgreSQL  
npm install pg

# Para SQL Server
npm install mssql

# Para Oracle
npm install oracledb

# Para encriptación segura
npx expo install expo-secure-store
```

### Configuración de Metro Bundler

Agregar a `metro.config.js`:
```javascript
resolver: {
  extraNodeModules: {
    'mysql2': require.resolve('mysql2'),
    'pg': require.resolve('pg'),
    'mssql': require.resolve('mssql'),
  }
}
```

## 🎓 Próximos Pasos

1. **Revisar archivos creados:**
   - `app/modulos/agregarModulo.tsx` (ya actualizado)
   - `app/modulos/configurarModulo.tsx` (nuevo)

2. **Decidir sobre conexión directa:**
   - ¿Realmente necesitas conexión directa?
   - ¿O es suficiente con API REST?
   - Considera los riesgos de seguridad

3. **Actualizar archivos pendientes:**
   - Modificar [id].tsx para soportar nuevas funcionalidades
   - Modificar index.tsx para filtrar por roles

4. **Testing:**
   - Probar creación de módulos con ambos tipos de conexión
   - Verificar filtrado por roles
   - Probar configuración de vistas

## 💡 Recomendación Final

**Para la mayoría de los casos, recomiendo usar SOLO API REST:**

**Ventajas:**
- ✅ Mucho más seguro
- ✅ Centraliza la lógica en el backend
- ✅ Fácil de auditar
- ✅ Mejor rendimiento (pooling de conexiones)
- ✅ No expone credenciales de BD

**La conexión directa solo tiene sentido si:**
- Cliente tiene servidor en red local
- No quiere/puede configurar backend
- Entiende y acepta los riesgos de seguridad

---

**Estado Actual**: 🟡 Parcialmente completado
- ✅ Formulario de creación actualizado
- ✅ Componente de configuración creado
- ⏳ Vista de datos pendiente de actualizar
- ⏳ Filtrado por roles pendiente

¿Continúo con la actualización de los archivos pendientes? 🚀
