import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import toast from "react-hot-toast";
import { ImagePlus } from "lucide-react";
import Canvas from "../components/board/Canvas";
import TopBar from "../components/board/TopBar";
import Toolbar from "../components/board/Toolbar";
import StylePanel from "../components/board/StylePanel";
import EmojiPicker from "../components/board/EmojiPicker";
import AIPanel from "../components/board/AIPanel";
import ShareModal from "../components/board/ShareModal";
import ChartEditor from "../components/board/ChartEditor";
import { defaultChartData } from "../components/board/ChartElement";
import { FullScreenSpinner } from "../components/ui/Spinner";
import { useAuth } from "../context/AuthContext";
import { useBoardRealtime } from "../hooks/useBoardRealtime";
import { boardApi, elementApi, uploadApi } from "../lib/api";
import { TOOLS, screenToWorld, translateData, unionBounds, worldToScreen } from "../lib/canvas";
import { exportPNG, exportSVG } from "../lib/exportCanvas";
import { fileToDownscaledBlob } from "../lib/image";
import { colorFromId } from "../lib/utils";

const MIN_ZOOM = 0.15;
const MAX_ZOOM = 5;
const HISTORY_LIMIT = 80;
const PASTE_OFFSET = 24;

const DEFAULT_STYLE = {
  stroke: "#16161d",
  color: "#16161d",
  fill: "transparent",
  strokeWidth: 4,
  fontSize: 24,
  sketch: false,
  bulletStyle: "disc",
};

const SHAPES = new Set(["rect", "ellipse", "diamond"]);
const STROKED = new Set([...SHAPES, "line", "arrow", "draw"]);
const FILLABLE = new Set([...SHAPES, "sticky"]);
const TEXTUAL = new Set(["text", "sticky", "bullet"]);

const TOOL_KEYS = {
  v: TOOLS.select,
  h: TOOLS.pan,
  t: TOOLS.text,
  g: TOOLS.hand,
  s: TOOLS.sticky,
  b: TOOLS.bullet,
  r: TOOLS.rect,
  o: TOOLS.ellipse,
  d: TOOLS.diamond,
  l: TOOLS.line,
  a: TOOLS.arrow,
  p: TOOLS.draw,
  e: TOOLS.eraser,
};

const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));
const byZ = (els) => [...els].sort((a, b) => (a.z ?? 0) - (b.z ?? 0));
const isTemp = (id) => typeof id === "string" && id.startsWith("tmp_");
const isTyping = (t) => t?.closest?.("input, textarea, select, [contenteditable='true']");
const hasImageFiles = (dt) => [...(dt?.items || [])].some((i) => i.kind === "file" && i.type.startsWith("image/"));
let tempSeq = 0;

// Only the style keys that make sense for this element type.
function stylePatchFor(el, patch) {
  const t = el.type;
  const out = {};
  if ("stroke" in patch && STROKED.has(t)) out.stroke = patch.stroke;
  if ("strokeWidth" in patch && STROKED.has(t)) out.strokeWidth = patch.strokeWidth;
  if ("fill" in patch && FILLABLE.has(t) && !(t === "sticky" && patch.fill === "transparent")) out.fill = patch.fill;
  if ("fontSize" in patch && TEXTUAL.has(t)) {
    out.fontSize = patch.fontSize;
    // Measured heights are stale at a new size; let getBounds re-estimate.
    if (t !== "sticky") out.h = undefined;
  }
  if ("color" in patch && (t === "text" || t === "bullet")) out.color = patch.color;
  if ("font" in patch && (TEXTUAL.has(t) || SHAPES.has(t))) out.font = patch.font === "hand" ? "hand" : undefined;
  if ("sketch" in patch && (SHAPES.has(t) || t === "line" || t === "arrow")) out.sketch = patch.sketch;
  if ("bulletStyle" in patch && t === "bullet") out.bulletStyle = patch.bulletStyle;
  return out;
}

