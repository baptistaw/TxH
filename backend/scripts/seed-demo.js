/**
 * Seed Demo - Script para inicializar datos de demostración
 *
 * Uso: node scripts/seed-demo.js
 *
 * Este script crea:
 * - 1 Organización demo
 * - 6 Usuarios demo (admin, anestesiologo, cirujano, hepatologo, intensivista, viewer)
 * - 5 Pacientes de ejemplo
 * - 3 Casos de trasplante de ejemplo
 *
 * IMPORTANTE: Los usuarios deben existir en Clerk primero.
 * Este script solo crea los registros en la base de datos.
 */

const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

// ============================================================================
// CONFIGURACIÓN DE USUARIOS DEMO
// ============================================================================

const DEMO_ORG = {
  id: 'org_demo_institucional', // Este ID se reemplaza con el real de Clerk
  name: 'Demo Institucional',
  slug: 'demo-institucional',
  timezone: 'America/Montevideo',
  isActive: true,
};

const DEMO_USERS = [
  {
    id: 10001,
    name: 'Admin Demo',
    email: 'admin@demo.anestrasplante.org',
    specialty: null,
    userRole: 'ADMIN',
    phone: '+598 99 000 001',
  },
  {
    id: 10002,
    name: 'Dr. Demo Anestesiólogo',
    email: 'anestesiologo@demo.anestrasplante.org',
    specialty: 'ANESTESIOLOGO',
    userRole: 'ANESTESIOLOGO',
    phone: '+598 99 000 002',
  },
  {
    id: 10003,
    name: 'Dr. Demo Cirujano',
    email: 'cirujano@demo.anestrasplante.org',
    specialty: 'CIRUJANO',
    userRole: 'VIEWER',
    phone: '+598 99 000 003',
  },
  {
    id: 10004,
    name: 'Dr. Demo Hepatólogo',
    email: 'hepatologo@demo.anestrasplante.org',
    specialty: 'HEPATOLOGO',
    userRole: 'VIEWER',
    phone: '+598 99 000 004',
  },
  {
    id: 10005,
    name: 'Dr. Demo Intensivista',
    email: 'intensivista@demo.anestrasplante.org',
    specialty: 'INTENSIVISTA',
    userRole: 'VIEWER',
    phone: '+598 99 000 005',
  },
  {
    id: 10006,
    name: 'Usuario Consulta',
    email: 'viewer@demo.anestrasplante.org',
    specialty: 'OTRO',
    userRole: 'VIEWER',
    phone: '+598 99 000 006',
  },
];

// ============================================================================
// PACIENTES DE EJEMPLO
// ============================================================================

const DEMO_PATIENTS = [
  {
    id: '12345678',
    name: 'Juan Pérez García',
    birthDate: new Date('1965-03-15'),
    sex: 'M',
    provider: 'ASSE',
    height: 175,
    weight: 78,
    bloodGroup: 'A+',
    asa: 'III',
    transplanted: true,
    dataSource: 'PLATFORM',
    observations: 'Paciente demo - Cirrosis por VHC',
  },
  {
    id: '23456789',
    name: 'María González López',
    birthDate: new Date('1972-08-22'),
    sex: 'F',
    provider: 'CASMU',
    height: 162,
    weight: 65,
    bloodGroup: 'O+',
    asa: 'IV',
    transplanted: true,
    dataSource: 'PLATFORM',
    observations: 'Paciente demo - Hepatitis autoinmune',
  },
  {
    id: '34567890',
    name: 'Carlos Rodríguez Martínez',
    birthDate: new Date('1958-11-30'),
    sex: 'M',
    provider: 'SMI',
    height: 180,
    weight: 92,
    bloodGroup: 'B+',
    asa: 'III',
    transplanted: false,
    dataSource: 'PLATFORM',
    observations: 'Paciente demo - En lista de espera - NASH',
  },
  {
    id: '45678901',
    name: 'Ana Fernández Silva',
    birthDate: new Date('1980-05-10'),
    sex: 'F',
    provider: 'MUCAM',
    height: 158,
    weight: 55,
    bloodGroup: 'AB+',
    asa: 'II',
    transplanted: false,
    dataSource: 'PLATFORM',
    observations: 'Paciente demo - Evaluación pretrasplante',
  },
  {
    id: '56789012',
    name: 'Roberto Sánchez Díaz',
    birthDate: new Date('1970-01-25'),
    sex: 'M',
    provider: 'COSEM',
    height: 172,
    weight: 85,
    bloodGroup: 'O-',
    asa: 'IV',
    transplanted: true,
    dataSource: 'PLATFORM',
    observations: 'Paciente demo - Retrasplante por rechazo crónico',
  },
];

