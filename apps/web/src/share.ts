// @tilemo/web — 成就卡片分享。
// Canvas 渲染 + 浮层 + 保存/分享。零新依赖（浏览器原生 Canvas + Web Share API）。
// 数据由 app.ts 采集并经 @tilemo/share-card 的 buildCardData 组装；本模块只接收
// CardData（+ 一个"换一句" rebuild 回调）并负责画 + 导出。

import type { CardData } from "@tilemo/share-card";
import { CARD_H, CARD_W, heatColor } from "@tilemo/share-card";

const FONT = '"PingFang SC", "Hiragino Sans GB", "Microsoft YaHei", system-ui, sans-serif';

// ---------------------------------------------------------------------------
// Canvas 渲染
// ---------------------------------------------------------------------------

function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
): void {
  const rr = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + rr, y);
  ctx.arcTo(x + w, y, x + w, y + h, rr);
  ctx.arcTo(x + w, y + h, x, y + h, rr);
  ctx.arcTo(x, y + h, x, y, rr);
  ctx.arcTo(x, y, x + w, y, rr);
  ctx.closePath();
}

/** 中文按字宽断行；返回行数组。 */
function wrap(text: string, ctx: CanvasRenderingContext2D, maxWidth: number): string[] {
  const lines: string[] = [];
  let line = "";
  for (const ch of text) {
    if (ctx.measureText(line + ch).width > maxWidth && line) {
      lines.push(line);
      line = ch;
    } else {
      line += ch;
    }
  }
  if (line) lines.push(line);
  return lines;
}

function text(
  ctx: CanvasRenderingContext2D,
  str: string,
  x: number,
  y: number,
  size: number,
  color: string,
  opts: { weight?: number; align?: CanvasTextAlign; spacing?: number } = {},
): void {
  const { weight = 400, align = "left", spacing = 0 } = opts;
  ctx.fillStyle = color;
  ctx.textAlign = align;
  ctx.textBaseline = "alphabetic";
  ctx.font = `${weight} ${size}px ${FONT}`;
  if (spacing > 0) {
    let cx = x;
    if (align === "center" || align === "right") {
      const total = ctx.measureText(str).width + spacing * (str.length - 1);
      cx = align === "center" ? x - total / 2 : x - total;
    }
    for (const ch of str) {
      ctx.textAlign = "left";
      ctx.fillText(ch, cx, y);
      cx += ctx.measureText(ch).width + spacing;
    }
  } else {
    ctx.fillText(str, x, y);
  }
}

function drawQr(ctx: CanvasRenderingContext2D, d: CardData, x: number, y: number, box: number): void {
  if (!d.qr) return;
  const pad = box * 0.14;
  // 白底（二维码必须高对比白底，无关主题）
  ctx.save();
  roundRect(ctx, x - pad, y - pad, box + pad * 2, box + pad * 2, 18);
  ctx.fillStyle = "#FFFFFF";
  ctx.fill();
  ctx.restore();
  const n = d.qr.size;
  const cell = box / n;
  ctx.fillStyle = "#2B2320";
  for (let r = 0; r < n; r++) {
    for (let c = 0; c < n; c++) {
      if (d.qr.dark[r * n + c]) {
        ctx.fillRect(x + c * cell, y + r * cell, cell + 0.6, cell + 0.6);
      }
    }
  }
}

