#!/bin/bash
# Script de setup para tests
# Crea y configura la base de datos de test

set -e

echo "🔧 Configurando entorno de test..."

# Cargar variables de entorno de test
export $(cat .env.test | grep -v '^#' | xargs)

echo "📦 Instalando dependencias si es necesario..."
if [ ! -d "node_modules" ]; then
  npm install
fi

echo "🗄️  Configurando base de datos de test..."

# Intentar crear la base de datos de test (fallará si ya existe, está bien)
echo "Creando base de datos txh_registro_test..."
createdb txh_registro_test 2>/dev/null || echo "⚠️  BD ya existe (OK)"

echo "🔄 Ejecutando migraciones Prisma..."
npx prisma migrate deploy

echo "🌱 Generando cliente Prisma..."
npx prisma generate

echo "✅ Setup completado!"
echo "Ejecuta 'npm test' para correr los tests"
