# 🔷 Guía de Consultas Múltiples - consultaMAYOR

## 🎯 Objetivo
Permitir configurar módulos con **múltiples consultas SQL** que se ejecutan en secuencia, con capacidad de referenciar resultados entre consultas.

## 📋 Estructura de Datos

### Interface QuerySQL
```typescript
interface QuerySQL {
  id: string;              // Identificador único de la consulta
  sql: string;             // Consulta SQL
  params?: any[];          // Parámetros opcionales
  stopOnEmpty?: boolean;   // Detener ejecución si no hay resultados
}
```

### Interface CustomModule (actualizado)
```typescript
interface CustomModule {
  // ... campos existentes
  
  // NUEVOS CAMPOS:
  usaConsultasMultiples?: boolean;  // Si true, usa consultasSQL en lugar de consultaSQL
  consultasSQL?: QuerySQL[];        // Array de consultas SQL
  queryIdPrincipal?: string;        // ID de la query que se mostrará en la vista
}
```

## 🔧 Formato de Request al Backend

### Consulta Simple (formato actual)
```json
{
  "query": "SELECT * FROM tabla"
}
```

### Consultas Múltiples (consultaMAYOR)
```json
{
  "queries": [
    {
      "id": "clientes",
      "sql": "SELECT * FROM clientes WHERE activo = 1",
      "params": [],
      "stopOnEmpty": false
    },
    {
      "id": "pedidos",
      "sql": "SELECT * FROM pedidos WHERE cliente_id = ?",
      "params": ["{{clientes[0].id}}"],
      "stopOnEmpty": true
    },
    {
      "id": "detalles",
      "sql": "SELECT * FROM detalles WHERE pedido_id = ?",
      "params": ["{{pedidos[0].id}}"],
      "stopOnEmpty": false
    }
  ]
}
```

## 📊 Formato de Response del Backend

```json
{
  "status": "ok",
  "totalQueries": 3,
  "executionLog": [
    {
      "id": "clientes",
      "rowCount": 150,
      "executionTime": "45ms",
      "params": []
    },
    {
      "id": "pedidos",
      "rowCount": 25,
      "executionTime": "32ms",
      "params": [123]
    },
    {
      "id": "detalles",
      "rowCount": 100,
      "executionTime": "78ms",
      "params": [456]
    }
  ],
  "results": {
    "clientes": {
      "rowCount": 150,
      "data": [...],
      "executionTime": "45ms"
    },
    "pedidos": {
      "rowCount": 25,
      "data": [...],
      "executionTime": "32ms"
    },
    "detalles": {
      "rowCount": 100,
      "data": [...],
      "executionTime": "78ms"
    }
  }
}
```

## 🎨 Cómo se Procesa en el Frontend

### 1. Detección del Modo
```typescript
if (modulo.usaConsultasMultiples && modulo.consultasSQL) {
  // Usar formato consultaMAYOR
  requestBody = {
    queries: modulo.consultasSQL.map(q => ({
      id: q.id,
      sql: q.sql,
      params: q.params || [],
      stopOnEmpty: q.stopOnEmpty || false
    }))
  };
} else {
  // Usar formato simple
  requestBody = {
    query: modulo.consultaSQL
  };
}
```

### 2. Extracción de Datos
```typescript
if (modulo.usaConsultasMultiples && resultado.results) {
  // Usar la query principal especificada
  const queryIdPrincipal = modulo.queryIdPrincipal || Object.keys(resultado.results)[0];
  datosObtenidos = resultado.results[queryIdPrincipal].data;
}
```

## 🔍 Casos de Uso

### Caso 1: Datos Relacionados en Cascada
```typescript
{
  usaConsultasMultiples: true,
  queryIdPrincipal: 'pedidos_completos',
  consultasSQL: [
    {
      id: 'cliente',
      sql: 'SELECT * FROM clientes WHERE id = ?',
      params: ['CLI001'],
      stopOnEmpty: true  // Detener si no existe el cliente
    },
    {
      id: 'pedidos_completos',
      sql: 'SELECT * FROM pedidos WHERE cliente_id = ?',
      params: ['{{cliente[0].id}}'],  // Referencia al resultado anterior
      stopOnEmpty: false
    }
  ]
}
```

### Caso 2: Agregaciones y Totales
```typescript
{
  usaConsultasMultiples: true,
  queryIdPrincipal: 'resumen',
  consultasSQL: [
    {
      id: 'ventas',
      sql: 'SELECT SUM(total) as total_ventas FROM ventas WHERE mes = ?',
      params: ['2025-10']
    },
    {
      id: 'gastos',
      sql: 'SELECT SUM(monto) as total_gastos FROM gastos WHERE mes = ?',
      params: ['2025-10']
    },
    {
      id: 'resumen',
      sql: `SELECT 
              {{ventas[0].total_ventas}} as ventas,
              {{gastos[0].total_gastos}} as gastos,
              ({{ventas[0].total_ventas}} - {{gastos[0].total_gastos}}) as utilidad`
    }
  ]
}
```

### Caso 3: Datos de Múltiples Tablas
```typescript
{
  usaConsultasMultiples: true,
  queryIdPrincipal: 'datos_completos',
  consultasSQL: [
    {
      id: 'datos_completos',
      sql: `SELECT 
              p.*,
              c.nombre as cliente_nombre,
              u.nombre as usuario_nombre
            FROM pedidos p
            LEFT JOIN clientes c ON p.cliente_id = c.id
            LEFT JOIN usuarios u ON p.usuario_id = u.id
            LIMIT 50`
    }
  ]
}
```

