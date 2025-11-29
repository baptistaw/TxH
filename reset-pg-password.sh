#!/bin/bash
# Script para resetear la contraseña del usuario postgres

set -e

echo "🔑 Reseteando contraseña del usuario postgres..."
echo ""

# Resetear contraseña usando peer authentication (como usuario del sistema)
sudo -u postgres psql << 'EOFPSQL'
-- Resetear contraseña del usuario postgres
ALTER USER postgres WITH PASSWORD 'postgres';
\q
EOFPSQL

echo ""
echo "✅ Contraseña reseteada a 'postgres'"
echo ""

# Probar conexión
echo "🧪 Probando conexión..."
PGPASSWORD=postgres psql -U postgres -d txh_registro -c "SELECT version();" | head -3

if [ $? -eq 0 ]; then
    echo ""
    echo "✅ ¡Conexión exitosa!"
    echo ""
    echo "Credenciales:"
    echo "  Usuario: postgres"
    echo "  Contraseña: postgres"
    echo "  Base de datos: txh_registro"
    echo "  Host: localhost"
    echo "  Puerto: 5432"
    echo ""
    echo "Ahora ejecuta:"
    echo "  cd /home/william-baptista/TxH/anestesia-trasplante/backend"
    echo "  npx prisma migrate deploy"
else
    echo ""
    echo "❌ Error de conexión"
    exit 1
fi
