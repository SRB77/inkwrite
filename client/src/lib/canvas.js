import { getStroke } from "perfect-freehand";

export const TOOLS = {
  select: "select",
  pan: "pan",
  text: "text",
  sticky: "sticky",
  rect: "rect",
  ellipse: "ellipse",
  diamond: "diamond",
  line: "line",
  arrow: "arrow",
  draw: "draw",
  bullet: "bullet",
  hand: "hand",
  eraser: "eraser",
};

export function fontFamilyFor(font) {
  return font === "hand" ? '"Caveat", "Segoe Script", cursive' : "Inter, sans-serif";
}

export const STROKE_COLORS = ["#16161d", "#2f8159", "#2563eb", "#e11d48", "#d97706", "#7c3aed", "#0891b2", "#ec4899"];
export const FILL_COLORS = ["transparent", "#fde68a", "#bbf7d0", "#bfdbfe", "#fbcfe8", "#ddd6fe", "#fed7aa", "#e5e7eb"];
export const STICKY_COLORS = ["#fde68a", "#bbf7d0", "#bfdbfe", "#fbcfe8", "#ddd6fe", "#fed7aa"];
export const STROKE_WIDTHS = [2, 4, 8];
export const FONT_SIZES = [14, 18, 24, 34, 48];

/* ---------- Camera ---------- */

export function worldToScreen(wx, wy, cam) {
  return { x: wx * cam.zoom + cam.x, y: wy * cam.zoom + cam.y };
}

export function screenToWorld(sx, sy, cam) {
  return { x: (sx - cam.x) / cam.zoom, y: (sy - cam.y) / cam.zoom };
}

/* ---------- Freehand ---------- */

const avg = (a, b) => (a + b) / 2;

export function strokeToPath(points, size = 4) {
  if (!points?.length) return "";
  const hasPressure = points.every((p) => p.length > 2 && p[2] != null);
  const outline = getStroke(points, {
    size: size * 2.2,
    thinning: 0.6,
    smoothing: 0.5,
    streamline: 0.5,
    simulatePressure: !hasPressure,
  });
  if (!outline.length) return "";

  const [first, ...rest] = outline;
  let d = `M ${first[0].toFixed(2)} ${first[1].toFixed(2)} Q`;
  for (let i = 0; i < outline.length; i++) {
    const [x0, y0] = outline[i];
    const [x1, y1] = outline[(i + 1) % outline.length];
    d += ` ${x0.toFixed(2)} ${y0.toFixed(2)} ${avg(x0, x1).toFixed(2)} ${avg(y0, y1).toFixed(2)}`;
  }
  return rest.length ? `${d} Z` : d;
}

/* ---------- Geometry ---------- */

function pointsBounds(points, pad = 0) {
  let minX = Infinity,
    minY = Infinity,
    maxX = -Infinity,
    maxY = -Infinity;
  for (const [x, y] of points) {
    if (x < minX) minX = x;
    if (y < minY) minY = y;
    if (x > maxX) maxX = x;
    if (y > maxY) maxY = y;
  }
  return { x: minX - pad, y: minY - pad, w: maxX - minX + pad * 2, h: maxY - minY + pad * 2 };
}

function estimateTextLines(text, width, fontSize) {
  const charsPerLine = Math.max(1, Math.floor(width / (fontSize * 0.55)));
  return String(text || "")
    .split("\n")
    .reduce((n, line) => n + Math.max(1, Math.ceil(line.length / charsPerLine)), 0);
}

export function getBounds(el) {
  const d = el.data || {};
  switch (el.type) {
    case "line":
    case "arrow":
      return {
        x: Math.min(d.x1, d.x2),
        y: Math.min(d.y1, d.y2),
        w: Math.abs(d.x2 - d.x1),
        h: Math.abs(d.y2 - d.y1),
      };
    case "draw":
      if (!d.points?.length) return { x: 0, y: 0, w: 0, h: 0 };
      return pointsBounds(d.points, (d.strokeWidth || 4) * 1.5);
    case "text": {
      const w = d.w || 260;
      const fontSize = d.fontSize || 20;
      const h = d.h || estimateTextLines(d.text, w, fontSize) * fontSize * 1.35;
      return { x: d.x || 0, y: d.y || 0, w, h };
    }
    case "bullet": {
      const fontSize = d.fontSize || 16;
      const h = d.h || (d.items?.length || 1) * fontSize * 1.7 + 12;
      return { x: d.x || 0, y: d.y || 0, w: d.w || 280, h };
    }
    default:
      return { x: d.x || 0, y: d.y || 0, w: d.w || 100, h: d.h || 100 };
  }
}

