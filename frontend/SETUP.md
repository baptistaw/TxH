# Guía de Configuración - Frontend TxH

## 📋 Prerrequisitos

- **Node.js:** >= 18.0.0
- **npm:** >= 9.0.0
- **Backend:** Servidor Express corriendo en puerto 4000

## 🚀 Instalación Paso a Paso

### 1. Clonar repositorio (si aplica)

```bash
cd anestesia-trasplante/frontend
```

### 2. Instalar dependencias

```bash
npm install
```

Esto instalará:
- Next.js 14 (App Router)
- React 18
- Tailwind CSS
- TanStack Table
- React Hook Form + Zod
- date-fns

### 3. Configurar variables de entorno

```bash
# Copiar archivo de ejemplo
cp .env.example .env.local
```

Editar `.env.local`:

```bash
# URL del backend API
NEXT_PUBLIC_API_URL=http://localhost:4000/api

# Nombre de la aplicación
NEXT_PUBLIC_APP_NAME=Sistema Registro TxH

# Entorno
NODE_ENV=development
```

### 4. Verificar backend está corriendo

Antes de iniciar el frontend, asegurarse que el backend esté activo:

```bash
cd ../backend
npm run dev
```

El backend debería estar en: http://localhost:4000

### 5. Iniciar servidor de desarrollo

```bash
npm run dev
```

El frontend estará disponible en: http://localhost:3000

## ✅ Verificación

### Health Check del Backend

Abrir en el navegador: http://localhost:4000/api/health

Debería retornar:

```json
{
  "status": "ok",
  "db": true,
  "timestamp": "2025-01-13T12:00:00.000Z"
}
```

### Test de Login

1. Ir a http://localhost:3000/login
2. Usar credenciales de prueba:
   - **Email:** admin@txh.uy
   - **Password:** admin123
3. Debería redirigir a /cases

### Test de Navegación

1. Verificar que la navbar aparece en la parte superior
2. Navegar a "Pacientes"
3. Navegar a "Casos"
4. Hacer clic en "Ver Detalles" de un caso

## 🛠️ Comandos Disponibles

```bash
# Desarrollo
npm run dev              # Inicia servidor de desarrollo en puerto 3000

# Producción
npm run build            # Crea build optimizado
npm start                # Ejecuta build de producción

# Calidad de código
npm run lint             # Ejecuta ESLint
npm run format           # Formatea código con Prettier
```

## 🔧 Configuración de IDE

### VS Code (Recomendado)

Instalar extensiones:

```json
{
  "recommendations": [
    "dbaeumer.vscode-eslint",
    "esbenp.prettier-vscode",
    "bradlc.vscode-tailwindcss"
  ]
}
```

Configurar `.vscode/settings.json`:

```json
{
  "editor.formatOnSave": true,
  "editor.defaultFormatter": "esbenp.prettier-vscode",
  "editor.codeActionsOnSave": {
    "source.fixAll.eslint": true
  },
  "tailwindCSS.experimental.classRegex": [
    ["cn\\(([^)]*)\\)", "(?:'|\"|`)([^']*)(?:'|\"|`)"]
  ]
}
```

## 🐛 Troubleshooting

### Error: "Cannot find module '@/...'"

**Solución:** Verificar que existe `jsconfig.json` en la raíz del proyecto:

```json
{
  "compilerOptions": {
    "baseUrl": ".",
    "paths": {
      "@/*": ["./src/*"]
    }
  }
}
```

### Error de CORS

**Problema:** No se puede conectar con el backend.

**Solución:** Verificar que el backend tenga configurado CORS correctamente:

```bash
# backend/.env
CORS_ORIGIN=http://localhost:3000
```

### Error: "fetch failed" o "ERR_CONNECTION_REFUSED"

**Problema:** Backend no está corriendo.

**Solución:**

```bash
cd ../backend
npm run dev
```

### Token no persiste después de login

**Problema:** localStorage no está disponible.

**Solución:** Verificar que estás usando el componente en client-side. Agregar `'use client'` al inicio del archivo si es necesario.

### Estilos de Tailwind no se aplican

**Problema:** Tailwind no está compilando correctamente.

**Solución:**

```bash
# Limpiar .next y reinstalar
rm -rf .next
npm install
npm run dev
```

### Error al hacer build: "Module not found"

**Problema:** Dependencias no instaladas.

**Solución:**

```bash
rm -rf node_modules package-lock.json
npm install
```

## 📦 Build de Producción

### 1. Configurar variables de entorno de producción

Crear `.env.production.local`:

```bash
NEXT_PUBLIC_API_URL=https://api.txh-registro.uy/api
NEXT_PUBLIC_APP_NAME=Sistema Registro TxH
NODE_ENV=production
```

### 2. Crear build

```bash
npm run build
```

### 3. Probar build localmente

```bash
npm start
```

### 4. Deploy

#### Vercel (Recomendado)

```bash
# Instalar Vercel CLI
npm i -g vercel

# Deploy
vercel
```

Configurar variables de entorno en el dashboard de Vercel.

#### Docker

```dockerfile
FROM node:18-alpine AS base

# Dependencias
FROM base AS deps
WORKDIR /app
COPY package*.json ./
RUN npm ci

# Builder
FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
ENV NEXT_TELEMETRY_DISABLED 1
RUN npm run build

# Runner
FROM base AS runner
WORKDIR /app
ENV NODE_ENV production
ENV NEXT_TELEMETRY_DISABLED 1

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs
EXPOSE 3000
ENV PORT 3000

CMD ["node", "server.js"]
```

Build y run:

```bash
docker build -t txh-frontend .
docker run -p 3000:3000 txh-frontend
```

## 🔐 Credenciales de Prueba

Para testing local:

```
Admin:
  Email: admin@txh.uy
  Password: admin123

Anestesiólogo:
  Email: anest@txh.uy
  Password: anest123
```

**IMPORTANTE:** Cambiar estas credenciales en producción.

## 📊 Monitoreo

### Logs del Frontend

En desarrollo, los logs aparecen en la consola donde ejecutaste `npm run dev`.

En producción (Vercel):
- Ir a Dashboard → Project → Logs
- Filtrar por errores o warnings

### Performance

Verificar métricas de Core Web Vitals:
- LCP (Largest Contentful Paint)
- FID (First Input Delay)
- CLS (Cumulative Layout Shift)

Next.js automáticamente reporta estas métricas en development.

## 🔄 Actualización de Dependencias

```bash
# Ver dependencias desactualizadas
npm outdated

# Actualizar dependencias menores
npm update

# Actualizar Next.js (cuidado con breaking changes)
npm install next@latest react@latest react-dom@latest
```

## 📝 Notas Adicionales

### Rutas Protegidas

Todas las rutas excepto `/login` están protegidas por `ProtectedRoute`.

Si un usuario intenta acceder sin autenticarse, será redirigido a `/login`.

### Estructura de Datos

El frontend espera que el backend retorne:

```javascript
// Paginación
{
  data: [...],
  pagination: {
    page: 1,
    limit: 20,
    total: 150,
    pages: 8
  }
}

// Detalle
{
  id: "...",
  patientId: "...",
  patient: { name: "...", ... },
  // ... más campos
}
```

### Manejo de Errores

Los errores de API se capturan automáticamente y se muestran al usuario con mensajes amigables.

401 (No autorizado) → Logout automático y redirección a login.

---

**¿Problemas?** Crear un issue en el repositorio o contactar al equipo de desarrollo.
