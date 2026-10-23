import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import ElementRenderer from "./ElementRenderer";
import EditingOverlay from "./EditingOverlay";
import {
  TOOLS,
  boundsIntersectRect,
  getBounds,
  hitTest,
  resizeData,
  screenToWorld,
  strokeToPath,
  translateData,
  unionBounds,
} from "../../lib/canvas";

/*
 * persist contract (supplied by the board page):
 *   create(type, data) → the new element (or a Promise of it); adds it to state and saves it
 *   update(id, patch)  → saves the patch; local state is already updated by the canvas
 *   remove(id)         → removes it from state and from the server
 */

const MIN_ZOOM = 0.15;
const MAX_ZOOM = 5;
const MIN_SIZE = 8;
const CURSOR_THROTTLE_MS = 45;
const DRAG_THRESHOLD = 3;
const BRAND = "#2f8159";
const INK = "#16161d";

const EDITABLE = new Set(["text", "sticky", "bullet", "rect", "ellipse", "diamond"]);
const LINES = new Set(["line", "arrow"]);

const HANDLE_CURSORS = {
  nw: "nwse-resize",
  se: "nwse-resize",
  ne: "nesw-resize",
  sw: "nesw-resize",
  n: "ns-resize",
  s: "ns-resize",
  e: "ew-resize",
  w: "ew-resize",
  rotate: "grab",
  p1: "move",
  p2: "move",
};
const TOOL_CURSORS = { [TOOLS.pan]: "grab", [TOOLS.select]: "default", [TOOLS.eraser]: "cell" };

const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));
const centerOf = (b) => ({ x: b.x + b.w / 2, y: b.y + b.h / 2 });
const normRect = (a, b) => ({ x: Math.min(a.x, b.x), y: Math.min(a.y, b.y), w: Math.abs(b.x - a.x), h: Math.abs(b.y - a.y) });

function rotatePoint(x, y, cx, cy, deg) {
  if (!deg) return { x, y };
  const r = (deg * Math.PI) / 180;
  const cos = Math.cos(r);
  const sin = Math.sin(r);
  const dx = x - cx;
  const dy = y - cy;
  return { x: cx + dx * cos - dy * sin, y: cy + dx * sin + dy * cos };
}

// Hit-test in the element's own (unrotated) frame.
function hitElement(el, wx, wy, tol) {
  const rotation = el.data?.rotation;
  if (!rotation) return hitTest(el, wx, wy, tol);
  const c = centerOf(getBounds(el));
  const p = rotatePoint(wx, wy, c.x, c.y, -rotation);
  return hitTest(el, p.x, p.y, tol);
}

// Moves the dragged edges by the pointer delta, so grabbing a handle never jumps.
function resizeBox(b0, dir, dx, dy) {
  let { x, y, w, h } = b0;
  const right = x + w;
  const bottom = y + h;
  if (dir.includes("w")) {
    x = Math.min(b0.x + dx, right - MIN_SIZE);
    w = right - x;
  }
  if (dir.includes("e")) w = Math.max(MIN_SIZE, b0.w + dx);
  if (dir.includes("n")) {
    y = Math.min(b0.y + dy, bottom - MIN_SIZE);
    h = bottom - y;
  }
  if (dir.includes("s")) h = Math.max(MIN_SIZE, b0.h + dy);
  return { x, y, w, h };
}

