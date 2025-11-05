import 'dotenv/config';
import { Worker, QueueEvents } from 'bullmq';
import { connection } from './lib/queue';

const worker = new Worker(
  'remix',
  async (job) => {
    // Simulate work/progress
    for (const p of [10, 25, 40, 55, 70, 85, 100]) {
      await job.updateProgress(p);
      await new Promise((r) => setTimeout(r, 400));
    }
    // ✅ TEMP: return the input media so the client can actually render something
    // Later, replace with the processed output URL you generate on the server.
    return { outputUrl: job.data.mediaUrl };
  },
  { connection }
);

const qe = new QueueEvents('remix', { connection });
qe.on('completed', ({ jobId }) => console.log(`[worker] completed ${jobId}`));
qe.on('failed', ({ jobId, failedReason }) => console.error(`[worker] failed ${jobId}: ${failedReason}`));
worker.on('error', (err) => console.error('[worker] error', err));
