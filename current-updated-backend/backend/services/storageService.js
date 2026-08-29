const fs = require('fs');
const path = require('path');
const { v4: uuidv4 } = require('uuid');

// Secure non-public storage directory for worker verification documents
const CERTIFICATES_STORAGE_DIR = path.resolve(__dirname, '../storage/certificates');

const MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024; // 5 MB

const ALLOWED_MIME_TYPES = {
  'image/jpeg': '.jpg',
  'image/png': '.png',
  'image/webp': '.webp',
  'application/pdf': '.pdf',
};

// Ensure storage directory exists
if (!fs.existsSync(CERTIFICATES_STORAGE_DIR)) {
  fs.mkdirSync(CERTIFICATES_STORAGE_DIR, { recursive: true });
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

module.exports = {
  CERTIFICATES_STORAGE_DIR,
  MAX_FILE_SIZE_BYTES,
  ALLOWED_MIME_TYPES,
  StorageError,
  saveCertificateDocument,
  resolveCertificatePath,
};
