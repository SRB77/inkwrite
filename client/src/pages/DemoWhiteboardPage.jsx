import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import toast from "react-hot-toast";
import { Download, Minus, Plus, Redo2, Undo2 } from "lucide-react";
import Canvas from "../components/board/Canvas";
import DemoBanner from "../components/board/DemoBanner";
import EmojiPicker from "../components/board/EmojiPicker";
import StylePanel from "../components/board/StylePanel";
import Toolbar from "../components/board/Toolbar";
import Button from "../components/ui/Button";
import { TOOLS } from "../lib/canvas";
import { exportPNG, exportSVG } from "../lib/exportCanvas";

const DEFAULT_STYLE = {
  stroke: "#16161d",
  color: "#16161d",
  fill: "transparent",
  strokeWidth: 4,
  fontSize: 24,
  sketch: false,
  bulletStyle: "disc",
};

let demoSequence = 0;

export default function DemoWhiteboardPage() {
  const [elements, setElements] = useState([]);
  const [tool, setTool] = useState(TOOLS.select);
  const [style, setStyle] = useState(DEFAULT_STYLE);
  const [camera, setCamera] = useState({ x: 0, y: 0, zoom: 1 });
  const [selectedIds, setSelectedIds] = useState([]);
  const [editingId, setEditingId] = useState(null);
  const [emojiOpen, setEmojiOpen] = useState(false);
  const [historyState, setHistoryState] = useState({ canUndo: false, canRedo: false });
  const history = useRef({ past: [], future: [] });

  const syncHistory = useCallback(() => {
    setHistoryState({ canUndo: history.current.past.length > 0, canRedo: history.current.future.length > 0 });
  }, []);

  const checkpoint = useCallback(() => {
    history.current.past.push(structuredClone(elements));
    if (history.current.past.length > 80) history.current.past.shift();
    history.current.future = [];
    syncHistory();
  }, [elements, syncHistory]);

  const create = useCallback(async (type, data) => {
    const element = { id: `demo_${++demoSequence}`, type, data, z: Date.now() + demoSequence };
    setElements((current) => [...current, element]);
    return element;
  }, []);

  const update = useCallback((id, patch) => {
    setElements((current) => current.map((element) => (element.id === id ? { ...element, ...patch } : element)));
  }, []);

  const remove = useCallback((id) => {
    setElements((current) => current.filter((element) => element.id !== id));
    setSelectedIds((current) => current.filter((selectedId) => selectedId !== id));
  }, []);

  const persist = useMemo(() => ({ create, update, remove }), [create, update, remove]);
  const selectedElements = useMemo(
    () => elements.filter((element) => selectedIds.includes(element.id)),
    [elements, selectedIds],
  );

  const restore = useCallback((target) => {
    setElements(target);
    setSelectedIds([]);
    setEditingId(null);
  }, []);

  const undo = useCallback(() => {
    const previous = history.current.past.pop();
    if (!previous) return;
    history.current.future.push(structuredClone(elements));
    restore(previous);
    syncHistory();
  }, [elements, restore, syncHistory]);

  const redo = useCallback(() => {
    const next = history.current.future.pop();
    if (!next) return;
    history.current.past.push(structuredClone(elements));
    restore(next);
    syncHistory();
  }, [elements, restore, syncHistory]);

  useEffect(() => {
    const onKeyDown = (event) => {
      if (!(event.metaKey || event.ctrlKey) || event.key.toLowerCase() !== "z") return;
      if (event.target.closest?.("input, textarea, select, [contenteditable='true']")) return;
      event.preventDefault();
      if (event.shiftKey) redo();
      else undo();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [redo, undo]);

  const zoomBy = (factor) => setCamera((current) => ({ ...current, zoom: Math.min(5, Math.max(0.15, current.zoom * factor)) }));

  const exportBoard = async (format) => {
    try {
      if (format === "svg") await exportSVG(elements, "inkwrite-demo");
      else await exportPNG(elements, "inkwrite-demo");
    } catch (error) {
      toast.error(error.message);
    }
  };

  return (
    <div className="fixed inset-0 overflow-hidden bg-white">
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
        canEdit
        background="plain"
        bgColor="#ffffff"
        persist={persist}
        onCheckpoint={checkpoint}
      />

      <DemoBanner />

      <header className="pointer-events-none fixed inset-x-3 top-3 z-30 flex items-start justify-between sm:inset-x-5">
        <Link to="/" className="pointer-events-auto rounded-xl bg-white/95 px-3 py-2 font-display text-sm font-bold text-ink shadow-[var(--shadow-card)] backdrop-blur">
          Inkwrite Demo
        </Link>
        <div className="pointer-events-auto mt-12 flex items-center gap-1 rounded-2xl border border-line bg-white/95 p-1.5 shadow-[var(--shadow-card)] backdrop-blur sm:mt-0">
          <Button variant="ghost" size="iconSm" onClick={undo} disabled={!historyState.canUndo} aria-label="Undo" title="Undo">
            <Undo2 className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="iconSm" onClick={redo} disabled={!historyState.canRedo} aria-label="Redo" title="Redo">
            <Redo2 className="h-4 w-4" />
          </Button>
          <span className="mx-1 h-5 w-px bg-line" />
          <Button variant="ghost" size="iconSm" onClick={() => zoomBy(1 / 1.2)} aria-label="Zoom out" title="Zoom out">
            <Minus className="h-4 w-4" />
          </Button>
          <span className="w-11 text-center text-xs font-semibold text-muted">{Math.round(camera.zoom * 100)}%</span>
          <Button variant="ghost" size="iconSm" onClick={() => zoomBy(1.2)} aria-label="Zoom in" title="Zoom in">
            <Plus className="h-4 w-4" />
          </Button>
          <span className="mx-1 h-5 w-px bg-line" />
          <Button variant="ghost" size="iconSm" onClick={() => exportBoard("png")} aria-label="Export PNG" title="Export PNG">
            <Download className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="iconSm" onClick={() => exportBoard("svg")} aria-label="Export SVG" title="Export SVG">
            <span className="text-[10px] font-bold">SVG</span>
          </Button>
          <Button as={Link} to="/login" size="sm" className="ml-1">
            Sign in
          </Button>
        </div>
      </header>

      <Toolbar
        tool={tool}
        setTool={setTool}
        onImage={() => toast.error("Sign in to add images to saved boards")}
        onChart={() => toast.error("Sign in to use AI charts on saved boards")}
        emojiOpen={emojiOpen}
        onEmojiToggle={() => setEmojiOpen((open) => !open)}
      />
      <EmojiPicker
        open={emojiOpen}
        onClose={() => setEmojiOpen(false)}
        onPick={(emoji) => {
          checkpoint();
          create("emoji", {
            x: (window.innerWidth / 2 - camera.x) / camera.zoom - 44,
            y: (window.innerHeight / 2 - camera.y) / camera.zoom - 44,
            w: 88,
            h: 88,
            emoji,
            rotation: 0,
          });
          setEmojiOpen(false);
        }}
      />
      <StylePanel style={style} tool={tool} selectedEls={editingId ? [] : selectedElements} onChange={setStyle} />
    </div>
  );
}