// Union AABB of many elements (ignores rotation); null when nothing has finite bounds.
export function unionBounds(elements) {
  let minX = Infinity,
    minY = Infinity,
    maxX = -Infinity,
    maxY = -Infinity;
  for (const el of elements) {
    const b = getBounds(el);
    if (![b.x, b.y, b.w, b.h].every(Number.isFinite)) continue;
    minX = Math.min(minX, b.x);
    minY = Math.min(minY, b.y);
    maxX = Math.max(maxX, b.x + b.w);
    maxY = Math.max(maxY, b.y + b.h);
  }
  if (minX === Infinity) return null;
  return { x: minX, y: minY, w: maxX - minX, h: maxY - minY };
}

export function translateData(el, dx, dy) {
  const d = el.data || {};
  switch (el.type) {
    case "line":
    case "arrow":
      return { ...d, x1: d.x1 + dx, y1: d.y1 + dy, x2: d.x2 + dx, y2: d.y2 + dy };
    case "draw":
      return { ...d, points: d.points.map(([x, y, p]) => (p == null ? [x + dx, y + dy] : [x + dx, y + dy, p])) };
    default:
      return { ...d, x: (d.x || 0) + dx, y: (d.y || 0) + dy };
  }
}

export function resizeData(el, bounds) {
  const d = el.data || {};
  if (el.type === "draw") {
    // Scale the raw points into the target box minus the stroke padding getBounds adds.
    if (!d.points?.length) return d;
    const pad = (d.strokeWidth || 4) * 1.5;
    const inner = pointsBounds(d.points);
    const target = { x: bounds.x + pad, y: bounds.y + pad, w: Math.max(0, bounds.w - pad * 2), h: Math.max(0, bounds.h - pad * 2) };
    const sx = inner.w ? target.w / inner.w : 1;
    const sy = inner.h ? target.h / inner.h : 1;
    return {
      ...d,
      points: d.points.map(([x, y, p]) => {
        const nx = target.x + (x - inner.x) * sx;
        const ny = target.y + (y - inner.y) * sy;
        return p == null ? [nx, ny] : [nx, ny, p];
      }),
    };
  }

  const old = getBounds(el);
  const sx = old.w ? bounds.w / old.w : 1;
  const sy = old.h ? bounds.h / old.h : 1;
  const mapX = (x) => bounds.x + (x - old.x) * sx;
  const mapY = (y) => bounds.y + (y - old.y) * sy;

  switch (el.type) {
    case "line":
    case "arrow":
      return { ...d, x1: mapX(d.x1), y1: mapY(d.y1), x2: mapX(d.x2), y2: mapY(d.y2) };
    default:
      return { ...d, x: bounds.x, y: bounds.y, w: bounds.w, h: bounds.h };
  }
}

function distToSegment(px, py, x1, y1, x2, y2) {
  const dx = x2 - x1;
  const dy = y2 - y1;
  const len2 = dx * dx + dy * dy;
  const t = len2 ? Math.max(0, Math.min(1, ((px - x1) * dx + (py - y1) * dy) / len2)) : 0;
  return Math.hypot(px - (x1 + t * dx), py - (y1 + t * dy));
}

export function hitTest(el, px, py, tol = 6) {
  const d = el.data || {};
  if (el.type === "line" || el.type === "arrow") {
    return distToSegment(px, py, d.x1, d.y1, d.x2, d.y2) <= tol + (d.strokeWidth || 2) / 2;
  }
  if (el.type === "draw") {
    const pts = d.points || [];
    const reach = tol + (d.strokeWidth || 4);
    if (pts.length === 1) return Math.hypot(px - pts[0][0], py - pts[0][1]) <= reach;
    for (let i = 1; i < pts.length; i++) {
      if (distToSegment(px, py, pts[i - 1][0], pts[i - 1][1], pts[i][0], pts[i][1]) <= reach) return true;
    }
    return false;
  }
  const b = getBounds(el);
  return px >= b.x - tol && px <= b.x + b.w + tol && py >= b.y - tol && py <= b.y + b.h + tol;
}

export function boundsIntersectRect(el, rect) {
  const b = getBounds(el);
  return b.x < rect.x + rect.w && b.x + b.w > rect.x && b.y < rect.y + rect.h && b.y + b.h > rect.y;
}

export function diamondPoints(b) {
  const cx = b.x + b.w / 2;
  const cy = b.y + b.h / 2;
  return `${cx},${b.y} ${b.x + b.w},${cy} ${cx},${b.y + b.h} ${b.x},${cy}`;
}

export function arrowHead(x1, y1, x2, y2, size = 12) {
  const angle = Math.atan2(y2 - y1, x2 - x1);
  const spread = Math.PI / 7;
  const ax = x2 - size * Math.cos(angle - spread);
  const ay = y2 - size * Math.sin(angle - spread);
  const bx = x2 - size * Math.cos(angle + spread);
  const by = y2 - size * Math.sin(angle + spread);
  return `${x2},${y2} ${ax},${ay} ${bx},${by}`;
}
