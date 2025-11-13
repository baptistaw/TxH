#!/bin/bash
# scripts/setup-test-db.sh
# Quick setup script for test database

set -e

echo "🔧 Setting up test database for TxH backend..."

# Colors
GREEN='\033[0.32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Check if PostgreSQL is running
if ! pg_isready > /dev/null 2>&1; then
  echo -e "${RED}❌ PostgreSQL is not running${NC}"
  echo "Please start PostgreSQL and try again"
  exit 1
fi

echo -e "${GREEN}✓${NC} PostgreSQL is running"

# Create test database if it doesn't exist
if psql -lqt | cut -d \| -f 1 | grep -qw txh_test; then
  echo -e "${YELLOW}⚠${NC}  Database txh_test already exists"
  read -p "Drop and recreate? (y/N): " -n 1 -r
  echo
  if [[ $REPLY =~ ^[Yy]$ ]]; then
    echo "Dropping database..."
    dropdb txh_test || true
    createdb txh_test
    echo -e "${GREEN}✓${NC} Database recreated"
  fi
else
  echo "Creating database txh_test..."
  createdb txh_test
  echo -e "${GREEN}✓${NC} Database created"
fi

# Create .env if it doesn't exist
if [ ! -f .env ]; then
  echo "Creating .env file..."
  cat > .env << 'EOF'
# Database
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/txh_test"

# JWT
JWT_SECRET="test-secret-key-for-testing-only"
JWT_EXPIRES_IN="24h"
JWT_REFRESH_EXPIRES_IN="7d"

# Node
NODE_ENV=test
PORT=4001

# Logging
LOG_LEVEL=error
EOF
  echo -e "${GREEN}✓${NC} .env created"
else
  echo -e "${YELLOW}⚠${NC}  .env already exists, skipping"
fi

# Generate Prisma Client
echo "Generating Prisma Client..."
npx prisma generate > /dev/null 2>&1
echo -e "${GREEN}✓${NC} Prisma Client generated"

# Run migrations
echo "Running Prisma migrations..."
npx prisma migrate deploy > /dev/null 2>&1
echo -e "${GREEN}✓${NC} Migrations completed"

# Verify setup
echo ""
echo "Verifying setup..."
if npx prisma migrate status | grep -q "Database schema is up to date"; then
  echo -e "${GREEN}✓${NC} Database schema is up to date"
else
  echo -e "${RED}❌ Database schema has pending migrations${NC}"
  exit 1
fi

echo ""
echo -e "${GREEN}✅ Test database setup complete!${NC}"
echo ""
echo "You can now run tests:"
echo "  npm test"
echo ""
echo "Or run tests in watch mode:"
echo "  npm run test:watch"
echo ""