## 🚀 Ventajas de Consultas Múltiples

### 1. **Reducción de Viajes al Servidor**
Ejecutar 3 consultas en una sola petición en lugar de 3 peticiones separadas.

### 2. **Transaccionalidad**
Todas las consultas se ejecutan en el mismo contexto, garantizando coherencia.

### 3. **Referencias entre Consultas**
Usar resultados de una query como parámetros de la siguiente:
```
Query 1 → Obtener cliente
Query 2 → Usar ID del cliente para obtener pedidos
Query 3 → Usar ID del pedido para obtener detalles
```

### 4. **Control de Flujo**
`stopOnEmpty: true` permite detener la ejecución si una consulta crítica no devuelve resultados.

### 5. **Performance**
El backend puede optimizar las consultas relacionadas.

## ⚙️ Configuración en el Formulario

### Toggle: Usar Consultas Múltiples
```tsx
<View style={styles.toggleContainer}>
  <Text style={styles.label}>Usar Consultas Múltiples (consultaMAYOR)</Text>
  <Switch
    value={usaConsultasMultiples}
    onValueChange={setUsaConsultasMultiples}
  />
  <Text style={styles.helpText}>
    Permite ejecutar múltiples consultas SQL en secuencia con referencias entre ellas
  </Text>
</View>
```

### Lista de Consultas
```tsx
{usaConsultasMultiples && (
  <View style={styles.section}>
    <Text style={styles.sectionTitle}>Consultas SQL</Text>
    
    {consultasSQL.map((query, index) => (
      <View key={index} style={styles.queryCard}>
        <TextInput
          placeholder="ID de la consulta (ej: clientes)"
          value={query.id}
          onChangeText={(text) => updateQuery(index, 'id', text)}
        />
        <TextInput
          placeholder="SELECT * FROM tabla..."
          value={query.sql}
          onChangeText={(text) => updateQuery(index, 'sql', text)}
          multiline
        />
        <View style={styles.queryOptions}>
          <Text>Parámetros (JSON):</Text>
          <TextInput
            placeholder='["valor1", "{{query1[0].campo}}"]'
            value={JSON.stringify(query.params || [])}
            onChangeText={(text) => updateQuery(index, 'params', JSON.parse(text))}
          />
          <View style={styles.checkboxRow}>
            <Text>Detener si vacío:</Text>
            <Switch
              value={query.stopOnEmpty || false}
              onChangeText={(val) => updateQuery(index, 'stopOnEmpty', val)}
            />
          </View>
        </View>
        <TouchableOpacity onPress={() => removeQuery(index)}>
          <Text>Eliminar Consulta</Text>
        </TouchableOpacity>
      </View>
    ))}
    
    <TouchableOpacity onPress={agregarConsulta}>
      <Text>+ Agregar Consulta</Text>
    </TouchableOpacity>
    
    <View style={styles.fieldContainer}>
      <Text style={styles.label}>Query Principal a Mostrar</Text>
      <Picker
        selectedValue={queryIdPrincipal}
        onValueChange={setQueryIdPrincipal}
      >
        {consultasSQL.map(q => (
          <Picker.Item key={q.id} label={q.id} value={q.id} />
        ))}
      </Picker>
    </View>
  </View>
)}
```

## 📱 Vista del Usuario

Cuando un módulo usa consultas múltiples:

1. **Internamente** ejecuta todas las queries configuradas
2. **Externamente** muestra solo los datos de la `queryIdPrincipal`
3. **Los logs** muestran todas las queries ejecutadas y sus tiempos

### Log de Ejemplo
```
🔷 MODO: Consultas Múltiples (consultaMAYOR)
🔷 Total de consultas: 3
📤 Request Body (Consultas Múltiples):
   Query 1:
     ID: clientes
     SQL: SELECT * FROM clientes WHERE activo = 1...
     Params: []
     stopOnEmpty: false
   Query 2:
     ID: pedidos
     SQL: SELECT * FROM pedidos WHERE cliente_id = ?...
     Params: ["{{clientes[0].id}}"]
     stopOnEmpty: true
   Query 3:
     ID: detalles
     SQL: SELECT * FROM detalles WHERE pedido_id = ?...
     Params: ["{{pedidos[0].id}}"]
     stopOnEmpty: false
📦 Respuesta de consultaMAYOR detectada
📦 Total de queries ejecutadas: 3
📦 Log de ejecución:
   clientes: 150 registros en 45ms
   pedidos: 25 registros en 32ms
   detalles: 100 registros en 78ms
✅ Procesando respuesta: resultado.results["pedidos"].data (consultaMAYOR)
📊 Total de registros obtenidos: 25
```

## 🎯 Próximos Pasos

### 1. Actualizar Formularios
- [ ] `agregarModulo.tsx` - Agregar toggle y lista de consultas
- [ ] `configurarModulo.tsx` - Permitir editar consultas múltiples

### 2. Validaciones
- [ ] Validar IDs únicos en las consultas
- [ ] Validar SQL de cada query
- [ ] Validar que queryIdPrincipal exista en consultasSQL

### 3. UI/UX
- [ ] Editor visual de queries con syntax highlighting
- [ ] Validador de referencias `{{queryId.campo}}`
- [ ] Preview de resultados de cada query

### 4. Documentación
- [ ] Ejemplos de uso comunes
- [ ] Best practices para referencias
- [ ] Guía de optimización de queries

---

**Fecha de creación**: 14 de octubre de 2025  
**Estado**: ✅ Interfaz actualizada, pendiente formularios
