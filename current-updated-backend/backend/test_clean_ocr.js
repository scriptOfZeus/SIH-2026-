const fs = require('fs');
const path = require('path');
const Tesseract = require('tesseract.js');
const { calculateNameMatch, calculateNumberMatch } = require('./services/ocrService');

function parseExtractedText(rawText) {
  if (!rawText || typeof rawText !== 'string') {
    return { name: null, number: null };
  }

  let extractedName = null;
  let extractedNumber = null;

  const lines = rawText.split(/\r?\n/).map(l => l.trim()).filter(Boolean);

  for (const line of lines) {
    // 1. Check for Name pattern
    if (!extractedName) {
      const nameMatch = line.match(/(?:Candidate\s*Name|Full\s*Name|Worker\s*Name|Name)[:\s]+([A-Za-z\s.'-]{2,50})/i);
      if (nameMatch) {
        extractedName = nameMatch[1].trim();
      }
    }

    // 2. Check for Certificate Number pattern
    if (!extractedNumber) {
      const certMatch = line.match(/(?:Certificate\s*(?:No\.?|Number|#)?|Cert\s*(?:No\.?|#)?|NSDC[_\s-]*ID|Registration\s*(?:No\.?|#)?)[:\s]+([A-Za-z0-9_\s-]{4,40})/i);
      if (certMatch) {
        extractedNumber = certMatch[1].trim();
      }
    }
  }

  return { name: extractedName, number: extractedNumber };
}

async function runTest() {
  const filePath = path.join(__dirname, 'test_fixtures/cert_ramesh_kumar.png');
  const buffer = fs.readFileSync(filePath);

  const worker = await Tesseract.createWorker('eng');
  const ret = await worker.recognize(buffer);
  await worker.terminate();

  const { name, number } = parseExtractedText(ret.data.text);
  console.log('Clean Extracted Name:', name);
  console.log('Clean Extracted Number:', number);

  const expectedName = 'Ramesh Kumar';
  const expectedNumber = 'NSDC-ELEC-2026-8839';

  console.log('Name matches Ramesh Kumar?', calculateNameMatch(name, expectedName));
  console.log('Number matches NSDC-ELEC-2026-8839?', calculateNumberMatch(number, expectedNumber));
}

runTest().catch(console.error);
