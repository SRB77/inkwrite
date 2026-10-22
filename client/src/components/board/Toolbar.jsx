import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  ArrowUpRight,
  BarChart3,
  Circle,
  Diamond,
  Donut,
  Eraser,
  Hand,
  ImagePlus,
  LineChart,
  List,
  Minus,
  MousePointer2,
  Pencil,
  PenTool,
  PieChart,
  Smile,
  Square,
  StickyNote,
  Type,
} from "lucide-react";
import { TOOLS } from "../../lib/canvas";
import { cn } from "../../lib/utils";

export const TOOL_ITEMS = [
  { id: TOOLS.select, icon: MousePointer2, label: "Select", key: "V" },
  { id: TOOLS.pan, icon: Hand, label: "Pan", key: "H" },
  { id: TOOLS.text, icon: Type, label: "Text", key: "T" },
  { id: TOOLS.hand, icon: PenTool, label: "Handwriting", key: "G" },
  { id: TOOLS.sticky, icon: StickyNote, label: "Sticky note", key: "S" },
  { id: TOOLS.bullet, icon: List, label: "Bullet list", key: "B" },
  { id: TOOLS.rect, icon: Square, label: "Rectangle", key: "R" },
  { id: TOOLS.ellipse, icon: Circle, label: "Ellipse", key: "O" },
  { id: TOOLS.diamond, icon: Diamond, label: "Diamond", key: "D" },
  { id: TOOLS.line, icon: Minus, label: "Line", key: "L" },
  { id: TOOLS.arrow, icon: ArrowUpRight, label: "Arrow", key: "A" },
  { id: TOOLS.draw, icon: Pencil, label: "Pen", key: "P" },
  { id: TOOLS.eraser, icon: Eraser, label: "Eraser", key: "E" },
];

const CHART_TYPES = [
  { type: "bar", label: "Bar chart", icon: BarChart3 },
  { type: "line", label: "Line chart", icon: LineChart },
  { type: "pie", label: "Pie chart", icon: PieChart },
  { type: "donut", label: "Donut chart", icon: Donut },
];

function ToolButton({ active, label, shortcut, onClick, children, ...props }) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={shortcut ? `${label} (${shortcut})` : label}
      aria-label={label}
      aria-pressed={active}
      className={cn(
        "focus-ring grid h-9 w-9 shrink-0 place-items-center rounded-xl transition-all duration-150",
        active ? "brand-gradient text-white shadow-[var(--shadow-brand)]" : "text-muted hover:bg-surface-2 hover:text-ink",
      )}
      {...props}
    >
      {children}
    </button>
  );
}

// Rendered outside the toolbar's scroll container, which would otherwise clip it.
function ChartMenu({ open, onClose, onChart }) {
  const ref = useRef(null);
  useEffect(() => {
    if (!open) return;
    const onDown = (e) => {
      if (ref.current?.contains(e.target) || e.target.closest?.("[data-chart-toggle]")) return;
      onClose();
    };
    document.addEventListener("pointerdown", onDown);
    return () => document.removeEventListener("pointerdown", onDown);
  }, [open, onClose]);

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          ref={ref}
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 6 }}
          transition={{ duration: 0.14 }}
          className="card pointer-events-auto absolute right-2 bottom-full mb-2 w-44 rounded-2xl p-1.5 shadow-[var(--shadow-lift)]"
        >
          {CHART_TYPES.map(({ type, label, icon: Icon }) => (
            <button
              key={type}
              type="button"
              onClick={() => {
                onClose();
                onChart(type);
              }}
              className="flex w-full items-center gap-2.5 rounded-xl px-2.5 py-2 text-sm text-ink transition-colors hover:bg-surface-2"
            >
              <Icon className="h-4 w-4 text-brand-600" />
              {label}
            </button>
          ))}
        </motion.div>
      )}
    </AnimatePresence>
  );
}

export default function Toolbar({ tool, setTool, onImage, onChart, emojiOpen, onEmojiToggle }) {
  const [chartOpen, setChartOpen] = useState(false);
  return (
    <div className="pointer-events-none absolute inset-x-0 bottom-4 z-30 flex justify-center px-4">
      <div className="relative max-w-full">
        <div className="glass no-scrollbar pointer-events-auto flex max-w-full items-center gap-0.5 overflow-x-auto rounded-2xl border border-line p-1.5 shadow-[var(--shadow-lift)]">
          {TOOL_ITEMS.map(({ id, icon: Icon, label, key }) => (
            <ToolButton key={id} active={tool === id} label={label} shortcut={key} onClick={() => setTool(id)}>
              <Icon className="h-4.5 w-4.5" />
            </ToolButton>
          ))}
          <span className="mx-1 h-6 w-px shrink-0 bg-line" />
          <ToolButton label="Image" onClick={onImage}>
            <ImagePlus className="h-4.5 w-4.5" />
          </ToolButton>
          <ToolButton label="Chart" active={chartOpen} onClick={() => setChartOpen((o) => !o)} data-chart-toggle>
            <BarChart3 className="h-4.5 w-4.5" />
          </ToolButton>
          <ToolButton label="Emoji" active={emojiOpen} onClick={onEmojiToggle} data-emoji-toggle>
            <Smile className="h-4.5 w-4.5" />
          </ToolButton>
        </div>
        <ChartMenu open={chartOpen} onClose={() => setChartOpen(false)} onChart={onChart} />
      </div>
    </div>
  );
}
