# Panel de Administración - Frontend

## 📋 Resumen

Se ha implementado un panel de administración completo con interfaz web que permite gestionar todos los aspectos del sistema de registro de trasplantes hepáticos.

## 🎯 Funcionalidades Implementadas

### 1. **Dashboard Principal** (`/admin`)
- Vista general de estadísticas del sistema
- Tarjetas con métricas clave:
  - Total de usuarios (por rol)
  - Total de pacientes
  - Casos de trasplante
  - Evaluaciones preoperatorias
- Menú de navegación rápida a todas las secciones
- Tabla de casos por mes (últimos 12 meses)

### 2. **Gestión de Usuarios** (`/admin/users`)
**Características:**
- Listar todos los usuarios del sistema
- Búsqueda por nombre o email
- Filtro por rol (ADMIN, ANESTESIOLOGO, VIEWER)
- Crear nuevos usuarios con contraseña
- Editar usuarios existentes
- Eliminar usuarios (protegido para ADMIN)
- Ver actividad (procedimientos y evaluaciones)

**Campos del formulario:**
- Nombre completo *
- Email *
- Especialidad
- Teléfono
- Rol *
- Contraseña (requerida solo al crear)

### 3. **Gestión de Pacientes** (`/admin/patients`)
**Características:**
- Listar todos los pacientes con paginación
- Búsqueda por nombre o CI
- Filtros:
  - Por prestador (ASSE, FEMI, CASMU, MP, OTRA)
  - Por estado de trasplante (trasplantado/no trasplantado)
- Vista detallada del paciente con:
  - Información general
  - Casos de trasplante con enlaces
  - Evaluaciones preoperatorias con etiologías
  - Otros procedimientos

### 4. **Gestión de Catálogos** (`/admin/catalogs`)
Sistema de tabs para gestionar múltiples catálogos:

#### **Tab: Etiologías**
- Listar, crear, editar y desactivar etiologías
- Campos: código, nombre, categoría, descripción, activo
- Contador de uso en evaluaciones preop

#### **Tab: Antibióticos**
- Gestión del catálogo de antibióticos
- Campos: código, nombre, categoría, dosificación, descripción, activo
- Base para uso en protocolos

#### **Tab: Posiciones**
- Posiciones quirúrgicas
- Campos: código, nombre, descripción, activo

#### **Tab: Locaciones**
- Locaciones de procedencia y destino
- Campos: código, nombre, tipo (procedencia/destino), activo

### 5. **Gestión de Protocolos de Antibióticos** (`/admin/protocols`)
**Interfaz completa de 3 niveles:**

#### **Nivel 1: Protocolos**
- Vista de lista lateral con todos los protocolos
- Crear nuevo protocolo
- Editar protocolo existente
- Desactivar protocolo
- Campos:
  - Código *
  - Nombre *
  - Tipo (hepático, hepatorrenal, especial) *
  - Descripción
  - Protocolo estándar (checkbox)
  - Para alergia (checkbox)
  - Colonización (texto: SAMR, XDR, etc.)
  - Activo (checkbox)

#### **Nivel 2: Fases**
- Vista detallada del protocolo seleccionado
- Agregar fases al protocolo
- Editar fases existentes
- Eliminar fases (elimina también antibióticos)
- Campos:
  - Fase (pre_incision, intraoperatorio, postoperatorio) *
  - Orden *
  - Momento (timing)
  - Duración
  - Condición especial
  - Descripción

#### **Nivel 3: Antibióticos de Fase**
- Agregar antibióticos a cada fase
- Editar antibióticos
- Eliminar antibióticos
- Campos:
  - Antibiótico (select del catálogo) *
  - Dosis *
  - Vía (IV, IM, VO) *
  - Frecuencia
  - Orden
  - Notas

## 🔐 Seguridad

- **Acceso restringido:** Solo usuarios con rol `ADMIN` pueden acceder
- **Validación automática:** Si no es admin, redirección a página principal
- **Protección de eliminación:**
  - No se pueden eliminar usuarios ADMIN
  - Las eliminaciones son "soft delete" (desactivación)
  - Confirmación requerida antes de eliminar

## 🛣️ Rutas del Panel

```
/admin                     → Dashboard principal
/admin/users              → Gestión de usuarios
/admin/patients           → Gestión de pacientes
/admin/catalogs           → Gestión de catálogos
/admin/catalogs?tab=etiologies   → Tab de etiologías
/admin/catalogs?tab=antibiotics  → Tab de antibióticos
/admin/catalogs?tab=positions    → Tab de posiciones
/admin/catalogs?tab=locations    → Tab de locaciones
/admin/protocols          → Gestión de protocolos ATB
```

## 📝 Archivos Creados

### Frontend
```
frontend/src/app/admin/
├── page.jsx                     # Dashboard principal
├── users/
│   └── page.jsx                 # Gestión de usuarios
├── patients/
│   └── page.jsx                 # Gestión de pacientes
├── catalogs/
│   └── page.jsx                 # Gestión de catálogos (tabs)
└── protocols/
    └── page.jsx                 # Gestión de protocolos ATB
```