function RemoteCursors({ cursors, camera }) {
  return (
    <div className="pointer-events-none absolute inset-0 z-20 overflow-hidden">
      {Object.entries(cursors).map(([id, c]) => {
        const p = worldToScreen(c.x, c.y, camera);
        const color = colorFromId(id);
        return (
          <div
            key={id}
            className="absolute top-0 left-0 transition-transform duration-75 ease-linear"
            style={{ transform: `translate(${p.x}px, ${p.y}px)` }}
          >
            <svg width="18" height="18" viewBox="0 0 18 18" className="drop-shadow-sm">
              <path d="M2 1.5 L15.5 9 L9.2 10.4 L6.4 16.5 Z" fill={color} stroke="#fff" strokeWidth="1.5" strokeLinejoin="round" />
            </svg>
            <span
              className="absolute top-4 left-3.5 rounded-full px-2 py-0.5 text-[11px] font-semibold whitespace-nowrap text-white shadow-[var(--shadow-card)]"
              style={{ backgroundColor: color }}
            >
              {c.name || "Guest"}
            </span>
          </div>
        );
      })}
    </div>
  );
}

export default function WhiteboardPage() {
  const { boardId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [board, setBoard] = useState(null);
  const [members, setMembers] = useState([]);
  const [elements, setElementsState] = useState([]);
  const [tool, setTool] = useState(TOOLS.select);
  const [style, setStyle] = useState(DEFAULT_STYLE);
  const [camera, setCamera] = useState({ x: 0, y: 0, zoom: 1 });
  const [selectedIds, setSelectedIds] = useState([]);
  const [editingId, setEditingId] = useState(null);
  const [aiOpen, setAiOpen] = useState(false);
  const [shareOpen, setShareOpen] = useState(false);
  const [editingChart, setEditingChart] = useState(null);
  const [dragOver, setDragOver] = useState(false);
  const [emojiOpen, setEmojiOpen] = useState(false);
  const [historyState, setHistoryState] = useState({ canUndo: false, canRedo: false });
  const fileInputRef = useRef(null);

  const role = board?.role;
  const canEdit = role === "owner" || role === "editor";
  const loading = !board || board.id !== boardId;

  /* ---------- Refs mirroring state, for stable handlers ---------- */

  const elementsRef = useRef(elements);
  const setElements = useCallback((updater) => {
    setElementsState((prev) => {
      const next = typeof updater === "function" ? updater(prev) : updater;
      elementsRef.current = next;
      return next;
    });
  }, []);

  const live = useRef({});
  useLayoutEffect(() => {
    live.current = { camera, selectedIds, editingId, members, canEdit };
  });

  const pending = useRef(new Map()); // tempId → Promise<server row>
  const history = useRef({ past: [], future: [] });
  const clipboard = useRef({ items: [], pastes: 0 });

  /* ---------- Load ---------- */

  useEffect(() => {
    let cancelled = false;
    history.current = { past: [], future: [] };
    boardApi
      .get(boardId)
      .then(({ board: b, elements: els, members: ms }) => {
        if (cancelled) return;
        const sorted = byZ(els);
        setElements(sorted);
        setMembers(ms);
        setSelectedIds([]);
        setEditingId(null);
        setHistoryState({ canUndo: false, canRedo: false });
        // Frame existing content in the viewport.
        const bounds = unionBounds(sorted);
        if (bounds) {
          const vw = window.innerWidth;
          const vh = window.innerHeight;
          const zoom = clamp(Math.min((vw * 0.8) / (bounds.w || 1), (vh * 0.7) / (bounds.h || 1)), MIN_ZOOM, 1);
          setCamera({ zoom, x: vw / 2 - (bounds.x + bounds.w / 2) * zoom, y: vh / 2 - (bounds.y + bounds.h / 2) * zoom });
        } else {
          setCamera({ x: 0, y: 0, zoom: 1 });
        }
        setBoard(b);
      })
      .catch((err) => {
        if (cancelled) return;
        toast.error(err.message);
        navigate("/dashboard", { replace: true });
      });
    return () => {
      cancelled = true;
    };
  }, [boardId, navigate, setElements]);

  /* ---------- Real-time ---------- */

  const { viewers, cursors, emitCursor, emitLive } = useBoardRealtime(boardId, {
    onElementCreated: (el) => setElements((prev) => (prev.some((e) => e.id === el.id) ? prev : byZ([...prev, el]))),
    onElementUpdated: (el) => {
      if (el.id === live.current.editingId) return;
      setElements((prev) => prev.map((e) => (e.id === el.id ? { ...e, ...el } : e)));
    },
    onElementDeleted: ({ id }) => {
      setElements((prev) => prev.filter((e) => e.id !== id));
      setSelectedIds((ids) => ids.filter((x) => x !== id));
    },
    onLive: (el) => {
      if (el.id === live.current.editingId) return;
      setElements((prev) => prev.map((e) => (e.id === el.id ? { ...e, data: el.data } : e)));
    },
    onBoardUpdated: (b) => setBoard((prev) => (prev ? { ...prev, ...b, role: prev.role } : prev)),
    onMemberAdded: (m) => setMembers((list) => [...list.filter((x) => x.id !== m.id), m]),
    onMemberRemoved: ({ userId }) => {
      const removed = live.current.members.find((m) => m.id === userId);
      setMembers((list) => list.filter((m) => m.id !== userId));
      // Server ids differ from auth ids, so recognise ourselves by email.
      if (removed && user?.email && removed.email?.toLowerCase() === user.email.toLowerCase()) {
        toast.error("You no longer have access to this whiteboard");
        navigate("/dashboard", { replace: true });
      }
    },
  });

  /* ---------- Persistence (optimistic) ---------- */

  const nextZ = useCallback(() => {
    const els = elementsRef.current;
    return els.length ? Math.max(...els.map((e) => e.z ?? 0)) + 1 : 1000;
  }, []);

  const resolveId = useCallback(async (id) => {
    if (!isTemp(id)) return id;
    const row = await pending.current.get(id)?.catch(() => null);
    return row?.id ?? null;
  }, []);

  const swapId = useCallback((oldId, newId) => {
    setSelectedIds((ids) => ids.map((x) => (x === oldId ? newId : x)));
    setEditingId((x) => (x === oldId ? newId : x));
    const remap = (snap) => snap.map((e) => (e.id === oldId ? { ...e, id: newId } : e));
    history.current.past = history.current.past.map(remap);
    history.current.future = history.current.future.map(remap);
  }, []);

  const create = useCallback(
    async (type, data, z = nextZ()) => {
      const tempId = `tmp_${++tempSeq}`;
      setElements((prev) => [...prev, { id: tempId, type, data, z }]);
      const request = elementApi.create(boardId, { type, data, z });
      pending.current.set(tempId, request);
      try {
        const row = await request;
        // Keep any local edits made while the request was in flight.
        setElements((prev) => prev.map((e) => (e.id === tempId ? { ...row, data: e.data } : e)));
        swapId(tempId, row.id);
        return row;
      } catch (err) {
        setElements((prev) => prev.filter((e) => e.id !== tempId));
        setSelectedIds((ids) => ids.filter((x) => x !== tempId));
        toast.error(err.message);
        return null;
      }
    },
    [boardId, nextZ, setElements, swapId],
  );

  const update = useCallback(
    async (id, patch) => {
      try {
        const realId = await resolveId(id);
        if (realId) await elementApi.update(boardId, realId, patch);
      } catch (err) {
        toast.error(err.message);
      }
    },
    [boardId, resolveId],
  );

  const remove = useCallback(
    async (id) => {
      setElements((prev) => prev.filter((e) => e.id !== id));
      setSelectedIds((ids) => ids.filter((x) => x !== id));
      try {
        const realId = await resolveId(id);
        if (realId) await elementApi.remove(boardId, realId);
      } catch (err) {
        toast.error(err.message);
      }
    },
    [boardId, resolveId, setElements],
  );

  const persist = useMemo(() => ({ create, update, remove }), [create, update, remove]);

  /* ---------- Undo / redo ---------- */

  const syncHistoryState = useCallback(() => {
    const { past, future } = history.current;
    setHistoryState({ canUndo: past.length > 0, canRedo: future.length > 0 });
  }, []);

  const checkpoint = useCallback(() => {
    const h = history.current;
    h.past.push(structuredClone(elementsRef.current));
    if (h.past.length > HISTORY_LIMIT) h.past.shift();
    h.future = [];
    syncHistoryState();
  }, [syncHistoryState]);

  // Restore a snapshot locally, then make the server match it.
  const restore = useCallback(
    (target) => {
      const current = elementsRef.current;
      const currentById = new Map(current.map((e) => [e.id, e]));
      const targetIds = new Set(target.map((e) => e.id));
      setElements(target);
      setSelectedIds((ids) => ids.filter((id) => targetIds.has(id)));
      setEditingId(null);

      for (const el of target) {
        const now = currentById.get(el.id);
        if (!now) {
          // Deleted since the snapshot: recreate (new server id) and remap.
          elementApi
            .create(boardId, { type: el.type, data: el.data, z: el.z })
            .then((row) => {
              setElements((prev) => prev.map((e) => (e.id === el.id ? { ...row, data: e.data } : e)));
              swapId(el.id, row.id);
            })
            .catch((err) => toast.error(err.message));
        } else if (JSON.stringify(now.data) !== JSON.stringify(el.data)) {
          update(el.id, { data: el.data });
        }
      }
      for (const el of current) {
        if (!targetIds.has(el.id)) {
          resolveId(el.id)
            .then((id) => id && elementApi.remove(boardId, id))
            .catch((err) => toast.error(err.message));
        }
      }
    },
    [boardId, resolveId, setElements, swapId, update],
  );

  const undo = useCallback(() => {
    const h = history.current;
    if (!h.past.length) return;
    h.future.push(structuredClone(elementsRef.current));
    restore(h.past.pop());
    syncHistoryState();
  }, [restore, syncHistoryState]);

  const redo = useCallback(() => {
    const h = history.current;
    if (!h.future.length) return;
    h.past.push(structuredClone(elementsRef.current));
    restore(h.future.pop());
    syncHistoryState();
  }, [restore, syncHistoryState]);

  /* ---------- Style ---------- */

  const applyStyle = useCallback(
    (patch) => {
      setStyle((s) => ({ ...s, ...patch }));
      const changes = new Map();
      for (const el of elementsRef.current) {
        if (!live.current.selectedIds.includes(el.id)) continue;
        const p = stylePatchFor(el, patch);
        if (Object.keys(p).length) changes.set(el.id, { ...el.data, ...p });
      }
      if (!changes.size) return;
      checkpoint();
      setElements((prev) => prev.map((e) => (changes.has(e.id) ? { ...e, data: changes.get(e.id) } : e)));
      for (const [id, data] of changes) update(id, { data });
    },
    [checkpoint, setElements, update],
  );

  /* ---------- Board meta ---------- */

  const rename = useCallback(
    (title) => {
      const next = title.trim();
      const prev = board?.title;
      if (!next || next === prev) return;
      setBoard((b) => ({ ...b, title: next }));
      boardApi.update(boardId, { title: next }).catch((err) => {
        toast.error(err.message);
        setBoard((b) => ({ ...b, title: prev }));
      });
    },
    [board?.title, boardId],
  );

  const updateBoardMeta = useCallback(
    (patch) => {
      const prev = board;
      setBoard((b) => ({ ...b, ...patch }));
      boardApi.update(boardId, patch).catch((err) => {
        toast.error(err.message);
        setBoard(prev);
      });
    },
    [board, boardId],
  );

  const onPreviewBgColor = useCallback((bg_color) => setBoard((b) => ({ ...b, bg_color })), []);

  /* ---------- Viewport helpers ---------- */

  const viewportCenter = useCallback(
    () => screenToWorld(window.innerWidth / 2, window.innerHeight / 2, live.current.camera),
    [],
  );

  const zoomBy = useCallback((factor) => {
    setCamera((cam) => {
      const zoom = clamp(cam.zoom * factor, MIN_ZOOM, MAX_ZOOM);
      const sx = window.innerWidth / 2;
      const sy = window.innerHeight / 2;
      const w = screenToWorld(sx, sy, cam);
      return { zoom, x: sx - w.x * zoom, y: sy - w.y * zoom };
    });
  }, []);

  /* ---------- Copy / paste / duplicate ---------- */

  const selectedElements = useCallback(
    () => elementsRef.current.filter((e) => live.current.selectedIds.includes(e.id)),
    [],
  );

  const createCopies = useCallback(
    async (items, offset) => {
      let z = nextZ();
      const rows = await Promise.all(items.map((el) => create(el.type, translateData(el, offset, offset), z++)));
      setSelectedIds(rows.filter(Boolean).map((r) => r.id));
    },
    [create, nextZ],
  );

  const copySelection = useCallback(() => {
    const items = selectedElements();
    if (!items.length) return;
    clipboard.current = { items: structuredClone(items), pastes: 0 };
  }, [selectedElements]);

  const pasteElements = useCallback(() => {
    const clip = clipboard.current;
    if (!clip.items.length) return;
    clip.pastes += 1;
    checkpoint();
    createCopies(clip.items, PASTE_OFFSET * clip.pastes);
  }, [checkpoint, createCopies]);

  const duplicate = useCallback(() => {
    const items = selectedElements();
    if (!items.length) return;
    checkpoint();
    createCopies(items, PASTE_OFFSET);
  }, [checkpoint, createCopies, selectedElements]);

  const deleteSelection = useCallback(() => {
    const ids = live.current.selectedIds;
    if (!ids.length) return;
    checkpoint();
    ids.forEach((id) => remove(id));
    setSelectedIds([]);
  }, [checkpoint, remove]);

  /* ---------- Media ---------- */

  const insertImageFile = useCallback(
    async (file, at) => {
      if (!file?.type?.startsWith("image/")) {
        toast.error("That file isn't an image");
        return;
      }
      const toastId = toast.loading("Uploading image…");
      try {
        const { blob, width, height, type } = await fileToDownscaledBlob(file);
        const { url, storageKey } = await uploadApi.image(
          boardId,
          blob,
          `image.${type === "image/png" ? "png" : "jpg"}`,
        );
        const scale = Math.min(1, 360 / Math.max(width, height));
        const w = Math.round(width * scale);
        const h = Math.round(height * scale);
        const c = at || viewportCenter();
        checkpoint();
        const row = await create("image", {
          x: c.x - w / 2,
          y: c.y - h / 2,
          w,
          h,
          src: url,
          storageKey,
        });
        if (row) setSelectedIds([row.id]);
        toast.success("Image added", { id: toastId });
      } catch (err) {
        toast.error(err.message, { id: toastId });
      }
    },
    [boardId, checkpoint, create, viewportCenter],
  );

  const insertChart = useCallback(
    async (chartType) => {
      const c = viewportCenter();
      checkpoint();
      const row = await create("chart", { x: c.x - 180, y: c.y - 120, w: 360, h: 240, ...defaultChartData(chartType) });
      if (row) {
        setTool(TOOLS.select);
        setSelectedIds([row.id]);
      }
    },
    [checkpoint, create, viewportCenter],
  );

  const insertEmoji = useCallback(
    async (emoji) => {
      const c = viewportCenter();
      const jitter = () => (Math.random() - 0.5) * 80;
      checkpoint();
      const row = await create("emoji", { x: c.x - 44 + jitter(), y: c.y - 44 + jitter(), w: 88, h: 88, emoji, rotation: 0 });
      if (row) setSelectedIds([row.id]);
    },
    [checkpoint, create, viewportCenter],
  );

  const getDropPoint = useCallback(() => {
    const c = viewportCenter();
    return { x: Math.round(c.x - 240), y: Math.round(c.y - 160) };
  }, [viewportCenter]);

  /* ---------- AI results ---------- */

  const onAIElementsCreated = useCallback(
    (els) => {
      checkpoint();
      setElements((prev) => byZ([...prev, ...els.filter((el) => !prev.some((e) => e.id === el.id))]));
      setSelectedIds(els.map((e) => e.id));
      setTool(TOOLS.select);
    },
    [checkpoint, setElements],
  );

  const onAIElementsUpdated = useCallback(
    (els) => {
      checkpoint();
      const byId = new Map(els.map((e) => [e.id, e]));
      setElements((prev) => prev.map((e) => (byId.has(e.id) ? { ...e, ...byId.get(e.id) } : e)));
    },
    [checkpoint, setElements],
  );

  /* ---------- Charts ---------- */

  const saveChart = useCallback(
    (patch) => {
      const el = editingChart;
      setEditingChart(null);
      if (!el) return;
      const current = elementsRef.current.find((e) => e.id === el.id);
      if (!current) return;
      const data = { ...current.data, ...patch };
      checkpoint();
      setElements((prev) => prev.map((e) => (e.id === el.id ? { ...e, data } : e)));
      update(el.id, { data });
    },
    [checkpoint, editingChart, setElements, update],
  );

  /* ---------- Export ---------- */

  const doExport = useCallback(
    async (format) => {
      const els = elementsRef.current;
      if (!els.length) {
        toast.error("Nothing to export yet");
        return;
      }
      const toastId = toast.loading(`Exporting ${format.toUpperCase()}…`);
      try {
        const opts = { background: board?.bg_color || "#ffffff" };
        if (format === "png") await exportPNG(els, board?.title, 2, opts);
        else await exportSVG(els, board?.title, opts);
        toast.success("Downloaded", { id: toastId });
      } catch (err) {
        toast.error(err.message, { id: toastId });
      }
    },
    [board],
  );

  /* ---------- Keyboard & clipboard ---------- */

  const actions = useRef({});
  useLayoutEffect(() => {
    actions.current = { undo, redo, deleteSelection, duplicate, copySelection, pasteElements, insertImageFile };
  });

  useEffect(() => {
    const onKeyDown = (e) => {
      if (isTyping(e.target)) return;
      const a = actions.current;
      const { canEdit: editable } = live.current;
      const mod = e.metaKey || e.ctrlKey;
      const key = e.key.toLowerCase();

      if (key === "escape") {
        setSelectedIds([]);
        setEditingId(null);
        setEmojiOpen(false);
        return;
      }
      if (mod && key === "a") {
        e.preventDefault();
        setSelectedIds(elementsRef.current.map((el) => el.id));
        return;
      }
      if (!editable) return;

      if (mod && key === "z") {
        e.preventDefault();
        if (e.shiftKey) a.redo();
        else a.undo();
      } else if (mod && key === "y") {
        e.preventDefault();
        a.redo();
      } else if (key === "delete" || key === "backspace") {
        e.preventDefault();
        a.deleteSelection();
      } else if (mod && key === "d") {
        e.preventDefault();
        a.duplicate();
      } else if (mod && key === "c") {
        a.copySelection();
      } else if (mod && key === "x") {
        a.copySelection();
        a.deleteSelection();
      } else if (!mod && !e.altKey && TOOL_KEYS[key]) {
        setTool(TOOL_KEYS[key]);
      }
    };

    const onPaste = (e) => {
      if (isTyping(e.target) || !live.current.canEdit) return;
      const image = [...(e.clipboardData?.files || [])].find((f) => f.type.startsWith("image/"));
      if (image) {
        e.preventDefault();
        actions.current.insertImageFile(image);
      } else if (clipboard.current.items.length) {
        e.preventDefault();
        actions.current.pasteElements();
      }
    };

    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("paste", onPaste);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("paste", onPaste);
    };
  }, []);

  /* ---------- Drag & drop ---------- */

  const dropHandlers = {
    onDragOver: (e) => {
      if (!canEdit || !hasImageFiles(e.dataTransfer)) return;
      e.preventDefault();
      e.dataTransfer.dropEffect = "copy";
      if (!dragOver) setDragOver(true);
    },
    onDragLeave: (e) => {
      if (!e.currentTarget.contains(e.relatedTarget)) setDragOver(false);
    },
    onDrop: (e) => {
      if (!canEdit) return;
      e.preventDefault();
      setDragOver(false);
      const files = [...e.dataTransfer.files].filter((f) => f.type.startsWith("image/"));
      const at = screenToWorld(e.clientX, e.clientY, camera);
      files.forEach((file, i) => insertImageFile(file, { x: at.x + i * PASTE_OFFSET, y: at.y + i * PASTE_OFFSET }));
    },
  };

  /* ---------- Render ---------- */

  const selectedEls = useMemo(() => elements.filter((e) => selectedIds.includes(e.id)), [elements, selectedIds]);

  if (loading) return <FullScreenSpinner label="Opening whiteboard..." />;

  return (
    <div className="fixed inset-0 overflow-hidden bg-white" {...dropHandlers}>
      <Canvas
        elements={elements}
        setElements={setElements}
        tool={tool}
        setTool={setTool}
        style={style}
        camera={camera}
        setCamera={setCamera}
        selectedIds={selectedIds}
        setSelectedIds={setSelectedIds}
        editingId={editingId}
        setEditingId={setEditingId}
        canEdit={canEdit}
        background={board.background}
        bgColor={board.bg_color}
        persist={persist}
        emitLive={emitLive}
        emitCursor={emitCursor}
        onRequestChartEdit={setEditingChart}
        onCheckpoint={checkpoint}
      />

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        hidden
        onChange={(e) => {
          const file = e.target.files?.[0];
          e.target.value = "";
          if (file) insertImageFile(file);
        }}
      />

      <RemoteCursors cursors={cursors} camera={camera} />

      {elements.length === 0 && (
        <div className="pointer-events-none absolute inset-0 grid place-items-center">
          <div className="animate-in text-center">
            <p className="font-display text-lg font-semibold text-ink/70">
              {canEdit ? "Your canvas is empty" : "This whiteboard is empty"}
            </p>
            {canEdit && (
              <p className="mt-1 text-sm text-faint">Pick a tool below and click anywhere — or ask the AI assistant ✨</p>
            )}
          </div>
        </div>
      )}

      <TopBar
        board={board}
        canEdit={canEdit}
        viewers={viewers}
        zoom={camera.zoom}
        canUndo={historyState.canUndo}
        canRedo={historyState.canRedo}
        onUndo={undo}
        onRedo={redo}
        onZoomIn={() => zoomBy(1.2)}
        onZoomOut={() => zoomBy(1 / 1.2)}
        onZoomReset={() => zoomBy(1 / camera.zoom)}
        onRename={rename}
        onBoardMeta={updateBoardMeta}
        onPreviewBgColor={onPreviewBgColor}
        onExport={doExport}
        onShare={() => setShareOpen(true)}
        aiOpen={aiOpen}
        onToggleAI={() => setAiOpen((o) => !o)}
      />

      {canEdit && (
        <>
          <Toolbar
            tool={tool}
            setTool={setTool}
            onImage={() => fileInputRef.current?.click()}
            onChart={insertChart}
            emojiOpen={emojiOpen}
            onEmojiToggle={() => setEmojiOpen((o) => !o)}
          />
          <EmojiPicker open={emojiOpen} onClose={() => setEmojiOpen(false)} onPick={insertEmoji} />
          <StylePanel style={style} tool={tool} selectedEls={editingId ? [] : selectedEls} onChange={applyStyle} />
          <AIPanel
            open={aiOpen}
            onClose={() => setAiOpen(false)}
            boardId={boardId}
            selectedIds={selectedIds}
            getDropPoint={getDropPoint}
            onElementsCreated={onAIElementsCreated}
            onElementsUpdated={onAIElementsUpdated}
          />
        </>
      )}

      <ShareModal
        open={shareOpen}
        onClose={() => setShareOpen(false)}
        boardId={boardId}
        members={members}
        setMembers={setMembers}
        ownerId={board.owner_id}
      />
      <ChartEditor open={Boolean(editingChart)} element={editingChart} onClose={() => setEditingChart(null)} onSave={saveChart} />

      {dragOver && (
        <div className="pointer-events-none absolute inset-3 z-50 grid place-items-center rounded-3xl border-2 border-dashed border-brand-400 bg-brand-50/70 backdrop-blur-[2px]">
          <div className="flex flex-col items-center gap-2 text-brand-700">
            <ImagePlus className="h-8 w-8" />
            <p className="font-display text-lg font-semibold">Drop images to add them to the board</p>
          </div>
        </div>
      )}
    </div>
  );
}
