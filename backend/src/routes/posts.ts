import { Router } from 'express';
import { readDB, writeDB } from '../lib/store';
import { nanoid } from 'nanoid';
import { z } from 'zod';

const r = Router();

/* ----- Feed ----- */
r.get('/posts', (req, res) => {
  const limit = Math.min(50, Number(req.query.limit || 20));
  const after = Number(req.query.after || 0);
  const db = readDB();
  const sorted = db.posts.sort((a, b) => b.createdAt - a.createdAt);
  const page = sorted.filter(p => !after || p.createdAt < after).slice(0, limit);
  res.json({ items: page, next: page.length ? page[page.length-1].createdAt : null });
});

const createSchema = z.object({
  authorId: z.string().min(1),
  mediaUrl: z.string().url(),
  caption: z.string().max(200).optional(),
});

r.post('/posts', (req, res) => {
  const parsed = createSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json(parsed.error.format());
  const db = readDB();
  const post = {
    id: nanoid(12),
    authorId: parsed.data.authorId,
    mediaUrl: parsed.data.mediaUrl,
    caption: parsed.data.caption,
    createdAt: Date.now(),
    likes: [] as string[],
  };
  db.posts.push(post);
  writeDB(db);
  res.json(post);
});

/* ----- Like / Unlike ----- */
r.post('/posts/:id/like', (req, res) => {
  const userId = String(req.body?.userId || '');
  if (!userId) return res.status(400).json({ error: 'missing_userId' });
  const db = readDB();
  const post = db.posts.find(p => p.id === req.params.id);
  if (!post) return res.status(404).json({ error: 'not_found' });
  if (!post.likes.includes(userId)) post.likes.push(userId);
  writeDB(db);
  res.json({ ok: true, likes: post.likes.length });
});

r.post('/posts/:id/unlike', (req, res) => {
  const userId = String(req.body?.userId || '');
  if (!userId) return res.status(400).json({ error: 'missing_userId' });
  const db = readDB();
  const post = db.posts.find(p => p.id === req.params.id);
  if (!post) return res.status(404).json({ error: 'not_found' });
  post.likes = post.likes.filter(id => id !== userId);
  writeDB(db);
  res.json({ ok: true, likes: post.likes.length });
});

/* ----- Delete (author only) ----- */
r.delete('/posts/:id', (req, res) => {
  const authorId = String(req.body?.authorId || '');
  if (!authorId) return res.status(400).json({ error: 'missing_authorId' });

  const db = readDB();
  const idx = db.posts.findIndex(p => p.id === req.params.id);
  if (idx === -1) return res.status(404).json({ error: 'not_found' });
  if (db.posts[idx].authorId !== authorId) return res.status(403).json({ error: 'forbidden' });

  const postId = db.posts[idx].id;
  db.posts.splice(idx, 1);
  // cascade delete comments for this post
  db.comments = db.comments.filter(c => c.postId !== postId);

  writeDB(db);
  res.json({ ok: true });
});

/* ----- Comments ----- */
const commentSchema = z.object({
  postId: z.string().min(1),
  authorId: z.string().min(1),
  text: z.string().min(1).max(300),
});

r.get('/posts/:id/comments', (req, res) => {
  const db = readDB();
  const list = db.comments
    .filter(c => c.postId === req.params.id)
    .sort((a, b) => a.createdAt - b.createdAt);
  res.json({ items: list });
});

r.post('/comments', (req, res) => {
  const parsed = commentSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json(parsed.error.format());
  const db = readDB();
  const c = {
    id: nanoid(12),
    postId: parsed.data.postId,
    authorId: parsed.data.authorId,
    text: parsed.data.text,
    createdAt: Date.now(),
  };
  // ensure post exists
  if (!db.posts.find(p => p.id === c.postId)) return res.status(404).json({ error: 'post_not_found' });
  db.comments.push(c);
  writeDB(db);
  res.json(c);
});

export default r;
