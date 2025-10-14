# 🎯 Ejemplo Práctico Completo - Sistema de Módulos

## Caso de Uso Real: Control de Inventario de Stock Bajo

Este ejemplo muestra cómo crear un módulo personalizado paso a paso.

---

## 📱 PARTE 1: Frontend (React Native)

### Paso 1: Usuario crea el módulo

1. Abre la app
2. Presiona el botón flotante "+" en la pantalla principal
3. Completa el formulario:

```
┌─────────────────────────────────────┐
│  Agregar Módulo                     │
├─────────────────────────────────────┤
│  Nombre del Módulo *                │
│  Stock Bajo                         │
│                                     │
│  Icono *                            │
│  📦 Cubo (cube-outline)             │
│                                     │
│  Consulta SQL *                     │
│  SELECT                             │
│    p.id,                            │
│    p.codigo,                        │
│    p.nombre,                        │
│    p.stock_actual,                  │
│    p.stock_minimo,                  │
│    p.precio                         │
│  FROM productos p                   │
│  WHERE p.stock_actual < p.stock_min │
│  ORDER BY p.stock_actual ASC        │
│                                     │
│  Dirección API REST *               │
│  https://api.felman.com/modulos/exe │
│                                     │
│  [Cancelar]  [Guardar Módulo]       │
└─────────────────────────────────────┘
```

4. Presiona "Guardar Módulo"
5. El sistema crea el módulo:

```typescript
{
  id: "module_1697302400000",
  nombre: "Stock Bajo",
  icono: "cube-outline",
  consultaSQL: "SELECT p.id, p.codigo, p.nombre, p.stock_actual, p.stock_minimo, p.precio FROM productos p WHERE p.stock_actual < p.stock_minimo ORDER BY p.stock_actual ASC",
  apiRestUrl: "https://api.felman.com/modulos/ejecutar",
  fechaCreacion: "2025-10-14T12:00:00.000Z"
}
```

6. El módulo aparece en el menú principal:

```
┌─────────────────────────────────────┐
│  Menú Principal                     │
├─────────────────────────────────────┤
│  ┌─────────┐  ┌─────────┐          │
│  │ 🏗️      │  │ 🏢      │          │
│  │ Moncada │  │Almassera│          │
│  └─────────┘  └─────────┘          │
│                                     │
│  ┌─────────┐  ┌─────────┐          │
│  │ 📦      │  │ 🗺️      │          │
│  │ Almacén │  │Logística│          │
│  └─────────┘  └─────────┘          │
│                                     │
│  ┌─────────┐                        │
│  │ 📦      │  ← NUEVO MÓDULO        │
│  │Stock Bajo│                       │
│  └─────────┘                        │
└─────────────────────────────────────┘
```

### Paso 2: Usuario usa el módulo

1. Hace clic en "Stock Bajo"
2. El sistema hace la petición al backend
3. Muestra los datos:

```
┌─────────────────────────────────────┐
│  ← 📦 Stock Bajo              🗑️    │
├─────────────────────────────────────┤
│  Total de registros: 12             │
│                                     │
│  ┌─ Registro #1 ─────────────────┐ │
│  │ id: 45                         │ │
│  │ codigo: PROD-045               │ │
│  │ nombre: Tornillo M8            │ │
│  │ stock_actual: 2                │ │
│  │ stock_minimo: 50               │ │
│  │ precio: 0.15                   │ │
│  └────────────────────────────────┘ │
│                                     │
│  ┌─ Registro #2 ─────────────────┐ │
│  │ id: 78                         │ │
│  │ codigo: PROD-078               │ │
│  │ nombre: Arandela M10           │ │
│  │ stock_actual: 5                │ │
│  │ stock_minimo: 100              │ │
│  │ precio: 0.10                   │ │
│  └────────────────────────────────┘ │
│                                     │
│  ┌─ Registro #3 ─────────────────┐ │
│  │ id: 92                         │ │
│  │ codigo: PROD-092               │ │
│  │ nombre: Tuerca M12             │ │
│  │ stock_actual: 8                │ │
│  │ stock_minimo: 75               │ │
│  │ precio: 0.20                   │ │
│  └────────────────────────────────┘ │
│                                     │
│  [Pull down to refresh...]          │
└─────────────────────────────────────┘
```

---

## 🖥️ PARTE 2: Backend (Node.js + Express + MySQL)

### Estructura del Proyecto Backend

```
backend/
├── server.js                 # Servidor principal
├── config/
│   └── database.js           # Configuración de BD
├── middleware/
│   ├── auth.js               # Autenticación
│   └── validator.js          # Validación de consultas
├── routes/
│   └── modulos.js            # Rutas de módulos
└── utils/
    └── queryValidator.js     # Utilidades de validación
```

### Archivo: config/database.js

