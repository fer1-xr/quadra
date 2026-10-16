import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { v4 as uuidv4 } from 'uuid';

// Crear directorio temporal si no existe
const uploadDir = './uploads/temp';
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// Configurar storage
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = uuidv4();
    const ext = path.extname(file.originalname);
    const name = path.basename(file.originalname, ext);
    cb(null, `${name}-${uniqueSuffix}${ext}`);
  },
});

// Filtro de archivos
const fileFilter = (req, file, cb) => {
  const allowedMimes = [
    'image/jpeg',
    'image/png',
    'image/gif',
    'image/bmp',
    'application/pdf',
  ];

  const allowedExts = ['.jpg', '.jpeg', '.png', '.gif', '.bmp', '.pdf'];

  const ext = path.extname(file.originalname).toLowerCase();
  const mime = file.mimetype;

  if (allowedExts.includes(ext) && allowedMimes.includes(mime)) {
    cb(null, true);
  } else {
    cb(
      new Error(`Tipo de archivo no permitido: ${mime}. Use JPG, PNG, GIF, BMP o PDF.`),
      false
    );
  }
};

// Configurar multer
export const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB máximo
  },
});

/**
 * Middleware para manejo de errores de upload
 */
export const uploadErrorHandler = (err, req, res, next) => {
  if (err instanceof multer.MulterError) {
    if (err.code === 'FILE_TOO_LARGE') {
      return res.status(400).json({
        error: 'Archivo muy grande. Máximo 10MB.',
      });
    }
    return res.status(400).json({
      error: `Error en upload: ${err.message}`,
    });
  }

  if (err) {
    return res.status(400).json({
      error: err.message,
    });
  }

  next();
};

/**
 * Limpia archivos temporales
 */
export const cleanupTempFiles = async (files) => {
  if (!files) return;

  const filesToDelete = Array.isArray(files) ? files : [files];
  for (const file of filesToDelete) {
    try {
      if (file?.path && fs.existsSync(file.path)) {
        fs.unlinkSync(file.path);
      }
    } catch (err) {
      console.warn(`No se pudo eliminar archivo temporal: ${file?.path}`);
    }
  }
};

export default {
  upload,
  uploadErrorHandler,
  cleanupTempFiles,
};
