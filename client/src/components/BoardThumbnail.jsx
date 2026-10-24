import { useEffect, useMemo, useRef, useState } from "react";
import { PenLine } from "lucide-react";
import { boardApi } from "../lib/api";
import { getBounds } from "../lib/canvas";
import ElementRenderer from "./board/ElementRenderer";

// Keyed by boardId+updatedAt, so an edited board refetches but re-renders don't.
const cache = new Map();

function sceneBounds(elements) {
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
  const w = Math.max(1, maxX - minX);
  const h = Math.max(1, maxY - minY);
  const pad = Math.max(w, h) * 0.04;
  return { x: minX - pad, y: minY - pad, w: w + pad * 2, h: h + pad * 2 };
}

export default function BoardThumbnail({ boardId, updatedAt }) {
  const key = `${boardId}:${updatedAt}`;
  const ref = useRef(null);
  const [loaded, setLoaded] = useState(null); // { key, elements }
  const elements = cache.get(key) ?? (loaded?.key === key ? loaded.elements : null);

  useEffect(() => {
    if (cache.has(key)) return;
    const node = ref.current;
    if (!node) return;
    let cancelled = false;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting) return;
        observer.disconnect();
        boardApi
          .get(boardId)
          .then(({ elements = [] }) => {
            cache.set(key, elements);
            if (!cancelled) setLoaded({ key, elements });
          })
          .catch(() => !cancelled && setLoaded({ key, elements: [] }));
      },
      { rootMargin: "300px" },
    );
    observer.observe(node);
    return () => {
      cancelled = true;
      observer.disconnect();
    };
  }, [boardId, key]);

  const bounds = useMemo(() => (elements?.length ? sceneBounds(elements) : null), [elements]);

  return (
    <div ref={ref} className="pointer-events-none h-full w-full no-select" aria-hidden="true">
      {bounds ? (
        <svg
          className="h-full w-full"
          viewBox={`${bounds.x} ${bounds.y} ${bounds.w} ${bounds.h}`}
          preserveAspectRatio="xMidYMid meet"
        >
          {elements.map((el) => {
            const rotation = el.data?.rotation;
            if (!rotation) return <ElementRenderer key={el.id} element={el} />;
            const b = getBounds(el);
            return (
              <g key={el.id} transform={`rotate(${rotation} ${b.x + b.w / 2} ${b.y + b.h / 2})`}>
                <ElementRenderer element={el} />
              </g>
            );
          })}
        </svg>
      ) : (
        <div className="grid h-full w-full place-items-center">
          <PenLine className="h-6 w-6 text-faint/60" />
        </div>
      )}
    </div>
  );
}
