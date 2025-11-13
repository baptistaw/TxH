#!/bin/bash
# tests/setup-and-run.sh - Script para ejecutar tests E2E

set -e

echo "╔═══════════════════════════════════════════════════════════╗"
echo "║  Playwright E2E Tests - Sistema Registro TxH             ║"
echo "╚═══════════════════════════════════════════════════════════╝"
echo ""

# Colores
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Verificar que estamos en el directorio correcto
if [ ! -f "package.json" ]; then
    echo -e "${RED}✗ Error: Ejecuta este script desde el directorio frontend${NC}"
    exit 1
fi

# Verificar que el backend esté corriendo
echo -e "${YELLOW}➤ Verificando backend...${NC}"
if curl -s http://localhost:4000/api/health > /dev/null 2>&1; then
    echo -e "${GREEN}✓ Backend está corriendo en puerto 4000${NC}"
else
    echo -e "${RED}✗ Backend NO está corriendo${NC}"
    echo ""
    echo "Por favor, inicia el backend primero:"
    echo "  cd ../backend"
    echo "  npm run dev"
    echo ""
    exit 1
fi

# Verificar que Playwright esté instalado
echo -e "${YELLOW}➤ Verificando Playwright...${NC}"
if [ ! -d "node_modules/@playwright" ]; then
    echo -e "${YELLOW}Instalando dependencias...${NC}"
    npm install
fi

if [ ! -d "$HOME/.cache/ms-playwright/chromium-1194" ]; then
    echo -e "${YELLOW}Instalando navegador Chromium...${NC}"
    npx playwright install chromium
fi

echo -e "${GREEN}✓ Playwright configurado${NC}"
echo ""

# Ejecutar tests
echo -e "${YELLOW}➤ Ejecutando tests...${NC}"
echo ""

if [ "$1" == "--headed" ]; then
    echo "Modo: Headed (con ventana visible)"
    npm run test:headed
elif [ "$1" == "--ui" ]; then
    echo "Modo: UI (interfaz interactiva)"
    npm run test:ui
else
    echo "Modo: Headless (sin ventana)"
    npm test
fi

EXIT_CODE=$?

echo ""
if [ $EXIT_CODE -eq 0 ]; then
    echo -e "${GREEN}✓ Todos los tests pasaron${NC}"
else
    echo -e "${RED}✗ Algunos tests fallaron (código: $EXIT_CODE)${NC}"
    echo ""
    echo "Para ver el reporte detallado:"
    echo "  npx playwright show-report"
fi

exit $EXIT_CODE
