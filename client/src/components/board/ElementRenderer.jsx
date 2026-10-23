import { arrowHead, diamondPoints, fontFamilyFor, getBounds, strokeToPath } from "../../lib/canvas";
import { seededRandom, sketchEllipse, sketchLine, sketchPolygon, sketchRect } from "../../lib/sketch";
import ChartElement from "./ChartElement";

const INK = "#16161d";

function Shape({ element, editing }) {
  const d = element.data || {};
  const b = getBounds(element);
  const fill = d.fill && d.fill !== "transparent" ? d.fill : "transparent";
  const stroke = d.stroke || INK;
  const strokeWidth = d.strokeWidth ?? 2;

  let base;
  let sketchPath = null;
  if (element.type === "ellipse") {
    const cx = b.x + b.w / 2;
    const cy = b.y + b.h / 2;
    base = <ellipse cx={cx} cy={cy} rx={b.w / 2} ry={b.h / 2} fill={fill} stroke={stroke} strokeWidth={strokeWidth} />;
    if (d.sketch) sketchPath = sketchEllipse(cx, cy, b.w / 2, b.h / 2, seededRandom(element.id));
  } else if (element.type === "diamond") {
    const pts = diamondPoints(b);
    base = <polygon points={pts} fill={fill} stroke={stroke} strokeWidth={strokeWidth} strokeLinejoin="round" />;
    if (d.sketch) {
      const poly = pts.split(" ").map((p) => p.split(",").map(Number));
      sketchPath = sketchPolygon(poly, seededRandom(element.id));
    }
  } else {
    base = (
      <rect
        x={b.x}
        y={b.y}
        width={b.w}
        height={b.h}
        rx={d.radius ?? 8}
        fill={fill}
        stroke={stroke}
        strokeWidth={strokeWidth}
      />
    );
    if (d.sketch) sketchPath = sketchRect(b.x, b.y, b.w, b.h, seededRandom(element.id));
  }

  return (
    <g>
      {/* Sketchy shapes fill their own wobbly path so no straight edge peeks out. */}
      {!sketchPath && base}
      {sketchPath && (
        <path d={sketchPath} fill={fill} stroke={stroke} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" />
      )}
      {d.label && !editing && (
        <foreignObject x={b.x} y={b.y} width={b.w} height={b.h}>
          <div
            style={{
              width: "100%",
              height: "100%",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              textAlign: "center",
              padding: 8,
              boxSizing: "border-box",
              fontSize: d.font === "hand" ? 16 : 14,
              fontFamily: fontFamilyFor(d.font),
              color: INK,
              overflowWrap: "break-word",
              whiteSpace: "pre-wrap",
            }}
          >
            {d.label}
          </div>
        </foreignObject>
      )}
    </g>
  );
}

function LineEl({ element }) {
  const d = element.data || {};
  const stroke = d.stroke || INK;
  const strokeWidth = d.strokeWidth ?? 2;
  const isArrow = element.type === "arrow";
  return (
    <g>
      {d.sketch ? (
        <path
          d={sketchLine(d.x1, d.y1, d.x2, d.y2, seededRandom(element.id))}
          fill="none"
          stroke={stroke}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
        />
      ) : (
        <line x1={d.x1} y1={d.y1} x2={d.x2} y2={d.y2} stroke={stroke} strokeWidth={strokeWidth} strokeLinecap="round" />
      )}
      {isArrow && (
        <polygon
          points={arrowHead(d.x1, d.y1, d.x2, d.y2, 10 + strokeWidth * 2)}
          fill={stroke}
          stroke={stroke}
          strokeWidth={1}
          strokeLinejoin="round"
        />
      )}
    </g>
  );
}

function Sticky({ element, editing }) {
  const d = element.data || {};
  const b = getBounds(element);
  const hand = d.font === "hand";
  return (
    <g>
      <rect x={b.x} y={b.y} width={b.w} height={b.h} rx={10} fill={d.fill || "#fde68a"} stroke="rgba(22,22,29,0.08)" />
      {!editing && (
        <foreignObject x={b.x} y={b.y} width={b.w} height={b.h}>
          <div
            style={{
              width: "100%",
              height: "100%",
              padding: 14,
              boxSizing: "border-box",
              overflow: "hidden",
              whiteSpace: "pre-wrap",
              overflowWrap: "break-word",
              fontSize: d.fontSize || (hand ? 22 : 16),
              lineHeight: hand ? 1.15 : 1.35,
              fontFamily: fontFamilyFor(d.font),
              color: d.color || INK,
            }}
          >
            {d.text}
          </div>
        </foreignObject>
      )}
    </g>
  );
}

function TextEl({ element, editing }) {
  const d = element.data || {};
  const b = getBounds(element);
  if (editing) return null;
  return (
    <foreignObject x={b.x} y={b.y} width={b.w} height={b.h}>
      <div
        style={{
          fontSize: d.fontSize || 20,
          fontWeight: d.weight || 500,
          fontFamily: fontFamilyFor(d.font),
          lineHeight: 1.35,
          whiteSpace: "pre-wrap",
          overflowWrap: "break-word",
          color: d.color || INK,
        }}
      >
        {d.text}
      </div>
    </foreignObject>
  );
}

function BulletEl({ element, editing }) {
  const d = element.data || {};
  const b = getBounds(element);
  if (editing) return null;
  const ordered = d.bulletStyle === "decimal";
  const List = ordered ? "ol" : "ul";
  return (
    <foreignObject x={b.x} y={b.y} width={b.w} height={b.h}>
      <List
        style={{
          margin: 0,
          padding: "6px 0 6px 1.3em",
          listStyleType: d.bulletStyle || "disc",
          fontSize: d.fontSize || 16,
          lineHeight: 1.7,
          fontFamily: fontFamilyFor(d.font),
          color: d.color || INK,
        }}
      >
        {(d.items || []).map((item, i) => (
          <li key={i} style={{ overflowWrap: "break-word" }}>
            {item}
          </li>
        ))}
      </List>
    </foreignObject>
  );
}

export default function ElementRenderer({ element, editing = false }) {
  const d = element.data || {};
  switch (element.type) {
    case "rect":
    case "ellipse":
    case "diamond":
      return <Shape element={element} editing={editing} />;
    case "line":
    case "arrow":
      return <LineEl element={element} />;
    case "draw":
      return <path d={strokeToPath(d.points, d.strokeWidth || 4)} fill={d.stroke || INK} stroke="none" />;
    case "image": {
      const b = getBounds(element);
      return <image href={d.src || d.url} x={b.x} y={b.y} width={b.w} height={b.h} preserveAspectRatio="xMidYMid slice" />;
    }
    case "emoji": {
      const b = getBounds(element);
      return (
        <text
          x={b.x + b.w / 2}
          y={b.y + b.h / 2}
          fontSize={Math.min(b.w, b.h) * 0.86}
          textAnchor="middle"
          dominantBaseline="central"
        >
          {d.emoji || d.text}
        </text>
      );
    }
    case "sticky":
      return <Sticky element={element} editing={editing} />;
    case "text":
      return <TextEl element={element} editing={editing} />;
    case "bullet":
      return <BulletEl element={element} editing={editing} />;
    case "chart":
      return <ChartElement element={element} />;
    default:
      return null;
  }
}
