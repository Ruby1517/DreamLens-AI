import fs from 'fs';
import path from 'path';

const DATA_DIR = path.join(process.cwd(), 'data');
const DB_FILE = path.join(DATA_DIR, 'db.json');

export type DB = {
  users: { id: string; createdAt: number }[];
  posts: {
    id: string;
    authorId: string;
    mediaUrl: string;
    caption?: string;
    createdAt: number;
    likes: string[];
  }[];
  comments: {
    id: string;
    postId: string;
    authorId: string;
    text: string;
    createdAt: number;
  }[];
};

function ensure() {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
  if (!fs.existsSync(DB_FILE)) {
    const initial: DB = { users: [], posts: [], comments: [] };
    fs.writeFileSync(DB_FILE, JSON.stringify(initial, null, 2));
  }
}

export function readDB(): DB {
  ensure();
  const raw = fs.readFileSync(DB_FILE, 'utf8');
  const parsed = JSON.parse(raw);
  // gently migrate older files
  if (!parsed.comments) parsed.comments = [];
  return parsed as DB;
}

export function writeDB(db: DB) {
  fs.writeFileSync(DB_FILE, JSON.stringify(db, null, 2));
}
