import { Router } from 'express';
import { z } from 'zod';
import { remixQueue } from '../lib/queue';

const r = Router();

const payload = z.object({
  style: z.string(),
  mediaUrl: z.string().url().optional(),
});

r.post('/jobs', async (req, res) => {
  const parsed = payload.safeParse(req.body);
  if (!parsed.success) return res.status(400).json(parsed.error.format());
  const job = await remixQueue.add('remix', parsed.data);
  res.json({ id: job.id, state: 'queued' });
});

export default r;
