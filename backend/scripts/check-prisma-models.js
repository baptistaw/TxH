const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient();
const models = Object.keys(p).filter(k => {
  return k.charAt(0) !== '_' && k.charAt(0) !== '$';
});
console.log('Available models:', models.slice(0, 30));
