// @tilemo/share-card — QR matrix via the pure-JS qrcode-generator.
// 输出扁平布尔网格，两端各自渲染成方块（web fillRect / RN View grid），
// 颜色取自 CardData.colors，与卡片视觉统一。避免 RN 的 buffer 坑。

import qrcode from "qrcode-generator";
import type { QrMatrix } from "./types";

// 同一 URL 的矩阵固定；缓存避免每次构建卡片都重跑 Reed-Solomon 编码。
const cache = new Map<string, QrMatrix>();

export function buildQr(text: string): QrMatrix {
  const hit = cache.get(text);
  if (hit) return hit;
  const qr = qrcode(0, "M");
  qr.addData(text);
  qr.make();
  const size = qr.getModuleCount();
  const dark: boolean[] = new Array(size * size);
  for (let r = 0; r < size; r++) {
    for (let c = 0; c < size; c++) dark[r * size + c] = qr.isDark(r, c);
  }
  const m: QrMatrix = { size, dark };
  cache.set(text, m);
  return m;
}
