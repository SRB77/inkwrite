# InkWrite — Dev Log

---

## Server Setup

- Initialized `server/` folder, set up `package.json`
- Installed deps via `npm i` — express, pg, socket.io, cors, dotenv, jose, multer, @aws-sdk/client-s3, @google/genai
- Organized folder structure under `src/`

## Entry Point

- `server/index.js` — creates Express app + `http.Server`, CORS, JSON body parser (5 MB limit), static `/uploads` route, mounts `/api` router, calls `initSocket`, listens on PORT 5050

## Database (NeonDB + Schema)

- Created NeonDB project; created object storage bucket `inkwrite-uploads`
- Added connection string to `.env`
- `src/config/db.js` — pg Pool setup with transaction helper
- `src/db/schema.sql` — tables: `users`, `whiteboards`, `whiteboard_members`, `elements` + 4 indexes
- `src/db/init.js` — reads schema.sql and applies it to the DB

## Config

- `src/config/neonAuth.js` — verifies JWT / session token via Neon Auth JWKS
- `src/config/storage.js` — Neon Object Storage (S3-compatible): `putObject`, `deleteObject`, `keyFromUrl`; gracefully disabled when env vars are absent
- `src/config/uploads.js` — resolves local `uploads/` directory, creates it on startup (`UPLOAD_DIR`)

## Utilities

- `src/utils/ApiError.js` — custom error class with static helpers (`badRequest`, `notFound`, `forbidden`, …)
- `src/utils/asyncHandler.js` — wraps async route handlers so thrown errors reach Express error middleware
- `src/utils/resolveUser.js` — verifies token, upserts user into DB, returns user object
- `src/utils/fileCleanup.js` — `deleteUploadByUrl(src)`: deletes from Neon Object Storage or local `uploads/` depending on which is active

## Middleware