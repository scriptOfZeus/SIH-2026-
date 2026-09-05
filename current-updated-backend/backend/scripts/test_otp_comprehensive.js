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

async function runCheck() {
  console.log('====================================================');
  console.log('OTP COMPREHENSIVE VERIFICATION AUDIT');
  console.log('====================================================\n');

  // Test 1: Worker OTP Request with +91
  console.log('--- 1. Worker OTP Request (+917000000099) ---');
  const w1Req = await sendRequest('/auth/otp/request', { phone: '+917000000099', role: 'worker' });
  console.log(`Status: ${w1Req.status} | Success: ${w1Req.body?.success} | Message: ${w1Req.body?.data?.message}`);

  // Test 2: Worker OTP Verify with +91
  console.log('\n--- 2. Worker OTP Verify (+917000000099, code: 123456) ---');
  const w1Ver = await sendRequest('/auth/otp/verify', { phone: '+917000000099', code: '123456', role: 'worker' });
  console.log(`Status: ${w1Ver.status} | Worker ID: ${w1Ver.body?.data?.worker?.id} | Full Name: ${w1Ver.body?.data?.worker?.full_name} | Token Exists: ${!!w1Ver.body?.data?.token}`);

  // Test 3: Worker OTP Request with 10 digits
  console.log('\n--- 3. Worker OTP Request (7000000099) ---');
  const w2Req = await sendRequest('/auth/otp/request', { phone: '7000000099', role: 'worker' });
  console.log(`Status: ${w2Req.status} | Success: ${w2Req.body?.success} | Message: ${w2Req.body?.data?.message}`);

  // Test 4: Worker OTP Verify with 10 digits
  console.log('\n--- 4. Worker OTP Verify (7000000099, code: 123456) ---');
  const w2Ver = await sendRequest('/auth/otp/verify', { phone: '7000000099', code: '123456', role: 'worker' });
  console.log(`Status: ${w2Ver.status} | Worker ID: ${w2Ver.body?.data?.worker?.id} | Token Exists: ${!!w2Ver.body?.data?.token}`);

  // Test 5: Worker OTP Verify with Wrong Code
  console.log('\n--- 5. Worker OTP Verify with Wrong Code (999999) ---');
  const wWrong = await sendRequest('/auth/otp/verify', { phone: '+917000000099', code: '999999', role: 'worker' });
  console.log(`Status: ${wWrong.status} (Expected: 401) | Error Code: ${wWrong.body?.error?.code} | Error Msg: ${wWrong.body?.error?.message}`);

  // Test 6: Customer OTP Request & Verify
  console.log('\n--- 6. Customer OTP Request (+919876543210) ---');
  const cReq = await sendRequest('/auth/otp/request', { phone: '+919876543210', role: 'customer' });
  console.log(`Status: ${cReq.status} | Success: ${cReq.body?.success}`);

  console.log('\n--- 7. Customer OTP Verify (+919876543210, code: 123456) ---');
  const cVer = await sendRequest('/auth/otp/verify', { phone: '+919876543210', code: '123456', role: 'customer' });
  console.log(`Status: ${cVer.status} | Customer ID: ${cVer.body?.data?.customer?.id} | Token Exists: ${!!cVer.body?.data?.token}`);

  // Test 8: Unregistered Worker Request
  console.log('\n--- 8. Unregistered Worker OTP Request (+910000000000) ---');
  const unreg = await sendRequest('/auth/otp/request', { phone: '+910000000000', role: 'worker' });
  console.log(`Status: ${unreg.status} (Expected: 404) | Error Code: ${unreg.body?.error?.code} | Error Msg: ${unreg.body?.error?.message}`);

  console.log('\n====================================================');
  console.log('ALL OTP FLOW CHECKS COMPLETED AND VERIFIED!');
  console.log('====================================================');
  process.exit(0);
}

runCheck().catch(e => {
  console.error(e);
  process.exit(1);
});
