const http = require('http');

async function sendRequest(path, body) {
  const payload = JSON.stringify(body);
  return new Promise((resolve, reject) => {
    const req = http.request(`http://localhost:5000/api/v1${path}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(payload)
      }
    }, res => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, body: JSON.parse(data) });
        } catch (e) {
          resolve({ status: res.statusCode, raw: data });
        }
      });
    });
    req.on('error', reject);
    req.write(payload);
    req.end();
  });
}

async function test() {
  console.log('=== 1. Testing OTP Request for +917000000099 ===');
  const r1 = await sendRequest('/auth/otp/request', { phone: '+917000000099', role: 'worker' });
  console.log('Status:', r1.status, 'Body:', JSON.stringify(r1.body));

  console.log('\n=== 2. Testing OTP Verification for +917000000099 ===');
  const v1 = await sendRequest('/auth/otp/verify', { phone: '+917000000099', code: '123456', role: 'worker' });
  console.log('Status:', v1.status, 'Worker ID:', v1.body?.data?.worker?.id, 'Token exists:', !!v1.body?.data?.token);

  console.log('\n=== 3. Testing OTP Request for 7000000099 (10-digits only) ===');
  const r2 = await sendRequest('/auth/otp/request', { phone: '7000000099', role: 'worker' });
  console.log('Status:', r2.status, 'Body:', JSON.stringify(r2.body));

  console.log('\n=== 4. Testing OTP Verification for 7000000099 ===');
  const v2 = await sendRequest('/auth/otp/verify', { phone: '7000000099', code: '123456', role: 'worker' });
  console.log('Status:', v2.status, 'Worker ID:', v2.body?.data?.worker?.id, 'Token exists:', !!v2.body?.data?.token);

  console.log('\n=== 5. Testing OTP Request for registered worker Alpha (+919817593066) ===');
  const r3 = await sendRequest('/auth/otp/request', { phone: '+919817593066', role: 'worker' });
  console.log('Status:', r3.status, 'Body:', JSON.stringify(r3.body));

  console.log('\n=== 6. Testing OTP Request for unregistered worker (+911111111111) ===');
  const r4 = await sendRequest('/auth/otp/request', { phone: '+911111111111', role: 'worker' });
  console.log('Status:', r4.status, 'Body:', JSON.stringify(r4.body));

  console.log('\n=== ALL TESTS COMPLETE ===');
  process.exit(0);
}

test().catch(err => {
  console.error('Test error:', err);
  process.exit(1);
});
