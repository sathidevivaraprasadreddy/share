import multer from 'multer';
import path from 'path';
import storageService from '../services/storageService.js';
import { generateStoredFilename, sanitizeFilename } from '../utils/fileSecurity.js';

const MAX_FILE_SIZE_MB = Number(process.env.MAX_FILE_SIZE_MB) || 2048;
const MAX_FILES_COUNT = Number(process.env.MAX_FILES_COUNT) || 10;

// Block dangerous executable extensions that could harm a server or recipient if executed
const BLOCKED_EXTENSIONS = new Set([
  '.exe', '.bat', '.cmd', '.sh', '.bash', '.vbs', '.msi', '.com', 
  '.scr', '.pif', '.application', '.gadget', '.hta', '.cpl', '.msc', 
  '.jar', '.php', '.asp', '.aspx', '.jsp', '.cgi', '.pl'
]);

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, storageService.getUploadDir());
  },
  filename: (req, file, cb) => {
    // Decode original name if latin1 encoded by multer
    let originalName = file.originalname;
    try {
      originalName = Buffer.from(file.originalname, 'latin1').toString('utf8');
    } catch {
      originalName = file.originalname;
    }
    file.sanitizedOriginalName = sanitizeFilename(originalName);
    const storedName = generateStoredFilename(file.sanitizedOriginalName);
    cb(null, storedName);
  }
});

const fileFilter = (req, file, cb) => {
  const ext = path.extname(file.originalname || '').toLowerCase();
  if (BLOCKED_EXTENSIONS.has(ext)) {
    return cb(
      new Error(`Files with extension '${ext}' are restricted for security reasons.`),
      false
    );
  }
  cb(null, true);
};

export const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: MAX_FILE_SIZE_MB * 1024 * 1024, // bytes
    files: MAX_FILES_COUNT
  }
});
