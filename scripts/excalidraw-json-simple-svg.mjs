/**
 * 将 Obsidian Excalidraw .excalidraw.md 中的 compressed-json 转为简易 SVG（矩形/文字/折线箭头），供静态站点引用。
 * 不依赖 @excalidraw/excalidraw，避免 Node 下 roughjs 等浏览器依赖。
 * 用法: node scripts/excalidraw-json-simple-svg.mjs <path-to.excalidraw.md> [out.svg]
 */
import fs from "fs";
import path from "path";
import LZString from "lz-string";

const OBSIDIAN_EXCALIDAW_EXT = path.extname("n.excalidaw").toLowerCase();

function esc(s) {
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function buildSvg(data) {
  const elements = (data.elements || []).filter((e) => !e.isDeleted);
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;

  function expand(x, y) {
    minX = Math.min(minX, x);
    minY = Math.min(minY, y);
    maxX = Math.max(maxX, x);
    maxY = Math.max(maxY, y);
  }

  for (const el of elements) {
    if (el.type === "rectangle") {
      expand(el.x, el.y);
      expand(el.x + (el.width || 0), el.y + (el.height || 0));
    } else if (el.type === "text") {
      expand(el.x, el.y);
      expand(el.x + (el.width || 0), el.y + (el.height || 0));
    } else if (el.type === "arrow" && Array.isArray(el.points)) {
      for (const [px, py] of el.points) {
        expand(el.x + px, el.y + py);
      }
    }
  }

  const pad = 16;
  const ox = -minX + pad;
  const oy = -minY + pad;
  const w = maxX - minX + pad * 2;
  const h = maxY - minY + pad * 2;

  const parts = [];
  parts.push(
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}" width="${w}" height="${h}" class="excalidraw-svg">`,
    `<!-- svg-source:excalidraw-simple -->`,
    `<rect x="0" y="0" width="${w}" height="${h}" fill="#ffffff"/>`,
  );

  const sorted = [...elements].sort((a, b) => {
    const ia = typeof a.index === "string" ? a.index : "";
    const ib = typeof b.index === "string" ? b.index : "";
    return ia.localeCompare(ib, "en");
  });

  for (const el of sorted) {
    const stroke = el.strokeColor || "#1e1e1e";
    const sw = el.strokeWidth != null ? el.strokeWidth : 2;
    if (el.type === "rectangle") {
      const x = el.x + ox;
      const y = el.y + oy;
      const rw = el.width || 0;
      const rh = el.height || 0;
      const fill = el.backgroundColor && el.backgroundColor !== "transparent"
        ? el.backgroundColor
        : "#f8f9fa";
      parts.push(
        `<rect x="${x}" y="${y}" width="${rw}" height="${rh}" fill="${esc(
          fill,
        )}" stroke="${esc(stroke)}" stroke-width="${sw}" rx="4"/>`,
      );
    } else if (el.type === "arrow" && Array.isArray(el.points) && el.points.length >= 2) {
      const pts = el.points.map(([px, py]) => `${el.x + ox + px},${el.y + oy + py}`);
      const endHead = el.endArrowhead === "arrow";
      parts.push(
        `<polyline fill="none" stroke="${esc(stroke)}" stroke-width="${sw}" points="${pts.join(
          " ",
        )}" stroke-linecap="round" stroke-linejoin="round"/>`,
      );
      if (endHead && el.points.length >= 2) {
        const n = el.points.length;
        const x2 = el.x + ox + el.points[n - 1][0];
        const y2 = el.y + oy + el.points[n - 1][1];
        const x1 = el.x + ox + el.points[n - 2][0];
        const y1 = el.y + oy + el.points[n - 2][1];
        const ang = Math.atan2(y2 - y1, x2 - x1);
        const ah = 10;
        const aw = 6;
        const xL = x2 - ah * Math.cos(ang) + aw * Math.sin(ang);
        const yL = y2 - ah * Math.sin(ang) - aw * Math.cos(ang);
        const xR = x2 - ah * Math.cos(ang) - aw * Math.sin(ang);
        const yR = y2 - ah * Math.sin(ang) + aw * Math.cos(ang);
        parts.push(
          `<polygon points="${x2},${y2} ${xL},${yL} ${xR},${yR}" fill="${esc(stroke)}"/>`,
        );
      }
    } else if (el.type === "text") {
      const x = el.x + ox;
      const y = el.y + oy;
      const fsz = el.fontSize || 20;
      const text = el.originalText || el.text || "";
      const lines = String(text).split("\n");
      const lh = fsz * 1.25;
      lines.forEach((line, i) => {
        parts.push(
          `<text x="${x}" y="${y + fsz + i * lh}" font-family="system-ui, sans-serif" font-size="${fsz}" fill="${esc(
            stroke,
          )}">${esc(line)}</text>`,
        );
      });
    }
  }

  parts.push(`</svg>`);
  return parts.join("\n");
}

async function main() {
  const mdPath = process.argv[2];
  if (!mdPath) {
    console.error("用法: node scripts/excalidraw-json-simple-svg.mjs <file.excalidraw.md> [out.svg]");
    process.exit(1);
  }
  const abs = path.isAbsolute(mdPath) ? mdPath : path.join(process.cwd(), mdPath);
  const outPath =
    process.argv[3] ||
    (() => {
      const baseNoMd = abs.replace(/\.md$/i, "");
      const linkExt = path.extname(baseNoMd).toLowerCase();
      if (linkExt === ".excalidraw" || linkExt === OBSIDIAN_EXCALIDAW_EXT) {
        return baseNoMd.slice(0, -linkExt.length) + ".excalidraw.svg";
      }
      return abs.replace(/\.excalidraw\.md$/i, ".excalidraw.svg");
    })();

  const t = fs.readFileSync(abs, "utf8");
  const m = t.match(/```compressed-json\n([\s\S]*?)```/);
  if (!m) {
    console.error("未找到 compressed-json 代码块:", abs);
    process.exit(1);
  }
  const raw = m[1].replace(/\s+/g, "");
  const jsonStr = LZString.decompressFromBase64(raw);
  if (!jsonStr) {
    console.error("解压失败");
    process.exit(1);
  }
  const data = JSON.parse(jsonStr);
  const svg = buildSvg(data);
  fs.writeFileSync(outPath, svg, "utf8");
  console.log("已写入:", outPath);
}

main();
