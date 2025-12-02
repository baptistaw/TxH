const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('Testing organization query...');

  // Check if organization model exists
  console.log('prisma.organization:', typeof prisma.organization);

  const org = await prisma.organization.findFirst({
    where: { isActive: true },
    orderBy: { createdAt: 'asc' },
  });

  console.log('Organization found:', org);

  // Check patients without org
  const patientsWithoutOrg = await prisma.patient.count({
    where: { organizationId: null }
  });
  console.log('Patients without organizationId:', patientsWithoutOrg);

  await prisma.$disconnect();
}

main().catch(e => {
  console.error('Error:', e);
  process.exit(1);
});