function SelectionOverlay({ elements, zoom }) {
  const s = 1 / zoom;
  const handle = 9 * s;
  const stroke = { stroke: BRAND, strokeWidth: 1.5 * s };
  const single = elements.length === 1 ? elements[0] : null;

  if (single && LINES.has(single.type)) {
    const d = single.data;
    return (
      <g>
        {[
          ["p1", d.x1, d.y1],
          ["p2", d.x2, d.y2],
        ].map(([id, x, y]) => (
          <circle key={id} data-handle={id} cx={x} cy={y} r={6 * s} fill="#fff" {...stroke} style={{ cursor: "move" }} />
        ))}
      </g>
    );
  }

  const b = single ? getBounds(single) : unionBounds(elements);
  if (!b) return null;
  const pad = 4 * s;
  const box = { x: b.x - pad, y: b.y - pad, w: b.w + pad * 2, h: b.h + pad * 2 };
  const rotation = single?.data?.rotation || 0;
  const c = centerOf(b);
  const midX = box.x + box.w / 2;
  const midY = box.y + box.h / 2;
  const handles = [
    ["nw", box.x, box.y],
    ["n", midX, box.y],
    ["ne", box.x + box.w, box.y],
    ["e", box.x + box.w, midY],
    ["se", box.x + box.w, box.y + box.h],
    ["s", midX, box.y + box.h],
    ["sw", box.x, box.y + box.h],
    ["w", box.x, midY],
  ];
  const rotateY = box.y - 26 * s;

  return (
    <g transform={rotation ? `rotate(${rotation} ${c.x} ${c.y})` : undefined}>
      <rect {...box} width={box.w} height={box.h} fill="none" {...stroke} strokeDasharray={`${5 * s} ${4 * s}`} />
      {single && (
        <>
          <line x1={midX} y1={box.y} x2={midX} y2={rotateY} {...stroke} />
          <circle data-handle="rotate" cx={midX} cy={rotateY} r={5.5 * s} fill="#fff" {...stroke} style={{ cursor: "grab" }} />
        </>
      )}
      {handles.map(([id, x, y]) => (
        <rect
          key={id}
          data-handle={id}
          x={x - handle / 2}
          y={y - handle / 2}
          width={handle}
          height={handle}
          rx={2 * s}
          fill="#fff"
          {...stroke}
          style={{ cursor: HANDLE_CURSORS[id] }}
        />
      ))}
    </g>
  );
}

function Draft({ draft, style, zoom }) {
  if (draft.kind === "marquee") {
    return (
      <rect
        x={draft.x}
        y={draft.y}
        width={draft.w}
        height={draft.h}
        fill="rgba(47,129,89,0.08)"
        stroke={BRAND}
        strokeWidth={1 / zoom}
        strokeDasharray={`${4 / zoom} ${3 / zoom}`}
      />
    );
  }
  if (draft.kind === "draw") {
    return <path d={strokeToPath(draft.points, style.strokeWidth || 4)} fill={style.stroke || INK} />;
  }
  const data =
    draft.kind === "box"
      ? { x: draft.x, y: draft.y, w: draft.w, h: draft.h }
      : { x1: draft.x1, y1: draft.y1, x2: draft.x2, y2: draft.y2 };
  return (
    <g opacity={0.85}>
      <ElementRenderer
        element={{
          id: "__draft",
          type: draft.type,
          data: { ...data, fill: style.fill, stroke: style.stroke, strokeWidth: style.strokeWidth, sketch: style.sketch },
        }}
      />
    </g>
  );
}

