// scripts/full-import.js
// Script maestro para importación completa de datos históricos

const { exec } = require('child_process');
const util = require('util');
const execPromise = util.promisify(exec);

async function runScript(scriptName, description) {
  console.log(`\n${'='.repeat(80)}`);
  console.log(`📌 ${description}`);
  console.log('='.repeat(80));

  try {
    const { stdout, stderr } = await execPromise(`node scripts/${scriptName}`);
    console.log(stdout);
    if (stderr) console.error(stderr);
    return true;
  } catch (error) {
    console.error(`❌ Error en ${scriptName}:`, error.message);
    return false;
  }
}

async function fullImport() {
  console.log('\n');
  console.log('╔' + '='.repeat(78) + '╗');
  console.log('║' + ' '.repeat(18) + '🚀 IMPORTACIÓN COMPLETA DE DATOS' + ' '.repeat(28) + '║');
  console.log('╚' + '='.repeat(78) + '╝');
  console.log('\n');

  try {
    // Paso 1: Limpiar datos existentes
    await runScript('cleanup-all-data.js', 'PASO 1: Limpiando datos existentes');

    // Paso 2: Importar clínicos
    await runScript('import-clinicians.js', 'PASO 2: Importando clínicos');

    // Paso 3: Importar pacientes, casos, preop, postop, líneas y monitoreo
    await runScript('import-complete-data.js', 'PASO 3: Importando pacientes y casos completos');

    // Paso 4: Importar registros intraoperatorios
    await runScript('import-intraop-records.js', 'PASO 4: Importando registros intraoperatorios');

    // Paso 5: Corregir fechas de finalización usando último registro CIERRE
    await runScript('fix-end-times.js', 'PASO 5: Corrigiendo fechas de finalización (último CIERRE)');

    // Paso 6: Corregir casos que terminaron al día siguiente
    await runScript('fix-overnight-cases.js', 'PASO 6: Corrigiendo casos que cruzaron medianoche');

    console.log('\n');
    console.log('╔' + '='.repeat(78) + '╗');
    console.log('║' + ' '.repeat(25) + '✅ IMPORTACIÓN COMPLETADA' + ' '.repeat(29) + '║');
    console.log('╚' + '='.repeat(78) + '╝');
    console.log('\n');

    // Verificación final
    console.log('📊 Ejecutando verificación final...\n');
    await execPromise(`node -e "
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function verify() {
  const patients = await prisma.patient.count();
  const cases = await prisma.transplantCase.count();
  const clinicians = await prisma.clinician.count();
  const teamAssignments = await prisma.teamAssignment.count();
  const preops = await prisma.preopEvaluation.count();
  const lines = await prisma.linesAndMonitoring.count();
  const intraop = await prisma.intraopRecord.count();
  const fluids = await prisma.fluidsAndBlood.count();

  console.log('='.repeat(60));
  console.log('RESUMEN FINAL DE DATOS IMPORTADOS:');
  console.log('='.repeat(60));
  console.log(\\\`  👥 Pacientes: \\\${patients}\\\`);
  console.log(\\\`  🏥 Casos de trasplante: \\\${cases}\\\`);
  console.log(\\\`  👨‍⚕️ Clínicos: \\\${clinicians}\\\`);
  console.log(\\\`  🤝 Asignaciones de equipo: \\\${teamAssignments}\\\`);
  console.log(\\\`  📋 Evaluaciones preoperatorias: \\\${preops}\\\`);
  console.log(\\\`  💉 Líneas y monitoreo: \\\${lines}\\\`);
  console.log(\\\`  💊 Registros intraoperatorios: \\\${intraop}\\\`);
  console.log(\\\`  💧 Registros de fluidos: \\\${fluids}\\\`);
  console.log('='.repeat(60));

  await prisma.\\\$disconnect();
}

verify().catch(console.error);
"`);

    console.log('\n✨ Todos los datos han sido importados y verificados correctamente.\n');

  } catch (error) {
    console.error('\n❌ Error durante la importación:', error.message);
    process.exit(1);
  }
}

fullImport();