// ============================================================================
// CASOS DE TRASPLANTE DE EJEMPLO
// ============================================================================

const DEMO_CASES = [
  {
    patientId: '12345678',
    startAt: new Date('2024-06-15T08:30:00'),
    endAt: new Date('2024-06-15T16:45:00'),
    duration: 495, // minutos
    isRetransplant: false,
    isHepatoRenal: false,
    optimalDonor: true,
    provenance: 'Sala',
    coldIschemiaTime: 420,
    warmIschemiaTime: 45,
    dataSource: 'PLATFORM',
    observations: 'Caso demo - Trasplante exitoso sin complicaciones',
  },
  {
    patientId: '23456789',
    startAt: new Date('2024-09-20T07:00:00'),
    endAt: new Date('2024-09-20T18:30:00'),
    duration: 690,
    isRetransplant: false,
    isHepatoRenal: false,
    optimalDonor: false,
    provenance: 'CTI',
    coldIschemiaTime: 540,
    warmIschemiaTime: 52,
    dataSource: 'PLATFORM',
    observations: 'Caso demo - Donante marginal, evolución favorable',
  },
  {
    patientId: '56789012',
    startAt: new Date('2024-11-05T09:00:00'),
    endAt: new Date('2024-11-05T20:15:00'),
    duration: 675,
    isRetransplant: true,
    isHepatoRenal: false,
    optimalDonor: true,
    provenance: 'CTI',
    coldIschemiaTime: 380,
    warmIschemiaTime: 48,
    dataSource: 'PLATFORM',
    observations: 'Caso demo - Retrasplante por rechazo crónico del injerto previo',
  },
];

// ============================================================================
// FUNCIONES DE SEED
// ============================================================================

async function clearDemoData() {
  console.log('🗑️  Limpiando datos demo existentes...');

  // Eliminar en orden por dependencias
  await prisma.teamAssignment.deleteMany({
    where: { case: { organizationId: DEMO_ORG.id } }
  });

  await prisma.transplantCase.deleteMany({
    where: { organizationId: DEMO_ORG.id }
  });

  await prisma.patient.deleteMany({
    where: { organizationId: DEMO_ORG.id }
  });

  await prisma.clinician.deleteMany({
    where: { organizationId: DEMO_ORG.id }
  });

  await prisma.organization.deleteMany({
    where: { id: DEMO_ORG.id }
  });

  console.log('✅ Datos demo eliminados');
}

async function seedOrganization() {
  console.log('🏥 Creando organización demo...');

  const org = await prisma.organization.upsert({
    where: { id: DEMO_ORG.id },
    update: DEMO_ORG,
    create: DEMO_ORG,
  });

  console.log(`✅ Organización creada: ${org.name}`);
  return org;
}

async function seedUsers(organizationId) {
  console.log('👥 Creando usuarios demo...');

  for (const user of DEMO_USERS) {
    await prisma.clinician.upsert({
      where: { id: user.id },
      update: {
        ...user,
        organizationId,
      },
      create: {
        ...user,
        organizationId,
        isActive: true,
      },
    });
    console.log(`   ✅ ${user.userRole}: ${user.email}`);
  }

  console.log('✅ Usuarios demo creados');
}

async function seedPatients(organizationId) {
  console.log('🏥 Creando pacientes demo...');

  for (const patient of DEMO_PATIENTS) {
    await prisma.patient.upsert({
      where: { id: patient.id },
      update: {
        ...patient,
        organizationId,
      },
      create: {
        ...patient,
        organizationId,
      },
    });
    console.log(`   ✅ Paciente: ${patient.name}`);
  }

  console.log('✅ Pacientes demo creados');
}

