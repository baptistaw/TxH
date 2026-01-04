#!/bin/bash
# ==============================================================================
# Script de Backup - Sistema Registro TxH
# ==============================================================================
# Uso: ./backup.sh
# Genera un backup de la base de datos PostgreSQL
# ==============================================================================

set -e

# Cargar variables
source .env

# Timestamp
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
BACKUP_FILE="backups/backup_${COMPOSE_PROJECT_NAME}_${TIMESTAMP}.sql.gz"

echo "Creando backup de la base de datos..."

# Crear backup
docker compose -f docker-compose.prod.yml exec -T postgres \
    pg_dump -U "${DB_USER:-postgres}" "${DB_NAME:-txh_registro}" | gzip > "$BACKUP_FILE"

echo "Backup creado: $BACKUP_FILE"

# Mantener solo los últimos 30 backups
cd backups
ls -tp | grep -v '/$' | tail -n +31 | xargs -I {} rm -- {} 2>/dev/null || true
cd ..

echo "Backups antiguos limpiados (manteniendo últimos 30)"
