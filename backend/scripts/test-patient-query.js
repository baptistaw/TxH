const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const organizationId = 'org_36BKhTFJLE7BbTBZfxsWPmgA57j';

  console.log('Testing patient query with organizationId:', organizationId);

  // Test simple count
  const totalPatients = await prisma.patient.count();
  console.log('Total patients in DB:', totalPatients);

  const patientsWithOrg = await prisma.patient.count({
    where: { organizationId }
  });
  console.log('Patients with this org:', patientsWithOrg);

  // Test the actual query structure
  const baseFilters = {
    deletedAt: null,
  };

  const andConditions = [baseFilters];

  andConditions.push({
    OR: [
      { organizationId },
      { organizationId: null },
    ],
  });

  const where = { AND: andConditions };

  console.log('\nQuery where:', JSON.stringify(where, null, 2));

  const patients = await prisma.patient.findMany({
    where,
    take: 5,
    orderBy: { createdAt: 'desc' },
    select: {
      id: true,
      name: true,
      organizationId: true,
    }
  });

  console.log('\nPatients found:', patients.length);
  patients.forEach(p => {
    console.log(`  - ${p.id}: ${p.name} (org: ${p.organizationId})`);
  });

  await prisma.$disconnect();
}

main().catch(e => {
  console.error('Error:', e);
  process.exit(1);
});
