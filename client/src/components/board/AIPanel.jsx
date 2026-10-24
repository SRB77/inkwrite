import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import toast from "react-hot-toast";
import { BarChart3, FileText, GitBranch, ListTree, Loader2, Sparkles, StickyNote, Wand2, X } from "lucide-react";
import Button from "../ui/Button";
import { aiApi } from "../../lib/api";
import { cn } from "../../lib/utils";

const CREATE_ACTIONS = [
  { key: "brainstorm", label: "Sticky notes", icon: StickyNote },
  { key: "outline", label: "Outline", icon: ListTree },
  { key: "diagram", label: "Flow diagram", icon: GitBranch },
  { key: "chart", label: "Chart", icon: BarChart3 },
];

function Divider({ children }) {
  return (
    <div className="my-4 flex items-center gap-3 text-[11px] font-medium tracking-wide text-faint uppercase">
      <span className="h-px flex-1 bg-line" />
      {children}
      <span className="h-px flex-1 bg-line" />
    </div>
  );
}

function SummarySection({ title, items }) {
  if (!items?.length) return null;
  return (
    <div className="mt-3">
      <h4 className="text-xs font-semibold text-ink">{title}</h4>
      <ul className="mt-1 list-disc space-y-0.5 pl-4 text-xs text-muted">
        {items.map((item, i) => (
          <li key={i}>{item}</li>
        ))}
      </ul>
    </div>
  );
}

function SummaryView({ summary }) {
  return (
    <div className="animate-in mt-3 max-h-64 overflow-y-auto rounded-xl bg-surface-2 p-3">
      {summary.headline && <p className="text-sm font-medium text-ink">{summary.headline}</p>}
      <SummarySection title="Themes" items={summary.themes} />
      <SummarySection title="Action items" items={summary.actionItems} />
      <SummarySection title="Open questions" items={summary.questions} />
    </div>
  );
}

export default function AIPanel({ open, onClose, boardId, selectedIds = [], getDropPoint, onElementsCreated, onElementsUpdated }) {
  const [topic, setTopic] = useState("");
  const [count, setCount] = useState(6);
  const [busy, setBusy] = useState(null);
  const [summary, setSummary] = useState(null);
  const hasSelection = selectedIds.length > 0;

  async function run(key, fn) {
    setBusy(key);
    try {
      await fn();
    } catch (err) {
      toast.error(err.message);
    } finally {
      setBusy(null);
    }
  }

  function requireTopic() {
    if (topic.trim()) return true;
    toast.error(hasSelection ? "Describe how to change the selection" : "Describe what you want to create");
    return false;
  }

  const editSelection = () =>
    requireTopic() &&
    run("edit", async () => {
      const elements = await aiApi.edit(boardId, { instruction: topic.trim(), ids: selectedIds });
      onElementsUpdated?.(elements);
      toast.success(`Updated ${elements.length} ${elements.length === 1 ? "item" : "items"}`);
    });

  const create = (key) =>
    requireTopic() &&
    run(key, async () => {
      const { x, y } = getDropPoint?.() || {};
      const elements = await aiApi[key](boardId, { topic: topic.trim(), count, x, y });
      onElementsCreated?.(elements);
      toast.success(`Added ${elements.length} ${elements.length === 1 ? "item" : "items"}`);
    });

  const summarize = () =>
    run("summary", async () => {
      setSummary(await aiApi.summary(boardId));
    });

  return (
    <AnimatePresence>
      {open && (
        <motion.aside
          initial={{ opacity: 0, x: 24 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: 24 }}
          transition={{ type: "spring", stiffness: 420, damping: 36 }}
          className="card absolute top-16 right-4 z-30 flex max-h-[calc(100%-5rem)] w-80 flex-col rounded-2xl shadow-[var(--shadow-lift)]"
          onPointerDown={(e) => e.stopPropagation()}
        >
          <header className="flex items-center justify-between border-b border-line px-4 py-3">
            <div className="flex items-center gap-2">
              <span className="grid h-7 w-7 place-items-center rounded-lg bg-brand-50 text-brand-600">
                <Sparkles className="h-4 w-4" />
              </span>
              <h2 className="font-display text-sm font-semibold">AI assistant</h2>
            </div>
            <Button variant="ghost" size="iconSm" onClick={onClose} aria-label="Close AI assistant">
              <X className="h-4 w-4" />
            </Button>
          </header>

          <div className="overflow-y-auto p-4">
            <textarea
              rows={3}
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              onKeyDown={(e) => e.stopPropagation()}
              placeholder={
                hasSelection
                  ? "How should the selection change? e.g. “make these more concise”"
                  : "What should I create? e.g. “launch plan for a mobile app”"
              }
              className="input-base resize-none rounded-2xl"
            />

            {hasSelection && (
              <>
                <Button
                  variant="soft"
                  className="mt-3 w-full"
                  loading={busy === "edit"}
                  disabled={Boolean(busy)}
                  onClick={editSelection}
                >
                  {busy !== "edit" && <Wand2 className="h-4 w-4" />}
                  Edit {selectedIds.length} selected
                </Button>
                <Divider>or create new</Divider>
              </>
            )}

            <label className={cn("block", !hasSelection && "mt-4")}>
              <span className="flex items-center justify-between text-xs font-medium text-muted">
                Items <span className="tabular text-ink">{count}</span>
              </span>
              <input
                type="range"
                min={3}
                max={12}
                value={count}
                onChange={(e) => setCount(Number(e.target.value))}
                className="mt-2 w-full accent-brand-500"
              />
            </label>

            <div className="mt-3 grid grid-cols-2 gap-2">
              {CREATE_ACTIONS.map(({ key, label, icon: Icon }) => (
                <button
                  key={key}
                  type="button"
                  disabled={Boolean(busy)}
                  onClick={() => create(key)}
                  className="focus-ring flex flex-col items-center gap-1.5 rounded-xl border border-line bg-surface px-2 py-3 text-xs font-medium text-ink transition-all hover:border-brand-300 hover:bg-brand-50/50 disabled:opacity-50"
                >
                  {busy === key ? (
                    <Loader2 className="h-4 w-4 animate-spin text-brand-500" />
                  ) : (
                    <Icon className="h-4 w-4 text-brand-600" />
                  )}
                  {label}
                </button>
              ))}
            </div>

            <Divider>board</Divider>

            <Button
              variant="secondary"
              className="w-full"
              loading={busy === "summary"}
              disabled={Boolean(busy)}
              onClick={summarize}
            >
              {busy !== "summary" && <FileText className="h-4 w-4" />}
              Summarize this board
            </Button>
            {summary && <SummaryView summary={summary} />}
          </div>
        </motion.aside>
      )}
    </AnimatePresence>
  );
}
