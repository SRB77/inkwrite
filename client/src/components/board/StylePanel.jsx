import { FILL_COLORS, FONT_SIZES, STICKY_COLORS, STROKE_COLORS, STROKE_WIDTHS, TOOLS } from "../../lib/canvas";
import { cn } from "../../lib/utils";

const SHAPES = ["rect", "ellipse", "diamond"];
const STROKED = [...SHAPES, "line", "arrow", "draw"];
const FILLABLE = [...SHAPES, "sticky"];
const TEXTUAL = ["text", "sticky", "bullet"];
const COLORED_TEXT = ["text", "bullet"];
const SKETCHABLE = [...SHAPES, "line", "arrow"];
const BULLET_STYLES = [
  { value: "disc", label: "•" },
  { value: "circle", label: "◦" },
  { value: "square", label: "▪" },
  { value: "decimal", label: "1." },
  { value: "none", label: "—" },
];

// Element type a creation tool produces.
const TOOL_TYPES = {
  [TOOLS.text]: "text",
  [TOOLS.hand]: "text",
  [TOOLS.sticky]: "sticky",
  [TOOLS.bullet]: "bullet",
  [TOOLS.rect]: "rect",
  [TOOLS.ellipse]: "ellipse",
  [TOOLS.diamond]: "diamond",
  [TOOLS.line]: "line",
  [TOOLS.arrow]: "arrow",
  [TOOLS.draw]: "draw",
};

const anyOf = (types, group) => types.some((t) => group.includes(t));

function Section({ title, children }) {
  return (
    <div className="py-2 first:pt-0 last:pb-0">
      <div className="mb-1.5 text-[11px] font-medium tracking-wide text-faint uppercase">{title}</div>
      {children}
    </div>
  );
}

function Swatches({ colors, value, onPick }) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {colors.map((c) => (
        <button
          key={c}
          type="button"
          onClick={() => onPick(c)}
          aria-label={c === "transparent" ? "No fill" : c}
          className={cn(
            "relative h-6 w-6 overflow-hidden rounded-full border border-line transition-transform hover:scale-110",
            value === c && "ring-2 ring-brand-500 ring-offset-1",
          )}
          style={{ backgroundColor: c === "transparent" ? "#fff" : c }}
        >
          {c === "transparent" && <span className="absolute inset-0 m-auto h-px w-7 rotate-45 bg-danger" />}
        </button>
      ))}
    </div>
  );
}

function Segmented({ options, value, onPick }) {
  return (
    <div className="flex gap-1">
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          onClick={() => onPick(o.value)}
          title={o.title}
          className={cn(
            "focus-ring h-8 min-w-8 flex-1 rounded-lg px-1.5 text-xs font-medium transition-colors",
            value === o.value ? "bg-brand-50 text-brand-700 ring-1 ring-brand-300" : "bg-surface-2 text-muted hover:text-ink",
          )}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

export default function StylePanel({ style, tool, selectedEls = [], onChange }) {
  const types = selectedEls.length ? [...new Set(selectedEls.map((el) => el.type))] : TOOL_TYPES[tool] ? [TOOL_TYPES[tool]] : [];
  if (!types.length) return null;

  // Reflect a single selected element's own values; otherwise the current tool style.
  const single = selectedEls.length === 1 ? selectedEls[0].data || {} : null;
  const v = {
    ...style,
    ...single,
    font: single ? single.font || "normal" : tool === TOOLS.hand ? "hand" : style.font || "normal",
    sketch: single ? Boolean(single.sketch) : style.sketch,
  };
  const onlySticky = types.every((t) => t === "sticky");

  const sections = [
    anyOf(types, STROKED) && (
      <Section key="stroke" title="Stroke">
        <Swatches colors={STROKE_COLORS} value={v.stroke} onPick={(stroke) => onChange({ stroke })} />
      </Section>
    ),
    anyOf(types, FILLABLE) && (
      <Section key="fill" title={onlySticky ? "Colour" : "Fill"}>
        <Swatches colors={onlySticky ? STICKY_COLORS : FILL_COLORS} value={v.fill} onPick={(fill) => onChange({ fill })} />
      </Section>
    ),
    anyOf(types, STROKED) && (
      <Section key="width" title="Width">
        <Segmented
          value={v.strokeWidth}
          onPick={(strokeWidth) => onChange({ strokeWidth })}
          options={STROKE_WIDTHS.map((w) => ({
            value: w,
            title: `${w}px`,
            label: <span className="mx-auto block rounded-full bg-current" style={{ height: Math.max(2, w / 1.5), width: 18 }} />,
          }))}
        />
      </Section>
    ),
    anyOf(types, COLORED_TEXT) && (
      <Section key="color" title="Text colour">
        <Swatches colors={STROKE_COLORS} value={v.color} onPick={(color) => onChange({ color })} />
      </Section>
    ),
    anyOf(types, TEXTUAL) && (
      <Section key="size" title="Size">
        <Segmented
          value={v.fontSize}
          onPick={(fontSize) => onChange({ fontSize })}
          options={FONT_SIZES.map((s) => ({ value: s, label: s }))}
        />
      </Section>
    ),
    anyOf(types, [...TEXTUAL, ...SHAPES]) && (
      <Section key="font" title="Font">
        <Segmented
          value={v.font}
          onPick={(font) => onChange({ font })}
          options={[
            { value: "normal", label: <span className="font-sans">Aa Clean</span> },
            { value: "hand", label: <span className="font-['Caveat'] text-sm">Aa Hand</span> },
          ]}
        />
      </Section>
    ),
    anyOf(types, SKETCHABLE) && (
      <Section key="sketch" title="Style">
        <Segmented
          value={Boolean(v.sketch)}
          onPick={(sketch) => onChange({ sketch })}
          options={[
            { value: false, label: "Crisp" },
            { value: true, label: "Hand-drawn" },
          ]}
        />
      </Section>
    ),
    types.includes("bullet") && (
      <Section key="bullets" title="Bullets">
        <Segmented value={v.bulletStyle} onPick={(bulletStyle) => onChange({ bulletStyle })} options={BULLET_STYLES} />
      </Section>
    ),
  ].filter(Boolean);

  if (!sections.length) return null;

  return (
    <div
      className="glass animate-in absolute top-1/2 left-3 z-30 hidden w-56 -translate-y-1/2 divide-y divide-line rounded-2xl border border-line p-3 shadow-[var(--shadow-soft)] md:block"
      onPointerDown={(e) => e.stopPropagation()}
    >
      {sections}
    </div>
  );
}
