#!/bin/bash
# Script completo para arreglar PostgreSQL de una vez

set -e

echo "╔══════════════════════════════════════════════════════════════╗"
echo "║     FIX COMPLETO DE POSTGRESQL                               ║"
echo "╚══════════════════════════════════════════════════════════════╝"
echo ""

PG_VERSION=$(psql --version | grep -oP '\d+' | head -1)
PG_HBA="/etc/postgresql/$PG_VERSION/main/pg_hba.conf"

echo "🔧 Paso 1: Restaurando configuración peer temporal..."
sudo cp "$PG_HBA" "$PG_HBA.backup.final"

# Restaurar peer para poder conectar
sudo sed -i 's/^local\s\+all\s\+postgres\s\+md5/local   all             postgres                                peer/' "$PG_HBA"
sudo sed -i 's/^local\s\+all\s\+all\s\+md5/local   all             all                                     peer/' "$PG_HBA"

echo "🔄 Reiniciando PostgreSQL..."
sudo systemctl restart postgresql
sleep 2

echo ""
echo "🔑 Paso 2: Reseteando contraseña del usuario postgres..."
sudo -u postgres psql << 'EOFPSQL'
ALTER USER postgres WITH PASSWORD 'postgres';
\q
EOFPSQL

echo "✅ Contraseña reseteada"
echo ""

echo "🔧 Paso 3: Configurando autenticación md5..."
sudo sed -i 's/^local\s\+all\s\+postgres\s\+peer/local   all             postgres                                md5/' "$PG_HBA"
sudo sed -i 's/^local\s\+all\s\+all\s\+peer/local   all             all                                     md5/' "$PG_HBA"

echo "🔄 Reiniciando PostgreSQL nuevamente..."
sudo systemctl restart postgresql
sleep 2

echo ""
echo "🧪 Paso 4: Probando conexión con contraseña..."
PGPASSWORD=postgres psql -U postgres -d txh_registro -c "SELECT 'Conexión exitosa!' as status, version();" 2>&1 | head -5

if [ $? -eq 0 ]; then
    echo ""
    echo "╔══════════════════════════════════════════════════════════════╗"
    echo "║                    ✅ TODO CONFIGURADO                       ║"
    echo "╚══════════════════════════════════════════════════════════════╝"
    echo ""
    echo "Credenciales PostgreSQL:"
    echo "  📌 Usuario: postgres"
    echo "  🔑 Contraseña: postgres"
    echo "  🗄️  Base de datos: txh_registro"
    echo "  🌐 Host: localhost:5432"
    echo ""
    echo "Siguiente paso:"
    echo "  cd /home/william-baptista/TxH/anestesia-trasplante/backend"
    echo "  npx prisma migrate deploy"
    echo ""
else
    echo ""
    echo "❌ Error de conexión. Restaurando backup..."
    sudo cp "$PG_HBA.backup.final" "$PG_HBA"
    sudo systemctl restart postgresql
    exit 1
fi
