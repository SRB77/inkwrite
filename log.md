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

- `src/middleware/errorHandler.js` — global Express error handler + 404 handler
- `src/middleware/auth.js` — `requireAuth`: extracts Bearer token, calls `resolveUser`, attaches `req.user`
- `src/middleware/whiteboardAccess.js` — `requireBoardAccess`: verifies owner/member, attaches `req.board`; `requireEditAccess`: blocks viewer-role from mutations
- `src/middleware/upload.js` — multer middleware (`uploadImage`): memory storage, image-only filter, 8 MB limit
- `src/realtime/index.js` — thin wrapper: `setIo`, `emitToBoard`, `boardRoom` — keeps Socket.IO instance decoupled from controllers

## Routes

- `src/routes/index.js` — root `/api` router; mounts `/healthcheck`, `/users`, `/whiteboards`
- `src/routes/userRoutes.js` — `GET /users/search` (protected)
- `src/routes/whiteboardRoutes.js` — full board CRUD + member management + element CRUD (all protected by `requireAuth`):
  - `GET /whiteboards` — list boards
  - `POST /whiteboards` — create board
  - `GET /whiteboards/:boardId` — get board + elements + members
  - `PATCH /whiteboards/:boardId` — update board metadata
  - `DELETE /whiteboards/:boardId` — delete board
  - `POST /whiteboards/:boardId/members` — add member
  - `DELETE /whiteboards/:boardId/members/:userId` — remove member
  - `POST /whiteboards/:boardId/elements` — create element
  - `POST /whiteboards/:boardId/elements/bulk` — bulk create elements
  - `PATCH /whiteboards/:boardId/elements/:elementId` — update element
  - `DELETE /whiteboards/:boardId/elements/:elementId` — delete element (cleans up image uploads)

## Controllers

- `src/controllers/userController.js` — `searchUsers`: ILIKE search by name/email
- `src/controllers/whiteboardController.js` — `listBoards`, `createBoard`, `getBoard`, `updateBoard`, `deleteBoard`, `addMember`, `removeMember`
- `src/controllers/elementController.js` — `createElement`, `bulkCreate`, `updateElement`, `deleteElement`; calls `deleteUploadByUrl` on image element deletion
- `src/controllers/uploadController.js` — `uploadImage`: accepts multipart upload, stores to Neon Object Storage if configured, else saves to local `uploads/`; returns `{ url, filename, size }`
- `src/controllers/aiController.js` — AI-powered board actions (all persist elements via shared `persistElements` helper, emit `element:created`):
  - `brainstorm` — generates sticky notes from a topic via Gemini
  - `outline` — generates a titled bullet-point outline
  - `diagram` — generates a flowchart (nodes + arrows) with topology-aware layout
  - `chart` — generates a bar/line/pie/donut chart element
  - `editSelection` — rewrites text/bullet/chart content for selected elements
  - `summary` — summarizes all text on the board (headline, themes, action items, open questions)

## AI Service

- `src/services/aiService.js` — Gemini (`gemini-2.0-flash` default) wrapper:
  - `runPrompt` — calls Gemini API, maps 429/401/403 to typed `ApiError`
  - `extractJson` — strips fenced code blocks, parses first JSON object/array from response
  - Exports: `brainstormNotes`, `generateOutline`, `generateDiagram`, `generateChart`, `editElements`, `editChart`, `summarizeBoard`

## Socket.IO