async function seedCases(organizationId) {
  console.log('💉 Creando casos de trasplante demo...');

  for (const caseData of DEMO_CASES) {
    const newCase = await prisma.transplantCase.create({
      data: {
        ...caseData,
        organizationId,
      },
    });

    // Asignar equipo al caso
    const anestesiologo = DEMO_USERS.find(u => u.specialty === 'ANESTESIOLOGO');
    const cirujano = DEMO_USERS.find(u => u.specialty === 'CIRUJANO');

    if (anestesiologo) {
      await prisma.teamAssignment.create({
        data: {
          caseId: newCase.id,
          clinicianId: anestesiologo.id,
          role: 'ANESTESIOLOGO',
        },
      });
    }

    if (cirujano) {
      await prisma.teamAssignment.create({
        data: {
          caseId: newCase.id,
          clinicianId: cirujano.id,
          role: 'CIRUJANO',
        },
      });
    }

    console.log(`   ✅ Caso: Paciente ${caseData.patientId} - ${caseData.isRetransplant ? 'Retrasplante' : 'Trasplante'}`);
  }

  console.log('✅ Casos demo creados');
}

async function seedPreopEvaluations(organizationId) {
  console.log('📋 Creando evaluaciones preoperatorias demo...');

  const patients = await prisma.patient.findMany({
    where: { organizationId },
  });

  const anestesiologo = DEMO_USERS.find(u => u.specialty === 'ANESTESIOLOGO');

  for (const patient of patients) {
    await prisma.preopEvaluation.create({
      data: {
        organizationId,
        patientId: patient.id,
        clinicianId: anestesiologo?.id,
        evaluationDate: new Date(),
        meld: Math.floor(Math.random() * 20) + 10, // MELD entre 10-30
        meldNa: Math.floor(Math.random() * 22) + 12,
        child: ['A', 'B', 'C'][Math.floor(Math.random() * 3)],
        etiology1: 'Cirrosis',
        hypertension: Math.random() > 0.5,
        diabetes: Math.random() > 0.7,
        renalFailure: Math.random() > 0.6,
        ascites: Math.random() > 0.5,
        encephalopathy: Math.random() > 0.7,
        inList: patient.transplanted || Math.random() > 0.3,
      },
    });
    console.log(`   ✅ Evaluación preop: ${patient.name}`);
  }

  console.log('✅ Evaluaciones preoperatorias creadas');
}

// ============================================================================
// MAIN
// ============================================================================

async function main() {
  console.log('');
  console.log('═══════════════════════════════════════════════════════════');
  console.log('   SEED DEMO - Sistema Registro TxH');
  console.log('═══════════════════════════════════════════════════════════');
  console.log('');

  try {
    // Limpiar datos existentes
    await clearDemoData();

    // Crear organización
    const org = await seedOrganization();

    // Crear usuarios
    await seedUsers(org.id);

    // Crear pacientes
    await seedPatients(org.id);

    // Crear casos
    await seedCases(org.id);

    // Crear evaluaciones preoperatorias
    await seedPreopEvaluations(org.id);

    console.log('');
    console.log('═══════════════════════════════════════════════════════════');
    console.log('   ✅ SEED COMPLETADO EXITOSAMENTE');
    console.log('═══════════════════════════════════════════════════════════');
    console.log('');
    console.log('📧 Usuarios demo creados:');
    console.log('');
    console.log('   Contraseña para todos: Demo2024!');
    console.log('');
    DEMO_USERS.forEach(u => {
      console.log(`   ${u.userRole.padEnd(15)} ${u.email}`);
    });
    console.log('');
    console.log('⚠️  IMPORTANTE: Los usuarios deben crearse en Clerk manualmente');
    console.log('   y luego vincularse a la organización "Demo Institucional"');
    console.log('');

  } catch (error) {
    console.error('❌ Error en seed:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

main();
