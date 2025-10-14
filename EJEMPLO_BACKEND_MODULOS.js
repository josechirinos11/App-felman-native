// EJEMPLO DE BACKEND PARA MÓDULOS PERSONALIZADOS
// Este es un ejemplo de cómo implementar el endpoint en el backend
// Puedes usar Node.js con Express, pero la lógica es similar en otros frameworks

// =============================================================================
// OPCIÓN 1: Node.js + Express + MySQL
// =============================================================================

/*
const express = require('express');
const mysql = require('mysql2/promise');
const cors = require('cors');

const app = express();
app.use(express.json());
app.use(cors());

// Configuración de la base de datos
const dbConfig = {
  host: 'localhost',
  user: 'tu_usuario',
  password: 'tu_password',
  database: 'tu_base_de_datos',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
};

const pool = mysql.createPool(dbConfig);

// Middleware de autenticación (ejemplo básico)
const verificarToken = (req, res, next) => {
  const token = req.headers.authorization?.replace('Bearer ', '');
  
  if (!token) {
    return res.status(401).json({ error: 'Token no proporcionado' });
  }
  
  // Aquí deberías verificar el token con tu sistema de autenticación
  // Por ejemplo con JWT
  try {
    // const decoded = jwt.verify(token, process.env.JWT_SECRET);
    // req.user = decoded;
    next();
  } catch (error) {
    return res.status(401).json({ error: 'Token inválido' });
  }
};

// Función para validar consultas SQL (seguridad)
const validarConsultaSQL = (query) => {
  const queryUpper = query.trim().toUpperCase();
  
  // Solo permitir SELECT
  if (!queryUpper.startsWith('SELECT')) {
    return { valido: false, error: 'Solo se permiten consultas SELECT' };
  }
  
  // Lista de palabras prohibidas
  const palabrasProhibidas = [
    'DROP', 'DELETE', 'UPDATE', 'INSERT', 'ALTER', 
    'CREATE', 'TRUNCATE', 'GRANT', 'REVOKE', 'EXECUTE',
    'EXEC', 'PROCEDURE', 'FUNCTION', 'TRIGGER'
  ];
  
  for (const palabra of palabrasProhibidas) {
    if (queryUpper.includes(palabra)) {
      return { valido: false, error: `Palabra prohibida: ${palabra}` };
    }
  }
  
  // Limitar longitud de la consulta
  if (query.length > 2000) {
    return { valido: false, error: 'Consulta demasiado larga' };
  }
  
  return { valido: true };
};

// Endpoint para ejecutar consultas personalizadas
app.post('/api/modulos/ejecutar-consulta', verificarToken, async (req, res) => {
  let connection;
  
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
      return res.status(400).json({ 
        error: validacion.error 
      });
    }
    
    // Obtener conexión del pool
    connection = await pool.getConnection();
    
    // Establecer timeout para la consulta (5 segundos)
    await connection.query('SET SESSION max_execution_time=5000');
    
    // Limitar resultados a 1000 registros
    const queryLimitada = query.trim().toUpperCase().includes('LIMIT') 
      ? query 
      : `${query} LIMIT 1000`;
    
    // Ejecutar la consulta
    const startTime = Date.now();
    const [rows] = await connection.query(queryLimitada);
    const executionTime = Date.now() - startTime;
    
    // Log de auditoría
    console.log('✅ Consulta ejecutada:', {
      usuario: req.user?.id || 'desconocido',
      query: query.substring(0, 100),
      registros: rows.length,
      tiempo: `${executionTime}ms`
    });
    
    // Responder con los datos
    res.json({
      success: true,
      data: rows,
      count: rows.length,
      executionTime: `${executionTime}ms`
    });
    
  } catch (error) {
    console.error('❌ Error ejecutando consulta:', error);
    
    // Enviar error genérico al cliente (no exponer detalles de la BD)
    res.status(500).json({ 
      error: 'Error al ejecutar la consulta',
      message: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
    
  } finally {
    // Liberar la conexión
    if (connection) {
      connection.release();
    }
  }
});

// Endpoint para validar una consulta sin ejecutarla
app.post('/api/modulos/validar-consulta', verificarToken, async (req, res) => {
  try {
    const { query } = req.body;
    
    if (!query) {
      return res.status(400).json({ 
        error: 'La consulta SQL es requerida' 
      });
    }
    
    const validacion = validarConsultaSQL(query);
    
    if (!validacion.valido) {
      return res.json({ 
        valido: false, 
        error: validacion.error 
      });
    }
    
    // Validar sintaxis SQL usando EXPLAIN
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
        error: 'Error de sintaxis SQL' 
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
});

// Iniciar servidor
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 Servidor corriendo en puerto ${PORT}`);
});
*/

// =============================================================================
// OPCIÓN 2: Node.js + Express + PostgreSQL
// =============================================================================

