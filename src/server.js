import { createServer } from 'node:http';
import { fileURLToPath } from 'node:url';
import { resolve } from 'node:path';
import { openStore } from './db.js';
import { fetchAnimalPicture } from './provider.js';

function sendJson(res, status, data) {
  res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8' });
  res.end(JSON.stringify(data));
}
async function readJson(req) {
  let body = '';
  for await (const chunk of req) {
    body += chunk;
    if (body.length > 10_000) {
      const error = new Error('Request body is too large');
      error.status = 413;
      throw error;
    }
  }
  try { return JSON.parse(body); }
  catch {
    const error = new Error('Send valid JSON');
    error.status = 400;
    throw error;
  }
}

export function createAnimalServer({
  store = openStore(process.env.DB_PATH || 'data/pictures.db'),
  fetchPicture = fetchAnimalPicture
} = {}) {
  const server = createServer(async (req, res) => {
    const path = new URL(req.url, 'http://localhost').pathname;
    try {
      if (req.method === 'GET' && path === '/health') {
        return sendJson(res, 200, { status: 'ok' });
      }
      if (req.method === 'POST' && path === '/api/pictures') {
        const input = await readJson(req);
        const { animal, count } = input ?? {};
        if (!['cat', 'dog', 'bear'].includes(animal) ||
            !Number.isInteger(count) || count < 1 || count > 10) {
          return sendJson(res, 400, { error: 'Use animal: cat, dog, or bear; count: 1 to 10' });
        }
        const downloaded = [];
        try {
          for (let i = 0; i < count; i++) downloaded.push(await fetchPicture(animal));
        } catch (error) {
          return sendJson(res, 502, { error: `Picture provider failed: ${error.message}` });
        }
        const ids = store.saveMany(animal, downloaded);
        return sendJson(res, 201, {
          animal, saved: ids.length,
          pictures: ids.map(id => ({ id, animal, imageUrl: `/api/pictures/${id}/image` }))
        });
      }
      const latest = path.match(/^\/api\/pictures\/(cat|dog|bear)\/latest$/);
      if (req.method === 'GET' && latest) {
        const picture = store.latest(latest[1]);
        if (!picture) return sendJson(res, 404, { error: `No saved ${latest[1]} picture yet` });
        return sendJson(res, 200, {
          id: picture.id, animal: picture.animal, createdAt: picture.created_at,
          imageUrl: `/api/pictures/${picture.id}/image`
        });
      }
      const image = path.match(/^\/api\/pictures\/([1-9]\d*)\/image$/);
      if (req.method === 'GET' && image) {
        const picture = store.byId(Number(image[1]));
        if (!picture) return sendJson(res, 404, { error: 'Picture not found' });
        res.writeHead(200, { 'Content-Type': picture.mime_type, 'X-Content-Type-Options': 'nosniff' });
        return res.end(picture.image);
      }
      return sendJson(res, 404, { error: 'Not found' });
    } catch (error) {
      console.error(error);
      if (!res.headersSent) sendJson(res, error.status || 500,
        { error: error.status ? error.message : 'Internal server error' });
    }
  });
  return { server, close: () => store.close() };
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const { server, close } = createAnimalServer();
  const port = Number(process.env.PORT || 3000);
  server.listen(port, '0.0.0.0', () => console.log(`Server running at http://localhost:${port}`));
  function shutdown() { server.close(() => { close(); process.exit(0); }); }
  process.once('SIGINT', shutdown);
  process.once('SIGTERM', shutdown);
}
