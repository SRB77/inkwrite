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

- `src/config/neonAuth.js` — verifies Neon Auth JWT/session tokens when configured, otherwise verifies and signs local HS256 JWTs using `JWT_SECRET`
- `src/controllers/authController.js` — local-mode registration/login with scrypt password hashes and JWT session responses
- `src/routes/authRoutes.js` — local auth endpoints plus protected session restore endpoint
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

- `src/routes/index.js` — root `/api` router; mounts `/healthcheck`, `/auth`, `/users`, `/whiteboards`
- `src/routes/authRoutes.js` — `POST /auth/register`, `POST /auth/login` for local mode and protected `GET /auth/me`
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

- `src/socket/index.js` — `initSocket(httpServer)`: creates `Server`, token auth middleware via `resolveUserFromToken`, handles per-connection events:
  - `wb:join` — joins board room, broadcasts `presence:join`, emits `presence:sync` back
  - `wb:leave` — leaves room, broadcasts `presence:leave`
  - `presence:cursor` — forwards cursor `{x, y}` to room
  - `element:live` — forwards in-flight element state to room (no DB write)
  - `disconnecting` — broadcasts `presence:leave` to all joined rooms

---

## Frontend Setup

### Stack
- React 19 + Vite 8, ESM project (`"type": "module"`)
- Tailwind CSS v4 via `@tailwindcss/vite` plugin (no `tailwind.config.js` needed)
- Linter: `oxlint`

### Key Dependencies
| Package | Purpose |
|---|---|
| `@neondatabase/auth-ui` + `@neondatabase/neon-js` | Neon Auth UI + SDK |
| `react-router-dom` v7 | Client-side routing |
| `axios` | HTTP client for API calls |
| `socket.io-client` | Real-time connection to backend |
| `framer-motion` | Animations |
| `lucide-react` | Icon set |
| `react-hot-toast` | Toast notifications |
| `perfect-freehand` | Smooth freehand drawing stroke generation |

### Environment (`.env`)
- `VITE_API_URL` — backend REST API base (`http://localhost:5050/api`)
- `VITE_SOCKET_URL` — Socket.IO server (`http://localhost:5050`)
- `VITE_NEON_AUTH_URL` — Neon Auth endpoint (same as backend `NEON_AUTH_URL`)

---

## Frontend — Routing & Auth

### `src/App.jsx`
- `BrowserRouter` with `AuthProvider` and `NeonAuthGate` wrapping all routes
- Auth mode is runtime-switched: if `VITE_NEON_AUTH_URL` is set → Neon Auth routes (`/auth/:pathname`); else → custom `/login` and `/register`
- Routes: `/` (Landing), `/login`, `/register`, `/auth/:pathname`, `/dashboard`, `/board/:boardId`, `/404`
- `ProtectedRoute` redirects unauthenticated users to `/login`; `PublicOnlyRoute` redirects logged-in users to `/dashboard`

### `src/context/AuthContext.jsx`
- Two providers in one file — `NeonAuthProvider` (Neon Auth SDK session) and `LocalAuthProvider` (JWT in localStorage) — selected at module load based on `neonEnabled`
- Both expose `{ user, loading, login, register, logout }` via `useAuth()`
- Neon mode: refreshes token on mount + every 10 min, connects Socket.IO on user change
- Local mode: reads token from localStorage on mount, calls `/auth/me` to restore session

### `src/components/NeonAuthGate.jsx`
- Wraps app in `NeonAuthUIProvider` when Neon Auth is enabled (no-op wrapper otherwise)
- `NeonAuthPage` renders `<AuthView>` for all Neon auth screens (`/auth/sign-in`, `/auth/sign-up`, `/auth/sign-out`, etc.)

### `src/routes/ProtectedRoute.jsx`
- `ProtectedRoute` — shows `FullScreenSpinner` while loading, redirects to `/login` with `state.from` if unauthenticated
- `PublicOnlyRoute` — redirects authenticated users to `/dashboard`

---

## Frontend — API & Socket Layer

