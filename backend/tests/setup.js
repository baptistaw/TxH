// tests/setup.js - Jest setup file
const { PrismaClient } = require('@prisma/client');

// Mock logger to avoid cluttering test output
jest.mock('../src/lib/logger', () => ({
  info: jest.fn(),
  error: jest.fn(),
  warn: jest.fn(),
  debug: jest.fn(),
  stream: {
    write: jest.fn(),
  },
}));

// Mock authentication middleware for tests
jest.mock('../src/middlewares/auth', () => ({
  ROLES: {
    ADMIN: 'admin',
    ANESTESIOLOGO: 'anestesiologo',
    DATA_ANALYST: 'data-analyst',
  },
  authenticate: (req, res, next) => {
    // Simulate authenticated user
    req.user = {
      id: 1,
      email: 'test@test.com',
      role: 'admin',
    };
    next();
  },
  authorize: (roles) => (req, res, next) => {
    // Always allow in tests
    next();
  },
  optionalAuth: (req, res, next) => {
    next();
  },
  generateToken: jest.fn(),
  generateRefreshToken: jest.fn(),
}));

// Set test environment variables
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test-secret-key-for-testing-only';
process.env.PORT = '4001';

// Global test timeout
jest.setTimeout(10000);

// Suppress console output during tests (optional)
global.console = {
  ...console,
  log: jest.fn(),
  debug: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
  // Keep error for debugging
  error: console.error,
};