```javascript
const mysql = require('mysql2/promise');

const pool = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'felman_user',
  password: process.env.DB_PASSWORD || 'password',
  database: process.env.DB_NAME || 'felman_db',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  enableKeepAlive: true,
  keepAliveInitialDelay: 0
});

// Verificar conexión al iniciar
pool.getConnection()
  .then(connection => {
    console.log('✅ Conexión a base de datos exitosa');
    connection.release();
  })
  .catch(err => {
    console.error('❌ Error conectando a base de datos:', err);
  });

module.exports = pool;
```

### Archivo: utils/queryValidator.js

```javascript
/**
 * Valida que una consulta SQL sea segura
 */
function validarConsultaSQL(query) {
  if (!query || typeof query !== 'string') {
    return { valido: false, error: 'Consulta inválida' };
  }

  const queryTrimmed = query.trim();
  const queryUpper = queryTrimmed.toUpperCase();

  // 1. Solo permitir SELECT
  if (!queryUpper.startsWith('SELECT')) {
    return { 
      valido: false, 
      error: 'Solo se permiten consultas SELECT' 
    };
  }

  // 2. Blacklist de palabras peligrosas
  const palabrasProhibidas = [
    'DROP', 'DELETE', 'UPDATE', 'INSERT', 'ALTER',
    'CREATE', 'TRUNCATE', 'GRANT', 'REVOKE', 'EXECUTE',
    'EXEC', 'PROCEDURE', 'FUNCTION', 'TRIGGER', 'SHOW',
    'DESCRIBE', 'DESC', 'USE', 'SET', 'DECLARE'
  ];

  for (const palabra of palabrasProhibidas) {
    // Buscar palabra completa, no parte de otra palabra
    const regex = new RegExp(`\\b${palabra}\\b`, 'i');
    if (regex.test(queryTrimmed)) {
      return { 
        valido: false, 
        error: `Palabra prohibida: ${palabra}` 
      };
    }
  }

  // 3. Limitar longitud
  if (queryTrimmed.length > 2000) {
    return { 
      valido: false, 
      error: 'Consulta demasiado larga (máx 2000 caracteres)' 
    };
  }

  // 4. Verificar que no haya comentarios SQL maliciosos
  if (queryTrimmed.includes('--') || queryTrimmed.includes('/*')) {
    return { 
      valido: false, 
      error: 'No se permiten comentarios SQL' 
    };
  }

  // 5. Verificar que no haya múltiples consultas (inyección)
  if (queryTrimmed.includes(';') && !queryTrimmed.endsWith(';')) {
    return { 
      valido: false, 
      error: 'No se permiten múltiples consultas' 
    };
  }

  return { valido: true };
}

/**
 * Agrega límite a la consulta si no lo tiene
 */
function agregarLimite(query, limite = 1000) {
  const queryUpper = query.toUpperCase();
  
  if (queryUpper.includes('LIMIT')) {
    return query;
  }
  
  // Remover punto y coma final si existe
  let queryModificada = query.trim();
  if (queryModificada.endsWith(';')) {
    queryModificada = queryModificada.slice(0, -1);
  }
  
  return `${queryModificada} LIMIT ${limite}`;
}

module.exports = {
  validarConsultaSQL,
  agregarLimite
};
```

### Archivo: middleware/auth.js

```javascript
const jwt = require('jsonwebtoken');

/**
 * Middleware de autenticación
 */
function verificarToken(req, res, next) {
  const authHeader = req.headers.authorization;
  
  if (!authHeader) {
    return res.status(401).json({ 
      error: 'Token no proporcionado' 
    });
  }
  
  const token = authHeader.replace('Bearer ', '');
  
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    next();
  } catch (error) {
    return res.status(401).json({ 
      error: 'Token inválido o expirado' 
    });
  }
}

/**
 * Middleware para verificar permisos de módulos personalizados
 */
function verificarPermisoModulos(req, res, next) {
  // Verificar que el usuario tenga permiso para usar módulos personalizados
  if (!req.user || !req.user.permisos) {
    return res.status(403).json({ 
      error: 'No tienes permisos para usar módulos personalizados' 
    });
  }
  
  if (!req.user.permisos.includes('modulos_personalizados')) {
    return res.status(403).json({ 
      error: 'No tienes permisos para usar módulos personalizados' 
    });
  }
  
  next();
}

module.exports = {
  verificarToken,
  verificarPermisoModulos
};
```

### Archivo: routes/modulos.js

