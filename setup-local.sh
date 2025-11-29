#!/bin/bash
set -e

echo "╔══════════════════════════════════════════════════════════════╗"
echo "║     SETUP LOCAL - Sistema Registro TxH                      ║"
echo "╚══════════════════════════════════════════════════════════════╝"
echo ""

# Colores
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Directorio base
BASE_DIR="/home/william-baptista/TxH/anestesia-trasplante"
BACKEND_DIR="$BASE_DIR/backend"
FRONTEND_DIR="$BASE_DIR/frontend"

cd "$BASE_DIR"

# ============================================================================
# 1. VERIFICAR POSTGRESQL
# ============================================================================
echo -e "${BLUE}[1/6]${NC} Verificando PostgreSQL..."

if ! pg_isready > /dev/null 2>&1; then
    echo -e "${RED}✗ PostgreSQL no está corriendo${NC}"
    echo "Inicia PostgreSQL con: sudo systemctl start postgresql"
    exit 1
fi

echo -e "${GREEN}✓${NC} PostgreSQL corriendo en puerto 5432"
echo ""

# ============================================================================
# 2. CONFIGURAR BASE DE DATOS
# ============================================================================
echo -e "${BLUE}[2/6]${NC} Configurando base de datos..."

# Crear usuario postgres si no existe
sudo -u postgres psql -tc "SELECT 1 FROM pg_roles WHERE rolname='postgres'" | grep -q 1 || \
    sudo -u postgres psql -c "CREATE USER postgres WITH PASSWORD 'postgres';"

# Dar permisos CREATEDB
sudo -u postgres psql -c "ALTER USER postgres CREATEDB;" > /dev/null 2>&1

# Crear base de datos si no existe
sudo -u postgres psql -lqt | cut -d \| -f 1 | grep -qw txh_registro || \
    sudo -u postgres createdb -O postgres txh_registro

echo -e "${GREEN}✓${NC} Base de datos 'txh_registro' configurada"
echo ""

# ============================================================================
# 3. INSTALAR DEPENDENCIAS BACKEND
# ============================================================================
echo -e "${BLUE}[3/6]${NC} Instalando dependencias del backend..."

cd "$BACKEND_DIR"

if [ ! -d "node_modules" ]; then
    npm install
    echo -e "${GREEN}✓${NC} Dependencias instaladas"
else
    echo -e "${GREEN}✓${NC} Dependencias ya instaladas"
fi
echo ""

# ============================================================================
# 4. EJECUTAR MIGRACIONES DE PRISMA
# ============================================================================
echo -e "${BLUE}[4/6]${NC} Ejecutando migraciones de Prisma..."

npx prisma migrate deploy

echo -e "${GREEN}✓${NC} Migraciones aplicadas correctamente"
echo ""

# ============================================================================
# 5. SEEDEAR DATOS DE TEST (OPCIONAL)
# ============================================================================
echo -e "${BLUE}[5/6]${NC} ¿Deseas cargar datos de prueba? (s/n)"
read -r SEED_CHOICE

if [[ "$SEED_CHOICE" =~ ^[Ss]$ ]]; then
    echo "Creando datos de test..."
    node -e "
        const {seedTestData, closeDatabase} = require('./tests/helpers/dbHelper');
        seedTestData()
            .then(() => {
                console.log('✅ Datos de test creados:');
                console.log('   - 3 pacientes');
                console.log('   - 3 clínicos');
                console.log('   - 2 casos de trasplante');
                console.log('   - 20 registros intraoperatorios');
                return closeDatabase();
            })
            .catch((err) => {
                console.error('Error:', err);
                process.exit(1);
            });
    "
    echo -e "${GREEN}✓${NC} Datos de test cargados"
else
    echo -e "${YELLOW}⊙${NC} Base de datos vacía (sin datos de test)"
fi
echo ""

# ============================================================================
# 6. INSTALAR DEPENDENCIAS FRONTEND (OPCIONAL)
# ============================================================================
echo -e "${BLUE}[6/6]${NC} ¿Deseas instalar dependencias del frontend? (s/n)"
read -r FRONTEND_CHOICE

if [[ "$FRONTEND_CHOICE" =~ ^[Ss]$ ]]; then
    cd "$FRONTEND_DIR"

    if [ ! -d "node_modules" ]; then
        echo "Instalando dependencias del frontend..."
        npm install
        echo -e "${GREEN}✓${NC} Dependencias del frontend instaladas"
    else
        echo -e "${GREEN}✓${NC} Dependencias del frontend ya instaladas"
    fi
else
    echo -e "${YELLOW}⊙${NC} Frontend no configurado (ejecuta 'npm install' en /frontend cuando quieras)"
fi

echo ""
echo "╔══════════════════════════════════════════════════════════════╗"
echo "║                    SETUP COMPLETADO                          ║"
echo "╚══════════════════════════════════════════════════════════════╝"
echo ""
echo -e "${GREEN}✓${NC} Todo listo para desarrollo local"
echo ""
echo "Para iniciar la aplicación, ejecuta en terminales separadas:"
echo ""
echo -e "${BLUE}Terminal 1 (Backend):${NC}"
echo "  cd $BACKEND_DIR"
echo "  npm run dev"
echo ""
echo -e "${BLUE}Terminal 2 (Frontend):${NC}"
echo "  cd $FRONTEND_DIR"
echo "  npm run dev"
echo ""
echo "Accede a la aplicación en:"
echo -e "  ${GREEN}Backend:${NC}  http://localhost:4000"
echo -e "  ${GREEN}Frontend:${NC} http://localhost:3000"
echo ""
echo "Para ejecutar tests:"
echo "  cd $BACKEND_DIR && npm test"
echo ""
