// Script para verificar el estado de los laboratorios
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkLabsStatus() {
  try {
    // Contar evaluaciones preoperatorias
    const totalPreops = await prisma.preopEvaluation.count();
    console.log(`📊 Total de evaluaciones preoperatorias: ${totalPreops}`);

    // Contar labs
    const totalLabs = await prisma.preopLabs.count();
    console.log(`🧪 Total de registros de laboratorio: ${totalLabs}`);

    // Evaluaciones con labs
    const preopWithLabs = await prisma.preopEvaluation.findMany({
      include: {
        labs: true,
        patient: {
          select: { id: true, name: true }
        }
      }
    });

    const preopWithLabCount = preopWithLabs.filter(p => p.labs && p.labs.length > 0).length;
    const preopWithoutLabCount = totalPreops - preopWithLabCount;

    console.log(`✅ Evaluaciones CON laboratorios: ${preopWithLabCount}`);
    console.log(`❌ Evaluaciones SIN laboratorios: ${preopWithoutLabCount}`);

    // Mostrar algunas evaluaciones sin labs
    if (preopWithoutLabCount > 0) {
      console.log(`\n📋 Primeras 10 evaluaciones SIN laboratorios:`);
      const withoutLabs = preopWithLabs
        .filter(p => !p.labs || p.labs.length === 0)
        .slice(0, 10);

      withoutLabs.forEach(p => {
        console.log(`  - ${p.patient.name} (CI: ${p.patient.id}) - Fecha: ${p.evaluationDate.toISOString().split('T')[0]}`);
      });
    }

    // Mostrar distribución de labs por paciente
    const labsDistribution = preopWithLabs
      .map(p => p.labs?.length || 0)
      .reduce((acc, count) => {
        acc[count] = (acc[count] || 0) + 1;
        return acc;
      }, {});

    console.log(`\n📈 Distribución de labs por evaluación:`);
    Object.entries(labsDistribution)
      .sort((a, b) => Number(a[0]) - Number(b[0]))
      .forEach(([count, total]) => {
        console.log(`  ${count} labs: ${total} evaluaciones`);
      });

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkLabsStatus();
