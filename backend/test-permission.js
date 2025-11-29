// Test script para verificar permisos
const TOKEN = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6NzAyMDMsImVtYWlsIjoiYmFwdGlzdGF3QGdtYWlsLmNvbSIsInNwZWNpYWx0eSI6IkFORVNURVNJT0xPR08iLCJyb2xlIjoiQU5FU1RFU0lPTE9HTyIsImlhdCI6MTczMjExMTExNiwiZXhwIjoxNzMyNzE1OTE2fQ.V_kd3K6_dIpGJCjE2PjMZ7jPExQxC1RvD0-8Q1H0gA0";

async function test() {
  // Test 1: Verificar que el backend esté corriendo
  console.log('🔍 Test 1: Health check...');
  const health = await fetch('http://localhost:4000/api/health');
  console.log('   Health:', await health.json());

  // Test 2: Listar casos del usuario
  console.log('\n🔍 Test 2: Listar mis casos...');
  const cases = await fetch('http://localhost:4000/api/cases?myPatients=true', {
    headers: { 'Authorization': `Bearer ${TOKEN}` }
  });
  const casesData = await cases.json();
  console.log(`   Encontrados: ${casesData.total} casos`);
  if (casesData.data && casesData.data.length > 0) {
    console.log(`   Primer caso: ${casesData.data[0].id}`);

    // Test 3: Verificar equipo del caso
    const caseId = casesData.data[0].id;
    console.log(`\n🔍 Test 3: Verificar equipo del caso ${caseId}...`);
    const team = await fetch(`http://localhost:4000/api/cases/${caseId}/team`, {
      headers: { 'Authorization': `Bearer ${TOKEN}` }
    });
    const teamData = await team.json();
    console.log('   Equipo:', JSON.stringify(teamData, null, 2));

    // Test 4: Intentar actualizar el caso
    console.log(`\n🔍 Test 4: Intentar actualizar caso ${caseId}...`);
    const update = await fetch(`http://localhost:4000/api/cases/${caseId}`, {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${TOKEN}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ notes: 'Test update' })
    });
    console.log(`   Status: ${update.status}`);
    if (update.status === 200) {
      console.log('   ✅ Update exitoso!');
    } else {
      const error = await update.json();
      console.log('   ❌ Error:', error);
    }
  }

  // Test 5: Listar procedimientos
  console.log('\n🔍 Test 5: Listar mis procedimientos...');
  const procedures = await fetch('http://localhost:4000/api/procedures?myPatients=true', {
    headers: { 'Authorization': `Bearer ${TOKEN}` }
  });
  const proceduresData = await procedures.json();
  console.log(`   Encontrados: ${proceduresData.total} procedimientos`);

  // Test 6: Listar evaluaciones preop
  console.log('\n🔍 Test 6: Listar mis evaluaciones preop...');
  const preops = await fetch('http://localhost:4000/api/preop?myEvaluations=true', {
    headers: { 'Authorization': `Bearer ${TOKEN}` }
  });
  const preopsData = await preops.json();
  console.log(`   Encontrados: ${preopsData.total} evaluaciones`);
}

test().catch(console.error);
