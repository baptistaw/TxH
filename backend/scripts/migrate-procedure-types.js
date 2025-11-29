// scripts/migrate-procedure-types.js
// Migra los tipos de procedimiento existentes a los nuevos nombres

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function migrateProcedureTypes() {
  console.log('\n🔄 MIGRACIÓN DE TIPOS DE PROCEDIMIENTO\n');
  console.log('='.repeat(80));

  try {
    // Migrar BIOPSIA_PERCUTANEA → BIOPSIA_HEPATICA_PERCUTANEA
    // Usar ALTER TYPE para añadir el nuevo valor temporalmente
    await prisma.$executeRawUnsafe(`
      ALTER TYPE "ProcedureType" ADD VALUE IF NOT EXISTS 'BIOPSIA_HEPATICA_PERCUTANEA'
    `);

    const biopsiaPercutanea = await prisma.$executeRawUnsafe(`
      UPDATE "procedures"
      SET "procedureType" = 'BIOPSIA_HEPATICA_PERCUTANEA'
      WHERE "procedureType" = 'BIOPSIA_PERCUTANEA'
    `);
    console.log(`✓ Migrados ${biopsiaPercutanea} procedimientos: BIOPSIA_PERCUTANEA → BIOPSIA_HEPATICA_PERCUTANEA`);

    // Verificar estado final
    const finalCount = await prisma.procedure.groupBy({
      by: ['procedureType'],
      _count: true,
    });

    console.log('\nEstado final:');
    finalCount.forEach(p => {
      console.log(`  ${p.procedureType || 'null'}: ${p._count} procedimientos`);
    });

    console.log('\n✅ Migración completada exitosamente\n');

  } catch (error) {
    console.error('❌ Error en migración:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

migrateProcedureTypes();
