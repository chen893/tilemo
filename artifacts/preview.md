# 预览方式 — 今天提了么

## 直接打开（推荐，最贴近评审方式）

双击打开，或在 Chrome 地址栏输入：

```
file:///Users/chen/Desktop/project/June/tilem/index.html
```

零联网、零依赖。可在 DevTools Network 面板勾选 Offline 验证离线可用，刷新后数据仍在（localStorage）。

## 本地静态服务器（可选）

```bash
cd /Users/chen/Desktop/project/June/tilem
python3 -m http.server 8080
# 浏览器访问 http://localhost:8080/
```

## 推荐的评审视口

- 移动：DevTools 设备模拟 iPhone 12（375 × 812）
- 桌面：1440 × 900（容器自动居中在 480px 窄列，两侧留白）

## 体验路径（契约第 7.1 条脊柱）

1. 今日页 → 看到主问句与 0/3 进度
2. 点"开始一组训练" → 全屏节拍器，准备 3-2-1 → 跟收紧/放松
3. 完成 → 回今日页，进度 +1，达标时主按钮变绿 + 光晕脉冲
4. 进记录页 → 看到本月热力点亮今天，三个大数字更新
5. 进设置页 → 调目标组数 / 主题（即时切换深色）/ 默认方案 / 声音触感 / 导出 JSON

## 主题切换

设置页 → 外观 → 浅 / 深 / 跟随系统；跟随系统模式下，系统切深色会自动跟随。