export function renderCard(canvas: HTMLCanvasElement, d: CardData): void {
  const W = CARD_W;
  const H = CARD_H;
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  canvas.width = W * dpr;
  canvas.height = H * dpr;
  canvas.style.width = "100%";
  canvas.style.aspectRatio = `${W} / ${H}`;
  const ctx = canvas.getContext("2d")!;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.clearRect(0, 0, W, H);

  const c = d.colors;
  const pad = 96;
  const cx = W / 2;

  // 背景
  ctx.fillStyle = c.paper;
  ctx.fillRect(0, 0, W, H);

  // eyebrow
  if (d.eyebrow) text(ctx, d.eyebrow, pad, 168, 34, c.text3, { weight: 600, spacing: 6 });

  // 中心区——按类型
  if (d.type === "milestone") {
    text(ctx, d.eyebrow ?? "", cx, 470, 116, c.accent, { weight: 800, align: "center", spacing: 8 });
    const hl = wrap(d.headline, ctx, W - pad * 2);
    let hy = 600;
    for (const ln of hl) {
      text(ctx, ln, cx, hy, 60, c.text, { weight: 700, align: "center" });
      hy += 78;
    }
    // 徽章 pill
    if (d.badge) {
      const bw = 300;
      const bh = 78;
      const bx = cx - bw / 2;
      const by = hy + 30;
      roundRect(ctx, bx, by, bw, bh, 39);
      ctx.fillStyle = c.accent;
      ctx.fill();
      text(ctx, d.badge, cx, by + bh / 2 + 26, 36, "#FFFFFF", { weight: 700, align: "center", spacing: 4 });
      text(ctx, `连续 ${d.streakDays} 天`, cx, by + bh + 96, 38, c.text3, { weight: 500, align: "center" });
    }
  } else if (d.type === "review" && d.heat) {
    text(ctx, d.headline, pad, 250, 56, c.text, { weight: 700 });
    const cols = d.heatCols ?? 6;
    const rows = Math.ceil(d.heat.length / cols);
    const cell = 116;
    const gap = 16;
    const gridW = cols * cell + (cols - 1) * gap;
    const startX = (W - gridW) / 2;
    const startY = 380;
    for (let i = 0; i < d.heat.length; i++) {
      const r = Math.floor(i / cols);
      const cc = i % cols;
      const x = startX + cc * (cell + gap);
      const y = startY + r * (cell + gap);
      roundRect(ctx, x, y, cell, cell, 26);
      ctx.fillStyle = heatColor(d.colors, d.heat[i]);
      ctx.fill();
    }
    text(ctx, `连续 ${d.streakDays} 天`, cx, startY + rows * (cell + gap) + 40, 38, c.text3, {
      weight: 500,
      align: "center",
    });
  } else {
    // daily
    text(ctx, d.headline, pad, 250, 64, c.text, { weight: 700 });
    // 大数字：连续天数
    text(ctx, String(d.streakDays), cx, 560, 210, c.accent, { weight: 800, align: "center" });
    text(ctx, "连续天数", cx, 640, 38, c.text3, { weight: 500, align: "center", spacing: 6 });
    // 今日完成进度条
    const goalTotal = Math.max(1, d.goalTotal);
    const ratio = Math.min(1, d.goalDone / goalTotal);
    text(ctx, `今日  ${d.goalDone} / ${d.goalTotal} 组`, cx, 760, 34, c.text2, { weight: 500, align: "center" });
    const barX = pad;
    const barY = 800;
    const barW = W - pad * 2;
    roundRect(ctx, barX, barY, barW, 14, 7);
    ctx.fillStyle = c.paperDeep;
    ctx.fill();
    if (ratio > 0) {
      roundRect(ctx, barX, barY, barW * ratio, 14, 7);
      ctx.fillStyle = c.accent;
      ctx.fill();
    }
  }

  // 副文案（QUOTES 一句），居中两行。review 卡热力图已占满中部，省略以免重叠。
  if (d.type !== "review") {
    const subLines = wrap("「" + d.sub + "」", ctx, W - pad * 2);
    let sy = H - 360;
    for (const ln of subLines.slice(0, 2)) {
      text(ctx, ln, cx, sy, 34, c.text2, { weight: 400, align: "center" });
      sy += 50;
    }
  }

  // 底部：左下 QR + 扫码，右下品牌
  drawQr(ctx, d, pad, H - 260, 100);
  text(ctx, "扫码，和我一起打卡", pad, H - 78, 24, c.text3, { weight: 500 });
  text(ctx, d.brand, W - pad, H - 150, 40, c.text, { weight: 700, align: "right" });
}

// ---------------------------------------------------------------------------
// 浮层 DOM + 交互
// ---------------------------------------------------------------------------

