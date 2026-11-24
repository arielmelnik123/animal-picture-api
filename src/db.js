import { DatabaseSync } from 'node:sqlite';
import { mkdirSync } from 'node:fs';
import { dirname } from 'node:path';

export function openStore(path = 'data/pictures.db') {
  mkdirSync(dirname(path), { recursive: true });
  const db = new DatabaseSync(path);
  db.exec(`CREATE TABLE IF NOT EXISTS pictures (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    animal TEXT NOT NULL,
    image BLOB NOT NULL,
    mime_type TEXT NOT NULL,
    source_url TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  ); CREATE INDEX IF NOT EXISTS pictures_animal_id ON pictures (animal, id);`);
  const insert = db.prepare('INSERT INTO pictures (animal, image, mime_type, source_url) VALUES (?, ?, ?, ?)');
  const latest = db.prepare('SELECT * FROM pictures WHERE animal = ? ORDER BY id DESC LIMIT 1');
  const byId = db.prepare('SELECT * FROM pictures WHERE id = ?');
  return {
    saveMany(animal, pictures) {
      db.exec('BEGIN');
      try {
        const ids = pictures.map(({ image, mimeType, sourceUrl }) =>
          Number(insert.run(animal, image, mimeType, sourceUrl).lastInsertRowid));
        db.exec('COMMIT');
        return ids;
      } catch (error) {
        db.exec('ROLLBACK');
        throw error;
      }
    },
    latest(animal) { return latest.get(animal); },
    byId(id) { return byId.get(id); },
    close() { db.close(); }
  };
}
