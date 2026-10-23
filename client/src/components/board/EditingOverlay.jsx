import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { fontFamilyFor, getBounds, worldToScreen } from "../../lib/canvas";

const SHAPES = new Set(["rect", "ellipse", "diamond"]);

function initialValue(el) {
  const d = el.data || {};
  if (el.type === "bullet") return (d.items || []).join("\n");
  if (SHAPES.has(el.type)) return d.label || "";
  return d.text || "";
}

function valuePatch(type, value) {
  if (type === "bullet") return { items: value.split("\n") };
  if (SHAPES.has(type)) return { label: value };
  return { text: value };
}

export default function EditingOverlay({ element, camera, onLocalChange, onCommit }) {
  const ref = useRef(null);
  const committed = useRef(false);
  const measuredH = useRef(null);
  const [value, setValue] = useState(() => initialValue(element));

  const d = element.data || {};
  const { type } = element;
  const zoom = camera.zoom;
  const hand = d.font === "hand";
  const isShape = SHAPES.has(type);
  const grows = type === "text" || type === "bullet";
  const b = getBounds(element);
  const pos = worldToScreen(b.x, b.y, camera);

  const fontSize =
    type === "text"
      ? d.fontSize || 20
      : type === "bullet"
        ? d.fontSize || 16
        : type === "sticky"
          ? d.fontSize || (hand ? 22 : 16)
          : hand
            ? 16
            : 14;
  const lineHeight = type === "bullet" ? 1.7 : type === "sticky" && hand ? 1.15 : 1.35;

  useEffect(() => {
    // Focus a frame later so the click that opened the editor has fully settled.
    const raf = requestAnimationFrame(() => {
      const ta = ref.current;
      if (!ta) return;
      ta.focus();
      ta.setSelectionRange(ta.value.length, ta.value.length);
    });
    return () => cancelAnimationFrame(raf);
  }, []);

  // Text and bullets grow with their content; report the height in world units.
  useLayoutEffect(() => {
    if (!grows) return;
    const ta = ref.current;
    ta.style.height = "auto";
    const sh = ta.scrollHeight;
    ta.style.height = `${sh}px`;
    const h = Math.ceil(sh / zoom);
    if (h !== measuredH.current) {
      measuredH.current = h;
      onLocalChange({ h });
    }
  }, [value, zoom, grows, onLocalChange]);

  function handleChange(e) {
    setValue(e.target.value);
    onLocalChange(valuePatch(type, e.target.value));
  }

  function commit() {
    if (committed.current) return;
    committed.current = true;
    const h = measuredH.current ?? undefined;
    if (type === "bullet") {
      const items = value
        .split("\n")
        .map((s) => s.trimEnd())
        .filter(Boolean);
      if (!items.length) return onCommit(null);
      // Dropped blank lines shrink the list, so recompute rather than reuse the measurement.
      const lines = value.split("\n").length;
      onCommit({ items, h: items.length === lines ? h : Math.ceil(items.length * fontSize * 1.7 + 12) });
    } else if (type === "text") {
      onCommit(value.trim() ? { text: value, h } : null);
    } else {
      onCommit(valuePatch(type, value));
    }
  }

  function handleKeyDown(e) {
    // Keep board shortcuts (delete, undo, tools…) from firing while typing.
    e.stopPropagation();
    if (e.key === "Escape" || (e.key === "Enter" && (e.metaKey || e.ctrlKey))) {
      e.preventDefault();
      ref.current.blur();
    }
  }

  const boxH = b.h * zoom;
  const shapePadTop = isShape ? Math.max(0, (boxH - value.split("\n").length * fontSize * zoom * lineHeight) / 2) : 0;
  const padding =
    type === "sticky"
      ? 14 * zoom
      : type === "bullet"
        ? `${6 * zoom}px 0 ${6 * zoom}px ${fontSize * 1.2 * zoom}px`
        : isShape
          ? `${shapePadTop}px ${8 * zoom}px 0`
          : 0;

  return (
    <textarea
      ref={ref}
      value={value}
      onChange={handleChange}
      onBlur={commit}
      onKeyDown={handleKeyDown}
      onPointerDown={(e) => e.stopPropagation()}
      spellCheck={false}
      rows={1}
      style={{
        position: "absolute",
        left: pos.x,
        top: pos.y,
        width: b.w * zoom,
        height: grows ? undefined : boxH,
        padding,
        margin: 0,
        border: "none",
        outline: "none",
        resize: "none",
        overflow: "hidden",
        boxSizing: "border-box",
        whiteSpace: "pre-wrap",
        overflowWrap: "break-word",
        fontSize: fontSize * zoom,
        lineHeight,
        fontFamily: fontFamilyFor(d.font),
        fontWeight: type === "text" ? d.weight || 500 : 400,
        color: d.color || "#16161d",
        textAlign: isShape ? "center" : "left",
        background: type === "sticky" ? d.fill || "#fde68a" : "transparent",
        borderRadius: type === "sticky" ? 10 * zoom : 4,
        boxShadow: "0 0 0 1.5px rgba(47,129,89,.55)",
        caretColor: "#2f8159",
        transform: d.rotation ? `rotate(${d.rotation}deg)` : undefined,
        transformOrigin: "center",
        zIndex: 10,
      }}
    />
  );
}
