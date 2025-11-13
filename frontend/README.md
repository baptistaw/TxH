# Frontend - Sistema Registro TxH

Frontend del Sistema de Registro Anestesiológico de Trasplante Hepático construido con Next.js 14 (App Router) y JavaScript.

## 🎨 Stack Tecnológico

- **Framework:** Next.js 14 (App Router)
- **Lenguaje:** JavaScript (ES6+)
- **Estilos:** Tailwind CSS (tema oscuro quirófano-friendly)
- **Tablas:** TanStack Table v8
- **Formularios:** React Hook Form + Zod
- **HTTP Client:** Fetch API nativo
- **Gestión de Estado:** React Context API
- **Enrutamiento:** Next.js App Router
- **Autenticación:** JWT con localStorage

## 📁 Estructura del Proyecto

```
frontend/
├── src/
│   ├── app/                    # App Router pages
│   │   ├── (auth)/
│   │   │   └── login/
│   │   │       └── page.jsx    # Página de login
│   │   ├── patients/
│   │   │   └── page.jsx        # Lista de pacientes
│   │   ├── cases/
│   │   │   ├── page.jsx        # Lista de casos
│   │   │   └── [id]/
│   │   │       └── page.jsx    # Detalle de caso
│   │   ├── layout.jsx          # Layout raíz
│   │   └── globals.css         # Estilos globales
│   ├── components/
│   │   ├── ui/                 # Componentes UI base
│   │   │   ├── Button.jsx
│   │   │   ├── Input.jsx
│   │   │   ├── Card.jsx
│   │   │   ├── Badge.jsx
│   │   │   ├── Spinner.jsx
│   │   │   └── Table.jsx
│   │   ├── layout/             # Componentes de layout
│   │   │   └── Navbar.jsx
│   │   └── auth/               # Componentes de autenticación
│   │       └── ProtectedRoute.jsx
│   ├── contexts/
│   │   └── AuthContext.jsx     # Context de autenticación
│   └── lib/
│       ├── api.js              # Cliente API
│       ├── auth.js             # Utilidades de auth
│       └── utils.js            # Utilidades generales
├── public/                     # Archivos estáticos
├── .env.example               # Variables de entorno
├── next.config.js             # Configuración Next.js
├── tailwind.config.js         # Configuración Tailwind
├── jsconfig.json              # Alias de rutas
└── package.json               # Dependencias
```

## 🚀 Instalación y Configuración

### 1. Instalar dependencias

```bash
npm install
```

### 2. Configurar variables de entorno

```bash
# Copiar archivo de ejemplo
cp .env.example .env.local

# Editar .env.local
NEXT_PUBLIC_API_URL=http://localhost:4000/api
NEXT_PUBLIC_APP_NAME=Sistema Registro TxH
```

### 3. Ejecutar en desarrollo

```bash
npm run dev
```

La aplicación estará disponible en: http://localhost:3000

### 4. Build de producción

```bash
# Crear build
npm run build

# Ejecutar build
npm start
```

## 🎯 Funcionalidades Implementadas

### Autenticación
- ✅ Login con email/password
- ✅ Persistencia de token en localStorage
- ✅ Protección de rutas con ProtectedRoute
- ✅ Logout automático en 401
- ✅ Context API para gestión de usuario

### Páginas

#### `/login`
- Formulario con React Hook Form + Zod
- Validación de campos
- Manejo de errores
- Redirección automática si ya está autenticado

#### `/patients`
- Lista de pacientes con paginación server-side
- TanStack Table para gestión de tabla
- Filtro de búsqueda por CI o nombre (debounced)
- Formateo de CI uruguayo
- Badges para estados (trasplantado)

#### `/cases`
- Lista de casos de trasplante
- Paginación server-side
- Filtros avanzados
- Badges para Retrasplante y Hepato-Renal
- Link a detalle de cada caso

#### `/cases/[id]`
- Vista detallada del caso
- Datos del trasplante (fechas, tiempos de isquemia, etc.)
- Evaluación Preoperatoria (MELD, Child, etiologías)
- Equipo Clínico (con avatares)
- Observaciones del caso
- Layout responsivo (2 columnas en desktop)

## 🎨 Diseño Oscuro "Quirófano-Friendly"

### Paleta de Colores

**Surgical (Verde Quirúrgico):**
- Primary: `#00a0a0` - Verde quirúrgico principal
- Usado para: Botones primarios, enlaces, acentos