```javascript
const express = require('express');
const router = express.Router();
const pool = require('../config/database');
const { verificarToken, verificarPermisoModulos } = require('../middleware/auth');
const { validarConsultaSQL, agregarLimite } = require('../utils/queryValidator');

// Contador de peticiones por usuario (rate limiting simple)
const peticionesPorUsuario = new Map();

/**
 * Rate limiting simple
 */
function verificarRateLimit(userId) {
  const ahora = Date.now();
  const ventana = 60000; // 1 minuto
  const maxPeticiones = 20; // máximo 20 peticiones por minuto
  
  if (!peticionesPorUsuario.has(userId)) {
    peticionesPorUsuario.set(userId, []);
  }
  
  const peticiones = peticionesPorUsuario.get(userId);
  
  // Limpiar peticiones antiguas
  const peticionesRecientes = peticiones.filter(
    timestamp => ahora - timestamp < ventana
  );
  
  if (peticionesRecientes.length >= maxPeticiones) {
    return false;
  }
  
  peticionesRecientes.push(ahora);
  peticionesPorUsuario.set(userId, peticionesRecientes);
  
  return true;
}

/**
 * POST /api/modulos/ejecutar-consulta
 * Ejecuta una consulta SQL personalizada
 */
router.post('/ejecutar-consulta', 
  verificarToken, 
  verificarPermisoModulos,
  async (req, res) => {
    let connection;
    const startTime = Date.now();
    
    try {
      const { query } = req.body;
      const userId = req.user.id;
      
      // 1. Verificar rate limiting
      if (!verificarRateLimit(userId)) {
        return res.status(429).json({ 
          error: 'Demasiadas peticiones. Espera un momento.' 
        });
      }
      
      // 2. Validar que se envió la consulta
      if (!query) {
        return res.status(400).json({ 
          error: 'La consulta SQL es requerida' 
        });
      }
      
      // 3. Validar la consulta
      const validacion = validarConsultaSQL(query);
      if (!validacion.valido) {
        console.warn(`⚠️ Consulta rechazada de usuario ${userId}: ${validacion.error}`);
        return res.status(400).json({ 
          error: validacion.error 
        });
      }
      
      // 4. Agregar límite si no lo tiene
      const queryLimitada = agregarLimite(query, 1000);
      
      // 5. Obtener conexión del pool
      connection = await pool.getConnection();
      
      // 6. Establecer timeout para la consulta (5 segundos)
      await connection.query('SET SESSION max_execution_time=5000');
      
      // 7. Ejecutar la consulta
      console.log(`🔍 Usuario ${userId} ejecutando consulta: ${queryLimitada.substring(0, 100)}...`);
      
      const [rows] = await connection.query(queryLimitada);
      const executionTime = Date.now() - startTime;
      
      // 8. Log de auditoría
      console.log(`✅ Consulta exitosa - Usuario: ${userId}, Registros: ${rows.length}, Tiempo: ${executionTime}ms`);
      
      // 9. Responder con los datos
      res.json({
        success: true,
        data: rows,
        count: rows.length,
        executionTime: `${executionTime}ms`,
        timestamp: new Date().toISOString()
      });
      
    } catch (error) {
      const executionTime = Date.now() - startTime;
      
      console.error(`❌ Error ejecutando consulta:`, {
        usuario: req.user?.id,
        error: error.message,
        tiempo: `${executionTime}ms`
      });
      
      // Detectar timeout
      if (error.code === 'ER_QUERY_TIMEOUT' || error.message.includes('timeout')) {
        return res.status(408).json({ 
          error: 'La consulta tardó demasiado tiempo. Intenta simplificarla.' 
        });
      }
      
      // Detectar error de sintaxis SQL
      if (error.code === 'ER_PARSE_ERROR' || error.sqlMessage) {
        return res.status(400).json({ 
          error: 'Error de sintaxis en la consulta SQL',
          details: process.env.NODE_ENV === 'development' ? error.sqlMessage : undefined
        });
      }
      
      // Error genérico (no exponer detalles internos)
      res.status(500).json({ 
        error: 'Error al ejecutar la consulta',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
      
    } finally {
      // Liberar la conexión
      if (connection) {
        connection.release();
      }
    }
  }
);

/**
 * POST /api/modulos/validar-consulta
 * Valida una consulta sin ejecutarla
 */
router.post('/validar-consulta', 
  verificarToken, 
  verificarPermisoModulos,
  async (req, res) => {
    try {
      const { query } = req.body;
      
      if (!query) {
        return res.status(400).json({ 
          error: 'La consulta SQL es requerida' 
        });
      }
      
      // Validar la consulta
      const validacion = validarConsultaSQL(query);
      
      if (!validacion.valido) {
        return res.json({ 
          valido: false, 
          error: validacion.error 
        });
      }
      
      // Validar sintaxis usando EXPLAIN (opcional)
      const connection = await pool.getConnection();
      try {
        await connection.query(`EXPLAIN ${query}`);
        res.json({ 
          valido: true, 
          message: 'Consulta válida' 
        });
      } catch (error) {
        res.json({ 
          valido: false, 
          error: 'Error de sintaxis SQL',
          details: process.env.NODE_ENV === 'development' ? error.sqlMessage : undefined
        });
      } finally {
        connection.release();
      }
      
    } catch (error) {
      console.error('❌ Error validando consulta:', error);
      res.status(500).json({ 
        error: 'Error al validar la consulta' 
      });
    }
  }
);

module.exports = router;
```

