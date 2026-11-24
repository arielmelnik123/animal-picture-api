# Animal picture API

A Node.js API that downloads cat, dog and bear pictures and saves them in SQLite. The images are stored in the database, so the latest saved picture can still be viewed if the image site is down.

Requires Node.js 24 or newer.

```sh
npm start
```

## API

- `GET /health` - health check
- `POST /api/pictures` - save pictures, for example `{"animal":"cat","count":2}` (count 1-10)
- `GET /api/pictures/cat/latest` - latest saved cat picture (also works with dog or bear)
- `GET /api/pictures/2/image` - image bytes for picture ID 2

The server uses port 3000 and creates `data/pictures.db` automatically.

## Tests

```sh
npm test
```

GitHub Actions also runs the tests and builds the Docker image on each push.

## Docker

```sh
docker build -t animal-app .
docker run -p 3000:3000 -v animal-app-data:/app/data animal-app
```
