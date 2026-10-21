// Native-SVG export. No foreignObject anywhere, so the SVG rasterizes cleanly to PNG.
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import ChartElement from "../components/board/ChartElement";
import { arrowHead, diamondPoints, fontFamilyFor, getBounds, strokeToPath, unionBounds } from "./canvas";
import { seededRandom, sketchEllipse, sketchLine, sketchPolygon, sketchRect } from "./sketch";
import { urlToDataURL } from "./image";

const INK = "#16161d";
const PADDING = 48;

const esc = (s) =>
  String(s ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
const n = (v) => Math.round(v * 100) / 100;

/* ---------- Text ---------- */

function wrapText(text, maxChars) {
  const lines = [];
  for (const para of String(text ?? "").split("\n")) {
    let line = "";
    for (let word of para.split(" ")) {
      while (word.length > maxChars) {
        if (line) lines.push(line);
        lines.push(word.slice(0, maxChars));
        word = word.slice(maxChars);
        line = "";
      }
      const next = line ? `${line} ${word}` : word;
      if (next.length > maxChars && line) {
        lines.push(line);
        line = word;
      } else {
        line = next;
      }
    }
    lines.push(line);
  }
  return lines;
}

export function textSvg(x, y, w, text, opts = {}) {
  const {
    fontSize = 16,
    lineHeight = 1.35,
    font,
    weight = 400,
    color = INK,
    align = "left",
    valign = "top",
    h,
  } = opts;
  const maxChars = Math.max(1, Math.floor((w - 4) / (fontSize * 0.55)));
  const lines = wrapText(text, maxChars);
  const lh = fontSize * lineHeight;
  const top = valign === "middle" && h != null ? y + (h - lines.length * lh) / 2 : y;
  const anchor = { left: "start", center: "middle", right: "end" }[align] || "start";
  const ax = align === "center" ? x + w / 2 : align === "right" ? x + w : x;
  // Approximate the CSS line box: half-leading above, then the ascent.
  const baseline = top + (lh - fontSize) / 2 + fontSize * 0.82;

  const tspans = lines
    .map((l, i) => `<tspan x="${n(ax)}" y="${n(baseline + i * lh)}">${esc(l) || " "}</tspan>`)
    .join("");
  return `<text font-size="${fontSize}" font-family="${esc(fontFamilyFor(font))}" font-weight="${weight}" fill="${esc(color)}" text-anchor="${anchor}" xml:space="preserve">${tspans}</text>`;
}

/* ---------- Elements ---------- */

const BULLET_MARKS = { disc: "•", circle: "◦", square: "▪", none: "" };

function shapeSvg(el) {
  const d = el.data || {};
  const b = getBounds(el);
  const fill = d.fill && d.fill !== "transparent" ? d.fill : "none";
  const stroke = esc(d.stroke || INK);
  const sw = d.strokeWidth ?? 2;
  const paint = `fill="${esc(fill)}" stroke="${stroke}" stroke-width="${sw}" stroke-linejoin="round" stroke-linecap="round"`;
  const cx = b.x + b.w / 2;
  const cy = b.y + b.h / 2;

  let shape;
  if (d.sketch) {
    const rand = seededRandom(el.id);
    const path =
      el.type === "ellipse"
        ? sketchEllipse(cx, cy, b.w / 2, b.h / 2, rand)
        : el.type === "diamond"
          ? sketchPolygon(
              diamondPoints(b)
                .split(" ")
                .map((p) => p.split(",").map(Number)),
              rand,
            )
          : sketchRect(b.x, b.y, b.w, b.h, rand);
    shape = `<path d="${path}" ${paint}/>`;
  } else if (el.type === "ellipse") {
    shape = `<ellipse cx="${n(cx)}" cy="${n(cy)}" rx="${n(b.w / 2)}" ry="${n(b.h / 2)}" ${paint}/>`;
  } else if (el.type === "diamond") {
    shape = `<polygon points="${diamondPoints(b)}" ${paint}/>`;
  } else {
    shape = `<rect x="${n(b.x)}" y="${n(b.y)}" width="${n(b.w)}" height="${n(b.h)}" rx="${d.radius ?? 8}" ${paint}/>`;
  }

  const label = d.label
    ? textSvg(b.x + 8, b.y, b.w - 16, d.label, {
        fontSize: d.font === "hand" ? 16 : 14,
        font: d.font,
        align: "center",
        valign: "middle",
        h: b.h,
      })
    : "";
  return shape + label;
}

function lineSvg(el) {
  const d = el.data || {};
  const stroke = esc(d.stroke || INK);
  const sw = d.strokeWidth ?? 2;
  const body = d.sketch
    ? `<path d="${sketchLine(d.x1, d.y1, d.x2, d.y2, seededRandom(el.id))}" fill="none" stroke="${stroke}" stroke-width="${sw}" stroke-linecap="round"/>`
    : `<line x1="${n(d.x1)}" y1="${n(d.y1)}" x2="${n(d.x2)}" y2="${n(d.y2)}" stroke="${stroke}" stroke-width="${sw}" stroke-linecap="round"/>`;
  const head =
    el.type === "arrow"
      ? `<polygon points="${arrowHead(d.x1, d.y1, d.x2, d.y2, 10 + sw * 2)}" fill="${stroke}" stroke="${stroke}" stroke-width="1" stroke-linejoin="round"/>`
      : "";
  return body + head;
}

function bodySvg(el) {
  const d = el.data || {};
  const b = getBounds(el);
  switch (el.type) {
    case "rect":
    case "ellipse":
    case "diamond":
      return shapeSvg(el);
    case "line":
    case "arrow":
      return lineSvg(el);
    case "draw":
      return `<path d="${strokeToPath(d.points, d.strokeWidth || 4)}" fill="${esc(d.stroke || INK)}"/>`;
    case "text":
      return textSvg(b.x, b.y, b.w, d.text, {
        fontSize: d.fontSize || 20,
        weight: d.weight || 500,
        font: d.font,
        color: d.color || INK,
      });
    case "sticky": {
      const hand = d.font === "hand";
      return (
        `<rect x="${n(b.x)}" y="${n(b.y)}" width="${n(b.w)}" height="${n(b.h)}" rx="10" fill="${esc(d.fill || "#fde68a")}" stroke="rgba(22,22,29,0.08)"/>` +
        textSvg(b.x + 14, b.y + 14, b.w - 28, d.text, {
          fontSize: d.fontSize || (hand ? 22 : 16),
          lineHeight: hand ? 1.15 : 1.35,
          font: d.font,
          color: d.color || INK,
        })
      );
    }
    case "bullet": {
      const style = d.bulletStyle || "disc";
      const text = (d.items || [])
        .map((item, i) => {
          const mark = style === "decimal" ? `${i + 1}.` : (BULLET_MARKS[style] ?? "•");
          return mark ? `${mark} ${item}` : item;
        })
        .join("\n");
      return textSvg(b.x, b.y + 6, b.w, text, {
        fontSize: d.fontSize || 16,
        lineHeight: 1.7,
        font: d.font,
        color: d.color || INK,
      });
    }
    case "chart":
      return renderToStaticMarkup(createElement(ChartElement, { element: el }));
    case "image":
      return `<image href="${esc(d.src || d.url)}" x="${n(b.x)}" y="${n(b.y)}" width="${n(b.w)}" height="${n(b.h)}" preserveAspectRatio="xMidYMid slice"/>`;
    case "emoji":
      return `<text x="${n(b.x + b.w / 2)}" y="${n(b.y + b.h / 2)}" font-size="${n(Math.min(b.w, b.h) * 0.86)}" text-anchor="middle" dominant-baseline="central">${esc(d.emoji || d.text)}</text>`;
    default:
      return "";
  }
}

export function elementSvg(el) {
  const body = bodySvg(el);
  const rotation = el.data?.rotation;
  if (!rotation || !body) return body;
  const b = getBounds(el);
  return `<g transform="rotate(${rotation} ${n(b.x + b.w / 2)} ${n(b.y + b.h / 2)})">${body}</g>`;
}

export function buildSvgString(elements, { background = "#ffffff" } = {}) {
  const b = unionBounds(elements) || { x: 0, y: 0, w: 800, h: 600 };
  const x = Math.floor(b.x - PADDING);
  const y = Math.floor(b.y - PADDING);
  const w = Math.ceil(b.w + PADDING * 2);
  const h = Math.ceil(b.h + PADDING * 2);
  const body = elements.map(elementSvg).join("");
  return (
    `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="${x} ${y} ${w} ${h}">` +
    `<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="${esc(background)}"/>` +
    body +
    `</svg>`
  );
}

/* ---------- Export ---------- */

export async function inlineImages(elements) {
  return Promise.all(
    elements.map(async (el) => {
      const src = el.data?.src || el.data?.url;
      if (el.type !== "image" || !src || src.startsWith("data:")) return el;
      try {
        return { ...el, data: { ...el.data, src: await urlToDataURL(src) } };
      } catch {
        return el; // Leave it as a remote link; the SVG still works, the PNG just omits it.
      }
    }),
  );
}

const safeName = (name) => String(name || "").replace(/[\\/:*?"<>|]+/g, "").trim() || "whiteboard";

function download(blob, filename) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export async function exportSVG(elements, name = "whiteboard", opts) {
  const svg = buildSvgString(await inlineImages(elements), opts);
  download(new Blob([svg], { type: "image/svg+xml;charset=utf-8" }), `${safeName(name)}.svg`);
}

export async function exportPNG(elements, name = "whiteboard", scale = 2, opts) {
  const svg = buildSvgString(await inlineImages(elements), opts);
  const url = URL.createObjectURL(new Blob([svg], { type: "image/svg+xml;charset=utf-8" }));
  try {
    const img = await new Promise((resolve, reject) => {
      const i = new Image();
      i.onload = () => resolve(i);
      i.onerror = () => reject(new Error("Couldn't render the board for export"));
      i.src = url;
    });
    // Stay inside browser canvas limits for very large boards.
    const s = Math.min(scale, 8192 / img.width, 8192 / img.height);
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(img.width * s);
    canvas.height = Math.round(img.height * s);
    const ctx = canvas.getContext("2d");
    ctx.scale(s, s);
    ctx.drawImage(img, 0, 0);
    const blob = await new Promise((resolve, reject) =>
      canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("Couldn't create the PNG"))), "image/png"),
    );
    download(blob, `${safeName(name)}.png`);
  } finally {
    URL.revokeObjectURL(url);
  }
}
