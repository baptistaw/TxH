# API de Administración - Documentación

## Autenticación
Todos los endpoints requieren:
- Header: `Authorization: Bearer <token>`
- Rol: `ADMIN`

---

## GESTIÓN DE USUARIOS

### Listar Usuarios
```http
GET /api/admin/users
```

**Query Parameters:**
- `page` (número, default: 1)
- `limit` (número, default: 50)
- `search` (string): Buscar por nombre o email
- `role` (string): Filtrar por rol (ADMIN, ANESTESIOLOGO, VIEWER)

**Respuesta:**
```json
{
  "data": [
    {
      "id": 111,
      "name": "Karina Rando",
      "email": "karina.rando@gmail.com",
      "specialty": "ANESTESIOLOGO",
      "userRole": "ANESTESIOLOGO",
      "_count": {
        "teamAssignments": 45,
        "procedures": 1,
        "preopEvaluations": 35
      }
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 50,
    "total": 25,
    "totalPages": 1
  }
}
```

### Obtener Usuario por ID
```http
GET /api/admin/users/:id
```

### Crear Usuario
```http
POST /api/admin/users
```

**Body:**
```json
{
  "name": "Nombre Completo",
  "email": "email@ejemplo.com",
  "specialty": "ANESTESIOLOGO",
  "phone": "+598123456789",
  "userRole": "VIEWER",
  "password": "contraseñaInicial"
}
```

### Actualizar Usuario
```http
PUT /api/admin/users/:id
```

**Body:** (todos los campos opcionales)
```json
{
  "name": "Nuevo Nombre",
  "email": "nuevo@email.com",
  "specialty": "CIRUJANO",
  "phone": "+598987654321",
  "userRole": "ANESTESIOLOGO",
  "password": "nuevaContraseña"
}
```

### Eliminar Usuario
```http
DELETE /api/admin/users/:id
```

**Nota:** No se pueden eliminar usuarios con rol ADMIN

---

## GESTIÓN DE PACIENTES

### Listar Pacientes
```http
GET /api/admin/patients
```

**Query Parameters:**
- `page` (número, default: 1)
- `limit` (número, default: 50)
- `search` (string): Buscar por nombre o CI
- `provider` (string): Filtrar por prestador (ASSE, FEMI, CASMU, MP, OTRA)
- `transplanted` (boolean): Filtrar trasplantados

**Respuesta:**
```json
{
  "data": [
    {
      "id": "12345678",
      "name": "Paciente Ejemplo",
      "provider": "ASSE",
      "transplanted": true,
      "_count": {
        "cases": 1,
        "procedures": 2,
        "preops": 3
      }
    }
  ],
  "pagination": {...}
}
```

### Obtener Paciente Completo
```http
GET /api/admin/patients/:id
```

**Respuesta:** Incluye todos los casos, procedimientos y evaluaciones preop

---

## GESTIÓN DE CATÁLOGOS

### Etiologías

#### Listar Etiologías
```http
GET /api/admin/catalogs/etiologies
```

**Query Parameters:**
- `category` (string): Filtrar por categoría
- `active` (boolean)

**Respuesta:**
```json
{
  "data": [
    {
      "id": "cuid...",
      "code": "HVC",
      "name": "Hepatitis C",
      "category": "Viral",
      "description": "...",
      "active": true,
      "_count": {
        "preopEtiologies": 45
      }
    }
  ]
}
```

#### Crear Etiología
```http
POST /api/admin/catalogs/etiologies
```

**Body:**
```json
{
  "code": "NUEVA",
  "name": "Nombre completo",
  "category": "Categoría",
  "description": "Descripción opcional",
  "active": true
}
```

#### Actualizar Etiología
```http
PUT /api/admin/catalogs/etiologies/:id
```

#### Desactivar Etiología
```http
DELETE /api/admin/catalogs/etiologies/:id
```

**Nota:** Marca como `active: false`, no elimina

---

### Antibióticos

#### Listar Antibióticos
```http
GET /api/admin/catalogs/antibiotics
```

