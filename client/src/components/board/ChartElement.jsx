export const CHART_PALETTE = ["#2f8159", "#2563eb", "#e11d48", "#d97706", "#7c3aed", "#0891b2", "#ec4899", "#16a34a"];

const AXIS = "#e2e0f0";
const INK = "#16161d";
const MUTED = "#5d5d6e";
const FONT = "Inter, sans-serif";

export function defaultChartData(chartType = "bar") {
  const titles = { bar: "Quarterly revenue", line: "Weekly active users", pie: "Traffic sources", donut: "Time spent" };
  const data =
    chartType === "line"
      ? [
          { label: "W1", value: 120 },
          { label: "W2", value: 180 },
          { label: "W3", value: 150 },
          { label: "W4", value: 240 },
          { label: "W5", value: 290 },
        ]
      : chartType === "pie" || chartType === "donut"
        ? [
            { label: "Search", value: 45 },
            { label: "Social", value: 25 },
            { label: "Direct", value: 20 },
            { label: "Other", value: 10 },
          ]
        : [
            { label: "Q1", value: 32 },
            { label: "Q2", value: 48 },
            { label: "Q3", value: 41 },
            { label: "Q4", value: 64 },
          ];
  return { chartType, title: titles[chartType] || titles.bar, data };
}

const colorAt = (d, i) => d.color || CHART_PALETTE[i % CHART_PALETTE.length];

function BarChart({ data, x, y, w, h }) {
  const max = Math.max(1, ...data.map((d) => Number(d.value) || 0));
  const slot = w / Math.max(1, data.length);
  const barW = Math.min(60, slot * 0.62);
  const baseY = y + h;
  return (
    <g>
      <line x1={x} y1={y} x2={x} y2={baseY} stroke={AXIS} />
      <line x1={x} y1={baseY} x2={x + w} y2={baseY} stroke={AXIS} />
      {data.map((d, i) => {
        const v = Number(d.value) || 0;
        const bh = (v / max) * (h - 16);
        const bx = x + slot * i + (slot - barW) / 2;
        const cx = bx + barW / 2;
        return (
          <g key={i}>
            <rect x={bx} y={baseY - bh} width={barW} height={bh} rx={4} fill={colorAt(d, i)} />
            <text x={cx} y={baseY - bh - 5} textAnchor="middle" fontSize={11} fontWeight={600} fill={INK} fontFamily={FONT}>
              {v}
            </text>
            <text x={cx} y={baseY + 15} textAnchor="middle" fontSize={11} fill={MUTED} fontFamily={FONT}>
              {d.label}
            </text>
          </g>
        );
      })}
    </g>
  );
}

function LineChart({ data, x, y, w, h }) {
  const values = data.map((d) => Number(d.value) || 0);
  const max = Math.max(1, ...values);
  const min = Math.min(0, ...values);
  const step = data.length > 1 ? w / (data.length - 1) : 0;
  const pts = values.map((v, i) => [x + (data.length > 1 ? step * i : w / 2), y + h - ((v - min) / (max - min || 1)) * h]);
  const color = data[0]?.color || CHART_PALETTE[0];
  return (
    <g>
      <line x1={x} y1={y + h} x2={x + w} y2={y + h} stroke={AXIS} />
      <polyline
        points={pts.map((p) => p.join(",")).join(" ")}
        fill="none"
        stroke={color}
        strokeWidth={2.5}
        strokeLinejoin="round"
        strokeLinecap="round"
      />
      {pts.map(([px, py], i) => (
        <g key={i}>
          <circle cx={px} cy={py} r={3.5} fill="#fff" stroke={color} strokeWidth={2} />
          <text x={px} y={y + h + 15} textAnchor="middle" fontSize={11} fill={MUTED} fontFamily={FONT}>
            {data[i].label}
          </text>
        </g>
      ))}
    </g>
  );
}

function arcPath(cx, cy, r, ri, a0, a1) {
  const large = a1 - a0 > Math.PI ? 1 : 0;
  const p = (rad, a) => `${cx + rad * Math.cos(a)} ${cy + rad * Math.sin(a)}`;
  if (!ri) return `M ${cx} ${cy} L ${p(r, a0)} A ${r} ${r} 0 ${large} 1 ${p(r, a1)} Z`;
  return `M ${p(r, a0)} A ${r} ${r} 0 ${large} 1 ${p(r, a1)} L ${p(ri, a1)} A ${ri} ${ri} 0 ${large} 0 ${p(ri, a0)} Z`;
}

function PieChart({ data, x, y, w, h, donut }) {
  const total = data.reduce((s, d) => s + (Number(d.value) || 0), 0) || 1;
  const legendW = Math.min(130, w * 0.42);
  const r = Math.max(10, Math.min((w - legendW - 12) / 2, h / 2));
  const cx = x + r;
  const cy = y + h / 2;
  const ri = donut ? r * 0.58 : 0;

  const fracs = data.map((d) => (Number(d.value) || 0) / total);
  const slices = fracs.map((frac, i) => {
    const a0 = -Math.PI / 2 + fracs.slice(0, i).reduce((s, f) => s + f, 0) * Math.PI * 2;
    // A full circle can't be drawn as a single arc; nudge it just short.
    const a1 = a0 + Math.min(frac, 0.9999) * Math.PI * 2;
    return { d: arcPath(cx, cy, r, ri, a0, a1), color: colorAt(data[i], i), pct: Math.round(frac * 100) };
  });

  const lx = x + r * 2 + 16;
  const ly = cy - (data.length * 18) / 2 + 9;
  return (
    <g>
      {slices.map((s, i) => (
        <path key={i} d={s.d} fill={s.color} stroke="#fff" strokeWidth={1.5} />
      ))}
      {data.map((d, i) => (
        <g key={i} transform={`translate(${lx}, ${ly + i * 18})`}>
          <rect x={0} y={-5} width={10} height={10} rx={2} fill={slices[i].color} />
          <text x={16} y={4} fontSize={11} fill={INK} fontFamily={FONT}>
            {d.label} <tspan fill={MUTED}>{slices[i].pct}%</tspan>
          </text>
        </g>
      ))}
    </g>
  );
}

export default function ChartElement({ element }) {
  const d = element.data || {};
  const { x = 0, y = 0, w = 360, h = 240 } = d;
  const data = Array.isArray(d.data) ? d.data : [];
  const chartType = d.chartType || "bar";

  const padX = 24;
  const top = d.title ? 40 : 18;
  const bottom = chartType === "pie" || chartType === "donut" ? 16 : 30;
  const area = { x: x + padX, y: y + top, w: Math.max(10, w - padX * 2), h: Math.max(10, h - top - bottom) };

  return (
    <g>
      <rect x={x} y={y} width={w} height={h} rx={12} fill="#fff" stroke="#e9e8f3" />
      {d.title && (
        <text x={x + w / 2} y={y + 25} textAnchor="middle" fontSize={14} fontWeight={700} fill={INK} fontFamily={FONT}>
          {d.title}
        </text>
      )}
      {data.length > 0 &&
        (chartType === "line" ? (
          <LineChart data={data} {...area} />
        ) : chartType === "pie" || chartType === "donut" ? (
          <PieChart data={data} {...area} donut={chartType === "donut"} />
        ) : (
          <BarChart data={data} {...area} />
        ))}
    </g>
  );
}
