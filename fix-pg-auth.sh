#!/bin/bash
# Script para configurar autenticación por contraseña en PostgreSQL

set -e

echo "🔧 Configurando autenticación de PostgreSQL..."
echo ""

# Encontrar la versión y archivo de configuración
PG_VERSION=$(psql --version | grep -oP '\d+' | head -1)
PG_HBA="/etc/postgresql/$PG_VERSION/main/pg_hba.conf"

echo "📂 Ubicación del archivo: $PG_HBA"
echo ""

# Backup del archivo original
echo "📋 Creando backup..."
sudo cp "$PG_HBA" "$PG_HBA.backup.$(date +%Y%m%d_%H%M%S)"

# Modificar autenticación para localhost
echo "🔑 Configurando autenticación por contraseña..."
sudo sed -i 's/^local\s\+all\s\+postgres\s\+peer/local   all             postgres                                md5/' "$PG_HBA"
sudo sed -i 's/^local\s\+all\s\+all\s\+peer/local   all             all                                     md5/' "$PG_HBA"
sudo sed -i 's/^host\s\+all\s\+all\s\+127\.0\.0\.1\/32\s\+ident/host    all             all             127.0.0.1\/32            md5/' "$PG_HBA"
sudo sed -i 's/^host\s\+all\s\+all\s\+::1\/128\s\+ident/host    all             all             ::1\/128                 md5/' "$PG_HBA"

echo ""
echo "📄 Configuración actualizada en $PG_HBA:"
echo "---"
sudo grep -v '^#' "$PG_HBA" | grep -v '^$' | head -10
echo "---"
echo ""

# Reiniciar PostgreSQL
echo "🔄 Reiniciando PostgreSQL..."
sudo systemctl restart postgresql

# Esperar a que PostgreSQL esté listo
sleep 2

if pg_isready > /dev/null 2>&1; then
    echo "✅ PostgreSQL reiniciado correctamente"
else
    echo "❌ Error al reiniciar PostgreSQL"
    exit 1
fi

echo ""
echo "🧪 Probando conexión con contraseña..."
PGPASSWORD=postgres psql -U postgres -d txh_registro -c "SELECT 'Conexión exitosa!' as status;" 2>&1

if [ $? -eq 0 ]; then
    echo ""
    echo "✅ ¡Autenticación configurada correctamente!"
    echo ""
    echo "Ahora puedes ejecutar:"
    echo "  cd /home/william-baptista/TxH/anestesia-trasplante/backend"
    echo "  npx prisma migrate deploy"
else
    echo ""
    echo "❌ Aún hay problemas de autenticación"
    echo "Puedes restaurar el backup con:"
    echo "  sudo cp $PG_HBA.backup.* $PG_HBA"
    echo "  sudo systemctl restart postgresql"
fi