**Respuesta:**
```json
{
  "data": [
    {
      "id": "cuid...",
      "code": "PTZ",
      "name": "Piperacilina/Tazobactam",
      "category": "Betalactámico - Inhibidor de betalactamasa",
      "dosage": "4.5 g IV - Dosis estándar | 13.5 g IV en BIC (8h) - Infusión continua",
      "description": "Antibiótico de amplio espectro...",
      "active": true
    }
  ]
}
```

#### Crear Antibiótico
```http
POST /api/admin/catalogs/antibiotics
```

**Body:**
```json
{
  "code": "NUEVO_ATB",
  "name": "Nombre del Antibiótico",
  "category": "Categoría",
  "dosage": "Dosis e indicaciones",
  "description": "Descripción",
  "active": true
}
```

#### Actualizar/Eliminar
- `PUT /api/admin/catalogs/antibiotics/:id`
- `DELETE /api/admin/catalogs/antibiotics/:id` (desactiva)

---

### Posiciones Quirúrgicas

#### Listar Posiciones
```http
GET /api/admin/catalogs/positions
```

#### Crear Posición
```http
POST /api/admin/catalogs/positions
```

**Body:**
```json
{
  "code": "DD",
  "name": "Decúbito Dorsal",
  "description": "Descripción opcional"
}
```

#### Actualizar/Eliminar
- `PUT /api/admin/catalogs/positions/:id`
- `DELETE /api/admin/catalogs/positions/:id`

---

### Locaciones (Procedencia/Destino)

#### Listar Locaciones
```http
GET /api/admin/catalogs/locations
```

**Query Parameters:**
- `type` (string): "provenance" o "destination"

#### Crear Locación
```http
POST /api/admin/catalogs/locations
```

**Body:**
```json
{
  "code": "CTI",
  "name": "CTI",
  "type": "provenance",
  "active": true
}
```

#### Actualizar/Eliminar
- `PUT /api/admin/catalogs/locations/:id`
- `DELETE /api/admin/catalogs/locations/:id`

---

## GESTIÓN DE PROTOCOLOS DE ANTIBIÓTICOS

### Listar Protocolos
```http
GET /api/admin/protocols
```

**Query Parameters:**
- `type` (string): "hepatico", "hepatorrenal", "especial"
- `active` (boolean)

**Respuesta:**
```json
{
  "data": [
    {
      "id": "cuid...",
      "code": "STANDARD_HEPATIC",
      "name": "Profilaxis estándar trasplante hepático",
      "type": "hepatico",
      "isStandard": true,
      "forAllergy": false,
      "forColonization": null,
      "description": "Paciente NO colonizado...",
      "active": true,
      "phases": [
        {
          "id": "cuid...",
          "phase": "pre_incision",
          "order": 1,
          "timing": "30-60 min antes de incisión",
          "duration": null,
          "condition": null,
          "antibiotics": [
            {
              "id": "cuid...",
              "antibioticCode": "PTZ",
              "dose": "4.5 g",
              "frequency": "dosis única",
              "route": "IV",
              "notes": null,
              "order": 1
            }
          ]
        }
      ]
    }
  ]
}
```

### Obtener Protocolo Específico
```http
GET /api/admin/protocols/:id
```

### Crear Protocolo
```http
POST /api/admin/protocols
```

**Body:**
```json
{
  "code": "MI_PROTOCOLO",
  "name": "Nombre del Protocolo",
  "type": "hepatico",
  "isStandard": false,
  "forAllergy": false,
  "forColonization": null,
  "description": "Descripción del protocolo",
  "active": true
}
```

**Nota:** Las fases y antibióticos se crean por separado

### Actualizar Protocolo
```http
PUT /api/admin/protocols/:id
```

**Body:** Mismos campos que crear (opcionales)

### Desactivar Protocolo
```http
DELETE /api/admin/protocols/:id
```

---

## GESTIÓN DE FASES DE PROTOCOLO

### Crear Fase
```http
POST /api/admin/protocols/:protocolId/phases
```

**Body:**
```json
{
  "phase": "pre_incision",
  "order": 1,
  "timing": "30-60 min antes",
  "duration": null,
  "description": "Descripción opcional",
  "condition": null
}
```