### `src/lib/api.js`
- Axios instance pointed at `VITE_API_URL`
- Request interceptor: attaches `Authorization: Bearer <token>` and `x-socket-id` header on every request
- Response interceptor: on 401 with Neon mode → auto-refreshes token and retries once; on 401 local mode → clears token and redirects to `/login`; normalises error messages
- Exports typed API groups:
  - `authApi` — `register`, `login`, `me`
  - `userApi` — `search`
  - `boardApi` — `list`, `create`, `get`, `update`, `remove`, `addMember`, `removeMember`
  - `uploadApi` — `image(boardId, blob, filename)`
  - `elementApi` — `create`, `bulkCreate`, `update`, `remove`
  - `aiApi` — `brainstorm`, `outline`, `diagram`, `chart`, `edit`, `summary`

### `src/lib/socket.js`
- Lazy singleton: creates `io` instance on first `getSocket()` call with `autoConnect: false`
- `connectSocket()` — refreshes Neon token if needed, sets auth token, connects
- `disconnectSocket()` — disconnects if connected
- `getSocketId()` — returns socket id for the `x-socket-id` header

### `src/lib/neonAuth.js`
- Neon Auth SDK wrapper: `createClient` with `BetterAuthReactAdapter`
- `refreshNeonToken()` — tries `authClient.token()` then falls back to `getSession()`, caches result
- `asTokenString()` — normalises various token shapes the SDK might return
- Exports: `neonEnabled`, `authClient`, `getNeonToken`, `clearNeonToken`, `neonSignIn`, `neonSignUp`, `neonSignOut`

---

## Frontend — Canvas Engine (`src/lib/`)

### `src/lib/canvas.js`
- Tool constants: `select`, `pan`, `text`, `sticky`, `rect`, `ellipse`, `diamond`, `line`, `arrow`, `draw`, `bullet`, `hand`, `eraser`
- Camera: `worldToScreen`, `screenToWorld`
- Freehand: `strokeToPath` — converts `perfect-freehand` output to SVG path string
- Geometry: `getBounds`, `unionBounds`, `translateData`, `resizeData`, `hitTest`, `boundsIntersectRect`, `diamondPoints`, `arrowHead`
- Style palettes: `STROKE_COLORS`, `FILL_COLORS`, `STICKY_COLORS`, `STROKE_WIDTHS`, `FONT_SIZES`

### `src/lib/sketch.js`
- Deterministic "hand-drawn" look using seeded random (FNV-1a hash + mulberry32 PRNG) — same element id always produces identical wobble
- Exports: `seededRandom`, `sketchLine`, `sketchPolygon`, `sketchRect`, `sketchEllipse`

### `src/lib/exportCanvas.js`
- `buildSvgString(elements, opts)` — renders all elements to a self-contained SVG string
- `exportSVG` / `exportPNG` — downloads the board as `.svg` or `.png` (PNG via canvas, capped at 8192 px)
- `inlineImages` — fetches remote image URLs and embeds them as data URIs before export
- `textSvg`, `elementSvg` — per-element SVG serializers (no foreignObject, renders cleanly outside a browser)

### `src/lib/image.js`
- `fileToDownscaledBlob(file, maxDim=1600)` — downscales large images before upload; preserves PNG transparency, converts everything else to JPEG
- `urlToDataURL(url)` — fetches a remote URL and returns a base64 data URI

### `src/lib/utils.js`
- `cn(...args)` — simple class name joiner
- `initials(name)` — extracts 1–2 letter initials
- `colorFromId(id)` — deterministic colour from a UUID (for avatars)
- `relativeTime(date)` — human-friendly relative timestamp

---

## Frontend — Components

### `src/components/board/Canvas.jsx`
Full interactive SVG canvas — the core of the whiteboard editor:
- Pointer handling: pan (middle button / space), move, marquee select, resize (8 handles), rotate, endpoint drag for lines, eraser
- Drawing: freehand (uses `perfect-freehand`), box/line drafts shown live before commit
- Keyboard: spacebar-pan
- Inline editing: `EditingOverlay` positioned over the SVG for text/sticky/bullet/shape labels
- Cursor throttle for live presence (45 ms)
- Rotation support on all non-line elements
- Prop contract: `persist.create`, `persist.update`, `persist.remove` for server writes; `emitLive` for in-flight socket updates; `emitCursor` for presence

