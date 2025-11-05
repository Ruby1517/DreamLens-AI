import { computeCountdownDays } from '../time';
import { sanitizeFileName } from '../file';

// Tiny inline tests — hook into vitest/jest in Day 2
const now = new Date('2025-10-02T00:00:00Z');
const in3 = new Date(now.getTime() + 3 * 86400000).toISOString();
if (computeCountdownDays(in3, now) !== 3) throw new Error('countdown should be 3');

if (sanitizeFileName(' my cat!!.png ') !== 'my_cat_.png') throw new Error('sanitize failed');