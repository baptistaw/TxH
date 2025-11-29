// scripts/check-baptista-user.js
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkUser() {
  try {
    const user = await prisma.clinician.findUnique({
      where: { email: 'baptistaw@gmail.com' },
      select: {
        id: true,
        name: true,
        email: true,
        userRole: true,
        specialty: true
      }
    });

    console.log('👤 Usuario baptistaw@gmail.com:\n');
    console.log(JSON.stringify(user, null, 2));

    console.log('\n\n🔍 Tipo de userRole:');
    console.log(`  Valor: "${user.userRole}"`);
    console.log(`  Tipo: ${typeof user.userRole}`);
    console.log(`  ¿Es ADMIN?: ${user.userRole === 'ADMIN'}`);
    console.log(`  ¿Es ANESTESIOLOGO?: ${user.userRole === 'ANESTESIOLOGO'}`);

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkUser();
