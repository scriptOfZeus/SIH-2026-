/**
 * Automated OCR Document Verification Service
 *
 * Provider-agnostic abstraction for skill certificate document analysis.
 * Local/Mock implementation supports development & testing, designed to be swapped
 * with AWS Textract (detectDocumentText) or Google Cloud Document AI in production.
 */

const CONFIDENCE_HIGH_THRESHOLD = 0.80; // >= 0.80 required for automated match
const CONFIDENCE_LOW_THRESHOLD = 0.70;  // < 0.70 flags manual_review_needed

/**
 * Normalizes text for robust comparison (strips punctuation, case-insensitive, collapses whitespace).
 */
function normalize(str) {
  if (!str) return '';
  return str
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '')
    .trim();
}

/**
 * Calculates string similarity between two normalized strings.
 */
function calculateNameMatch(extractedName, expectedName) {
  const normExtracted = normalize(extractedName);
  const normExpected = normalize(expectedName);

  if (!normExtracted || !normExpected) return false;
  if (normExtracted === normExpected) return true;

  // Check token set match (e.g. "Kumar Mahesh" vs "Mahesh Kumar")
  const tokensExtracted = (extractedName || '').toLowerCase().trim().split(/\s+/).filter(Boolean);
  const tokensExpected = (expectedName || '').toLowerCase().trim().split(/\s+/).filter(Boolean);

  const setExpected = new Set(tokensExpected);
  const matchingTokens = tokensExtracted.filter(t => setExpected.has(t));

  return matchingTokens.length === tokensExpected.length && tokensExtracted.length === tokensExpected.length;
}

/**
 * Verifies certificate number match (case & separator agnostic).
 */
function calculateNumberMatch(extractedNumber, expectedNumber) {
  const normExtracted = normalize(extractedNumber);
  const normExpected = normalize(expectedNumber);

  if (!normExtracted || !normExpected) return false;
  return normExtracted === normExpected;
}

/**
 * Pluggable OCR Engine: Local / Mock implementation for dev & automated testing.
 * Can parse structured OCR hints, plain text certificates, or simulated NSDC certificate streams.
 */
async function extractDocumentData({ buffer, mimeType, hints = null }) {
  // Check if test payload explicitly specified OCR hints (for reproducible test simulation)
  if (hints && (hints.name || hints.number || hints.ocr_extracted_name || hints.ocr_extracted_number || hints.mock_ocr)) {
    const mock = hints.mock_ocr || hints;
    return {
      extracted_name: mock.ocr_extracted_name || mock.name || null,
      extracted_number: mock.ocr_extracted_number || mock.number || null,
      confidence_score: typeof mock.confidence === 'number' ? mock.confidence : 0.95,
      raw_text: mock.raw_text || '',
    };
  }

  // Attempt to inspect text encoded in document buffer (e.g., text certificate or embedded metadata)
  const bufferString = buffer.toString('utf8');

  // Check for JSON embedded mock
  try {
    const parsed = JSON.parse(bufferString);
    if (parsed.mock_ocr || parsed.ocr_extracted_name || parsed.ocr_extracted_number) {
      const m = parsed.mock_ocr || parsed;
      return {
        extracted_name: m.ocr_extracted_name || m.name || null,
        extracted_number: m.ocr_extracted_number || m.number || null,
        confidence_score: typeof m.confidence === 'number' ? m.confidence : 0.92,
        raw_text: bufferString,
      };
    }
  } catch (_) {
    // Not JSON, continue to pattern matching
  }

  // Regex patterns for Indian NSDC / Skill India / Trade certificates
  const namePattern = /(?:Name|Candidate Name|Full Name|Worker Name)[:\s]+([A-Za-z\s]{3,50})/i;
  const certPattern = /(?:Certificate\s*(?:No|Number|#)|Cert\s*(?:No|#)|NSDC[_\s]*ID)[:\s]+([A-Za-z0-9_-]{4,40})/i;

  const nameMatch = bufferString.match(namePattern);
  const certMatch = bufferString.match(certPattern);

  if (nameMatch || certMatch) {
    return {
      extracted_name: nameMatch ? nameMatch[1].trim() : null,
      extracted_number: certMatch ? certMatch[1].trim() : null,
      confidence_score: 0.90,
      raw_text: bufferString.slice(0, 500),
    };
  }

  // Generic fallback: simulate realistic scan of image with high confidence default
  return {
    extracted_name: null,
    extracted_number: null,
    confidence_score: 0.55, // Low confidence when text cannot be resolved
    raw_text: '',
  };
}

/**
 * Main verification orchestrator.
 * Compares OCR-extracted data against verified worker record in database.
 * Determines status: 'matched' | 'mismatch' | 'manual_review_needed'
 */
async function processAndVerifyCertificate({ buffer, mimeType, worker, hints = null }) {
  const ocrData = await extractDocumentData({ buffer, mimeType, hints });

  const extractedName = ocrData.extracted_name;
  const extractedNumber = ocrData.extracted_number;
  const confidence = ocrData.confidence_score;

  const nameMatches = calculateNameMatch(extractedName, worker.full_name);
  const numberMatches = calculateNumberMatch(extractedNumber, worker.skill_certificate_number);

  let ocrStatus = 'manual_review_needed';
  let decisionReason = '';

  // 1. Check confidence quality threshold
  if (confidence < CONFIDENCE_LOW_THRESHOLD || !extractedName || !extractedNumber) {
    ocrStatus = 'manual_review_needed';
    decisionReason = `Insufficient OCR scan quality or unreadable fields (confidence: ${(confidence * 100).toFixed(1)}%). Requires manual administrator review.`;
  }
  // 2. Check for matches
  else if (nameMatches && numberMatches && confidence >= CONFIDENCE_HIGH_THRESHOLD) {
    ocrStatus = 'matched';
    decisionReason = `Automated match verified: Certificate number and candidate name match database record (confidence: ${(confidence * 100).toFixed(1)}%).`;
  }
  // 3. Clear mismatch detected
  else {
    ocrStatus = 'mismatch';
    const mismatchDetails = [];
    if (!nameMatches) mismatchDetails.push(`Name mismatch: Document shows '${extractedName}', expected '${worker.full_name}'`);
    if (!numberMatches) mismatchDetails.push(`Certificate number mismatch: Document shows '${extractedNumber}', expected '${worker.skill_certificate_number}'`);
    decisionReason = mismatchDetails.join('; ');
  }

  return {
    ocr_status: ocrStatus,
    ocr_extracted_name: extractedName,
    ocr_extracted_number: extractedNumber,
    ocr_confidence_score: confidence,
    name_matched: nameMatches,
    number_matched: numberMatches,
    decision_reason: decisionReason,
  };
}

module.exports = {
  CONFIDENCE_HIGH_THRESHOLD,
  CONFIDENCE_LOW_THRESHOLD,
  normalize,
  calculateNameMatch,
  calculateNumberMatch,
  extractDocumentData,
  processAndVerifyCertificate,
};
