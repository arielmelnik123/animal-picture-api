# Animal picture API

A small Node.js REST service for the Camunda technical challenge. It downloads cat, dog, or bear pictures and stores the **image bytes** in an SQLite database. It can return the most recently saved picture even when the image provider is unavailable.

## Requirements

- Node.js 24 or newer for the built-in `node:sqlite` module
- Docker Desktop only for the container option
- Internet access to fetch new images; saved images work offline

There are no third-party npm dependencies or frontend. Opening `http://localhost:3000/` returns `{"error":"Not found"}` because this is an API; use the endpoints below.

## Run on your computer

From the folder containing `package.json`:

```sh
npm run build
npm test
npm start
```

The server listens on `http://localhost:3000`. `data/pictures.db` is created automatically. Keep the terminal open while using the API. Stop with Ctrl+C. The database is excluded from Git.

## Quick test (Windows PowerShell)

Open a **second** PowerShell window in the project folder while the server is running:

```powershell
Invoke-RestMethod http://localhost:3000/health
$body = @{ animal = 'cat'; count = 2 } | ConvertTo-Json
Invoke-RestMethod -Uri http://localhost:3000/api/pictures -Method Post -ContentType 'application/json' -Body $body
Invoke-RestMethod http://localhost:3000/api/pictures/cat/latest
```

The POST response includes picture IDs. The latest response includes an `imageUrl`, such as `/api/pictures/2/image`. Open `http://localhost:3000/api/pictures/2/image` in your browser to see the saved image. Replace 2 with the returned ID. Try `dog` and `bear` too. Stop and restart the server, then request `/api/pictures/cat/latest` again to confirm persistence.

You can also send the POST in Postman using **Body → raw → JSON**:

```json
{"animal":"cat","count":2}
```

## Run with Docker

From this folder, with Docker Desktop running:

```sh
docker build -t animal-app .
docker run --name animal-app -p 3000:3000 -v animal-app-data:/app/data animal-app
```

Use the same URLs and PowerShell commands above. The named volume preserves the SQLite file across containers. To stop the container, press Ctrl+C. To rerun, use `docker start -a animal-app`. To recreate it, use `docker rm animal-app`, followed by the same `docker run` command; the named volume remains. Stop any local `npm start` process first so port 3000 is free.

## API

| Method | Path | Result |
| --- | --- | --- |
| GET | `/health` | `{"status":"ok"}` |
| POST | `/api/pictures` | Save 1–10 pictures; JSON body `{"animal":"cat","count":2}` |
| GET | `/api/pictures/:animal/latest` | JSON metadata and `imageUrl` for the latest saved picture |
| GET | `/api/pictures/:id/image` | Stored image bytes with their image Content-Type |

The supported animals are `cat`, `dog`, and `bear`. The POST returns 201 on success; invalid input returns 400, missing pictures 404, unavailable image providers 502. The service downloads the entire requested batch before inserting it, then commits all inserts in one SQLite transaction. A failed download or insert leaves no partial batch.

## Image sources and limits

The provider tries two public image sources for each animal. Cat: Placekitten, then Cataas; dog: Place.dog, then Placedog.net; bear: Placebear (two variations). These third-party services can change or become unavailable. Each image has an eight-second request timeout and a 3 MB size cap; the server accepts counts from 1 to 10. Images are stored in the database rather than only storing URLs.

`npm test` uses controlled image data and does not need the providers or internet. Docker execution still needs to be verified on a computer with Docker Desktop.
