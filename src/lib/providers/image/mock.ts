import type { ImageProvider, ImageResult, Txt2ImgArgs } from "./types";

// MockProvider renders a deterministic SVG "contact sheet" placeholder showing
// the prompt and parameters. It needs no GPU, so the entire node-graph + render
// pipeline is fully runnable and testable in any environment. Swapping in a real
// GPU backend (ComfyUI) changes only which provider the factory returns.

function escapeXml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function wrap(text: string, max: number, maxLines: number): string[] {
  const words = text.split(/\s+/);
  const lines: string[] = [];
  let line = "";
  for (const w of words) {
    if ((line + " " + w).trim().length > max) {
      if (line) lines.push(line);
      line = w;
    } else {
      line = (line + " " + w).trim();
    }
    if (lines.length >= maxLines) break;
  }
  if (line && lines.length < maxLines) lines.push(line);
  if (lines.length >= maxLines) lines[maxLines - 1] += " …";
  return lines.slice(0, maxLines);
}

export class MockImageProvider implements ImageProvider {
  readonly name = "mock";

  async txt2img(args: Txt2ImgArgs): Promise<ImageResult> {
    const w = args.width || 1024;
    const h = args.height || 1024;
    const seed = args.seed ?? Math.floor(Math.random() * 1e9);
    // Deterministic hue from the prompt for a little visual variety.
    let hash = 0;
    for (const c of args.positive) hash = (hash * 31 + c.charCodeAt(0)) >>> 0;
    const hue = hash % 360;

    const promptLines = wrap(args.positive, 48, 10)
      .map(
        (l, i) =>
          `<text x="48" y="${150 + i * 30}" font-size="22" fill="#e9e9ef" font-family="sans-serif">${escapeXml(
            l
          )}</text>`
      )
      .join("");

    const negLines = wrap(args.negative, 60, 2)
      .map(
        (l, i) =>
          `<text x="48" y="${h - 90 + i * 24}" font-size="16" fill="#ff9a9a" font-family="sans-serif">${escapeXml(
            l
          )}</text>`
      )
      .join("");

    const svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="hsl(${hue} 40% 16%)"/>
      <stop offset="100%" stop-color="hsl(${(hue + 40) % 360} 45% 8%)"/>
    </linearGradient>
  </defs>
  <rect width="${w}" height="${h}" fill="url(#bg)"/>
  <rect x="20" y="20" width="${w - 40}" height="${h - 40}" fill="none" stroke="hsl(${hue} 60% 55%)" stroke-width="2" opacity="0.5"/>
  <text x="48" y="80" font-size="28" fill="hsl(${hue} 70% 70%)" font-family="sans-serif" font-weight="bold">MOCK RENDER</text>
  <text x="48" y="110" font-size="16" fill="#a9aab3" font-family="monospace">${w}×${h} · seed ${seed} · steps ${args.steps ?? 25} · cfg ${args.cfg ?? 7}</text>
  ${promptLines}
  ${negLines}
</svg>`;

    return { bytes: Buffer.from(svg, "utf8"), ext: "svg", meta: { seed, provider: "mock" } };
  }
}
