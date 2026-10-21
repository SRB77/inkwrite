// Deterministic hand-drawn wobble: the same element id always produces the same
// jitter, so shapes look identical on every render and for every collaborator.

export function seededRandom(id) {
  // FNV-1a hash of the id → 32-bit seed
  let h = 0x811c9dc5;
  const str = String(id ?? "");
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  // mulberry32 PRNG
  let a = h >>> 0;
  return function rand() {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const jitter = (rand, amp) => (rand() - 0.5) * 2 * amp;
const f = (n) => n.toFixed(2);

// Quadratic-smoothed path through points, using midpoints as on-curve anchors.
function smoothPath(points, closed = false) {
  if (points.length < 2) return "";
  if (points.length === 2) {
    return `M ${f(points[0][0])} ${f(points[0][1])} L ${f(points[1][0])} ${f(points[1][1])}`;
  }
  const pts = closed ? [...points, points[0], points[1]] : points;
  const mid = (a, b) => [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2];
  const start = closed ? mid(pts[0], pts[1]) : pts[0];
  let d = `M ${f(start[0])} ${f(start[1])}`;
  for (let i = 1; i < pts.length - 1; i++) {
    const m = mid(pts[i], pts[i + 1]);
    d += ` Q ${f(pts[i][0])} ${f(pts[i][1])} ${f(m[0])} ${f(m[1])}`;
  }
  if (!closed) {
    const last = pts[pts.length - 1];
    d += ` L ${f(last[0])} ${f(last[1])}`;
  }
  return closed ? `${d} Z` : d;
}

function wobblySegment(x1, y1, x2, y2, rand, amp) {
  const len = Math.hypot(x2 - x1, y2 - y1);
  const steps = Math.max(2, Math.min(8, Math.round(len / 40)));
  const pts = [];
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    const a = i === 0 || i === steps ? amp * 0.5 : amp;
    pts.push([x1 + (x2 - x1) * t + jitter(rand, a), y1 + (y2 - y1) * t + jitter(rand, a)]);
  }
  return pts;
}

export function sketchLine(x1, y1, x2, y2, rand, amp = 1.8) {
  return smoothPath(wobblySegment(x1, y1, x2, y2, rand, amp));
}

export function sketchPolygon(points, rand, amp = 1.8) {
  const pts = [];
  for (let i = 0; i < points.length; i++) {
    const [x1, y1] = points[i];
    const [x2, y2] = points[(i + 1) % points.length];
    pts.push(...wobblySegment(x1, y1, x2, y2, rand, amp).slice(0, -1));
  }
  return smoothPath(pts, true);
}

export function sketchRect(x, y, w, h, rand, amp = 1.8) {
  return sketchPolygon(
    [
      [x, y],
      [x + w, y],
      [x + w, y + h],
      [x, y + h],
    ],
    rand,
    amp,
  );
}

export function sketchEllipse(cx, cy, rx, ry, rand, amp = 2) {
  const n = 22;
  const offset = rand() * Math.PI * 2;
  const pts = [];
  for (let i = 0; i < n; i++) {
    const t = offset + (i / n) * Math.PI * 2;
    pts.push([cx + Math.cos(t) * (rx + jitter(rand, amp)), cy + Math.sin(t) * (ry + jitter(rand, amp))]);
  }
  return smoothPath(pts, true);
}
