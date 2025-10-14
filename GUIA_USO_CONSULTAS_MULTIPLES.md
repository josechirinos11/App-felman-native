# 📚 Guía de Uso: Consultas Múltiples en Módulos Personalizados

## 🎯 ¿Qué son las Consultas Múltiples?

Las consultas múltiples permiten ejecutar varias consultas SQL relacionadas en secuencia, donde cada consulta puede usar los resultados de consultas anteriores. Esto es útil para:

- **Consultas dependientes**: Obtener un ID en la primera consulta y usarlo en la segunda
- **Datos relacionados**: Traer información de múltiples tablas de manera estructurada
- **Filtros dinámicos**: Aplicar filtros basados en resultados previos
- **Paradas condicionales**: Detener la ejecución si una consulta no retorna resultados

## 🔧 Cómo Configurar Consultas Múltiples

### 1. Activar el Modo de Consultas Múltiples

1. Ve al módulo que deseas editar
2. Presiona el botón de **Configuración** (⚙️)
3. En la sección "💾 Consulta SQL", activa el switch **"Usar Consultas Múltiples"**

![Switch de Consultas Múltiples](ejemplo-toggle.png)

### 2. Agregar Consultas

Una vez activado, verás:
- Un botón **"Agregar Consulta"** (➕)
- Cada consulta se muestra en una tarjeta individual

Para cada consulta debes configurar:

#### a) **ID de Consulta** *
- Identificador único (ej: `query1`, `pedidos`, `detalles`)
- Se usará para referenciar los resultados
- Debe ser único entre todas las consultas

#### b) **SQL** *
- La consulta SQL a ejecutar
- Puede incluir referencias a consultas anteriores usando la sintaxis:
  ```sql
  {{queryId[index].campo}}
  ```

**Ejemplos:**
```sql
-- Query 1: Obtener pedido
SELECT id, cliente, fecha FROM pedidos WHERE numero = '12345'

-- Query 2: Obtener detalles usando resultado de Query 1
SELECT * FROM detalles_pedido WHERE pedido_id = {{query1[0].id}}

-- Query 3: Obtener cliente usando resultado de Query 1
SELECT * FROM clientes WHERE id = {{query1[0].cliente}}
```

#### c) **Parámetros** (opcional)
- Array JSON con valores para la consulta
- Ejemplo: `["valor1", "valor2"]`
- Se pueden usar con placeholders `?` en el SQL

#### d) **Detener si no hay resultados**
- Switch que detiene la ejecución si esta consulta no retorna datos
- Útil cuando las siguientes consultas dependen de estos resultados

### 3. Seleccionar Consulta Principal

Después de agregar todas tus consultas:
1. Busca el campo **"Consulta Principal para Mostrar"**
2. Selecciona qué consulta quieres mostrar en la tabla del módulo
3. Las demás consultas se ejecutarán pero sus datos no se mostrarán directamente

## 📝 Ejemplos Prácticos

### Ejemplo 1: Pedido y sus Detalles

```javascript
// Consulta 1: query1
ID: query1
SQL: SELECT id, numero_pedido, cliente FROM pedidos WHERE numero_pedido = '12345'
Stop on Empty: ✓ Sí (si no hay pedido, no ejecutar lo demás)

// Consulta 2: detalles
ID: detalles
SQL: SELECT * FROM detalles_pedido WHERE pedido_id = {{query1[0].id}}
Stop on Empty: ✗ No

// Query Principal: detalles
```

### Ejemplo 2: Cliente con Facturas y Pagos

```javascript
// Consulta 1: cliente
ID: cliente
SQL: SELECT id, nombre, direccion FROM clientes WHERE codigo = 'CLI001'
Stop on Empty: ✓ Sí

// Consulta 2: facturas
ID: facturas
SQL: SELECT id, numero, fecha, total FROM facturas WHERE cliente_id = {{cliente[0].id}}
Stop on Empty: ✗ No

// Consulta 3: pagos
ID: pagos
SQL: SELECT * FROM pagos WHERE factura_id IN (SELECT id FROM facturas WHERE cliente_id = {{cliente[0].id}})
Stop on Empty: ✗ No

// Query Principal: facturas
```

### Ejemplo 3: Operarios con Fichajes del Día

```javascript
// Consulta 1: operario
ID: operario
SQL: SELECT id, nombre, apellido FROM operarios WHERE codigo = 'OP123'
Stop on Empty: ✓ Sí

// Consulta 2: fichajes_hoy
ID: fichajes_hoy
SQL: SELECT * FROM fichajes WHERE operario_id = {{operario[0].id}} AND DATE(fecha) = CURDATE()
Stop on Empty: ✗ No

// Query Principal: fichajes_hoy
```

## 🔍 Sintaxis de Referencias

### Formato General
```
{{queryId[index].campo}}
```

- **queryId**: ID de la consulta que quieres referenciar
- **index**: Índice del resultado (normalmente 0 para el primer resultado)
- **campo**: Nombre de la columna del resultado

### Ejemplos de Referencias

```sql
-- Referencia simple
{{query1[0].id}}

-- Múltiples referencias en una consulta
SELECT * FROM tabla 
WHERE campo1 = {{query1[0].valor1}} 
  AND campo2 = {{query1[0].valor2}}

-- Referencias en subconsultas
SELECT * FROM productos 
WHERE categoria_id IN (
  SELECT id FROM categorias WHERE codigo = {{query1[0].categoria}}
)

-- Referencias con operaciones
SELECT * FROM ventas 
WHERE fecha >= DATE_SUB({{query1[0].fecha}}, INTERVAL 30 DAY)
```

