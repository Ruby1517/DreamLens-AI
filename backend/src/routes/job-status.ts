import { Router } from 'express';
import { Job, Queue } from 'bullmq';

const r = Router();
const connection = { host: process.env.REDIS_HOST || 'localhost', port: Number(process.env.REDIS_PORT || 6379) };
const queue = new Queue('remix', { connection });

r.get('/jobs/:id', async (req, res) => {
  const id = req.params.id;
  const job = await Job.fromId(queue, id);
  if (!job) return res.status(404).json({ error: 'not_found' });
  const state = await job.getState();
  const progress = typeof job.progress === 'number' ? job.progress : 0;
  res.json({ id, state, progress, returnvalue: job.returnvalue ?? null });
});

export default r;