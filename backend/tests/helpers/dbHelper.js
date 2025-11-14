// tests/helpers/dbHelper.js
// Helper functions for database operations in tests

const { PrismaClient } = require('@prisma/client');
const {
  testPatients,
  testClinicians,
  testCases,
  testPreops,
  testIntraopSnapshots,
  testTeamMembers,
  testPostops,
} = require('../fixtures/testData');

const prisma = new PrismaClient();

/**
 * Clean all test data from database
 */
async function cleanDatabase() {
  // Delete in reverse order of dependencies
  await prisma.postOpOutcome.deleteMany({});
  await prisma.teamAssignment.deleteMany({});
  await prisma.intraopRecord.deleteMany({});
  await prisma.preopEvaluation.deleteMany({});
  await prisma.transplantCase.deleteMany({});
  await prisma.clinician.deleteMany({});
  await prisma.patient.deleteMany({});
}

/**
 * Seed database with test fixtures
 * Returns created data with IDs
 */
async function seedTestData() {
  // Clean first
  await cleanDatabase();

  // Create patients
  const patients = await Promise.all(
    testPatients.map((p) => prisma.patient.create({ data: p }))
  );

  // Create clinicians
  const clinicians = await Promise.all(
    testClinicians.map((c) => prisma.clinician.create({ data: c }))
  );

  // Create cases
  const cases = await Promise.all(
    testCases.map((c) => prisma.transplantCase.create({ data: c }))
  );

  // Create preop evaluations
  const preops = await Promise.all(
    testPreops.map((p, index) =>
      prisma.preopEvaluation.create({
        data: {
          ...p,
          caseId: cases[index].id,
        },
      })
    )
  );

  // Create intraop snapshots
  const intraopRecords = await Promise.all(
    testIntraopSnapshots.map((snapshot) => {
      const { caseIndex, ...data } = snapshot;
      return prisma.intraopRecord.create({
        data: {
          ...data,
          caseId: cases[caseIndex].id,
        },
      });
    })
  );

  // Create team members
  const teamMembers = await Promise.all(
    testTeamMembers.map((tm) => {
      const { caseIndex, clinicianCi, ...data } = tm;
      return prisma.teamAssignment.create({
        data: {
          ...data,
          caseId: cases[caseIndex].id,
          clinicianId: clinicianCi,
        },
      });
    })
  );

  // Create postop outcomes
  const postops = await Promise.all(
    testPostops.map((p) => {
      const { caseIndex, ...data } = p;
      return prisma.postOpOutcome.create({
        data: {
          ...data,
          caseId: cases[caseIndex].id,
        },
      });
    })
  );

  return {
    patients,
    clinicians,
    cases,
    preops,
    intraopRecords,
    teamMembers,
    postops,
  };
}

/**
 * Get test data summary
 */
async function getTestDataSummary() {
  const [
    patientCount,
    clinicianCount,
    caseCount,
    preopCount,
    intraopCount,
    teamCount,
    postopCount,
  ] = await Promise.all([
    prisma.patient.count(),
    prisma.clinician.count(),
    prisma.transplantCase.count(),
    prisma.preopEvaluation.count(),
    prisma.intraopRecord.count(),
    prisma.teamAssignment.count(),
    prisma.postOpOutcome.count(),
  ]);

  return {
    patients: patientCount,
    clinicians: clinicianCount,
    cases: caseCount,
    preops: preopCount,
    intraopRecords: intraopCount,
    teamMembers: teamCount,
    postops: postopCount,
  };
}

/**
 * Close database connection
 */
async function closeDatabase() {
  await prisma.$disconnect();
}

module.exports = {
  prisma,
  cleanDatabase,
  seedTestData,
  getTestDataSummary,
  closeDatabase,
};
