import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import {
  ArrowLeft,
  Download,
  Eye,
  Minus,
  Palette,
  Plus,
  Redo2,
  Share2,
  Sparkles,
  Undo2,
} from "lucide-react";
import Button from "../ui/Button";
import Avatar from "../ui/Avatar";
import { cn } from "../../lib/utils";

const BACKGROUNDS = [
  { value: "dots", label: "Dotted grid" },
  { value: "grid", label: "Lined grid" },
  { value: "plain", label: "Plain" },
];
const BG_COLORS = ["#ffffff", "#f7f7fb", "#fffbeb", "#f0fdf4", "#eff6ff", "#fdf2f8"];

function useDismiss(open, close) {
  const ref = useRef(null);
  useEffect(() => {
    if (!open) return;
    const onDown = (e) => !ref.current?.contains(e.target) && close();
    const onKey = (e) => e.key === "Escape" && close();
    document.addEventListener("pointerdown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open, close]);
  return ref;
}

function Popover({ open, children, className }) {
  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0, y: -4, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -4, scale: 0.98 }}
          transition={{ duration: 0.14 }}
          className={cn("card absolute top-11 z-40 rounded-2xl p-2 shadow-[var(--shadow-lift)]", className)}
        >
          {children}
        </motion.div>
      )}
    </AnimatePresence>
  );
}

const Divider = () => <span className="mx-1 h-5 w-px bg-line" />;

function TitleField({ title, canEdit, onRename }) {
  const [draft, setDraft] = useState(title);
  const [prevTitle, setPrevTitle] = useState(title);
  if (title !== prevTitle) {
    // Follow remote renames while not typing.
    setPrevTitle(title);
    setDraft(title);
  }
  if (!canEdit) return <span className="max-w-[14rem] truncate px-2 font-display text-sm font-semibold">{title}</span>;
  const commit = () => (draft.trim() ? onRename(draft) : setDraft(title));
  return (
    <input
      value={draft}
      onChange={(e) => setDraft(e.target.value)}
      onBlur={commit}
      onKeyDown={(e) => {
        if (e.key === "Enter") e.currentTarget.blur();
        if (e.key === "Escape") {
          setDraft(title);
          e.currentTarget.blur();
        }
      }}
      aria-label="Whiteboard title"
      className="focus-ring w-40 truncate rounded-lg bg-transparent px-2 py-1 font-display text-sm font-semibold outline-none hover:bg-surface-2 focus:bg-surface-2 sm:w-56"
    />
  );
}

function BackgroundMenu({ board, onBoardMeta, onPreviewBgColor }) {
  const [open, setOpen] = useState(false);
  const ref = useDismiss(open, () => setOpen(false));
  return (
    <div ref={ref} className="relative">
      <Button variant="ghost" size="iconSm" onClick={() => setOpen((o) => !o)} aria-label="Background" title="Background">
        <Palette className="h-4 w-4" />
      </Button>
      <Popover open={open} className="left-0 w-56">
        <div className="px-2 pt-1 pb-2 text-xs font-medium text-muted">Background</div>
        {BACKGROUNDS.map((b) => (
          <button
            key={b.value}
            type="button"
            onClick={() => onBoardMeta({ background: b.value })}
            className={cn(
              "flex w-full items-center rounded-xl px-2.5 py-2 text-left text-sm transition-colors hover:bg-surface-2",
              board.background === b.value ? "font-semibold text-brand-700" : "text-ink",
            )}
          >
            {b.label}
          </button>
        ))}
        <div className="my-2 h-px bg-line" />
        <div className="flex flex-wrap items-center gap-1.5 px-2 pb-1">
          {BG_COLORS.map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => onBoardMeta({ bg_color: c })}
              aria-label={`Background colour ${c}`}
              className={cn(
                "h-6 w-6 rounded-full border border-line transition-transform hover:scale-110",
                board.bg_color === c && "ring-2 ring-brand-500 ring-offset-2",
              )}
              style={{ backgroundColor: c }}
            />
          ))}
          <input
            type="color"
            value={board.bg_color || "#ffffff"}
            onChange={(e) => onPreviewBgColor(e.target.value)}
            onBlur={(e) => onBoardMeta({ bg_color: e.target.value })}
            aria-label="Custom background colour"
            className="h-6 w-6 cursor-pointer rounded-full border border-line p-0 [&::-webkit-color-swatch]:rounded-full [&::-webkit-color-swatch]:border-none [&::-webkit-color-swatch-wrapper]:p-0"
          />
        </div>
      </Popover>
    </div>
  );
}