export default function Canvas({
  elements,
  setElements,
  tool,
  setTool,
  style = {},
  camera,
  setCamera,
  selectedIds,
  setSelectedIds,
  editingId,
  setEditingId,
  canEdit,
  background = "dots",
  bgColor = "#ffffff",
  persist,
  emitLive,
  emitCursor,
  onRequestChartEdit,
  onCheckpoint,
}) {
  const containerRef = useRef(null);
  const svgRef = useRef(null);
  const gestureRef = useRef(null);
  const lastCursorEmit = useRef(0);
  const editDraft = useRef(null); // { id, data } — latest data while typing, ahead of React state
  const [draft, setDraft] = useState(null);
  const [spaceHeld, setSpaceHeld] = useState(false);
  const [gestureCursor, setGestureCursor] = useState(null);

  // Latest values for native listeners and gesture handlers.
  const latest = useRef({ elements, camera, selectedIds });
  useLayoutEffect(() => {
    latest.current = { elements, camera, selectedIds };
  });

  /* ---------- Wheel: ctrl/cmd zooms to cursor, plain wheel pans ---------- */
  useEffect(() => {
    const node = containerRef.current;
    const onWheel = (e) => {
      e.preventDefault();
      const rect = node.getBoundingClientRect();
      const sx = e.clientX - rect.left;
      const sy = e.clientY - rect.top;
      if (e.ctrlKey || e.metaKey) {
        setCamera((cam) => {
          const zoom = clamp(cam.zoom * Math.exp(-e.deltaY * 0.01), MIN_ZOOM, MAX_ZOOM);
          const w = screenToWorld(sx, sy, cam);
          return { zoom, x: sx - w.x * zoom, y: sy - w.y * zoom };
        });
      } else {
        setCamera((cam) => ({ ...cam, x: cam.x - e.deltaX, y: cam.y - e.deltaY }));
      }
    };
    node.addEventListener("wheel", onWheel, { passive: false });
    return () => node.removeEventListener("wheel", onWheel);
  }, [setCamera]);

  /* ---------- Spacebar-held panning ---------- */
  useEffect(() => {
    const typing = (t) => t?.closest?.("input, textarea, select, [contenteditable='true']");
    const down = (e) => {
      if (e.code === "Space" && !typing(e.target)) {
        e.preventDefault();
        setSpaceHeld(true);
      }
    };
    const up = (e) => e.code === "Space" && setSpaceHeld(false);
    const reset = () => setSpaceHeld(false);
    window.addEventListener("keydown", down);
    window.addEventListener("keyup", up);
    window.addEventListener("blur", reset);
    return () => {
      window.removeEventListener("keydown", down);
      window.removeEventListener("keyup", up);
      window.removeEventListener("blur", reset);
    };
  }, []);

  const toWorld = useCallback((clientX, clientY) => {
    const rect = svgRef.current.getBoundingClientRect();
    return screenToWorld(clientX - rect.left, clientY - rect.top, latest.current.camera);
  }, []);

  /* ---------- Element mutations ---------- */

  const applyLive = useCallback(
    (changes, types) => {
      setElements((prev) => prev.map((el) => (changes.has(el.id) ? { ...el, data: changes.get(el.id) } : el)));
      for (const [id, data] of changes) emitLive?.({ id, type: types.get(id), data });
    },
    [setElements, emitLive],
  );

  function createElement(type, data, { edit = false } = {}) {
    onCheckpoint?.();
    Promise.resolve(persist.create(type, data))
      .then((el) => {
        if (!el) return;
        setSelectedIds([el.id]);
        if (edit) setEditingId(el.id);
      })
      .catch(() => {}); // persist reports its own errors
  }

  function eraseAt(g, w) {
    const tol = 6 / latest.current.camera.zoom;
    for (const el of latest.current.elements) {
      if (!g.erased.has(el.id) && hitElement(el, w.x, w.y, tol)) {
        g.erased.add(el.id);
        persist.remove(el.id);
      }
    }
  }

  function startTransform(handle, w) {
    const { elements: els, selectedIds: ids } = latest.current;
    const sel = els.filter((el) => ids.includes(el.id));
    if (!sel.length) return;
    const single = sel.length === 1 ? sel[0] : null;
    const kind = handle === "rotate" ? "rotate" : handle === "p1" || handle === "p2" ? "endpoint" : "resize";
    const b0 = single ? getBounds(single) : unionBounds(sel);
    const c = centerOf(b0);
    gestureRef.current = {
      kind,
      handle,
      single,
      b0,
      // Pointer at gesture start, in the selection's unrotated frame.
      start: rotatePoint(w.x, w.y, c.x, c.y, -(single?.data?.rotation || 0)),
      originals: new Map(sel.map((el) => [el.id, el])),
      types: new Map(sel.map((el) => [el.id, el.type])),
    };
    onCheckpoint?.();
    setGestureCursor(handle === "rotate" ? "grabbing" : HANDLE_CURSORS[handle]);
  }

  /* ---------- Pointer handlers ---------- */

  function onPointerDown(e) {
    if (e.button !== 0 && e.button !== 1) return;
    // The first click while editing just commits the edit (via the textarea's blur).
    if (editingId) return;
    // Suppress the browser's mousedown focus change, which would instantly blur
    // (and commit) an editor opened by this same click. Also stops text selection.
    e.preventDefault();
    svgRef.current.setPointerCapture(e.pointerId);
    const w = toWorld(e.clientX, e.clientY);
    const { camera: cam, elements: els, selectedIds: sel } = latest.current;

    if (e.button === 1 || spaceHeld || tool === TOOLS.pan) {
      gestureRef.current = { kind: "pan", startX: e.clientX, startY: e.clientY, cam };
      setGestureCursor("grabbing");
      return;
    }

    if (tool === TOOLS.select) {
      const handle = e.target.closest?.("[data-handle]")?.dataset.handle;
      if (handle && canEdit) return startTransform(handle, w);

      const hit = [...els].reverse().find((el) => hitElement(el, w.x, w.y, 6 / cam.zoom));
      if (hit) {
        const next = e.shiftKey
          ? sel.includes(hit.id)
            ? sel.filter((id) => id !== hit.id)
            : [...sel, hit.id]
          : sel.includes(hit.id)
            ? sel
            : [hit.id];
        setSelectedIds(next);
        if (canEdit && next.includes(hit.id)) {
          const moving = els.filter((el) => next.includes(el.id));
          gestureRef.current = {
            kind: "move",
            start: w,
            startX: e.clientX,
            startY: e.clientY,
            moved: false,
            originals: new Map(moving.map((el) => [el.id, el])),
            types: new Map(moving.map((el) => [el.id, el.type])),
          };
        }
        return;
      }

      if (!e.shiftKey) setSelectedIds([]);
      gestureRef.current = { kind: "marquee", start: w, base: e.shiftKey ? sel : [] };
      setDraft({ kind: "marquee", x: w.x, y: w.y, w: 0, h: 0 });
      return;
    }

    if (!canEdit) return;

    switch (tool) {
      case TOOLS.text:
        createElement(
          "text",
          { x: w.x, y: w.y, w: 260, text: "", fontSize: style.fontSize || 24, color: INK, weight: 500 },
          { edit: true },
        );
        setTool(TOOLS.select);
        return;
      case TOOLS.hand:
        createElement(
          "text",
          { x: w.x, y: w.y, w: 300, text: "", font: "hand", fontSize: Math.max(style.fontSize || 0, 28), color: INK, weight: 500 },
          { edit: true },
        );
        setTool(TOOLS.select);
        return;
      case TOOLS.sticky:
        createElement(
          "sticky",
          {
            x: w.x,
            y: w.y,
            w: 190,
            h: 190,
            text: "",
            fill: style.fill && style.fill !== "transparent" ? style.fill : "#fde68a",
            fontSize: 16,
          },
          { edit: true },
        );
        setTool(TOOLS.select);
        return;
      case TOOLS.bullet:
        createElement(
          "bullet",
          { x: w.x, y: w.y, w: 280, items: ["Item"], fontSize: 16, color: INK, bulletStyle: style.bulletStyle || "disc" },
          { edit: true },
        );
        setTool(TOOLS.select);
        return;
      case TOOLS.rect:
      case TOOLS.ellipse:
      case TOOLS.diamond:
        gestureRef.current = { kind: "box", type: tool, start: w };
        setDraft({ kind: "box", type: tool, x: w.x, y: w.y, w: 0, h: 0 });
        return;
      case TOOLS.line:
      case TOOLS.arrow:
        gestureRef.current = { kind: "line", type: tool, start: w };
        setDraft({ kind: "line", type: tool, x1: w.x, y1: w.y, x2: w.x, y2: w.y });
        return;
      case TOOLS.draw: {
        const points = [drawPoint(e.nativeEvent, w)];
        gestureRef.current = { kind: "draw", points };
        setDraft({ kind: "draw", points });
        return;
      }
      case TOOLS.eraser: {
        onCheckpoint?.();
        const g = { kind: "erase", erased: new Set() };
        gestureRef.current = g;
        eraseAt(g, w);
        return;
      }
      default:
    }
  }

  function drawPoint(ev, w = toWorld(ev.clientX, ev.clientY)) {
    // Mouse has no real pressure, so let perfect-freehand simulate it.
    return ev.pointerType === "mouse" ? [w.x, w.y] : [w.x, w.y, ev.pressure || 0.5];
  }

  function onPointerMove(e) {
    const w = toWorld(e.clientX, e.clientY);

    const now = performance.now();
    if (emitCursor && now - lastCursorEmit.current > CURSOR_THROTTLE_MS) {
      lastCursorEmit.current = now;
      emitCursor(w.x, w.y);
    }

    const g = gestureRef.current;
    if (!g) return;

    switch (g.kind) {
      case "pan":
        setCamera({ ...g.cam, x: g.cam.x + e.clientX - g.startX, y: g.cam.y + e.clientY - g.startY });
        return;

      case "move": {
        if (!g.moved) {
          if (Math.hypot(e.clientX - g.startX, e.clientY - g.startY) < DRAG_THRESHOLD) return;
          g.moved = true;
          onCheckpoint?.();
          setGestureCursor("move");
        }
        const dx = w.x - g.start.x;
        const dy = w.y - g.start.y;
        g.latest = new Map([...g.originals].map(([id, el]) => [id, translateData(el, dx, dy)]));
        applyLive(g.latest, g.types);
        return;
      }

      case "resize": {
        const rotation = g.single?.data?.rotation || 0;
        const c = centerOf(g.b0);
        const p = rotatePoint(w.x, w.y, c.x, c.y, -rotation);
        const b1 = resizeBox(g.b0, g.handle, p.x - g.start.x, p.y - g.start.y);
        const sx = g.b0.w ? b1.w / g.b0.w : 1;
        const sy = g.b0.h ? b1.h / g.b0.h : 1;
        g.latest = new Map(
          [...g.originals].map(([id, el]) => {
            const b = getBounds(el);
            const nb = g.single
              ? b1
              : { x: b1.x + (b.x - g.b0.x) * sx, y: b1.y + (b.y - g.b0.y) * sy, w: b.w * sx, h: b.h * sy };
            return [id, resizeData(el, nb)];
          }),
        );
        applyLive(g.latest, g.types);
        return;
      }

      case "rotate": {
        const c = centerOf(g.b0);
        let deg = (Math.atan2(w.y - c.y, w.x - c.x) * 180) / Math.PI + 90;
        if (e.shiftKey) deg = Math.round(deg / 15) * 15;
        deg = ((deg % 360) + 360) % 360;
        g.latest = new Map([[g.single.id, { ...g.single.data, rotation: deg }]]);
        applyLive(g.latest, g.types);
        return;
      }

      case "endpoint": {
        const [kx, ky] = g.handle === "p1" ? ["x1", "y1"] : ["x2", "y2"];
        g.latest = new Map([[g.single.id, { ...g.single.data, [kx]: w.x, [ky]: w.y }]]);
        applyLive(g.latest, g.types);
        return;
      }

      case "box":
        setDraft({ kind: "box", type: g.type, ...normRect(g.start, w) });
        return;

      case "line":
        setDraft({ kind: "line", type: g.type, x1: g.start.x, y1: g.start.y, x2: w.x, y2: w.y });
        return;

      case "draw": {
        const events = e.nativeEvent.getCoalescedEvents?.() || [e.nativeEvent];
        for (const ev of events.length ? events : [e.nativeEvent]) g.points.push(drawPoint(ev));
        setDraft({ kind: "draw", points: [...g.points] });
        return;
      }

      case "erase":
        eraseAt(g, w);
        return;

      case "marquee": {
        const rect = normRect(g.start, w);
        setDraft({ kind: "marquee", ...rect });
        const hits = latest.current.elements.filter((el) => boundsIntersectRect(el, rect)).map((el) => el.id);
        setSelectedIds([...new Set([...g.base, ...hits])]);
        return;
      }
      default:
    }
  }

  function onPointerUp(e) {
    const g = gestureRef.current;
    gestureRef.current = null;
    setGestureCursor(null);
    setDraft(null);
    if (!g) return;

    const zoom = latest.current.camera.zoom;
    const shapeStyle = { stroke: style.stroke, strokeWidth: style.strokeWidth, sketch: style.sketch };

    switch (g.kind) {
      case "move":
      case "resize":
      case "rotate":
      case "endpoint":
        // Live motion went over the socket; this is the one authoritative save.
        if (g.latest) for (const [id, data] of g.latest) persist.update(id, { data });
        return;

      case "box": {
        const w = toWorld(e.clientX, e.clientY);
        let r = normRect(g.start, w);
        if (r.w * zoom < 4 && r.h * zoom < 4) r = { x: g.start.x, y: g.start.y, w: 140, h: 90 };
        else r = { ...r, w: Math.max(MIN_SIZE, r.w), h: Math.max(MIN_SIZE, r.h) };
        createElement(g.type, { ...r, fill: style.fill, ...shapeStyle });
        setTool(TOOLS.select);
        return;
      }

      case "line": {
        const w = toWorld(e.clientX, e.clientY);
        const tooShort = Math.hypot(w.x - g.start.x, w.y - g.start.y) * zoom < 4;
        const end = tooShort ? { x: g.start.x + 160, y: g.start.y } : w;
        createElement(g.type, { x1: g.start.x, y1: g.start.y, x2: end.x, y2: end.y, ...shapeStyle });
        setTool(TOOLS.select);
        return;
      }

      case "draw":
        if (g.points.length) createElement("draw", { points: g.points, stroke: style.stroke, strokeWidth: style.strokeWidth });
        return;
      default:
    }
  }

  function onDoubleClick(e) {
    if (tool !== TOOLS.select || !canEdit) return;
    const w = toWorld(e.clientX, e.clientY);
    const { elements: els, camera: cam } = latest.current;
    const hit = [...els].reverse().find((el) => hitElement(el, w.x, w.y, 6 / cam.zoom));
    if (!hit) return;
    if (hit.type === "chart") return onRequestChartEdit?.(hit);
    if (EDITABLE.has(hit.type)) {
      onCheckpoint?.();
      setSelectedIds([hit.id]);
      setEditingId(hit.id);
    }
  }

  /* ---------- Inline editing ---------- */

  const editingEl = editingId ? elements.find((el) => el.id === editingId) : null;

  const handleLocalEdit = useCallback(
    (patch) => {
      const el = latest.current.elements.find((x) => x.id === editingId);
      if (!el) return;
      const base = editDraft.current?.id === el.id ? editDraft.current.data : el.data;
      const data = { ...base, ...patch };
      editDraft.current = { id: el.id, data };
      setElements((prev) => prev.map((x) => (x.id === el.id ? { ...x, data } : x)));
      emitLive?.({ id: el.id, type: el.type, data });
    },
    [editingId, setElements, emitLive],
  );

  const handleCommit = useCallback(
    (id, patch) => {
      const el = latest.current.elements.find((x) => x.id === id);
      const base = editDraft.current?.id === id ? editDraft.current.data : el?.data;
      editDraft.current = null;
      setEditingId(null);
      if (!el) return;
      if (patch === null) {
        setSelectedIds([]);
        persist.remove(id);
        return;
      }
      const data = { ...base, ...patch };
      setElements((prev) => prev.map((x) => (x.id === id ? { ...x, data } : x)));
      persist.update(id, { data });
    },
    [setEditingId, setSelectedIds, setElements, persist],
  );

  /* ---------- Render ---------- */

  const selectedEls = useMemo(() => elements.filter((el) => selectedIds.includes(el.id)), [elements, selectedIds]);
  const showSelection = selectedEls.length > 0 && !editingId && canEdit && tool === TOOLS.select;
  const cursor = gestureCursor || (spaceHeld ? "grab" : TOOL_CURSORS[tool] || "crosshair");
  const bgClass = background === "dots" ? "canvas-bg-dots" : background === "grid" ? "canvas-bg-grid" : "";
  const bgSize = 22 * camera.zoom;

  return (
    <div ref={containerRef} className="no-select relative h-full w-full overflow-hidden" style={{ touchAction: "none" }}>
      <div
        className={`absolute inset-0 ${bgClass}`}
        style={{
          backgroundColor: bgColor,
          backgroundSize: `${bgSize}px ${bgSize}px`,
          backgroundPosition: `${camera.x}px ${camera.y}px`,
        }}
      />
      <svg
        ref={svgRef}
        className="absolute inset-0 h-full w-full"
        style={{ cursor }}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        onDoubleClick={onDoubleClick}
      >
        <g transform={`translate(${camera.x} ${camera.y}) scale(${camera.zoom})`}>
          {elements.map((el) => {
            const node = <ElementRenderer element={el} editing={el.id === editingId} />;
            const rotation = el.data?.rotation;
            if (!rotation) return <g key={el.id}>{node}</g>;
            const c = centerOf(getBounds(el));
            return (
              <g key={el.id} transform={`rotate(${rotation} ${c.x} ${c.y})`}>
                {node}
              </g>
            );
          })}
          {draft && <Draft draft={draft} style={style} zoom={camera.zoom} />}
          {showSelection && <SelectionOverlay elements={selectedEls} zoom={camera.zoom} />}
        </g>
      </svg>

      {editingEl && (
        <EditingOverlay
          key={editingEl.id}
          element={editingEl}
          camera={camera}
          onLocalChange={handleLocalEdit}
          onCommit={(patch) => handleCommit(editingEl.id, patch)}
        />
      )}
    </div>
  );
}