/*
const express = require('express');
const { Pool } = require('pg');
const cors = require('cors');

const app = express();
app.use(express.json());
app.use(cors());

// Configuración de PostgreSQL
const pool = new Pool({
  host: 'localhost',
  port: 5432,
  database: 'tu_base_de_datos',
  user: 'tu_usuario',
  password: 'tu_password',
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

// El resto de la implementación es similar a MySQL
// Solo cambian las consultas específicas del motor de BD

app.post('/api/modulos/ejecutar-consulta', async (req, res) => {
  const client = await pool.connect();
  
  try {
    const { query } = req.body;
    
    // Validaciones...
    const validacion = validarConsultaSQL(query);
    if (!validacion.valido) {
      return res.status(400).json({ error: validacion.error });
    }
    
    // Establecer timeout en PostgreSQL
    await client.query('SET statement_timeout = 5000'); // 5 segundos
    
    // Ejecutar consulta
    const result = await client.query(query);
    
    res.json({
      success: true,
      data: result.rows,
      count: result.rowCount
    });
    
  } catch (error) {
    console.error('❌ Error:', error);
    res.status(500).json({ error: 'Error al ejecutar la consulta' });
  } finally {
    client.release();
  }
});
*/

// =============================================================================
// OPCIÓN 3: Python + Flask + SQLAlchemy
// =============================================================================

/*
from flask import Flask, request, jsonify
from flask_cors import CORS
from sqlalchemy import create_engine, text
from sqlalchemy.exc import SQLAlchemyError
import re
import time

app = Flask(__name__)
CORS(app)

# Configuración de la base de datos
DATABASE_URL = "mysql+pymysql://usuario:password@localhost/base_datos"
engine = create_engine(DATABASE_URL, pool_size=10, max_overflow=20)

def validar_consulta_sql(query):
    """Valida que la consulta SQL sea segura"""
    query_upper = query.strip().upper()
    
    # Solo permitir SELECT
    if not query_upper.startswith('SELECT'):
        return False, 'Solo se permiten consultas SELECT'
    
    # Palabras prohibidas
    palabras_prohibidas = [
        'DROP', 'DELETE', 'UPDATE', 'INSERT', 'ALTER',
        'CREATE', 'TRUNCATE', 'GRANT', 'REVOKE'
    ]
    
    for palabra in palabras_prohibidas:
        if palabra in query_upper:
            return False, f'Palabra prohibida: {palabra}'
    
    return True, None

@app.route('/api/modulos/ejecutar-consulta', methods=['POST'])
def ejecutar_consulta():
    try:
        data = request.get_json()
        query = data.get('query')
        
        if not query:
            return jsonify({'error': 'Consulta SQL requerida'}), 400
        
        # Validar consulta
        valido, error = validar_consulta_sql(query)
        if not valido:
            return jsonify({'error': error}), 400
        
        # Limitar resultados
        if 'LIMIT' not in query.upper():
            query = f"{query} LIMIT 1000"
        
        # Ejecutar consulta
        start_time = time.time()
        
        with engine.connect() as connection:
            result = connection.execute(text(query))
            rows = [dict(row) for row in result]
        
        execution_time = (time.time() - start_time) * 1000
        
        return jsonify({
            'success': True,
            'data': rows,
            'count': len(rows),
            'executionTime': f'{execution_time:.2f}ms'
        })
        
    except SQLAlchemyError as e:
        print(f'Error de base de datos: {str(e)}')
        return jsonify({'error': 'Error al ejecutar la consulta'}), 500
    except Exception as e:
        print(f'Error: {str(e)}')
        return jsonify({'error': 'Error interno del servidor'}), 500

if __name__ == '__main__':
    app.run(debug=True, port=3000)
*/

// =============================================================================
// RECOMENDACIONES DE SEGURIDAD IMPORTANTES
// =============================================================================

/*
1. AUTENTICACIÓN Y AUTORIZACIÓN
   - Siempre verificar el token del usuario
   - Validar permisos antes de ejecutar consultas
   - Implementar rate limiting por usuario

2. VALIDACIÓN DE CONSULTAS
   - Solo permitir SELECT
   - Blacklist de palabras peligrosas
   - Limitar longitud de la consulta
   - Validar sintaxis antes de ejecutar

3. LIMITACIÓN DE RECURSOS
   - Timeout para consultas (máx 5-10 segundos)
   - Límite de registros retornados (máx 1000-5000)
   - Pool de conexiones configurado correctamente
   - Rate limiting en el endpoint

4. LOGGING Y AUDITORÍA
   - Registrar todas las consultas ejecutadas
   - Guardar usuario, timestamp, y query
   - Alertas para consultas sospechosas
   - Métricas de uso

5. MANEJO DE ERRORES
   - No exponer detalles internos al cliente
   - Logs detallados en servidor
   - Respuestas genéricas de error

6. CONFIGURACIÓN DE BASE DE DATOS
   - Usuario de BD con permisos limitados (solo SELECT)
   - Conexión con SSL/TLS
   - Credenciales en variables de entorno
   - Backup regular de la BD

7. CACHE
   - Implementar cache para consultas frecuentes
   - Reducir carga en la base de datos
   - Invalidación de cache apropiada

8. MONITOREO
   - Alertas para uso excesivo
   - Métricas de rendimiento
   - Detección de anomalías
*/

module.exports = {
  // Este archivo es solo de ejemplo y documentación
  // Implementa el código según tu stack tecnológico
};