### Archivo: server.js (Principal)

```javascript
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');

const modulosRoutes = require('./routes/modulos');

const app = express();

// Middleware de seguridad
app.use(helmet());

// CORS
app.use(cors({
  origin: process.env.FRONTEND_URL || '*',
  credentials: true
}));

// Parsing de JSON
app.use(express.json({ limit: '1mb' }));

// Compresión de respuestas
app.use(compression());

// Logging de peticiones
app.use((req, res, next) => {
  console.log(`${req.method} ${req.path} - ${new Date().toISOString()}`);
  next();
});

// Rutas
app.use('/api/modulos', modulosRoutes);

// Health check
app.get('/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    timestamp: new Date().toISOString() 
  });
});

// Manejo de rutas no encontradas
app.use((req, res) => {
  res.status(404).json({ 
    error: 'Ruta no encontrada' 
  });
});

// Manejo de errores global
app.use((err, req, res, next) => {
  console.error('❌ Error no manejado:', err);
  res.status(500).json({ 
    error: 'Error interno del servidor' 
  });
});

// Iniciar servidor
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 Servidor corriendo en puerto ${PORT}`);
  console.log(`📊 Entorno: ${process.env.NODE_ENV || 'development'}`);
});

// Manejo de cierre graceful
process.on('SIGTERM', () => {
  console.log('⚠️ SIGTERM recibido. Cerrando servidor...');
  process.exit(0);
});
```

### Archivo: .env (Variables de Entorno)

```env
# Base de Datos
DB_HOST=localhost
DB_USER=felman_user
DB_PASSWORD=tu_password_seguro
DB_NAME=felman_db

# JWT
JWT_SECRET=tu_secret_key_muy_seguro_y_largo

# Servidor
PORT=3000
NODE_ENV=production

# Frontend
FRONTEND_URL=http://localhost:8081
```

### Archivo: package.json

```json
{
  "name": "felman-backend-modulos",
  "version": "1.0.0",
  "description": "Backend para módulos personalizados",
  "main": "server.js",
  "scripts": {
    "start": "node server.js",
    "dev": "nodemon server.js",
    "test": "jest"
  },
  "dependencies": {
    "express": "^4.18.2",
    "mysql2": "^3.6.0",
    "jsonwebtoken": "^9.0.2",
    "cors": "^2.8.5",
    "helmet": "^7.0.0",
    "compression": "^1.7.4",
    "dotenv": "^16.3.1"
  },
  "devDependencies": {
    "nodemon": "^3.0.1"
  }
}
```

---

## 🧪 PARTE 3: Pruebas

### Probar con Postman/cURL

```bash
# 1. Obtener token (asumiendo que tienes endpoint de login)
curl -X POST http://localhost:3000/api/login \
  -H "Content-Type: application/json" \
  -d '{"email":"usuario@ejemplo.com","password":"password"}'

# Respuesta:
# { "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..." }

# 2. Ejecutar consulta personalizada
curl -X POST http://localhost:3000/api/modulos/ejecutar-consulta \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..." \
  -d '{
    "query": "SELECT id, codigo, nombre, stock_actual FROM productos WHERE stock_actual < stock_minimo LIMIT 10"
  }'

# Respuesta:
# {
#   "success": true,
#   "data": [
#     {
#       "id": 45,
#       "codigo": "PROD-045",
#       "nombre": "Tornillo M8",
#       "stock_actual": 2
#     },
#     ...
#   ],
#   "count": 10,
#   "executionTime": "45ms",
#   "timestamp": "2025-10-14T12:00:00.000Z"
# }
```

---

## 📊 Resultado Final

### En la App Móvil/Web

El usuario ahora tiene un módulo "Stock Bajo" que:

✅ Aparece en el menú principal con icono de cubo
✅ Al hacer clic, muestra los productos con stock bajo
✅ Los datos se cargan desde la base de datos en tiempo real
✅ Puede refrescar los datos con pull-to-refresh
✅ Puede eliminar el módulo si ya no lo necesita
✅ El módulo persiste entre sesiones

### Beneficios

1. **Sin código adicional**: No necesitas crear una pantalla nueva cada vez
2. **Flexible**: Cualquier consulta SELECT funciona
3. **Seguro**: El backend valida y protege
4. **Rápido**: Los usuarios pueden crear módulos en segundos
5. **Escalable**: Puedes tener N módulos personalizados

---

**¡El sistema está listo para usar!** 🎉
