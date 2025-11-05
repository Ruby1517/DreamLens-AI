import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import path from 'path';
import health from './routes/health';
import jobs from './routes/jobs';
import jobStatus from './routes/job-status';
import media from './routes/media';
import auth from './routes/auth';
import posts from './routes/posts';


const app = express();
app.use(cors({ origin: '*' }));
app.use(express.json({ limit: '25mb' }));

// Static hosting for uploaded files
app.use('/uploads', express.static(path.join(process.cwd(), 'uploads')));

// Routes
app.use('/api', health);
app.use('/api', jobs);
app.use('/api', jobStatus);
app.use('/api', media);
app.use('/api', auth);
app.use('/api', posts);

const port = Number(process.env.PORT || 4000);
app.listen(port, () => console.log(`[api] http://localhost:${port}`));
