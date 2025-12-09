# DISEÑO DE BASE DE DATOS MONGODB PARA SAAS MULTI-TENANT

Para transformar tu proyecto en un SaaS (Software as a Service) escalable, te recomiendo esta estructura de colecciones en MongoDB. Esto permitirá que tu Lambda gestione la autenticación y la configuración dinámica.

## 1. Colección: `empresas` (Tenants)
Esta es la colección principal. Cada documento representa a un cliente (empresa) que paga una suscripción.

```json
{
  "_id": ObjectId("..."),
  "nombre": "Moncada Construcciones",
  "identificador": "moncada", // Slug único para URLs o referencias internas
  "logoUrl": "https://s3.aws.../logo-moncada.png",
  "activo": true, // Si es false, nadie de esta empresa puede entrar
  "plan": "premium", // "basic", "pro", "enterprise"
  "fechaVencimiento": ISODate("2025-12-31"),
  
  // Módulos que esta empresa ha contratado (IDs que coinciden con tu frontend)
  "modulosHabilitados": [
    "moncada_core", 
    "almacen_general", 
    "reportes_avanzados"
  ],

  // Configuración específica de la empresa
  "configuracion": {
    "colorPrimario": "#2e78b7",
    "permitirRegistroPublico": false
  },

  "createdAt": ISODate("...")
}
```

## 2. Colección: `usuarios`
Los usuarios pertenecen a una empresa. Ya no son "sueltos".

```json
{
  "_id": ObjectId("..."),
  "empresaId": ObjectId("..."), // REFERENCIA CLAVE a la colección empresas
  "nombre": "Juan Perez",
  "email": "juan@moncada.com",
  "password": "hash_seguro_bcrypt...", // NUNCA texto plano
  "rol": "admin", // "admin", "operario", "supervisor"
  "activo": true,
  "ultimoAcceso": ISODate("...")
}
```

## 3. Colección: `modulos` (Catálogo del Desarrollador)
Aunque tienes módulos nativos en código, es bueno tenerlos registrados en BD para poder activarlos/desactivarlos remotamente sin tocar código.

```json
{
  "_id": "moncada_core", // ID manual que coincide con modulesRegistry.ts
  "nombre": "Gestión Moncada",
  "descripcion": "Módulo exclusivo para gestión de obras...",
  "tipo": "nativo", // "nativo" (carpeta en app) o "dinamico" (JSON)
  "precioMensual": 50.00
}
```

---

# LÓGICA PARA TU LAMBDA (Backend)

Cuando el usuario hace Login, la Lambda debe hacer esto:

1. **Buscar Usuario:** Buscar en colección `usuarios` por email/nombre.
2. **Verificar Password:** Comparar hash.
3. **Buscar Empresa:** Usar el `empresaId` del usuario para buscar en la colección `empresas`.
4. **Validar Suscripción:**
   - ¿La empresa está `activa: true`?
   - ¿La `fechaVencimiento` es futura?
   - Si no, denegar acceso (Error 403: Suscripción vencida).
5. **Construir Respuesta:**
   Devolver al frontend un objeto que combine todo:

```json
// Respuesta del Login
{
  "token": "jwt_token...",
  "usuario": {
    "id": "...",
    "nombre": "Juan",
    "rol": "admin"
  },
  "empresa": {
    "nombre": "Moncada",
    "logo": "...",
    "modulos": ["moncada_core", "almacen_general"] // Esto alimenta tu App
  }
}
```

---

# PANTALLA DE CONFIGURACIÓN (App)

En `app/(tabs)/configuracion.tsx`, deberías implementar estas secciones. Solo visibles si el usuario es `rol: 'admin'`.

1. **Perfil de Empresa:**
   - Ver Logo actual.
   - Ver estado de suscripción ("Activo hasta Dic 2025").
   - Botón para subir nuevo logo (Sube a S3/Cloudinary y actualiza campo `logoUrl` en BD).

2. **Gestión de Usuarios (CRUD):**
   - **Listar:** `GET /api/usuarios?empresaId=X`
   - **Crear:** `POST /api/usuarios` (Nombre, Pass, Rol). El backend asigna automáticamente el `empresaId` del admin que lo crea.
   - **Eliminar/Bloquear:** Switch para poner `activo: false` a un empleado despedido.

3. **Módulos Contratados:**
   - Lista de lectura (Read-only).
   - Muestra qué módulos tienen activos.
   - Mensaje: "Para activar más módulos, contacte a soporte (Jose Chirinos)".