## 🎨 Flujo Visual

```
┌─────────────────────────────────────────┐
│  📝 Formulario de Configuración         │
├─────────────────────────────────────────┤
│                                         │
│  🔘 Usar Consultas Múltiples: ✓        │
│                                         │
│  ┌───────────────────────────────────┐ │
│  │ 📋 Consulta #1                    │ │
│  │                                   │ │
│  │ ID: query1                        │ │
│  │ SQL: SELECT id, nombre FROM...    │ │
│  │ Stop on Empty: ✓                  │ │
│  └───────────────────────────────────┘ │
│                                         │
│  ┌───────────────────────────────────┐ │
│  │ 📋 Consulta #2                    │ │
│  │                                   │ │
│  │ ID: detalles                      │ │
│  │ SQL: SELECT * WHERE id={{query1...│ │
│  │ Stop on Empty: ✗                  │ │
│  └───────────────────────────────────┘ │
│                                         │
│  ➕ Agregar Consulta                   │
│                                         │
│  Consulta Principal: detalles ▼        │
│                                         │
└─────────────────────────────────────────┘
```

## ⚠️ Validaciones

El sistema valida automáticamente:

1. ✅ Al menos una consulta debe existir
2. ✅ Todas las consultas deben tener un ID
3. ✅ Todas las consultas deben tener SQL
4. ✅ Los IDs deben ser únicos
5. ✅ Debe seleccionarse una consulta principal
6. ✅ Las referencias deben apuntar a consultas anteriores

## 🔄 Formato Backend

Las consultas se envían al endpoint `/consultaMAYOR` con este formato:

```json
{
  "queries": [
    {
      "id": "query1",
      "sql": "SELECT * FROM tabla WHERE...",
      "params": ["valor1"],
      "stopOnEmpty": true
    },
    {
      "id": "query2",
      "sql": "SELECT * FROM tabla2 WHERE id = {{query1[0].id}}",
      "params": [],
      "stopOnEmpty": false
    }
  ]
}
```

La respuesta del backend:

```json
{
  "success": true,
  "results": {
    "query1": {
      "data": [...],
      "executionTime": 45,
      "rowCount": 1
    },
    "query2": {
      "data": [...],
      "executionTime": 32,
      "rowCount": 15
    }
  }
}
```

## 💡 Consejos y Mejores Prácticas

### ✅ Haz

- **Usa IDs descriptivos**: `pedidos`, `detalles`, `cliente` en lugar de `query1`, `query2`
- **Ordena lógicamente**: Las consultas deben estar en orden de dependencia
- **Usa stopOnEmpty**: Cuando las siguientes consultas dependen de estos resultados
- **Documenta**: Usa comentarios en SQL para explicar consultas complejas
- **Prueba**: Verifica cada consulta individualmente antes de combinarlas

### ❌ Evita

- **Referencias circulares**: query2 no puede referenciar query3 si query3 usa query2
- **IDs genéricos**: `q1`, `q2` son difíciles de mantener
- **Consultas muy largas**: Divide en subconsultas si es necesario
- **Referencias hacia adelante**: Solo puedes usar resultados de consultas anteriores
- **Demasiadas consultas**: Limita a 3-5 consultas para mantener el rendimiento

## 🐛 Diagnóstico de Problemas

### Problema: "Los IDs de las consultas deben ser únicos"
- **Causa**: Dos o más consultas tienen el mismo ID
- **Solución**: Cambia los IDs para que sean únicos

### Problema: "Debe seleccionar una consulta principal"
- **Causa**: No se ha seleccionado qué consulta mostrar
- **Solución**: Usa el selector "Consulta Principal para Mostrar"

### Problema: No se muestran datos
- **Causa**: La consulta principal puede no tener resultados
- **Solución**: 
  1. Revisa los logs en la consola (busca emojis 🔍, 📊)
  2. Verifica que la consulta principal sea la correcta
  3. Asegúrate que las referencias estén bien escritas

### Problema: Referencias no funcionan
- **Causa**: Sintaxis incorrecta o referencia a consulta posterior
- **Solución**: 
  - Formato correcto: `{{queryId[0].campo}}`
  - Solo puedes referenciar consultas anteriores
  - Verifica que el campo exista en los resultados

## 📊 Logs y Debugging

Cuando ejecutas un módulo con consultas múltiples, verás logs detallados:

```
🔍 ========================================
🔍 EJECUTANDO CONSULTAS MÚLTIPLES
🔍 ========================================
🔍 Modo: Consultas Múltiples
🔍 Total de consultas: 3
🔍 Query principal: detalles

📤 Request body: {
  "queries": [...]
}

✅ Respuesta recibida
📊 Consulta 'query1': 1 resultados (45ms)
📊 Consulta 'detalles': 15 resultados (32ms)
✅ Datos extraídos de query principal: 15 registros
```

## 🎓 Resumen

Las consultas múltiples son una herramienta poderosa para:
- ✅ Ejecutar consultas dependientes
- ✅ Usar resultados de una consulta en otra
- ✅ Controlar el flujo de ejecución con stopOnEmpty
- ✅ Organizar datos complejos de manera estructurada

Sigue esta guía y tus módulos personalizados serán mucho más potentes y flexibles! 🚀