### `src/components/board/ElementRenderer.jsx`
SVG renderer for all 12 element types: `rect`, `ellipse`, `diamond`, `line`, `arrow`, `draw`, `sticky`, `text`, `bullet`, `chart`, `image`, `emoji`; supports `sketch` mode (wobbly edges) on shapes via `seededRandom`

### `src/components/board/AIPanel.jsx`
Slide-in panel (framer-motion spring animation) with:
- Prompt textarea
- If elements are selected → "Edit N selected" button
- Items count slider (3–12)
- 2×2 grid of create buttons: Sticky notes, Outline, Flow diagram, Chart
- "Summarize this board" with collapsible result (headline, themes, action items, open questions)

### `src/components/board/ShareModal.jsx`
Member management modal: invite by email + role (editor/viewer), list current members sorted owner-first, remove members; owner-only controls; uses `Avatar` component

### `src/components/board/ChartElement.jsx` / `ChartEditor.jsx`
Chart rendering and in-place editing (file present, content not read yet)

### `src/components/board/EditingOverlay.jsx`
Positioned HTML overlay for inline text editing (file present, content not read yet)

### `src/components/BoardThumbnail.jsx`
Lazy-loaded SVG thumbnail for the dashboard board cards: intersection-observer triggers a `boardApi.get()` fetch; result cached by `boardId:updatedAt` key; renders via `ElementRenderer`

### `src/components/AuthLayout.jsx`
Two-column auth layout: branded left panel (desktop only) + centered form on the right; used by Login, Register, and `NeonAuthPage`

### `src/components/UserMenu.jsx` / `ui/` primitives
`UserMenu` — avatar + dropdown (file present). UI primitives: `Button`, `Input`/`Select`/`Textarea`, `Modal`, `Avatar`, `Spinner` / `FullScreenSpinner`

---

## Frontend — Pages

| Page | Status | Notes |
|---|---|---|
| `Landing.jsx` | ✅ Done | Hero, features grid, how-it-works, stats, testimonials, CTA |
| `Login.jsx` | ✅ Done | Email/password form via `AuthLayout`; redirects to `state.from` after login |
| `Register.jsx` | ✅ Done (not read) | Mirrors Login |
| `Dashboard.jsx` | ✅ Done | Board grid with `BoardThumbnail`, `CreateBoardModal`, delete with confirm |
| `NotFound.jsx` | ✅ Done (not read) | 404 page |
| `WhiteboardPage.jsx` | ✅ Done | Full protected editor with Canvas, TopBar, Toolbar, StylePanel, AIPanel, ShareModal, realtime presence, uploads, exports, charts, and undo/redo |

---

## Frontend — Current State & What's Left

**Done:**
- Full routing + auth (both Neon and local JWT modes)
- Complete API client with auto token refresh and retry
- Socket.IO client singleton wired to auth lifecycle
- Full canvas engine (geometry, tools, sketch, export)
- All 12 element types render correctly
- AI panel, share modal, dashboard, landing page fully built
- Export to SVG + PNG

**Remaining:**
- No known feature wiring remains from the original implementation log. Future work is product enhancement rather than completing the editor shell.

---

## Bug Fixes (resolved)

### Whiteboard routes crash on startup (`Route.patch() requires a callback`)
- **Cause:** `whiteboardAccess.js` exported `requiredEditAccess` (typo — extra `d`); routes imported `requireEditAccess` → destructured as `undefined` → Express crashed on `router.patch()`
- **Fix:** Renamed to `requireEditAccess` in both the declaration and the export

