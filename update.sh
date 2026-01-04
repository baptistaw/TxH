#!/bin/bash
# ==============================================================================
# Script de Actualización - Sistema Registro TxH
# ==============================================================================
# Uso: ./update.sh
# Actualiza la instancia a la última versión
# ==============================================================================

set -e

# Colores
GREEN='\033[0;32m'
BLUE='\033[0;34m'
NC='\033[0m'

log_info() { echo -e "${BLUE}[INFO]${NC} $1"; }
log_success() { echo -e "${GREEN}[OK]${NC} $1"; }

echo ""
echo "============================================================"
echo "   Sistema Registro TxH - Actualización"
echo "============================================================"
echo ""

# Cargar variables
source .env

# Crear backup antes de actualizar
log_info "Creando backup de seguridad..."
./backup.sh

# Obtener últimos cambios
log_info "Obteniendo últimos cambios..."
git pull origin main

# Reconstruir imágenes
log_info "Reconstruyendo imágenes..."
docker compose -f docker-compose.prod.yml build --no-cache

# Reiniciar servicios
log_info "Reiniciando servicios..."
docker compose -f docker-compose.prod.yml up -d

# Esperar a que la BD esté lista
sleep 10

# Ejecutar migraciones
log_info "Ejecutando migraciones..."
docker compose -f docker-compose.prod.yml exec -T backend npx prisma migrate deploy

log_success "Actualización completada"

# Verificar estado
docker compose -f docker-compose.prod.yml ps

echo ""
log_success "La aplicación ha sido actualizada"
echo ""
