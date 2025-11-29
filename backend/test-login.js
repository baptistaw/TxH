// Test para verificar el login y el token generado
async function testLogin() {
  const response = await fetch('http://localhost:4000/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: 'baptistaw@gmail.com',
      password: '123456'
    })
  });

  const data = await response.json();

  console.log('=== RESPUESTA DEL LOGIN ===');
  console.log('Status:', response.status);
  console.log('\nUsuario en respuesta:');
  console.log(JSON.stringify(data.user, null, 2));

  if (data.token) {
    const payload = JSON.parse(Buffer.from(data.token.split('.')[1], 'base64').toString());
    console.log('\nPayload del token JWT:');
    console.log(JSON.stringify(payload, null, 2));
  }
}

testLogin().catch(console.error);
