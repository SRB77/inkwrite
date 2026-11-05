<div align="center">

# 🖋️ InkWrite

### **Next-Generation AI Collaborative Whiteboard Engine**

*A high-performance, real-time multiplayer infinite canvas with generative AI co-pilot, deterministic hand-drawn styling, and enterprise-grade access control.*

[![React 19](https://img.shields.io/badge/React-19.3-61DAFB?style=for-the-badge&logo=react&logoColor=black)](https://react.dev/)
[![Vite](https://img.shields.io/badge/Vite-8.3-646CFF?style=for-the-badge&logo=vite&logoColor=white)](https://vitejs.dev/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-v4.3-38B2AC?style=for-the-badge&logo=tailwind-css&logoColor=white)](https://tailwindcss.com/)
[![Node.js](https://img.shields.io/badge/Node.js-20+-339933?style=for-the-badge&logo=nodedotjs&logoColor=white)](https://nodejs.org/)
[![Express](https://img.shields.io/badge/Express-4.21-000000?style=for-the-badge&logo=express&logoColor=white)](https://expressjs.com/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-Neon_Serverless-4169E1?style=for-the-badge&logo=postgresql&logoColor=white)](https://neon.tech/)
[![Socket.IO](https://img.shields.io/badge/Socket.IO-4.8-010101?style=for-the-badge&logo=socketdotio&logoColor=white)](https://socket.io/)
[![OpenRouter](https://img.shields.io/badge/AI_Engine-OpenRouter_/_Gemini-FF6F00?style=for-the-badge&logo=google&logoColor=white)](https://openrouter.ai/)

<br />

[Features](#-key-features) • [System Architecture](#-system-architecture--design) • [Engineering Highlights](#-engineering-deep-dives) • [Tech Stack](#-technology-matrix) • [Local Setup](#-local-setup--getting-started) • [API & Sockets](#-api--websocket-specification) • [Database Schema](#-database-schema)

---

</div>

## 📌 Executive Summary

**InkWrite** is a modern, production-grade collaborative whiteboard platform engineered for distributed product, design, and engineering teams. It bridges the fluidity of freeform diagramming tools (like Excalidraw or Miro) with context-aware Generative AI agents.

Rather than treating AI as an isolated chatbot, InkWrite integrates LLMs directly into the spatial canvas runtime: users can brainstorm sticky clusters, generate structured hierarchical outlines, synthesize topological flowcharts, construct interactive charts, and summarize entire boards with a single prompt.

Built from first principles, InkWrite features an in-house SVG rendering pipeline with deterministic seeded pseudo-random wobbly sketch styling, sub-50ms cursor presence over WebSockets, hybrid cloud/local S3 storage, and dual-mode authentication via Neon Auth JWKS and local JWT fallbacks.

---

## ⚡ Key Features

### 🎨 Infinite Canvas & Vector Engine
* **12 Element Primitives:** Native support for Rectangles, Ellipses, Diamonds, Lines, Arrows, Freehand Strokes (`perfect-freehand`), Sticky Notes, Plain Text, Rich Bullet Lists, Charts, Images, and Emojis.
* **Deterministic "Sketch" Mode:** Every element uses a seeded PRNG (`FNV-1a` hash + `Mulberry32`) so organic, hand-drawn edges remain pixel-consistent across all connected clients without transmitting vertex noise.
* **Spatial Operations:** Complete transformation engine supporting world-to-screen camera projection, multi-handle resizing, endpoint line snapping, rotation, and bounding-box hit detection.
* **Zero-Loss Vector Export:** Clean standalone SVG serializer (no `foreignObject` dependencies) with inline base64 image bundling and high-resolution raster PNG export up to 8192px.

### 🤖 Generative AI Co-Pilot
* **Intelligent Brainstorming:** Converts broad topics into color-coded, spatially clustered sticky note grids.
* **Topology-Aware Flowcharts:** Generates flowchart diagrams with intelligent node positioning, directional connections, and automatic layout topology.
* **Dynamic Chart Generation:** Synthesizes structured datasets into customizable visual elements (Bar, Line, Pie, and Donut charts) editable via an integrated chart inspector.
* **Board Summarization & Synthesis:** Scans all text, sticky notes, and bullets on the board to generate actionable recaps (key themes, action items, and open questions).
* **Selection-Aware Rewriting:** Contextually re-articulates, refines, or translates selected canvas elements in-place.
* **Model Failover & Resiliency:** Utilizes OpenRouter's API with an automated model fallback chain to prevent downtime during peak API demand.

### 🌐 Real-Time Multiplayer & Collaboration
* **Sub-50ms Presence:** Throttled (45ms) live cursor broadcasts with personalized user color badges and hover labels.
* **Ephemeral Live Previews:** In-flight transforms (moving, drafting, resizing) stream over WebSocket channels before committing to the database, ensuring instantaneous visual feedback.
* **Echo Suppression:** Automatic `x-socket-id` header injection on REST calls prevents self-echoing of client mutations.
* **Granular RBAC:** Multi-tenant access controls supporting `Owner`, `Editor`, and `Viewer` permission tiers.

### 🛡️ Enterprise Security & Storage
* **Dual Auth Runtime:** Seamless switching between Neon Auth (JWKS session tokens) and standalone JWT with automatic 401 retry loops.
* **Cloud & Edge Storage:** S3-compatible Neon Object Storage client with automated fallback to localized disk storage (`/uploads`).
* **Clean Garbage Collection:** Cascading deletion hooks remove cloud and disk image assets whenever element entities are destroyed.

---

## 🏛️ System Architecture & Design

```mermaid
flowchart TD
    subgraph Client["Frontend Client (React 19 + Vite 8)"]
        UI["UI Layer\n(Tailwind v4, Lucide, Framer)"]
        Canvas["Spatial Canvas Engine\n(SVG Renderer, Sketch PRNG)"]
        State["Client State & Socket Hook\n(Axios Interceptors, Socket.IO)"]
        UI --> Canvas
        Canvas --> State
    end

    subgraph Gateway["Server Gateway (Express 4.21)"]
        AuthMiddleware["Auth & JWKS Guard\n(Jose, Session Cache)"]
        RBAC["Board Access Guard\n(Owner / Editor / Viewer)"]
        APIRouter["REST API Router\n(/api/whiteboards, /api/users)"]
        SocketServer["Socket.IO Server\n(Presence & Live Drafts)"]
    end

    subgraph Services["Core Backend Services"]
        AIService["AI Engine\n(OpenRouter / Model Chain)"]
        StorageService["Storage Adapter\n(Neon S3 / Local Disk Fallback)"]
        DBPool["Postgres Pool\n(pg Pool with Transactions)"]
    end

    subgraph Data["Persistence & External Services"]
        NeonDB[("Neon PostgreSQL\n(Serverless DB)")]
        NeonAuth["Neon Auth JWKS\n(Identity Provider)"]
        OpenRouterAPI["LLM Provider\n(Gemini 2.0 / Nemotron)"]
        ObjectStore[("Object Storage\n(S3 / Disk)")]
    end

    %% Connections
    State -->|"HTTP REST Requests"| AuthMiddleware
    State <-->|"WebSocket Events (wb:join, cursor)"| SocketServer
    AuthMiddleware --> RBAC
    RBAC --> APIRouter
    APIRouter --> AIService
    APIRouter --> StorageService
    APIRouter --> DBPool
    
    AuthMiddleware -.->|"Verify Token"| NeonAuth
    AIService -->|"Prompt + Model Fallback"| OpenRouterAPI
    StorageService -->|"Put / Delete Blobs"| ObjectStore
    DBPool -->|"Parameterized Queries"| NeonDB
```

---

## 🔄 Real-Time State Synchronization Flow

InkWrite uses a **two-tier state model**:
1. **Ephemeral Layer (WebSocket):** In-flight movements, drafts, selections, and cursors bypass the database for near-zero latency.
2. **Persistent Layer (REST):** Completed drag/draw/edit actions are committed to PostgreSQL via REST with optimistic local updates.

```mermaid
sequenceDiagram
    autonumber
    actor UserA as User A (Editor)
    participant ClientA as Client A Runtime
    participant Socket as Socket.IO Hub
    participant API as Express API
    participant DB as Neon PostgreSQL
    actor UserB as User B (Viewer)
    participant ClientB as Client B Runtime

    Note over UserA, ClientB: Step 1: Real-Time Live Interaction (Ephemeral)
    UserA->>ClientA: Drags element / Moves cursor
    ClientA->>Socket: emit("presence:cursor", { x, y })
    ClientA->>Socket: emit("element:live", { element })
    Socket-->>ClientB: broadcast("presence:cursor")
    Socket-->>ClientB: broadcast("element:live")
    ClientB->>UserB: Renders ghost element & remote cursor

    Note over UserA, ClientB: Step 2: Persistence & Broad Synchronization
    UserA->>ClientA: Pointer Up (Finishes modification)
    ClientA->>API: PATCH /api/whiteboards/:id/elements/:elemId (with x-socket-id)
    API->>DB: UPDATE elements SET data = ... WHERE id = ...
    DB-->>API: 200 OK (Updated row)
    API->>Socket: emitToBoard("element:updated", element)
    Socket-->>ClientB: broadcast("element:updated")
    ClientB->>UserB: Commits permanent element render
```

---

## 🔬 Engineering Deep Dives

### 1. Why Pure SVG Over HTML5 Canvas or WebGL?
Many diagramming tools default to HTML5 Canvas or WebGL. InkWrite intentionally implements an SVG rendering model:
* **DOM Accessibility & Inspection:** Each shape resides in the SVG DOM, enabling effortless browser hit testing, high-DPI scaling across 4K/Retina displays, and crisp text rendering without blurry rasterization.
* **Clean Document Serialization:** Exporting to vector `.svg` requires zero canvas pixel extraction. The internal element state converts directly to XML, maintaining pristine vector quality when imported into Figma, Illustrator, or pen plotters.
* **Component-Driven Composability:** Elements are React subcomponents (`<ElementRenderer />`), allowing standard React lifecycle hooks, animation primitives (`framer-motion`), and declarative event listeners.

### 2. Deterministic Hand-Drawn "Sketch" Mathematics
To avoid transmitting bulky polygon geometry over WebSockets for hand-drawn shapes, InkWrite uses a deterministic PRNG:
```javascript
// Seeded PRNG: 32-bit FNV-1a Hash + Mulberry32 Generator
function seededRandom(seed) {
  let h = 2166136261 >>> 0;
  for (let i = 0; i < seed.length; i++) {
    h = Math.imul(h ^ seed.charCodeAt(i), 16777619);
  }
  return function () {
    h = Math.imul(h ^ (h >>> 15), h | 1);
    h ^= h + Math.imul(h ^ (h >>> 7), h | 61);
    return ((h ^ (h >>> 14)) >>> 0) / 4294967296;
  };
}
```
* Every shape derives its jitter from its immutable `element.id`.
* The server and all receiving peers generate the **exact same organic jitter** without broadcasting thousands of SVG path segments over the wire.

### 3. Model Chaining & Fault-Tolerant AI Engine
Free-tier and frontier LLM endpoints encounter transient rate limits (`HTTP 429`) or saturation. InkWrite solves this via automated model fallback chaining:
* If the primary model fails, the request automatically cascades through fallback models (e.g., `google/gemma` -> `nvidia/nemotron`).
* The extraction layer dynamically strips markdown code fences (` ```json `), locating balanced brackets via linear scan to handle conversational prefixes gracefully.

---

## 🗄️ Database Schema

The database is built on PostgreSQL with strict relational foreign keys and composite indexing for high-frequency queries:

```mermaid
erDiagram
    USERS ||--o{ WHITEBOARDS : "owns"
    USERS ||--o{ WHITEBOARD_MEMBERS : "participates"
    WHITEBOARDS ||--o{ WHITEBOARD_MEMBERS : "has"
    WHITEBOARDS ||--o{ ELEMENTS : "contains"

    USERS {
        uuid id PK
        text email UK
        text name
        text avatar_url
        timestamptz created_at
        timestamptz updated_at
    }

    WHITEBOARDS {
        uuid id PK
        text title
        text description
        text background
        text bg_color
        uuid owner_id FK
        timestamptz created_at
        timestamptz updated_at
    }

    WHITEBOARD_MEMBERS {
        uuid whiteboard_id PK,FK
        uuid user_id PK,FK
        text role "owner | editor | viewer"
        timestamptz joined_at
    }

    ELEMENTS {
        uuid id PK
        uuid whiteboard_id FK
        text type "rect|ellipse|draw|sticky|..."
        jsonb data
        integer z_index
        uuid created_by FK
        timestamptz created_at
        timestamptz updated_at
    }
```

---

## 💻 Technology Matrix

| Category | Technology | Version | Key Architectural Responsibility |
|---|---|---|---|
| **Frontend Framework** | **React** | `v19.3` | Reactive UI, concurrent rendering, spatial state hooks |
| **Build Tooling** | **Vite** | `v8.3` | Instant HMR, ESM bundling, Oxlint linter integration |
| **Styling** | **Tailwind CSS** | `v4.3` | Atomic CSS with `@tailwindcss/vite` plugin |
| **Animation** | **Framer Motion** | `v14.7` | Smooth layout transitions & spring-animated AI drawer |
| **Stroke Generation** | **Perfect Freehand** | `v1.2` | Pressure-sensitive, organic pen & brush stroke outlines |
| **Backend Runtime** | **Node.js** | `>=20.0` | Asynchronous I/O event loop |
| **Web Server** | **Express** | `v4.21` | HTTP routing, JSON payload parsing, static routes |
| **Realtime Engine** | **Socket.IO** | `v4.8` | Room-based WebSockets, presence multiplexing |
| **Database** | **PostgreSQL (Neon)** | `v16.0` | Relational storage, connection pooler, JSONB indexing |
| **Object Storage** | **AWS S3 SDK** | `v3.11` | S3-compatible blob storage with local directory fallback |
| **AI Integration** | **OpenRouter API** | — | LLM inference, schema-enforced generation, model failover |

---

## 📁 Repository Structure

```text
inkwrite/
├── client/                        # Frontend Single Page Application
│   ├── public/                    # Static vector icons and favicon assets
│   ├── src/
│   │   ├── assets/                # Visual branding and hero illustrations
│   │   ├── components/            # UI Components
│   │   │   ├── board/             # Canvas, Toolbar, AIPanel, ElementRenderer, StylePanel
│   │   │   ├── ui/                # Base primitives (Button, Modal, Input, Avatar, Spinner)
│   │   │   ├── AuthLayout.jsx     # Split-screen responsive authentication template
│   │   │   ├── BoardThumbnail.jsx # Lazy-loaded cached SVG canvas preview
│   │   │   └── NeonAuthGate.jsx   # Dynamic Neon Auth SDK provider
│   │   ├── context/               # AuthContext (Neon session & local JWT provider)
│   │   ├── hooks/                 # useBoardRealtime (WebSocket room lifecycle hook)
│   │   ├── lib/                   # Spatial canvas math, sketch PRNG, API client, export
│   │   ├── pages/                 # Landing, Login, Register, Dashboard, WhiteboardPage
│   │   ├── routes/                # ProtectedRoute & PublicOnlyRoute wrappers
│   │   ├── App.jsx                # Route hierarchy and context providers
│   │   └── main.jsx               # React DOM entrypoint
│   ├── package.json
│   └── vite.config.js
│
├── server/                        # Backend REST & WebSocket Server
│   ├── src/
│   │   ├── config/                # Postgres pool, Neon Auth JWKS, S3 storage, uploads
│   │   ├── controllers/           # Whiteboard, element, user, upload, and AI controllers
│   │   ├── db/                    # schema.sql and init.js database bootstrap
│   │   ├── middleware/            # requireAuth, requireBoardAccess, errorHandler, upload
│   │   ├── realtime/              # Decoupled Socket.IO emitter interface
│   │   ├── routes/                # Modular Express routers
│   │   ├── services/              # OpenRouter AI client with fallback model chains
│   │   ├── socket/                # Connection events, presence tracking, cursor sync
│   │   └── utils/                 # ApiError class, asyncHandler, resolveUser, fileCleanup
│   ├── index.js                   # Server entrypoint (Express + HTTP + Socket.IO)
│   └── package.json
│
├── log.md                         # Detailed incremental development & architectural log
├── .gitignore                     # Repository-level ignore rules
└── README.md                      # Comprehensive project documentation
```

---

## 🚀 Local Setup & Getting Started

### 📋 Prerequisites
Make sure you have the following installed on your machine:
* **Node.js** `>= 20.0.0`
* **npm** `>= 9.0.0`
* A running **PostgreSQL** database (or a free [Neon](https://neon.tech) cloud database)
* An [OpenRouter](https://openrouter.ai/) API key for AI features

---

### 1. Clone the Repository
```bash
git clone https://github.com/SRB77/inkwrite.git
cd inkwrite
```

---

### 2. Configure Backend Environment
Navigate to the `server/` directory and configure `.env`:
```bash
cd server
cp .env.example .env   # Or create server/.env manually
```

Add your environment variables to [server/.env](file:///Users/soumyaranjan/Desktop/projects/inkwrite/server/.env):
```env
PORT=5050
NODE_ENV=development
CLIENT_URL=http://localhost:5173

# PostgreSQL / Neon Database URL
DATABASE_URL=postgresql://user:password@localhost:5432/inkwrite?sslmode=require

# Neon Auth (Optional - leave empty for standalone local JWT mode)
NEON_AUTH_URL=

# Local JWT fallback (required when NEON_AUTH_URL is empty in deployed environments)
JWT_SECRET=replace-with-a-long-random-secret

# Neon Object Storage / S3 (Optional - falls back to local /uploads directory)
NEON_STORAGE_ENDPOINT=
NEON_STORAGE_ACCESS_KEY_ID=
NEON_STORAGE_SECRET_ACCESS_KEY=
NEON_STORAGE_REGION=ap-southeast-1
NEON_STORAGE_BUCKET=inkwrite-uploads

# AI Engine (OpenRouter)
OPENROUTER_API_KEY=your_openrouter_api_key_here
OPENROUTER_MODEL=google/gemma-2-9b-it:free
OPENROUTER_FALLBACK_MODELS=nvidia/nemotron-3-ultra-550b-a55b:free,meta-llama/llama-3.3-70b-instruct:free
```

Initialize the database schema:
```bash
npm install
npm run db:init
```

Start the backend server in development mode:
```bash
npm run dev
# Server running on http://localhost:5050
```

---

### 3. Configure Frontend Environment
In a new terminal window, navigate to the `client/` directory:
```bash
cd client
cp .env.example .env   # Or create client/.env manually
```

Add your environment variables to [client/.env](file:///Users/soumyaranjan/Desktop/projects/inkwrite/client/.env):
```env
# Backend API & WebSocket URLs
VITE_API_URL=http://localhost:5050/api
VITE_SOCKET_URL=http://localhost:5050

# Neon Auth URL (Optional - matches backend NEON_AUTH_URL if enabled)
VITE_NEON_AUTH_URL=
```

Install client dependencies and start the Vite dev server:
```bash
npm install
npm run dev
# Frontend running on http://localhost:5173
```

### Start both client and server together

From the repository root, run:

```bash
npm run start
```

This starts the backend development server on `http://localhost:5050` and the Vite frontend on `http://localhost:5173`. If either port is already in use by an InkWrite process, the launcher reuses that running service instead of starting a duplicate. Press `Ctrl+C` once to stop processes started by the launcher.

> [!TIP]
> Open `http://localhost:5173` in your browser. Open a secondary incognito window to test live multi-user cursors and instant collaborative edits in real time!

---

## 📡 API & WebSocket Specification

### 🔌 REST API Endpoints

| Method | Endpoint | Access | Description |
|---|---|---|---|
| `GET` | `/api/healthcheck` | Public | API process health status |
| `POST` | `/api/auth/register` | Public (local mode) | Create a local JWT account |
| `POST` | `/api/auth/login` | Public (local mode) | Sign in with local JWT credentials |
| `GET` | `/api/auth/me` | Protected | Restore the current local-auth session |
| `GET` | `/api/users/search?q=...` | Protected | Search users by name or email |
| `GET` | `/api/whiteboards` | Protected | List whiteboards accessible to current user |
| `POST` | `/api/whiteboards` | Protected | Create a new whiteboard |
| `GET` | `/api/whiteboards/:id` | Member | Retrieve whiteboard metadata, elements, and members |
| `PATCH` | `/api/whiteboards/:id` | Owner/Editor | Update whiteboard properties (title, background, color) |
| `DELETE` | `/api/whiteboards/:id` | Owner | Delete whiteboard and all associated assets |
| `POST` | `/api/whiteboards/:id/members` | Owner | Add member with `editor` or `viewer` role |
| `DELETE` | `/api/whiteboards/:id/members/:userId` | Owner | Remove member from whiteboard |
| `POST` | `/api/whiteboards/:id/elements` | Owner/Editor | Create a new canvas element |
| `POST` | `/api/whiteboards/:id/elements/bulk` | Owner/Editor | Bulk create multiple elements (paste / AI) |
| `PATCH` | `/api/whiteboards/:id/elements/:elemId` | Owner/Editor | Update element geometry or attributes |
| `DELETE` | `/api/whiteboards/:id/elements/:elemId` | Owner/Editor | Delete element (triggers storage cleanup) |
| `POST` | `/api/whiteboards/:id/uploads` | Owner/Editor | Upload image file (supports S3 & local fallback) |
| `POST` | `/api/whiteboards/:id/ai/brainstorm` | Owner/Editor | Generate sticky note ideation clusters |
| `POST` | `/api/whiteboards/:id/ai/diagram` | Owner/Editor | Synthesize topological flowchart diagram |
| `POST` | `/api/whiteboards/:id/ai/chart` | Owner/Editor | Generate structured chart data element |
| `POST` | `/api/whiteboards/:id/ai/summary` | Member | Analyze all board content and return executive summary |

---

### ⚡ WebSocket Events (Socket.IO)

```text
Client ──► Server
  wb:join           { boardId }                Join a whiteboard room
  wb:leave          { boardId }                Leave a whiteboard room
  presence:cursor   { boardId, x, y }          Broadcast local cursor coordinates
  element:live      { boardId, element }       Stream in-flight shape adjustments

Server ──► Client
  presence:sync     [ { userId, name, x, y } ] Sync existing room peers on join
  presence:join     { user }                   Notify room that a collaborator joined
  presence:leave    { userId }                 Notify room that a collaborator left
  presence:cursor   { userId, x, y }           Update collaborator cursor position
  element:live      { element, by }            Receive in-flight live preview
  element:created   { element }                New element committed to database
  element:updated   { element }                Existing element updated in database
  element:deleted   { id }                     Element deleted from database
```

---

## 🛡️ Reliability & Security Highlights

> [!IMPORTANT]
> **Defensive Engineering Standards Applied:**
> * **Zero SQL Injections:** All database queries utilize strict parameterized placeholders (`$1, $2, ...`).
> * **Zero Untracked Secrets:** Local credentials and keys are strictly excluded from git tracking via repository root and package `.gitignore` boundaries.
> * **Payload Quotas:** Express JSON body parser strictly capped at `5MB`; multer file upload memory buffer capped at `8MB` with MIME-type image verification.
> * **Decoupled Architecture:** Socket.IO instance logic is decoupled from route controllers via an abstraction helper (`src/realtime/index.js`), preserving clean unit testability.

---

## 🗺️ Roadmap & Future Enhancements

- [x] Multi-user realtime cursor presence and element synchronization
- [x] Generative AI brainstorming, flowchart diagramming, and summarization
- [x] Seeded PRNG deterministic organic sketch styling
- [x] Zero-loss standalone SVG & PNG canvas export
- [ ] Multi-level Undo / Redo command pattern stack (`Ctrl+Z` / `Ctrl+Shift+Z`)
- [ ] Export to interactive HTML and printable multi-page PDF documents
- [ ] Yjs / Automerge CRDT integration for offline-first conflict-free p2p editing
- [ ] Audio/Video collaboration rooms with WebRTC mesh calling

### Implementation consistency notes

- `WhiteboardPage.jsx` is fully implemented and is the protected editor route; older development notes describing it as a stub are historical and have been corrected in `log.md`.
- When `NEON_AUTH_URL` is configured, Neon Auth is used for sign-in and token verification.
- When `NEON_AUTH_URL` is empty, `/api/auth/register`, `/api/auth/login`, and `/api/auth/me` provide the standalone local JWT fallback. Set a strong `JWT_SECRET` outside development.
- The local fallback stores scrypt password hashes in `users.password_hash`; existing databases receive this column through the idempotent schema migration.
- `/demo` provides a client-only guest canvas for recruiters and first-time visitors. Demo changes are temporary and do not use database persistence, Socket.IO, AI, sharing, or uploads.

---

## 👨‍💻 Author

**Soumya Ranjan Behera**  
* GitHub: [@SRB77](https://github.com/SRB77)
* Email: [soumyach144@gmail.com](mailto:soumyach144@gmail.com)

---

<div align="center">
  <sub>Built with ❤️ using React 19, Vite, Tailwind CSS, Node.js, Neon PostgreSQL, and Socket.IO.</sub>
</div>
