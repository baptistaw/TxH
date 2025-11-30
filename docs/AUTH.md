# Sistema de Autenticación y Autorización

Este documento describe el sistema de autenticación y autorización del Sistema de Registro Anestesiológico TxH.

## Tabla de Contenidos

1. [Arquitectura General](#arquitectura-general)
2. [Clerk - Proveedor de Autenticación](#clerk---proveedor-de-autenticación)
3. [Roles del Sistema](#roles-del-sistema)
4. [Flujo de Autenticación](#flujo-de-autenticación)
5. [Bootstrap - Inicialización del Sistema](#bootstrap---inicialización-del-sistema)
6. [Sincronización de Usuarios](#sincronización-de-usuarios)
7. [Datos de Organización](#datos-de-organización)
8. [API de Autenticación](#api-de-autenticación)
9. [Guía de Configuración](#guía-de-configuración)

---

## Arquitectura General

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              CLERK (Externo)                                │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                         Organización                                 │   │
│  │  - Nombre de la organización                                         │   │
│  │  - Logo de la organización                                           │   │
│  │  - Usuarios y sus roles (org:admin, org:member)                      │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                    │                                        │
│                                    │ JWT Token (incluye org_role)           │
│                                    ▼                                        │
└────────────────────────────────────│────────────────────────────────────────┘
                                     │
                                     ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                           SISTEMA TxH                                       │
│  ┌──────────────────────┐              ┌──────────────────────┐            │
│  │      FRONTEND        │              │       BACKEND        │            │
│  │  (Next.js + Clerk)   │◄────────────►│     (Express.js)     │            │
│  │                      │   API REST   │                      │            │
│  │  - AuthContext       │              │  - Middleware auth   │            │
│  │  - useOrganization   │              │  - RBAC              │            │
│  └──────────────────────┘              └──────────┬───────────┘            │
│                                                   │                         │
│                                                   ▼                         │
│                                        ┌──────────────────────┐            │
│                                        │   BASE DE DATOS      │            │
│                                        │    (PostgreSQL)      │            │
│                                        │                      │            │
│                                        │  Clinician:          │            │
│                                        │  - id                │            │
│                                        │  - clerkId           │            │
│                                        │  - email             │            │
│                                        │  - userRole ◄────────┼── ADMIN    │
│                                        │                      │   ANESTESIOLOGO
│                                        │                      │   VIEWER   │
│                                        └──────────────────────┘            │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Principio de Diseño: "BD Siempre Gana"

Los roles del sistema se gestionan **exclusivamente desde la base de datos**. Clerk se utiliza únicamente para:

- Autenticación (login/logout)
- Verificación de identidad (email, clerkId)
- Datos de la organización (nombre, logo)
- Control de acceso al bootstrap (org:admin)

**Clerk NO sincroniza roles automáticamente con la BD.**

---

## Clerk - Proveedor de Autenticación

### Configuración de Clerk

El sistema utiliza [Clerk](https://clerk.com) como proveedor de autenticación externo.

#### Variables de Entorno

**Frontend (`.env.local`):**
```env
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_...
CLERK_SECRET_KEY=sk_test_...
NEXT_PUBLIC_CLERK_SIGN_IN_URL=/sign-in
NEXT_PUBLIC_CLERK_SIGN_UP_URL=/sign-up
NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL=/dashboard
NEXT_PUBLIC_CLERK_AFTER_SIGN_UP_URL=/dashboard
```

**Backend (`.env`):**
```env
CLERK_SECRET_KEY=sk_test_...
```

### Organizaciones en Clerk

Cada institución médica tiene su propia organización en Clerk con:

| Campo | Descripción |
|-------|-------------|
| `name` | Nombre completo de la organización |
| `imageUrl` | Logo de la organización |
| `slug` | Identificador único (ej: `pnth-uruguay`) |

### Roles en Clerk Organizations

| Rol Clerk | Descripción | Uso en TxH |
|-----------|-------------|------------|
| `org:admin` | Administrador de la organización | Puede ejecutar bootstrap |
| `org:member` | Miembro de la organización | Usuario regular |

**Importante:** Los roles de Clerk (`org:admin`, `org:member`) son independientes de los roles del sistema (`ADMIN`, `ANESTESIOLOGO`, `VIEWER`).

---

## Roles del Sistema

Los roles se definen en la base de datos en el campo `userRole` de la tabla `Clinician`.

### Roles Disponibles

| Rol | Permisos |
|-----|----------|
| `ADMIN` | Acceso total. Gestión de usuarios, catálogos, protocolos y todos los datos clínicos. |
| `ANESTESIOLOGO` | Crear y editar pacientes, trasplantes, procedimientos y registros intraoperatorios. |
| `VIEWER` | Solo lectura. Puede visualizar todos los datos pero no modificarlos. |

### Jerarquía de Permisos

```
ADMIN
  └── ANESTESIOLOGO
        └── VIEWER
```

### Middleware de Autorización

```javascript
// Uso en rutas del backend
const { authenticate, authorize, ROLES } = require('../middlewares/auth');

// Solo ADMIN
router.post('/users', authenticate, authorize(ROLES.ADMIN), controller.create);

// ADMIN o ANESTESIOLOGO
router.post('/cases', authenticate, authorize(ROLES.ADMIN, ROLES.ANESTESIOLOGO), controller.create);

// Cualquier usuario autenticado
router.get('/patients', authenticate, controller.list);
```

---

## Flujo de Autenticación

### 1. Login

```
Usuario                 Frontend              Clerk                Backend
   │                       │                    │                     │
   │──── Click Login ─────►│                    │                     │
   │                       │──── Redirect ─────►│                     │
   │                       │                    │                     │
   │◄───── Login Form ─────│◄───────────────────│                     │
   │                       │                    │                     │
   │──── Credenciales ────►│───────────────────►│                     │
   │                       │                    │                     │
   │                       │◄──── JWT Token ────│                     │
   │                       │                    │                     │
   │                       │──── GET /auth/me ──┼────────────────────►│
   │                       │                    │                     │
   │                       │◄─── User Data ─────┼─────────────────────│
   │                       │                    │                     │
   │◄── Dashboard ─────────│                    │                     │
```

### 2. Verificación de Token

El backend verifica el token JWT de Clerk en cada request:

```javascript
// middlewares/auth.js
const { verifyToken } = require('@clerk/backend');

const verifiedToken = await verifyToken(token, { secretKey });

// Datos extraídos del token:
// - sub (clerkId)
// - email
// - org_id
// - org_role
// - org_slug
```

### 3. Vinculación con BD

Una vez verificado el token, el backend busca al usuario en la BD:

```javascript
// Por clerkId (usuarios ya vinculados)
const clinician = await prisma.clinician.findFirst({
  where: { clerkId }
});

// O por email (primera vez)
const clinician = await prisma.clinician.findUnique({
  where: { email }
});
```

---

## Bootstrap - Inicialización del Sistema

El bootstrap es el proceso de crear el primer administrador cuando el sistema no tiene ninguno.

### Flujo de Bootstrap

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         FLUJO DE BOOTSTRAP                                  │
│                                                                             │
│  Usuario inicia sesión con Clerk                                            │
│         │                                                                   │
│         ▼                                                                   │
│  ¿Usuario existe en BD?                                                     │
│         │                                                                   │
│    ┌────┴────┐                                                              │
│   SÍ        NO                                                              │
│    │         │                                                              │
│    │         ▼                                                              │
│    │    ¿Existen ADMINs en BD?                                              │
│    │         │                                                              │
│    │    ┌────┴────┐                                                         │
│    │   SÍ        NO                                                         │
│    │    │         │                                                         │
│    │    │         ▼                                                         │
│    │    │    ¿Usuario es org:admin en Clerk?                                │
│    │    │         │                                                         │
│    │    │    ┌────┴────┐                                                    │
│    │    │   SÍ        NO                                                    │
│    │    │    │         │                                                    │
│    │    │    ▼         ▼                                                    │
│    │    │  /bootstrap  "Contacta al admin de Clerk"                         │
│    │    │    │                                                              │
│    │    │    ▼                                                              │
│    │    │  Crear ADMIN                                                      │
│    │    │    │                                                              │
│    ▼    ▼    ▼                                                              │
│  /dashboard                                                                 │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Requisitos para Bootstrap

1. **No debe existir ningún usuario con rol ADMIN en la base de datos**
2. **El usuario de Clerk debe tener rol `org:admin` en la organización**

### Endpoints de Bootstrap

#### Verificar Estado

```http
GET /api/auth/bootstrap/status
Authorization: Bearer <clerk_token>
```

**Respuesta:**
```json
{
  "bootstrapAvailable": true,
  "isEligible": true,
  "message": "Puedes crear el primer administrador del sistema."
}
```

#### Ejecutar Bootstrap

```http
POST /api/auth/bootstrap
Authorization: Bearer <clerk_token>
Content-Type: application/json

{
  "name": "Dr. Juan Pérez",
  "specialty": "ANESTESIOLOGIA"
}
```

**Respuesta exitosa (201):**
```json
{
  "message": "Primer administrador creado exitosamente",
  "user": {
    "id": 1,
    "name": "Dr. Juan Pérez",
    "email": "juan.perez@hospital.com",
    "specialty": "ANESTESIOLOGIA",
    "userRole": "ADMIN",
    "clerkId": "user_xxxxx"
  }
}
```

**Errores posibles:**

| Código | Error | Descripción |
|--------|-------|-------------|
| 403 | Acceso denegado | Usuario no es org:admin en Clerk |
| 409 | Bootstrap no disponible | Ya existe un ADMIN en el sistema |
| 400 | Datos incompletos | Falta el nombre del usuario |

### Página de Bootstrap (Frontend)

La página `/bootstrap` se muestra automáticamente cuando:
- El usuario está autenticado en Clerk
- No existe en la base de datos
- El bootstrap está disponible
- El usuario es `org:admin` en Clerk

---

## Sincronización de Usuarios

### Endpoint de Sincronización

```http
POST /api/auth/sync
Authorization: Bearer <clerk_token>
```

Este endpoint vincula un usuario de Clerk con un registro existente en la BD por email.

### Comportamiento

| Escenario | Acción |
|-----------|--------|
| Usuario existe en BD por email | Vincula `clerkId` al registro existente |
| Usuario no existe en BD | Retorna 404 (debe crearlo un admin) |
| Usuario ya vinculado | No hace nada, retorna datos actuales |

**Importante:** La sincronización **NO modifica roles**. Los roles se gestionan únicamente desde el panel de administración.

### Crear Usuarios Nuevos

Solo los administradores pueden crear usuarios:

```http
POST /api/admin/users
Authorization: Bearer <clerk_token>
Content-Type: application/json

{
  "name": "Dra. María López",
  "email": "maria.lopez@hospital.com",
  "specialty": "CIRUGIA",
  "userRole": "VIEWER"
}
```

El usuario creado podrá iniciar sesión una vez que:
1. Tenga una cuenta en Clerk con el mismo email
2. Inicie sesión y se vincule automáticamente

---

## Datos de Organización

### Hook useOrganization

El frontend utiliza un hook personalizado para obtener datos de la organización de Clerk:

```javascript
// src/hooks/useOrganization.js
import { useOrganization } from '@/hooks/useOrganization';

function MyComponent() {
  const {
    name,           // Nombre de la organización
    logoUrl,        // URL del logo
    slug,           // Slug de la organización
    id,             // ID de la organización
    memberRole,     // Rol del usuario en Clerk (org:admin, org:member)
    isOrgAdmin,     // true si el usuario es org:admin
    isLoaded,       // true cuando los datos están listos
    hasOrganization // true si hay una organización activa
  } = useOrganization();

  return (
    <div>
      <img src={logoUrl} alt={name} />
      <h1>{name}</h1>
    </div>
  );
}
```

### Fallbacks

Si no hay organización activa, se usan valores por defecto:
- `name`: "Sistema TxH"
- `logoUrl`: "/logo.jpg"

---

## API de Autenticación

### Endpoints

| Método | Ruta | Descripción |
|--------|------|-------------|
| GET | `/api/auth/me` | Obtener usuario actual |
| POST | `/api/auth/sync` | Sincronizar usuario de Clerk con BD |
| PUT | `/api/auth/profile` | Actualizar perfil del usuario |
| GET | `/api/auth/bootstrap/status` | Verificar estado del bootstrap |
| POST | `/api/auth/bootstrap` | Ejecutar bootstrap |

### GET /api/auth/me

Obtiene los datos del usuario autenticado.

**Request:**
```http
GET /api/auth/me
Authorization: Bearer <clerk_token>
```

**Response (usuario existente):**
```json
{
  "user": {
    "id": 1,
    "name": "Dr. Juan Pérez",
    "email": "juan.perez@hospital.com",
    "specialty": "ANESTESIOLOGIA",
    "phone": "+598 99 123 456",
    "userRole": "ADMIN",
    "clerkId": "user_xxxxx"
  }
}
```

**Response (usuario nuevo):**
```json
{
  "user": {
    "clerkId": "user_xxxxx",
    "email": "nuevo@hospital.com",
    "role": "VIEWER",
    "isNewUser": true
  }
}
```

### PUT /api/auth/profile

Actualiza el perfil del usuario.

**Request:**
```http
PUT /api/auth/profile
Authorization: Bearer <clerk_token>
Content-Type: application/json

{
  "name": "Dr. Juan Pérez García",
  "phone": "+598 99 999 999"
}
```

**Response:**
```json
{
  "message": "Perfil actualizado exitosamente",
  "user": {
    "id": 1,
    "name": "Dr. Juan Pérez García",
    "email": "juan.perez@hospital.com",
    "phone": "+598 99 999 999",
    "specialty": "ANESTESIOLOGIA",
    "userRole": "ADMIN"
  }
}
```

---

## Guía de Configuración

### Para una Organización Nueva

#### 1. Configurar Clerk

1. Crear cuenta en [Clerk](https://clerk.com)
2. Crear una nueva aplicación
3. Habilitar "Organizations" en la configuración
4. Crear la organización con nombre y logo
5. Agregar el primer usuario como `org:admin`

#### 2. Configurar el Sistema

1. Configurar variables de entorno con las claves de Clerk
2. Iniciar backend y frontend
3. El usuario `org:admin` inicia sesión
4. Automáticamente se redirige a `/bootstrap`
5. Completa el formulario para crear el primer ADMIN

#### 3. Crear Usuarios

1. El ADMIN accede a `/admin/users`
2. Crea usuarios con email, nombre, especialidad y rol
3. Los usuarios crean sus cuentas en Clerk (mismo email)
4. Al iniciar sesión, se vinculan automáticamente

### Troubleshooting

#### "Usuario no registrado"

El usuario está en Clerk pero no en la BD.

**Solución:** Un ADMIN debe crear el usuario en `/admin/users`.

#### "Acceso denegado" en Bootstrap

El usuario no es `org:admin` en Clerk.

**Solución:** En el dashboard de Clerk, asignar rol `org:admin` al usuario.

#### "Bootstrap no disponible"

Ya existe un ADMIN en el sistema.

**Solución:** Contactar al ADMIN existente para crear la cuenta.

#### Logo u organización incorrectos

Los datos de organización vienen de Clerk.

**Solución:** Actualizar nombre/logo en el dashboard de Clerk.

---

## Diagrama de Componentes

```
Frontend                                     Backend
─────────────────────────────────────────────────────────────────────

ClerkProvider
    │
    ├── AuthContext ◄──────── API ─────────► authController
    │       │                                    │
    │       ├── syncUserWithDB()                 ├── getCurrentUser()
    │       ├── bootstrapStatus                  ├── syncUser()
    │       └── user (BD + Clerk)                ├── bootstrap()
    │                                            └── getBootstrapStatus()
    │
    ├── useOrganization ◄─── Clerk API
    │       │
    │       ├── name
    │       ├── logoUrl
    │       └── memberRole
    │
    └── Páginas
            │
            ├── /bootstrap
            ├── /dashboard
            └── /admin/users
```

---

## Histórico de Cambios

| Fecha | Cambio |
|-------|--------|
| 2024-01-XX | Implementación inicial con Clerk |
| 2024-XX-XX | Agregado sistema de bootstrap |
| 2024-XX-XX | Separación de roles Clerk vs BD ("BD siempre gana") |

---

## Referencias

- [Clerk Documentation](https://clerk.com/docs)
- [Clerk Organizations](https://clerk.com/docs/organizations/overview)
- [Next.js + Clerk](https://clerk.com/docs/quickstarts/nextjs)