const CSS = `
.share-overlay{position:fixed;inset:0;z-index:9999;display:none;align-items:center;justify-content:center;
  background:rgba(20,16,14,.55);backdrop-filter:blur(4px);padding:24px;box-sizing:border-box}
.share-overlay.is-open{display:flex}
.share-panel{width:min(420px,92vw);max-height:94vh;overflow:auto;background:var(--paper);border-radius:28px;
  padding:22px;box-shadow:0 30px 80px rgba(0,0,0,.35)}
.share-canvas{width:100%;border-radius:20px;display:block;background:var(--paper-soft)}
.share-actions{display:flex;gap:10px;margin-top:16px}
.share-btn{flex:1;padding:14px 0;border-radius:14px;border:1px solid var(--rule-strong);background:var(--paper-deep);
  color:var(--text);font-size:15px;font-weight:600;cursor:pointer;font-family:inherit}
.share-btn:active{opacity:.7}
.share-btn--primary{background:var(--accent);border-color:var(--accent);color:#fff}
.share-btn--ghost{flex:0 0 auto;width:52px}
.share-sub{margin-top:12px;text-align:center;color:var(--text3);font-size:13px}
.share-top{display:flex;justify-content:flex-end;margin-bottom:8px}
.share-close{width:34px;height:34px;border-radius:999px;border:1px solid var(--rule-strong);background:transparent;
  color:var(--text2);font-size:18px;cursor:pointer;line-height:1}
.share-done-btn{display:inline-block;margin-top:18px;padding:10px 22px;border-radius:999px;
  border:1px solid var(--accent);background:transparent;color:var(--accent);font-size:15px;font-weight:600;cursor:pointer;font-family:inherit}
.share-done-btn:active{opacity:.7}
.share-fab{position:fixed;top:12px;right:12px;width:38px;height:38px;border-radius:999px;
  border:1px solid var(--rule-strong);background:var(--paper-soft);color:var(--text2);
  font-size:18px;line-height:1;cursor:pointer;z-index:50;box-shadow:0 2px 8px rgba(0,0,0,.08);font-family:inherit}
.share-fab:active{opacity:.7}
`;

interface Overlay {
  root: HTMLDivElement;
  canvas: HTMLCanvasElement;
}

let overlay: Overlay | null = null;

// 模块加载即注入样式（触发按钮 + 浮层都用得到）。
if (typeof document !== "undefined" && document.head && !document.getElementById("share-style")) {
  const __st = document.createElement("style");
  __st.id = "share-style";
  __st.textContent = CSS;
  document.head.appendChild(__st);
}

function ensureOverlay(): Overlay {
  if (overlay) return overlay;
  const root = document.createElement("div");
  root.className = "share-overlay";
  root.innerHTML = `
    <div class="share-panel" role="dialog" aria-modal="true">
      <div class="share-top">
        <button class="share-close" aria-label="关闭">×</button>
      </div>
      <canvas class="share-canvas"></canvas>
      <div class="share-actions">
        <button class="share-btn" data-act="save">保存图片</button>
        <button class="share-btn share-btn--primary" data-act="share">分享</button>
      </div>
    </div>`;
  document.body.appendChild(root);
  const canvas = root.querySelector("canvas") as HTMLCanvasElement;
  root.querySelector(".share-close")!.addEventListener("click", () => close());
  root.addEventListener("click", (e) => {
    if (e.target === root) close();
  });
  // 监听器只绑一次（避免每次 openShareCard 累积绑定 → 第 N 次点击触发 N 次）
  root.querySelector<HTMLButtonElement>('[data-act="save"]')!.addEventListener("click", () => {
    void saveImage(canvas);
  });
  root.querySelector<HTMLButtonElement>('[data-act="share"]')!.addEventListener("click", () => {
    void shareImage(canvas);
  });
  overlay = { root, canvas };
  return overlay;
}

let currentData: CardData | null = null;

function close(): void {
  if (overlay) overlay.root.classList.remove("is-open");
}

/** 主入口：传入"构建卡片"的回调。 */
export function openShareCard(build: () => CardData): void {
  const o = ensureOverlay();
  currentData = build();
  renderCard(o.canvas, currentData);
  o.root.classList.add("is-open");
}

function fileName(d: CardData): string {
  return `tilemo-day${d.streakDays}-${d.type}.png`;
}

async function canvasToBlob(canvas: HTMLCanvasElement): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("toBlob 失败"))), "image/png");
  });
}

async function saveImage(canvas: HTMLCanvasElement): Promise<void> {
  const blob = await canvasToBlob(canvas);
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = currentData ? fileName(currentData) : "tilemo.png";
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

async function shareImage(canvas: HTMLCanvasElement): Promise<void> {
  const blob = await canvasToBlob(canvas);
  const nav: any = navigator as any;
  const file = new File([blob], currentData ? fileName(currentData) : "tilemo.png", { type: "image/png" });
  // Web Share API（文件）— 移动浏览器支持
  if (nav.canShare && nav.canShare({ files: [file] })) {
    try {
      await nav.share({ files: [file], title: "今天，提了么", text: "和我一起打卡 👊" });
      return;
    } catch {
      /* 用户取消或失败 → 兜底保存 */
    }
  }
  saveImage(canvas);
}
