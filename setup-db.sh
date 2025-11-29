#!/bin/bash
# Script simplificado para configurar PostgreSQL
# Ejecuta esto manualmente: ./setup-db.sh

set -e

echo "🔧 Configurando PostgreSQL para el proyecto TxH..."
echo ""

# Configurar PostgreSQL
echo "Creando usuario y base de datos en PostgreSQL..."
sudo -u postgres psql << 'EOFPSQL'
-- Crear usuario si no existe
DO $$
BEGIN
  IF NOT EXISTS (SELECT FROM pg_user WHERE usename = 'postgres') THEN
    CREATE USER postgres WITH PASSWORD 'postgres';
  END IF;
END
$$;

-- Dar permisos
ALTER USER postgres CREATEDB;
ALTER USER postgres WITH SUPERUSER;

-- Crear base de datos si no existe
SELECT 'CREATE DATABASE txh_registro OWNER postgres'
WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname = 'txh_registro')\gexec

-- Dar permisos
GRANT ALL PRIVILEGES ON DATABASE txh_registro TO postgres;
EOFPSQL

echo ""
echo "✅ Usuario 'postgres' configurado"
echo "✅ Base de datos 'txh_registro' creada"
echo ""
echo "Ahora ejecuta:"
echo "  cd /home/william-baptista/TxH/anestesia-trasplante/backend"
echo "  npx prisma migrate deploy"
echo "  npm run dev"
