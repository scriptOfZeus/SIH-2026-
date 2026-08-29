const fs = require('fs');
const path = require('path');
const { v4: uuidv4 } = require('uuid');

// Secure non-public storage directory for worker verification documents
const CERTIFICATES_STORAGE_DIR = path.resolve(__dirname, '../storage/certificates');
const CLAIMS_STORAGE_DIR = path.resolve(__dirname, '../storage/claims');
const DISPUTES_STORAGE_DIR = path.resolve(__dirname, '../storage/disputes');

const MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024; // 5 MB

const ALLOWED_MIME_TYPES = {
  'image/jpeg': '.jpg',
  'image/png': '.png',
  'image/webp': '.webp',
  'application/pdf': '.pdf',
};

// Ensure storage directories exist
if (!fs.existsSync(CERTIFICATES_STORAGE_DIR)) {
  fs.mkdirSync(CERTIFICATES_STORAGE_DIR, { recursive: true });
}
if (!fs.existsSync(CLAIMS_STORAGE_DIR)) {
  fs.mkdirSync(CLAIMS_STORAGE_DIR, { recursive: true });
}
if (!fs.existsSync(DISPUTES_STORAGE_DIR)) {
  fs.mkdirSync(DISPUTES_STORAGE_DIR, { recursive: true });
}

class StorageError extends Error {
  constructor(message, code, statusCode = 400) {
    super(message);
    this.code = code;
    this.statusCode = statusCode;
  }
}

/**
 * Validates and safely stores a certificate document.
 * Prevents path traversal, validates MIME type and file size.
 * Returns an internal, non-public authenticated document URL.
 */
function saveCertificateDocument({ workerId, buffer, mimeType, originalFilename = 'certificate.png' }) {
  if (!buffer || !Buffer.isBuffer(buffer)) {
    throw new StorageError('No valid document buffer provided', 'EMPTY_DOCUMENT');
  }

  // 1. File Size Validation
  if (buffer.length > MAX_FILE_SIZE_BYTES) {
    throw new StorageError(`Document exceeds maximum allowed size of 5MB (size: ${(buffer.length / (1024 * 1024)).toFixed(2)}MB)`, 'FILE_TOO_LARGE');
  }

  // 2. MIME Type Validation
  const normalizedMime = (mimeType || '').toLowerCase().trim();
  const extension = ALLOWED_MIME_TYPES[normalizedMime];
  if (!extension) {
    throw new StorageError(`Unsupported document type '${mimeType}'. Allowed formats: JPEG, PNG, WEBP, PDF`, 'INVALID_FILE_TYPE');
  }

  // 3. Path Traversal Prevention & Safe File Naming
  // Strictly generate a server-controlled random filename. Never use client path directly.
  const safeId = workerId.replace(/[^a-zA-Z0-9_-]/g, '');
  const uniqueToken = uuidv4().slice(0, 8);
  const secureFilename = `cert_${safeId}_${Date.now()}_${uniqueToken}${extension}`;
  const targetPath = path.join(CERTIFICATES_STORAGE_DIR, secureFilename);

  // Guard against any directory breakout
  if (!targetPath.startsWith(CERTIFICATES_STORAGE_DIR)) {
    throw new StorageError('Invalid file path traversal detected', 'SECURITY_ERROR', 403);
  }

  fs.writeFileSync(targetPath, buffer);

  // Safe internal authenticated URI (never exposed via unrestricted public static routes)
  const documentUrl = `/api/v1/admin/workers/${workerId}/certificate-document`;

  return {
    stored_filename: secureFilename,
    file_path: targetPath,
    document_url: documentUrl,
    mime_type: normalizedMime,
    file_size_bytes: buffer.length,
  };
}

/**
 * Retrieves the stored certificate file path for a worker.
 */
function resolveCertificatePath(storedFilename) {
  if (!storedFilename) return null;
  const safeName = path.basename(storedFilename); // Strip any potential relative path traversal
  const resolved = path.join(CERTIFICATES_STORAGE_DIR, safeName);
  if (fs.existsSync(resolved)) {
    return resolved;
  }
  return null;
}

/**
 * Validates and safely stores a welfare claim evidence document.
 * Enforces file size (<= 5MB), MIME type check, random naming, and directory breakout guard.
 */
