# ==============================================================================
# Dockerfile - Backend Sistema Registro TxH
# ==============================================================================
# Multi-stage build para producción optimizada
# ==============================================================================

# Stage 1: Dependencias
FROM node:20-alpine AS deps

WORKDIR /app

# Instalar dependencias necesarias para bcrypt y Prisma
RUN apk add --no-cache libc6-compat openssl

# Copiar archivos de dependencias
COPY package*.json ./
COPY prisma ./prisma/

# Instalar dependencias de producción
RUN npm ci --only=production && npm cache clean --force

# Generar cliente Prisma
RUN npx prisma generate

# Stage 2: Producción
FROM node:20-alpine AS runner

WORKDIR /app

# Variables de entorno por defecto
ENV NODE_ENV=production
ENV PORT=4000

# Crear usuario no-root para seguridad
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 expressjs

# Instalar dependencias del sistema
RUN apk add --no-cache openssl

# Copiar dependencias desde stage anterior
COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/prisma ./prisma

# Copiar código fuente
COPY --chown=expressjs:nodejs . .

# Cambiar a usuario no-root
USER expressjs

# Exponer puerto
EXPOSE 4000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:4000/api/health || exit 1

# Comando de inicio
CMD ["node", "src/server.js"]
