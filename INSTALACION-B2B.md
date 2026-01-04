# Guía de Instalación B2B - Sistema Registro TxH

## Requisitos del Servidor

- **VPS/Servidor dedicado** con:
  - Ubuntu 22.04 LTS (recomendado) o Debian 12
  - Mínimo 2 GB RAM, 2 vCPU, 40 GB SSD
  - Puertos 80 y 443 abiertos
  - Dominio apuntando al servidor (registro A en DNS)

- **Software necesario**:
  - Docker Engine 24+
  - Docker Compose v2

## Instalación Rápida

### 1. Instalar Docker

```bash
# Instalar Docker
curl -fsSL https://get.docker.com | sh

# Agregar tu usuario al grupo docker
sudo usermod -aG docker $USER

# Reiniciar sesión o ejecutar:
newgrp docker
```

### 2. Clonar el Repositorio

```bash
git clone https://github.com/tu-usuario/anestesia-trasplante.git
cd anestesia-trasplante
```

### 3. Configurar Variables de Entorno

```bash
# Copiar template
cp .env.template .env

# Editar con tus valores
nano .env
```

**Variables obligatorias:**

| Variable | Descripción | Ejemplo |
|----------|-------------|---------|
| `DOMAIN` | Dominio del cliente | `registro.hospital.com` |
| `INSTITUTION_NAME` | Nombre de la institución | `Hospital Central` |
| `DB_PASSWORD` | Contraseña de PostgreSQL | (generar con `openssl rand -base64 32`) |
| `CLERK_PUBLISHABLE_KEY` | Key pública de Clerk | `pk_live_...` |
| `CLERK_SECRET_KEY` | Key secreta de Clerk | `sk_live_...` |
| `JWT_SECRET` | Secreto para tokens | (generar con node crypto) |
| `ENCRYPTION_KEY` | Clave de cifrado | (generar con `openssl rand -hex 32`) |

### 4. Configurar Clerk

1. Crear aplicación en [dashboard.clerk.com](https://dashboard.clerk.com)
2. Agregar dominio a "Authorized domains"
3. Copiar las keys al `.env`
4. Configurar webhook (después del setup):
   - URL: `https://tu-dominio.com/api/webhooks/clerk`
   - Eventos: `user.created`, `user.updated`, `organization.*`

### 5. Ejecutar Setup

```bash
./setup.sh
```

El script:
- Verifica la configuración
- Genera certificados SSL con Let's Encrypt
- Construye las imágenes Docker
- Inicia todos los servicios
- Ejecuta migraciones de base de datos

### 6. Verificar Instalación

```bash
# Ver estado de servicios
docker compose -f docker-compose.prod.yml ps

# Ver logs
docker compose -f docker-compose.prod.yml logs -f
```

Accede a `https://tu-dominio.com` para verificar.

## Comandos Útiles

```bash
# Ver logs de todos los servicios
docker compose -f docker-compose.prod.yml logs -f

# Ver logs de un servicio específico
docker compose -f docker-compose.prod.yml logs -f backend

# Reiniciar servicios
docker compose -f docker-compose.prod.yml restart

# Detener todo
docker compose -f docker-compose.prod.yml down

# Crear backup manual
./backup.sh

# Actualizar a nueva versión
./update.sh
```

## Mantenimiento

### Backups Automáticos

Configurar cron para backups diarios:

```bash
# Editar crontab
crontab -e

# Agregar línea (backup diario a las 3 AM)
0 3 * * * cd /ruta/a/anestesia-trasplante && ./backup.sh
```

### Monitoreo

Los health checks están configurados en Docker. Para monitoreo externo:

- **Uptime**: `https://tu-dominio.com/health`
- **API**: `https://tu-dominio.com/api/health`

### Renovación SSL

Los certificados se renuevan automáticamente por Certbot.

## Personalización

### Branding

En el archivo `.env`:

```bash
INSTITUTION_NAME=Hospital Central de Montevideo
INSTITUTION_LOGO_URL=https://hospital.com/logo.png
PRIMARY_COLOR=#0066cc
```

Después de cambiar, reconstruir el frontend:

```bash
docker compose -f docker-compose.prod.yml build frontend
docker compose -f docker-compose.prod.yml up -d frontend
```

## Soporte

Para soporte técnico contactar a: [tu-email@ejemplo.com]
