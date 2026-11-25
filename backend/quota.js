import { DatabaseSync } from 'node:sqlite';
import { mkdirSync } from 'node:fs';
import { dirname } from 'node:path';

export function createQuota(path, dailyLimit) {
  if (!Number.isSafeInteger(dailyLimit) || dailyLimit < 0) throw new Error('Invalid AI daily request limit');
  if (path !== ':memory:') mkdirSync(dirname(path), { recursive: true });
  const db = new DatabaseSync(path);
  db.exec('PRAGMA busy_timeout=3000; CREATE TABLE IF NOT EXISTS quota (bucket TEXT PRIMARY KEY, used INTEGER NOT NULL, expires INTEGER NOT NULL)');
  const reserve = db.prepare('INSERT INTO quota VALUES (?,1,?) ON CONFLICT(bucket) DO UPDATE SET used=used+1 WHERE used < ?');
  const prune = db.prepare('DELETE FROM quota WHERE expires <= ?');
  return (userId, now = Date.now()) => {
    if (dailyLimit === 0) return false;
    const hour = Math.floor(now / 3600000);
    const day = Math.floor(hour / 24);
    db.exec('BEGIN IMMEDIATE');
    try {
      prune.run(now);
      const user = reserve.run(userId + ':' + hour, (hour + 1) * 3600000, 10);
      const global = reserve.run('global:' + day, (day + 1) * 86400000, dailyLimit);
      const ok = Boolean(user.changes && global.changes);
      db.exec(ok ? 'COMMIT' : 'ROLLBACK');
      return ok;
    } catch (error) {
      db.exec('ROLLBACK');
      throw error;
    }
  };
}