### Additional bugs fixed in the same pass
- `whiteboardRoutes.js`: duplicate `router.get("/")` for `createBoard` → `router.post("/")`
- `whiteboardRoutes.js`: `":boardId"` missing leading `/` → `"/:boardId"`
- `whiteboardController.js`: regex `/^#[0-9a-fA-F] {6}$/` had stray space → `/^#[0-9a-fA-F]{6}$/`
- `whiteboardController.js`: SQL table name `whiteboard members` (space) → `whiteboard_members` (3 occurrences)
- `whiteboardController.js` `createBoard`: `query()` called with no args; SQL string and params were floating dead expressions → fixed to proper `query(sql, params)` call

### Socket.IO crash (`Server is not defined`)
- **Cause:** `src/socket/index.js` imported `{ server }` (lowercase) from `socket.io`; correct export is `Server`
- **Fix:** `const { Server } = require("socket.io")`

### Upload middleware crash (`cb is not defined`)
- **Cause:** `src/middleware/upload.js` multer `fileFilter` had third param named `db` instead of `cb`; the body referenced `cb(...)` → `ReferenceError` on every upload
- **Fix:** Renamed param `db` → `cb`

### `touchBoard` silently broken (element writes don't update board `updated_at`)
- **Cause:** `src/controllers/elementController.js` SQL had typo `"UPDAE whiteboards..."` — pg would throw on every element create/update/delete
- **Fix:** `UPDAE` → `UPDATE`

### Schema default bg_color corrupt
- **Cause:** `src/db/schema.sql` had `DEFAULT '■#ffffff'` — stray `■` character before the hex value; new boards would persist an invalid color
- **Fix:** Removed the stray character → `DEFAULT '#ffffff'`

### AI and upload routes not mounted *(was already resolved in the codebase)*
- `whiteboardRoutes.js` already imports and mounts `aiController` (6 routes under `/:boardId/ai/`) and `uploadController` (under `/:boardId/uploads`) — no change needed

### Socket.IO crash (`socket is not defined`)
- **Cause:** `wb:leave`, `presence:cursor`, `element:live`, `disconnecting` handlers placed outside the `io.on("connection", socket => { ... })` callback — closing `});` was one block too early
- **Fix:** Moved closing `});` to after `disconnecting` handler, wrapping all per-socket listeners inside the connection callback

### Authentication mode mismatch and stale test route
- **Cause:** The client exposed local JWT calls (`/auth/register`, `/auth/login`, `/auth/me`) but the server did not mount those routes, while token verification only handled Neon Auth. `userRoutes.js` also contained an unrelated `/users/about` test endpoint.
- **Fix:** Added `src/controllers/authController.js` and `src/routes/authRoutes.js`; mounted `/api/auth`; implemented scrypt password hashing, local HS256 JWT issue/verify, login, registration, and session restore; added the idempotent `users.password_hash` schema migration; removed `/users/about`.

### Neon Auth configuration warning and documentation drift
- **Cause:** `neonAuth.js` logged that Neon Auth was missing when it was actually configured, and `log.md` described the now-complete `WhiteboardPage.jsx` as a stub.
- **Fix:** Corrected the configuration branch and synchronized `log.md` and `README.md` with the current editor and authentication behavior.

## Consistency pass — November 5, 2026

- Added working local JWT fallback without changing the Neon Auth production path.
- Added `JWT_SECRET` to `server/.env.example` and the setup documentation.
- Mounted the missing auth routes and removed the stray user test endpoint.
- Added an idempotent `password_hash` column migration for existing databases.
- Updated the API table, current-page status, architecture notes, and remaining-work section to match the source tree.

## Demo workspace — November 5, 2026

- Added `client/src/components/DemoAccessButton.jsx` — shared CTA on sign-in and sign-up screens that opens a fresh `/demo?session=...` route.
- Added `client/src/components/board/DemoBanner.jsx` — explains that demo work is temporary and links visitors to sign in.
- Added `client/src/pages/DemoWhiteboardPage.jsx` — client-only whiteboard with local element state, drawing tools, shapes, text, sticky notes, emoji, undo/redo, zoom, and PNG export.
- Updated `client/src/App.jsx` — added the public `/demo` route.
- Updated local and Neon Auth screens — added the demo CTA without changing authentication behavior.
- Demo mode intentionally does not call board APIs, open Socket.IO rooms, create database rows, or persist data in localStorage.
