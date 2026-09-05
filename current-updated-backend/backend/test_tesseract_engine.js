const Tesseract = require('tesseract.js');

async function testTesseract() {
  console.log('Testing Tesseract.js initialization...');
  try {
    // Generate a simple test image or recognize text
    const sampleTextPng = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';
    const buffer = Buffer.from(sampleTextPng, 'base64');
    
    const worker = await Tesseract.createWorker('eng');
    const ret = await worker.recognize(buffer);
    console.log('Tesseract recognize success! Text:', ret.data.text, 'Confidence:', ret.data.confidence);
    await worker.terminate();
    console.log('Tesseract worker terminated successfully.');
  } catch (err) {
    console.error('Tesseract test error:', err);
  }
}

testTesseract();
