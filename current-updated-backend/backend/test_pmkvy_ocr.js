const fs = require('fs');
const path = require('path');
const Tesseract = require('tesseract.js');

async function testPmkvyOcr() {
  const filePath = path.join(__dirname, 'test_fixtures/cert_pmkvy_abhishek.jpg');
  const buffer = fs.readFileSync(filePath);

  console.log('Running Tesseract OCR on PMKVY certificate...');
  const worker = await Tesseract.createWorker('eng');
  const ret = await worker.recognize(buffer);
  await worker.terminate();

  console.log('--- RECOGNIZED PMKVY TEXT ---');
  console.log(ret.data.text);
  console.log('-----------------------------');
  console.log('Confidence:', ret.data.confidence);
}

testPmkvyOcr().catch(console.error);