### API Client
```
frontend/src/lib/api.js          # Extendido con adminApi
```

## 🚀 Cómo Usar

### 1. Acceso al Panel
1. Iniciar sesión como usuario con rol ADMIN
2. Navegar a `/admin` o hacer clic en "Panel de Administración"

### 2. Crear un Protocolo de Antibióticos (Ejemplo)

**Paso 1: Crear el protocolo base**
1. Ir a `/admin/protocols`
2. Clic en "+ Crear"
3. Completar:
   - Código: `STANDARD_HEPATIC`
   - Nombre: `Profilaxis estándar trasplante hepático`
   - Tipo: `Hepático`
   - Descripción: `Paciente NO colonizado previamente...`
   - ✓ Protocolo estándar
4. Guardar

**Paso 2: Agregar fase pre-incisión**
1. Seleccionar el protocolo creado
2. Clic en "+ Agregar Fase"
3. Completar:
   - Fase: `Pre-incisión`
   - Orden: `1`
   - Momento: `30-60 min antes de incisión`
4. Guardar

**Paso 3: Agregar antibióticos a la fase**
1. En la fase creada, clic en "+ Agregar" (antibióticos)
2. Completar:
   - Antibiótico: `PTZ - Piperacilina/Tazobactam`
   - Dosis: `4.5 g`
   - Vía: `IV`
   - Frecuencia: `dosis única`
   - Orden: `1`
3. Guardar
4. Repetir para Gentamicina

**Paso 4: Agregar más fases según el protocolo**
- Fase intraoperatoria con BIC de PTZ
- Fase postoperatoria (24h)
- Fases condicionales (si cirugía >10h, si sangrado >1500ml)

### 3. Crear un Usuario

1. Ir a `/admin/users`
2. Clic en "+ Crear Usuario"
3. Completar todos los campos requeridos
4. **Importante:** La contraseña es obligatoria al crear
5. Guardar

### 4. Gestionar Catálogos

1. Ir a `/admin/catalogs`
2. Seleccionar el tab correspondiente
3. Usar "+ Agregar" para crear nuevos elementos
4. Editar o Desactivar según necesidad

## 🎨 Diseño y UX

- **Responsive:** Funciona en desktop, tablet y móvil
- **Tailwind CSS:** Estilos consistentes con el resto del sistema
- **Modales:** Para crear/editar sin cambiar de página
- **Confirmaciones:** Para acciones destructivas
- **Feedback visual:**
  - Badges de estado (activo/inactivo)
  - Colores por rol de usuario
  - Indicadores de protocolo estándar
- **Navegación intuitiva:**
  - Breadcrumbs implícitos
  - Botones "Volver" en cada página
  - Links directos desde dashboard

## ✅ Estado Actual

**Backend:**
- ✅ API completa con todos los endpoints
- ✅ Validaciones y permisos configurados
- ✅ Documentación en `admin-api-documentation.md`

**Frontend:**
- ✅ Dashboard principal
- ✅ Gestión de usuarios
- ✅ Gestión de pacientes
- ✅ Gestión de catálogos (4 tabs)
- ✅ Gestión de protocolos (3 niveles)
- ✅ API client completo
- ✅ Validaciones y permisos

**Base de datos:**
- ✅ Schema actualizado con normalizaciones
- ✅ Catálogos migrados
- ✅ Relaciones configuradas
- ⚠️ Protocolos vacíos (administrador debe crearlos)

## 📊 Próximos Pasos Opcionales

1. **Exportación de datos:**
   - Exportar catálogos a CSV
   - Exportar protocolos a JSON

2. **Importación masiva:**
   - Importar etiologías desde CSV
   - Importar protocolos desde JSON

3. **Auditoría:**
   - Log de cambios en catálogos
   - Historial de modificaciones de protocolos

4. **Búsqueda avanzada:**
   - Búsqueda por múltiples criterios
   - Filtros combinados

5. **Visualizaciones:**
   - Gráficos de uso de protocolos
   - Estadísticas de etiologías más comunes

## 🔧 Mantenimiento

### Agregar un nuevo catálogo

1. Crear modelo en `prisma/schema.prisma`
2. Agregar endpoints en `src/routes/admin.js`
3. Agregar funciones API en `frontend/src/lib/api.js`
4. Agregar tab en `frontend/src/app/admin/catalogs/page.jsx`

### Modificar un protocolo existente

Los protocolos son completamente editables desde la interfaz:
- No es necesario modificar código
- Cambios se guardan en la base de datos
- Historial disponible mediante backups regulares

## 📞 Soporte

Para cualquier duda o mejora, consultar:
- Documentación de API: `docs/admin-api-documentation.md`
- Schema de base de datos: `prisma/schema.prisma`
- Código de admin routes: `src/routes/admin.js`
