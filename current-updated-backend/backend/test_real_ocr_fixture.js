const fs = require('fs');
const path = require('path');
const Tesseract = require('tesseract.js');

async function testOcr() {
  const filePath = path.join(__dirname, 'test_fixtures/cert_ramesh_kumar.png');
  const buffer = fs.readFileSync(filePath);

  console.log('Running Tesseract OCR on:', filePath);
  const worker = await Tesseract.createWorker('eng');
  const ret = await worker.recognize(buffer);
  await worker.terminate();

  console.log('--- RECOGNIZED TEXT ---');
  console.log(ret.data.text);
  console.log('-----------------------');
  console.log('Confidence:', ret.data.confidence);

  const namePattern = /(?:Name|Candidate Name|Full Name|Worker Name)[:\s]+([A-Za-z\s]{3,50})/i;
  const certPattern = /(?:Certificate\s*(?:No|Number|#)|Cert\s*(?:No|#)|NSDC[_\s-]*ID)[:\s]+([A-Za-z0-9_-]{4,40})/i;

  const nameMatch = ret.data.text.match(namePattern);
  const certMatch = ret.data.text.match(certPattern);

  console.log('Extracted Name:', nameMatch ? nameMatch[1].trim() : 'NOT FOUND');
  console.log('Extracted Number:', certMatch ? certMatch[1].trim() : 'NOT FOUND');
}

testOcr().catch(console.error);
