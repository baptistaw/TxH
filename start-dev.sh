#!/bin/bash

# Script para iniciar backend y frontend en paralelo

echo "╔══════════════════════════════════════════════════════════════╗"
echo "║          INICIANDO SERVIDOR DE DESARROLLO                   ║"
echo "╚══════════════════════════════════════════════════════════════╝"
echo ""

# Colores
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m'

BASE_DIR="/home/william-baptista/TxH/anestesia-trasplante"
BACKEND_DIR="$BASE_DIR/backend"
FRONTEND_DIR="$BASE_DIR/frontend"

# Función para cleanup al salir
cleanup() {
    echo ""
    echo -e "${YELLOW}Deteniendo servidores...${NC}"
    kill $(jobs -p) 2>/dev/null
    exit 0
}

trap cleanup SIGINT SIGTERM

# Verificar si tmux está instalado
if command -v tmux &> /dev/null; then
    echo -e "${BLUE}Usando tmux para gestionar servidores${NC}"
    echo ""

    # Crear sesión tmux con dos paneles
    tmux new-session -d -s txh-dev

    # Panel 1: Backend
    tmux send-keys -t txh-dev "cd $BACKEND_DIR && echo '🟢 BACKEND (Puerto 4000)' && npm run dev" C-m

    # Split horizontal
    tmux split-window -h -t txh-dev

    # Panel 2: Frontend
    tmux send-keys -t txh-dev "cd $FRONTEND_DIR && echo '🔵 FRONTEND (Puerto 3000)' && npm run dev" C-m

    # Attach a la sesión
    echo -e "${GREEN}✓${NC} Servidores iniciados en tmux"
    echo ""
    echo "Comandos útiles:"
    echo "  • Navegar entre paneles: Ctrl+b + flechas"
    echo "  • Detach de tmux: Ctrl+b + d"
    echo "  • Re-attach: tmux attach -t txh-dev"
    echo "  • Cerrar sesión: tmux kill-session -t txh-dev"
    echo ""
    echo -e "${BLUE}Presiona ENTER para entrar en la sesión tmux...${NC}"
    read

    tmux attach -t txh-dev

else
    echo -e "${YELLOW}tmux no está instalado, usando procesos en background${NC}"
    echo "  Instala tmux para una mejor experiencia: sudo apt install tmux"
    echo ""

    # Iniciar backend en background
    echo -e "${BLUE}Iniciando backend...${NC}"
    cd "$BACKEND_DIR"
    npm run dev > /tmp/txh-backend.log 2>&1 &
    BACKEND_PID=$!

    # Esperar 3 segundos
    sleep 3

    # Iniciar frontend en background
    echo -e "${BLUE}Iniciando frontend...${NC}"
    cd "$FRONTEND_DIR"
    npm run dev > /tmp/txh-frontend.log 2>&1 &
    FRONTEND_PID=$!

    echo ""
    echo -e "${GREEN}✓${NC} Servidores iniciados"
    echo ""
    echo "PIDs:"
    echo "  Backend:  $BACKEND_PID"
    echo "  Frontend: $FRONTEND_PID"
    echo ""
    echo "Logs:"
    echo "  Backend:  tail -f /tmp/txh-backend.log"
    echo "  Frontend: tail -f /tmp/txh-frontend.log"
    echo ""
    echo "URLs:"
    echo "  Backend:  http://localhost:4000"
    echo "  Frontend: http://localhost:3000"
    echo ""
    echo -e "${YELLOW}Presiona Ctrl+C para detener ambos servidores${NC}"
    echo ""

    # Esperar indefinidamente
    wait
fi
