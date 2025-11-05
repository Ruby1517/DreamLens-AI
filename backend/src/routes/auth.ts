import { Router } from 'express';
import { readDB, writeDB } from '../lib/store';
import { nanoid } from 'nanoid';

const r = Router();

r.post('/auth/guest', (_req, res) => {
  const db = readDB();
  const id = nanoid(10);
  db.users.push({ id, createdAt: Date.now() });
  writeDB(db);
  res.json({ userId: id });
});

export default r;
