#!/bin/bash
# ==============================================================================
# Script de Setup - Sistema Registro TxH (B2B Single-Tenant)
# ==============================================================================
# Uso: ./setup.sh
# Este script configura una nueva instancia para un cliente
# ==============================================================================

set -e

# Colores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Funciones de utilidad
log_info() { echo -e "${BLUE}[INFO]${NC} $1"; }
log_success() { echo -e "${GREEN}[OK]${NC} $1"; }
log_warning() { echo -e "${YELLOW}[WARN]${NC} $1"; }
log_error() { echo -e "${RED}[ERROR]${NC} $1"; }

# Banner
echo ""
echo "============================================================"
echo "   Sistema Registro TxH - Setup B2B Single-Tenant"
echo "============================================================"
echo ""

# Verificar que existe .env
if [ ! -f ".env" ]; then
    log_error "No se encontró el archivo .env"
    log_info "Ejecuta: cp .env.template .env"
    log_info "Luego edita .env con los valores de tu cliente"
    exit 1
fi

# Cargar variables de entorno
source .env

# Verificar variables requeridas
log_info "Verificando configuración..."

REQUIRED_VARS=(
    "DOMAIN"
    "INSTITUTION_NAME"
    "DB_PASSWORD"
    "CLERK_PUBLISHABLE_KEY"
    "CLERK_SECRET_KEY"
    "JWT_SECRET"
    "ENCRYPTION_KEY"
)

MISSING_VARS=()
for var in "${REQUIRED_VARS[@]}"; do
    if [ -z "${!var}" ]; then
        MISSING_VARS+=("$var")
    fi
done

if [ ${#MISSING_VARS[@]} -gt 0 ]; then
    log_error "Faltan las siguientes variables en .env:"
    for var in "${MISSING_VARS[@]}"; do
        echo "  - $var"
    done
    exit 1
fi

log_success "Configuración verificada"

# Generar configuración de Nginx con el dominio correcto
log_info "Generando configuración de Nginx para: $DOMAIN"

# Crear directorio si no existe
mkdir -p nginx/conf.d

# Generar nginx config con el dominio
cat > nginx/conf.d/app.conf << EOF
# Configuración generada automáticamente para: $DOMAIN

upstream backend {
    server backend:4000;
    keepalive 32;
}

upstream frontend {
    server frontend:3000;
    keepalive 32;
}

server {
    listen 80;
    listen [::]:80;
    server_name $DOMAIN;

    location /.well-known/acme-challenge/ {
        root /var/www/certbot;
    }

    location / {
        return 301 https://\$host\$request_uri;
    }
}

server {
    listen 443 ssl http2;
    listen [::]:443 ssl http2;
    server_name $DOMAIN;

    ssl_certificate /etc/letsencrypt/live/$DOMAIN/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/$DOMAIN/privkey.pem;

    ssl_session_timeout 1d;
    ssl_session_cache shared:SSL:50m;
    ssl_session_tickets off;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers ECDHE-ECDSA-AES128-GCM-SHA256:ECDHE-RSA-AES128-GCM-SHA256:ECDHE-ECDSA-AES256-GCM-SHA384:ECDHE-RSA-AES256-GCM-SHA384;
    ssl_prefer_server_ciphers off;

    add_header Strict-Transport-Security "max-age=63072000" always;
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;

    client_max_body_size 50M;

    location /api {
        proxy_pass http://backend;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_cache_bypass \$http_upgrade;
        proxy_read_timeout 90s;
    }

    location / {
        proxy_pass http://frontend;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_cache_bypass \$http_upgrade;
    }
}
EOF

log_success "Configuración de Nginx generada"

# Crear directorios necesarios
log_info "Creando directorios..."
mkdir -p backups
mkdir -p certbot/conf
mkdir -p certbot/www

log_success "Directorios creados"

# Verificar si Docker está instalado
log_info "Verificando Docker..."
if ! command -v docker &> /dev/null; then
    log_error "Docker no está instalado"
    log_info "Instalar con: curl -fsSL https://get.docker.com | sh"
    exit 1
fi

if ! command -v docker-compose &> /dev/null && ! docker compose version &> /dev/null; then
    log_error "Docker Compose no está instalado"
    exit 1
fi

log_success "Docker verificado"

# Preguntar si generar certificado SSL
echo ""
read -p "¿Generar certificado SSL con Let's Encrypt? (s/n): " GENERATE_SSL

if [[ "$GENERATE_SSL" =~ ^[Ss]$ ]]; then
    if [ -z "$SSL_EMAIL" ]; then
        read -p "Email para notificaciones de SSL: " SSL_EMAIL
    fi

    log_info "Obteniendo certificado SSL para $DOMAIN..."

    # Iniciar nginx temporalmente para el challenge
    docker compose -f docker-compose.prod.yml up -d nginx

    # Obtener certificado
    docker compose -f docker-compose.prod.yml run --rm certbot certonly \
        --webroot \
        --webroot-path=/var/www/certbot \
        --email "$SSL_EMAIL" \
        --agree-tos \
        --no-eff-email \
        -d "$DOMAIN"

    docker compose -f docker-compose.prod.yml down

    log_success "Certificado SSL obtenido"
fi

# Construir imágenes
log_info "Construyendo imágenes Docker..."
docker compose -f docker-compose.prod.yml build --no-cache

log_success "Imágenes construidas"

# Iniciar servicios
log_info "Iniciando servicios..."
docker compose -f docker-compose.prod.yml up -d

# Esperar a que la base de datos esté lista
log_info "Esperando a que PostgreSQL esté listo..."
sleep 10

# Ejecutar migraciones de Prisma
log_info "Ejecutando migraciones de base de datos..."
docker compose -f docker-compose.prod.yml exec -T backend npx prisma migrate deploy

log_success "Migraciones ejecutadas"

# Verificar estado
log_info "Verificando estado de los servicios..."
docker compose -f docker-compose.prod.yml ps

echo ""
echo "============================================================"
log_success "¡Instalación completada!"
echo "============================================================"
echo ""
echo "La aplicación está disponible en:"
echo "  https://$DOMAIN"
echo ""
echo "Próximos pasos:"
echo "  1. Configura el webhook de Clerk en:"
echo "     https://dashboard.clerk.com -> Webhooks"
echo "     URL: https://$DOMAIN/api/webhooks/clerk"
echo ""
echo "  2. Agrega $DOMAIN a los dominios autorizados en Clerk"
echo ""
echo "  3. Crea el primer usuario administrador en:"
echo "     https://$DOMAIN/sign-up"
echo ""
echo "Comandos útiles:"
echo "  Ver logs:     docker compose -f docker-compose.prod.yml logs -f"
echo "  Reiniciar:    docker compose -f docker-compose.prod.yml restart"
echo "  Detener:      docker compose -f docker-compose.prod.yml down"
echo "  Backup BD:    ./backup.sh"
echo ""
