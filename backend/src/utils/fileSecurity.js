import crypto from 'crypto';
import fs from 'fs';
import path from 'path';

/**
 * Generate a cryptographically secure, unpredictable token for public sharing.
 * 32 characters (16 bytes hex) gives 2^128 possible values.
 */
export function generateShareToken() {
  return crypto.randomBytes(16).toString('hex');
}

/**
 * Generate a cryptographically secure token for revoking/deleting a session.
 * 48 characters (24 bytes hex) ensures high entropy.
 */
export function generateRevokeToken() {
  return crypto.randomBytes(24).toString('hex');
}

/**
 * Sanitize original filename to prevent path traversal and shell injection risks.
 * Preserves normal characters, dashes, underscores, dots, and spaces.
 */
export function sanitizeFilename(originalName) {
  if (!originalName || typeof originalName !== 'string') {
    return 'unnamed_file';
  }

  // Strip path traversal attempts and directory components
  const baseName = path.basename(originalName.trim());

  // Replace null bytes and dangerous control characters
  const cleanName = baseName
    .replace(/[\x00-\x1f\x80-\x9f]/g, '')
    .replace(/[<>:"/\\|?*]/g, '_');

  return cleanName.length > 0 ? cleanName.substring(0, 200) : 'file';
}

/**
 * Generate an unpredictable internal stored filename.
 * Uses 16 random bytes + timestamp + sanitized extension.
 * This guarantees no collisions and zero correlation with original filesystem names.
 */
export function generateStoredFilename(originalName) {
  const ext = path.extname(originalName || '').toLowerCase().substring(0, 10);
  const safeExt = ext.replace(/[^a-z0-9.]/gi, '');
  const randomPart = crypto.randomBytes(16).toString('hex');
  const timestamp = Date.now();
  return `${timestamp}_${randomPart}${safeExt}`;
}

/**
 * Generate a cryptographically random six-digit transfer code (100000 - 999999)
 */
export function generateSixDigitCode() {
  return crypto.randomInt(100000, 1000000).toString();
}

/**
 * Calculate SHA-256 checksum of a file on local filesystem
 */
export async function calculateFileHash(filePath) {
  return new Promise((resolve, reject) => {
    const hash = crypto.createHash('sha256');
    const stream = fs.createReadStream(filePath);
    stream.on('error', (err) => reject(err));
    stream.on('data', (chunk) => hash.update(chunk));
    stream.on('end', () => resolve(hash.digest('hex')));
  });
}

/**
 * Format bytes into human-readable units (e.g. 1.25 MB)
 */
export function formatBytes(bytes, decimals = 2) {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
}