**Medical (Azul Médico):**
- Primary: `#0057e6` - Azul médico
- Usado para: Elementos secundarios, badges

**Dark (Fondo Oscuro):**
- Main: `#252f36` - Fondo principal
- 600: `#1e262c` - Cards y paneles
- 700: `#161c21` - Elementos interactivos

### Características de Diseño

- Alto contraste para legibilidad en entornos oscuros
- Efectos de brillo (glow) sutiles en elementos importantes
- Tipografía clara y espaciado cómodo
- Transiciones suaves
- Scrollbar personalizado
- Responsive en todos los dispositivos

## 🔧 Componentes UI

### Button
```jsx
<Button variant="primary|secondary|outline|ghost|danger" size="sm|md|lg">
  Texto
</Button>
```

### Input
```jsx
<Input
  label="Email"
  type="email"
  error="Error message"
  helperText="Helper text"
/>
```

### Card
```jsx
<Card>
  <CardHeader>
    <CardTitle>Título</CardTitle>
    <CardDescription>Descripción</CardDescription>
  </CardHeader>
  <CardContent>Contenido</CardContent>
  <CardFooter>Footer</CardFooter>
</Card>
```

### Badge
```jsx
<Badge variant="default|success|warning|danger|info|surgical">
  Texto
</Badge>
```

### DataTable (TanStack Table)
```jsx
<DataTable table={table} />
<TablePagination table={table} totalRecords={total} />
```

## 🔐 Autenticación

### Credenciales de Prueba

```bash
# Admin
Email: admin@txh.uy
Password: admin123

# Anestesiólogo
Email: anest@txh.uy
Password: anest123
```

### AuthContext

```jsx
import { useAuth } from '@/contexts/AuthContext';

function MyComponent() {
  const { user, login, logout, isAuthenticated } = useAuth();
  // ...
}
```

### ProtectedRoute

```jsx
<ProtectedRoute requiredRoles={['admin', 'anestesiologo']}>
  <MyProtectedComponent />
</ProtectedRoute>
```

## 📡 API Client

### Uso del cliente API

```javascript
import { patientsApi, casesApi, authApi } from '@/lib/api';

// Listar pacientes con filtros
const data = await patientsApi.list({ search: 'Juan', page: 1, limit: 20 });

// Obtener caso por ID
const caso = await casesApi.getById('cuid123');

// Login
const result = await authApi.login('email@example.com', 'password');
```

### Manejo de Errores

El cliente API maneja automáticamente:
- Tokens expirados (401) → Logout automático
- Errores de red → ApiError con mensaje descriptivo
- Respuestas no-JSON → Conversión a texto

## 🧪 Testing (Futuro)

```bash
# Ejecutar tests
npm test

# Coverage
npm run test:coverage
```

## 📝 Utilidades

### Formateo

```javascript
import { formatDate, formatCI, formatDuration, formatBoolean } from '@/lib/utils';

formatDate('2024-01-13T12:00:00Z') // '13/01/2024'
formatCI('1234567') // '1.234.567-X'
formatDuration(125) // '2h 5min'
formatBoolean(true) // 'Sí'
```

### Validación

```javascript
import { isValidCI } from '@/lib/utils';

isValidCI('1234567') // true
isValidCI('abc') // false
```

## 🐛 Troubleshooting

### Error: "Cannot find module '@/...'"

Verificar que `jsconfig.json` existe y tiene la configuración correcta.

### Error de CORS

Verificar que el backend tiene configurado el origin correcto en `.env`:

```bash
CORS_ORIGIN=http://localhost:3000
```

### Token no persiste

Verificar que localStorage esté disponible (solo funciona en client-side).

## 📦 Deploy

### Vercel (Recomendado)

```bash
# Conectar repo a Vercel
vercel

# Configurar variables de entorno en Vercel:
NEXT_PUBLIC_API_URL=https://api.txh-registro.uy/api
```

### Docker

```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
RUN npm run build
EXPOSE 3000
CMD ["npm", "start"]
```

## 🤝 Contribuir

1. Fork el proyecto
2. Crear branch de feature (`git checkout -b feature/AmazingFeature`)
3. Commit cambios (`git commit -m 'Add some AmazingFeature'`)
4. Push al branch (`git push origin feature/AmazingFeature`)
5. Abrir Pull Request

## 📄 Licencia

UNLICENSED - Uso interno Hospital de Clínicas

---

**Desarrollado con ❤️ para el Hospital de Clínicas - UdelaR**
