// scripts/cleanup-old-proceduretype-items.js
// Desactiva items antiguos del catálogo ProcedureType que ya no se usan

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// Items antiguos que deben ser desactivados (reemplazados por nuevos)
const OLD_ITEMS = [
  'BIOPSIA_HEPATICA',      // Reemplazado por BIOPSIA_HEPATICA_PERCUTANEA
  'BIOPSIA_PERCUTANEA',    // Reemplazado por BIOPSIA_HEPATICA_PERCUTANEA
  'FGC_BIOPSIA',           // No es un procedimiento común, mantener pero desactivar
];

async function cleanupOldItems() {
  console.log('\n🧹 LIMPIEZA DE ITEMS ANTIGUOS DEL CATÁLOGO PROCEDURETYPE\n');
  console.log('='.repeat(80));

  try {
    const catalog = await prisma.catalog.findFirst({
      where: { name: 'ProcedureType' },
      include: { items: true }
    });

    if (!catalog) {
      console.log('❌ No se encontró el catálogo ProcedureType');
      return;
    }

    console.log(`Catálogo: ${catalog.label}`);
    console.log(`Total items: ${catalog.items.length}`);
    console.log('');

    let deactivated = 0;

    for (const oldCode of OLD_ITEMS) {
      const item = catalog.items.find(i => i.code === oldCode);

      if (item && item.active) {
        await prisma.catalogItem.update({
          where: { id: item.id },
          data: { active: false }
        });
        console.log(`✓ Desactivado: ${oldCode} - ${item.label}`);
        deactivated++;
      } else if (item && !item.active) {
        console.log(`○ Ya desactivado: ${oldCode}`);
      } else {
        console.log(`○ No encontrado: ${oldCode}`);
      }
    }

    console.log('');
    console.log('='.repeat(80));
    console.log(`Items desactivados: ${deactivated}`);
    console.log('');

    // Mostrar resumen de items activos
    const activeCount = await prisma.catalogItem.count({
      where: { catalogId: catalog.id, active: true }
    });
    console.log(`✅ Items activos en el catálogo: ${activeCount}`);
    console.log('');

  } catch (error) {
    console.error('❌ Error:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

cleanupOldItems();