function ExportMenu({ onExport }) {
  const [open, setOpen] = useState(false);
  const ref = useDismiss(open, () => setOpen(false));
  const pick = (format) => {
    setOpen(false);
    onExport(format);
  };
  return (
    <div ref={ref} className="relative">
      <Button variant="ghost" size="iconSm" onClick={() => setOpen((o) => !o)} aria-label="Export" title="Export">
        <Download className="h-4 w-4" />
      </Button>
      <Popover open={open} className="right-0 w-44">
        {[
          ["png", "Export as PNG"],
          ["svg", "Export as SVG"],
        ].map(([format, label]) => (
          <button
            key={format}
            type="button"
            onClick={() => pick(format)}
            className="flex w-full rounded-xl px-2.5 py-2 text-left text-sm text-ink transition-colors hover:bg-surface-2"
          >
            {label}
          </button>
        ))}
      </Popover>
    </div>
  );
}

function Viewers({ viewers }) {
  if (!viewers.length) return null;
  const shown = viewers.slice(0, 4);
  return (
    <div className="flex items-center -space-x-2 pr-1" title={viewers.map((v) => v.name).join(", ")}>
      {shown.map((v) => (
        <Avatar key={v.id} user={v} size="sm" ring />
      ))}
      {viewers.length > shown.length && (
        <span className="grid h-7 w-7 place-items-center rounded-full bg-surface-2 text-[10px] font-semibold text-muted ring-2 ring-surface">
          +{viewers.length - shown.length}
        </span>
      )}
    </div>
  );
}

export default function TopBar({
  board,
  canEdit,
  viewers = [],
  zoom,
  canUndo,
  canRedo,
  onUndo,
  onRedo,
  onZoomIn,
  onZoomOut,
  onZoomReset,
  onRename,
  onBoardMeta,
  onPreviewBgColor,
  onExport,
  onShare,
  aiOpen,
  onToggleAI,
}) {
  return (
    <div className="pointer-events-none absolute inset-x-0 top-0 z-30 flex items-start justify-between gap-2 p-3">
      <div className="glass pointer-events-auto flex items-center gap-1 rounded-2xl border border-line p-1.5 shadow-[var(--shadow-soft)]">
        <Button as={Link} to="/dashboard" variant="ghost" size="iconSm" aria-label="Back to dashboard" title="Back to dashboard">
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <Divider />
        <TitleField title={board.title} canEdit={canEdit} onRename={onRename} />
        {canEdit ? (
          <BackgroundMenu board={board} onBoardMeta={onBoardMeta} onPreviewBgColor={onPreviewBgColor} />
        ) : (
          <span className="flex items-center gap-1 rounded-full bg-surface-2 px-2.5 py-1 text-xs font-medium text-muted">
            <Eye className="h-3.5 w-3.5" />
            View only
          </span>
        )}
      </div>

      <div className="glass pointer-events-auto flex items-center gap-1 rounded-2xl border border-line p-1.5 shadow-[var(--shadow-soft)]">
        <Viewers viewers={viewers} />
        {viewers.length > 0 && <Divider />}
        {canEdit && (
          <div className="hidden items-center gap-1 sm:flex">
            <Button variant="ghost" size="iconSm" onClick={onUndo} disabled={!canUndo} aria-label="Undo" title="Undo (⌘Z)">
              <Undo2 className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="iconSm" onClick={onRedo} disabled={!canRedo} aria-label="Redo" title="Redo (⇧⌘Z)">
              <Redo2 className="h-4 w-4" />
            </Button>
            <Divider />
          </div>
        )}
        <div className="hidden items-center sm:flex">
          <Button variant="ghost" size="iconSm" onClick={onZoomOut} aria-label="Zoom out" title="Zoom out">
            <Minus className="h-4 w-4" />
          </Button>
          <button
            type="button"
            onClick={onZoomReset}
            title="Reset zoom"
            className="focus-ring tabular h-8 w-14 rounded-full text-xs font-semibold text-muted transition-colors hover:bg-surface-2 hover:text-ink"
          >
            {Math.round(zoom * 100)}%
          </button>
          <Button variant="ghost" size="iconSm" onClick={onZoomIn} aria-label="Zoom in" title="Zoom in">
            <Plus className="h-4 w-4" />
          </Button>
          <Divider />
        </div>
        <ExportMenu onExport={onExport} />
        {canEdit && (
          <Button
            variant={aiOpen ? "soft" : "ghost"}
            size="iconSm"
            onClick={onToggleAI}
            aria-label="AI assistant"
            title="AI assistant"
          >
            <Sparkles className="h-4 w-4" />
          </Button>
        )}
        <Button size="sm" onClick={onShare} className="ml-1">
          <Share2 className="h-3.5 w-3.5" />
          Share
        </Button>
      </div>
    </div>
  );
}