function saveClaimDocument({ workerId, buffer, mimeType, claimId }) {
  if (!buffer || !Buffer.isBuffer(buffer)) {
    throw new StorageError('No valid document buffer provided', 'EMPTY_DOCUMENT');
  }

  // 1. File Size Validation
  if (buffer.length > MAX_FILE_SIZE_BYTES) {
    throw new StorageError(`Document exceeds maximum allowed size of 5MB (size: ${(buffer.length / (1024 * 1024)).toFixed(2)}MB)`, 'FILE_TOO_LARGE');
  }

  // 2. MIME Type Validation
  const normalizedMime = (mimeType || '').toLowerCase().trim();
  const extension = ALLOWED_MIME_TYPES[normalizedMime];
  if (!extension) {
    throw new StorageError(`Unsupported document type '${mimeType}'. Allowed formats: JPEG, PNG, WEBP, PDF`, 'INVALID_FILE_TYPE');
  }

  // 3. Path Traversal Prevention & Safe File Naming
  const safeWorkerId = (workerId || 'worker').replace(/[^a-zA-Z0-9_-]/g, '');
  const uniqueToken = uuidv4().slice(0, 8);
  const secureFilename = `claim_${safeWorkerId}_${Date.now()}_${uniqueToken}${extension}`;
  const targetPath = path.join(CLAIMS_STORAGE_DIR, secureFilename);

  if (!targetPath.startsWith(CLAIMS_STORAGE_DIR)) {
    throw new StorageError('Invalid file path traversal detected', 'SECURITY_ERROR', 403);
  }

  fs.writeFileSync(targetPath, buffer);

  const documentUrl = `/api/v1/welfare/claims/${claimId || uniqueToken}/document`;

  return {
    stored_filename: secureFilename,
    file_path: targetPath,
    document_url: documentUrl,
    mime_type: normalizedMime,
    file_size_bytes: buffer.length,
  };
}

/**
 * Retrieves the stored claim file path.
 */
function resolveClaimPath(storedFilename) {
  if (!storedFilename) return null;
  const safeName = path.basename(storedFilename);
  const resolved = path.join(CLAIMS_STORAGE_DIR, safeName);
  if (fs.existsSync(resolved)) {
    return resolved;
  }
  return null;
}

function saveDisputeEvidence({ buffer, mimeType, disputeId }) {
  if (!buffer || !Buffer.isBuffer(buffer)) {
    throw new StorageError('No valid document buffer provided', 'EMPTY_DOCUMENT');
  }
  if (buffer.length > MAX_FILE_SIZE_BYTES) {
    throw new StorageError('File size exceeds the 5MB limit', 'FILE_TOO_LARGE');
  }
  const ext = ALLOWED_MIME_TYPES[mimeType];
  if (!ext) {
    throw new StorageError(`Unsupported MIME type: ${mimeType}`, 'INVALID_FILE_TYPE');
  }
  const safeId = String(disputeId).replace(/[^a-zA-Z0-9_-]/g, '');
  const storedFilename = `dispute_${safeId}_${uuidv4().split('-')[0]}${ext}`;
  const targetPath = path.resolve(DISPUTES_STORAGE_DIR, storedFilename);
  fs.writeFileSync(targetPath, buffer);
  return { stored_filename: storedFilename, mime_type: mimeType };
}

function resolveDisputePath(filename) {
  if (!filename) return null;
  const safeFilename = path.basename(filename);
  const resolved = path.resolve(DISPUTES_STORAGE_DIR, safeFilename);
  if (!resolved.startsWith(DISPUTES_STORAGE_DIR)) return null;
  if (fs.existsSync(resolved)) return resolved;
  return null;
}

module.exports = {
  CERTIFICATES_STORAGE_DIR,
  CLAIMS_STORAGE_DIR,
  DISPUTES_STORAGE_DIR,
  MAX_FILE_SIZE_BYTES,
  ALLOWED_MIME_TYPES,
  StorageError,
  saveCertificateDocument,
  resolveCertificatePath,
  saveClaimDocument,
  resolveClaimPath,
  saveDisputeEvidence,
  resolveDisputePath,
};
