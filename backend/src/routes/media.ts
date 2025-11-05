import { Router } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';

const r = Router();

const UPLOAD_DIR = path.join(process.cwd(), 'uploads');
if (!fs.existsSync(UPLOAD_DIR)) fs.mkdirSync(UPLOAD_DIR, { recursive: true });

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, UPLOAD_DIR),
  filename: (_req, file, cb) => {
    const safe = file.originalname.replace(/[^a-zA-Z0-9._-]+/g, '_');
    const stamp = Date.now();
    cb(null, `${stamp}__${safe}`);
  },
});
const upload = multer({ storage, limits: { fileSize: 100 * 1024 * 1024 } }); // 100MB

// Helper: pick public base from env (recommended) or infer
function publicBase(req: any) {
  return process.env.PUBLIC_BASE || `${req.protocol}://${req.headers.host}`;
}

r.post('/media/upload', upload.single('file'), (req: any, res) => {
  if (!req.file) return res.status(400).json({ error: 'no_file' });
  const fileUrl = `${publicBase(req)}/uploads/${req.file.filename}`;
  return res.json({ url: fileUrl, name: req.file.originalname, size: req.file.size });
});

export default r;