**Valores de `phase`:**
- `pre_incision`
- `intraoperatorio`
- `postoperatorio`

### Actualizar Fase
```http
PUT /api/admin/protocols/:protocolId/phases/:phaseId
```

### Eliminar Fase
```http
DELETE /api/admin/protocols/:protocolId/phases/:phaseId
```

**Nota:** Elimina también todos los antibióticos de la fase (cascade)

---

## GESTIÓN DE ANTIBIÓTICOS EN FASES

### Agregar Antibiótico a Fase
```http
POST /api/admin/protocols/:protocolId/phases/:phaseId/antibiotics
```

**Body:**
```json
{
  "antibioticCode": "PTZ",
  "dose": "4.5 g",
  "frequency": "c/8h",
  "route": "IV",
  "notes": "Notas adicionales",
  "order": 1
}
```

### Actualizar Antibiótico
```http
PUT /api/admin/protocols/:protocolId/phases/:phaseId/antibiotics/:antibioticId
```

### Eliminar Antibiótico
```http
DELETE /api/admin/protocols/:protocolId/phases/:phaseId/antibiotics/:antibioticId
```

---

## ESTADÍSTICAS DEL SISTEMA

### Obtener Estadísticas
```http
GET /api/admin/stats
```

**Respuesta:**
```json
{
  "users": {
    "total": 25,
    "byRole": {
      "admin": 1,
      "anestesiologo": 4,
      "viewer": 20
    }
  },
  "patients": 428,
  "cases": 284,
  "procedures": 111,
  "preops": 542,
  "casesByMonth": [
    { "month": "2024-11-01T00:00:00.000Z", "count": 12 },
    ...
  ]
}
```

---

## Ejemplos de Uso

### Crear Protocolo Completo

1. **Crear el protocolo base:**
```http
POST /api/admin/protocols
{
  "code": "NUEVO_PROTOCOLO",
  "name": "Mi Protocolo Personalizado",
  "type": "hepatico",
  "isStandard": false,
  "description": "Descripción"
}
```

2. **Crear fase pre-incisión:**
```http
POST /api/admin/protocols/{protocolId}/phases
{
  "phase": "pre_incision",
  "order": 1,
  "timing": "30-60 min antes"
}
```

3. **Agregar antibióticos a la fase:**
```http
POST /api/admin/protocols/{protocolId}/phases/{phaseId}/antibiotics
{
  "antibioticCode": "PTZ",
  "dose": "4.5 g",
  "frequency": "dosis única",
  "route": "IV",
  "order": 1
}
```

### Actualizar Protocolo Existente

1. **Obtener protocolo completo:**
```http
GET /api/admin/protocols/:id
```

2. **Modificar información del protocolo:**
```http
PUT /api/admin/protocols/:id
{
  "description": "Nueva descripción actualizada"
}
```

3. **Agregar nueva fase:**
```http
POST /api/admin/protocols/:protocolId/phases
{...}
```

4. **Modificar antibiótico existente:**
```http
PUT /api/admin/protocols/:protocolId/phases/:phaseId/antibiotics/:antibioticId
{
  "dose": "Nueva dosis"
}
```

---

## Códigos de Estado HTTP

- `200 OK`: Operación exitosa (GET, PUT)
- `201 Created`: Recurso creado exitosamente (POST)
- `204 No Content`: Eliminación exitosa (DELETE)
- `400 Bad Request`: Datos inválidos
- `401 Unauthorized`: No autenticado
- `403 Forbidden`: No autorizado (no es ADMIN)
- `404 Not Found`: Recurso no encontrado
- `500 Internal Server Error`: Error del servidor

---

## Notas Importantes

1. **Eliminaciones**: La mayoría de los "DELETE" solo desactivan (`active: false`), no eliminan permanentemente
2. **Cascada**: Eliminar una fase elimina todos sus antibióticos
3. **Validación**: Los códigos deben ser únicos
4. **Orden**: El campo `order` controla el orden de visualización
5. **Búsqueda**: Los campos de búsqueda son case-insensitive

