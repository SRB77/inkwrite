import { useState } from "react";
import { BarChart3, Donut, LineChart, PieChart, Plus, Trash2 } from "lucide-react";
import Modal from "../ui/Modal";
import Button from "../ui/Button";
import { Input } from "../ui/Input";
import { CHART_PALETTE } from "./ChartElement";
import { cn } from "../../lib/utils";

const TYPES = [
  { key: "bar", label: "Bar", icon: BarChart3 },
  { key: "line", label: "Line", icon: LineChart },
  { key: "pie", label: "Pie", icon: PieChart },
  { key: "donut", label: "Donut", icon: Donut },
];

let rowKey = 0;
const withKey = (row, i) => ({
  key: ++rowKey,
  label: row.label ?? "",
  value: row.value ?? 0,
  color: row.color || CHART_PALETTE[i % CHART_PALETTE.length],
});

function ChartForm({ element, onClose, onSave }) {
  const d = element?.data || {};
  const [chartType, setChartType] = useState(d.chartType || "bar");
  const [title, setTitle] = useState(d.title || "");
  const [rows, setRows] = useState(() => (Array.isArray(d.data) ? d.data : []).map(withKey));

  const updateRow = (key, patch) => setRows((rs) => rs.map((r) => (r.key === key ? { ...r, ...patch } : r)));
  const addRow = () => setRows((rs) => [...rs, withKey({ label: `Item ${rs.length + 1}`, value: 10 }, rs.length)]);
  const removeRow = (key) => setRows((rs) => rs.filter((r) => r.key !== key));

  function save() {
    onSave({
      chartType,
      title: title.trim(),
      data: rows.map(({ label, value, color }) => ({ label: label.trim(), value: Number(value) || 0, color })),
    });
  }

  return (
    <Modal
      open
      onClose={onClose}
      title="Edit chart"
      size="md"
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={save} disabled={!rows.length}>
            Save chart
          </Button>
        </>
      }
    >
      <div className="grid grid-cols-4 gap-2" role="radiogroup" aria-label="Chart type">
        {TYPES.map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            type="button"
            role="radio"
            aria-checked={chartType === key}
            onClick={() => setChartType(key)}
            className={cn(
              "focus-ring flex flex-col items-center gap-1 rounded-xl border px-2 py-2.5 text-xs font-medium transition-all",
              chartType === key
                ? "border-brand-300 bg-brand-50 text-brand-700"
                : "border-line bg-surface text-muted hover:border-brand-300 hover:text-ink",
            )}
          >
            <Icon className="h-4 w-4" />
            {label}
          </button>
        ))}
      </div>

      <Input label="Title" className="mt-4" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Chart title" />

      <div className="mt-4">
        <div className="mb-1.5 flex items-center justify-between">
          <span className="text-xs font-medium text-muted">Data</span>
          <span className="tabular text-xs text-faint">{rows.length} rows</span>
        </div>
        <div className="max-h-64 space-y-2 overflow-y-auto pr-1">
          {rows.map((row) => (
            <div key={row.key} className="flex items-center gap-2">
              <input
                type="color"
                value={row.color}
                onChange={(e) => updateRow(row.key, { color: e.target.value })}
                aria-label="Colour"
                className="h-9 w-9 shrink-0 cursor-pointer rounded-full border border-line bg-surface p-1 [&::-moz-color-swatch]:rounded-full [&::-moz-color-swatch]:border-none [&::-webkit-color-swatch]:rounded-full [&::-webkit-color-swatch]:border-none [&::-webkit-color-swatch-wrapper]:p-0"
              />
              <Input
                className="flex-1"
                value={row.label}
                onChange={(e) => updateRow(row.key, { label: e.target.value })}
                placeholder="Label"
                aria-label="Label"
              />
              <Input
                type="number"
                className="w-24"
                value={row.value}
                onChange={(e) => updateRow(row.key, { value: e.target.value })}
                aria-label="Value"
              />
              <Button variant="ghost" size="iconSm" onClick={() => removeRow(row.key)} aria-label="Delete row" className="hover:text-danger">
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          ))}
        </div>
        <Button variant="soft" size="sm" className="mt-3" onClick={addRow}>
          <Plus className="h-3.5 w-3.5" />
          Add row
        </Button>
      </div>
    </Modal>
  );
}

export default function ChartEditor({ open, element, onClose, onSave }) {
  // Remount per element so local state always reseeds from element.data.
  if (!open || !element) return null;
  return <ChartForm key={element.id} element={element} onClose={onClose} onSave={onSave} />;
}
