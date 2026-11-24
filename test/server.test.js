import test from 'node:test';
import assert from 'node:assert/strict';
import { once } from 'node:events';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createAnimalServer } from '../src/server.js';
import { openStore } from '../src/db.js';

const sampleImage = Buffer.from([0xff, 0xd8, 0xff, 0xd9]);
function setup(download = async () => ({
  image: sampleImage, mimeType: 'image/jpeg', sourceUrl: 'https://example.org/cat.jpg'
})) {
  const dir = mkdtempSync(join(tmpdir(), 'animal-app-'));
  const dbPath = join(dir, 'pictures.db');
  const store = openStore(dbPath);
  const { server, close } = createAnimalServer({ store, fetchPicture: download });
  return {
    dbPath,
    async start() {
      server.listen(0, '127.0.0.1');
      await once(server, 'listening');
      return `http://127.0.0.1:${server.address().port}`;
    },
    async stop() {
      await new Promise((resolve, reject) =>
        server.close(error => error ? reject(error) : resolve()));
      close();
    },
    cleanup() { rmSync(dir, { recursive: true, force: true }); }
  };
}
async function post(base, animal, count) {
  return fetch(base + '/api/pictures', {
    method: 'POST', headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ animal, count })
  });
}

test('saves a batch, returns the latest for the chosen animal, and serves image bytes after reopening SQLite', async () => {
  const app = setup();
  try {
    const base = await app.start();
    const saved = await post(base, 'cat', 2);
    assert.equal(saved.status, 201);
    const batch = await saved.json();
    assert.equal(batch.saved, 2);
    assert.equal(batch.pictures.length, 2);
    const latest = await (await fetch(base + '/api/pictures/cat/latest')).json();
    assert.equal(latest.id, batch.pictures[1].id);
    assert.equal(latest.animal, 'cat');
    const image = await fetch(base + latest.imageUrl);
    assert.equal(image.headers.get('content-type'), 'image/jpeg');
    assert.deepEqual(Buffer.from(await image.arrayBuffer()), sampleImage);
    await app.stop();
    const store = openStore(app.dbPath);
    assert.equal(store.latest('cat').id, latest.id);
    store.close();
  } finally { app.cleanup(); }
});

test('rejects bad input and does not save a partial batch after a provider failure', async () => {
  let calls = 0;
  const app = setup(async () => {
    if (++calls === 2) throw new Error('provider down');
    return { image: sampleImage, mimeType: 'image/jpeg', sourceUrl: 'https://example.org/cat.jpg' };
  });
  try {
    const base = await app.start();
    assert.equal((await post(base, 'lion', 1)).status, 400);
    assert.equal((await post(base, 'cat', 0)).status, 400);
    const failed = await post(base, 'cat', 2);
    assert.equal(failed.status, 502);
    const missing = await fetch(base + '/api/pictures/cat/latest');
    assert.equal(missing.status, 404);
    assert.equal((await fetch(base + '/health')).status, 200);
    await app.stop();
  } finally { app.cleanup(); }
});
