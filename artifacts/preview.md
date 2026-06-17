# 预览方式 — 今天提了么（v5 会呼吸的张弛体）

## 直接打开（推荐，最贴近评审方式）

双击打开，或在 Chrome 地址栏输入：

```
file:///Users/chen/Desktop/project/June/tilem/index.html
```

零联网、零依赖。可在 DevTools Network 面板勾选 Offline 验证离线可用，刷新后数据仍在（localStorage，键名 `tgm:*` 与 v3/v4 一致，已有数据无缝继承）。

## 本地静态服务器（可选）

```bash
cd /Users/chen/Desktop/project/June/tilem
python3 -m http.server 8080
# 浏览器访问 http://localhost:8080/
```

## 推荐的评审视口

- 移动：DevTools 设备模拟 iPhone 12（375 × 812）——有机形态与呼吸动效在小屏最见张力
- 桌面：1440 × 900（容器 560px 居中窄列，ambient 呼吸装饰在两侧溢出可见）

## 体验路径（核心脊柱）

1. 今日页 → 报头日期 + 每日一句 + 主问句「今天，提了么？」（未完成时字距略紧=绷着）+ **绷紧的弦**（向上微拱的紧绷弧，进度中央 ratio 标签）+ 巨型进度数字 0/3 + 呼吸 CTA（4.5s 一个呼吸周期，blob 形态也在缓慢变形）
2. 点呼吸 CTA「开始一组训练 →」→ 全屏节拍器，准备 3-2-1（带呼吸种子形）→ **有机呼吸形**（收紧时缩小 0.82 + 升温 accent-hot；放松时扩大 1.05 + 降温 accent-soft）+ tabular-nums 倒计时
3. 完成 → 回今日页，**弦松弛下垂**（path 中央沉降，easing droop 满足释放）+ 主问句字距松开=安顿 + CTA 一次温柔沉降脉冲
4. 进记录页 → 三数字有机 blob 卡（连续/总天/总组）+ 月历有机 blob 热力（4 档：透明/浅陶/中陶/暖朱）+ 点格展开日详情
5. 进设置页 → 有机控件（blob 拨子开关/胶囊步进器/分段/方案阵列）+ 主题即时切换 + 导出 JSON

## 视觉语言（v5 PIVOT：设计语言 = 提肛动作本身）

- **有机身体曲线**：非对称 border-radius（如 `60% 40% 55% 45% / 50% 60% 40% 50%`）+ SVG blob 路径，反矩形反尖角反四平八稳正圆
- **呼吸**：CTA 4.5s 呼吸周期（scale 1↔1.03 + blob 形态变形）+ ambient 装饰形反向呼吸 + masthead 种子脉冲——全 app 生命感母题
- **张弛**：进度=绷紧的弦（向上拱），达标=弦松弛下垂（path d 切换，easing droop 释放）；主问句未完成绷着/完成松弛；按压 CTA=肌肉收紧 scale 0.97
- **节拍器=有机呼吸形**：肺叶/身体状 SVG blob，收紧缩小升温/放松扩大降温，反 v3/v4 同心圆环
- **暖身体色**：paper `#FAF3EC` 暖纸白 × ink `#2B2320` 暖墨 × 单一鲜活暖朱 `#E85A4F`（收紧升温 `#D63A2E`，放松降温 `#F4B4A8`），克制暖色 tonal 分层（非渐变非玻璃）
- **字体**：系统无衬线 600-800，温暖自信；主问句 `clamp(40px, 11vw, 72px)`（非 v4 168px 攻击巨字）；大号 tabular-nums 数字

## 主题切换

设置页 → 外观 → 浅 / 深 / 跟随系统；跟随系统模式下，系统切深色会自动跟随。深色模式：暖夜炭 `#1F1814`（非纯黑，带皮肤余温）、文本 `#F2E8DC`、accent 提亮到 `#FF6B5E` 保对比。

## reduced-motion

`prefers-reduced-motion: reduce` 下：CTA 呼吸停、ambient 静态（opacity 降至 0.3）、弦/字距 transition 关闭、节拍器形静态切换（收紧 scale 0.9 / 放松 scale 1.0），倒计时与功能仍正常。
