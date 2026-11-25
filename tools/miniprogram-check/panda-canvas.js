// 只验一件事：播放层的 canvas 动画循环到底有没有在跑、画面参数有没有变化。
// 用最小 wx / Component 运行时 + 假 canvas 2d 节点（记录每次绘制调用的关键参数）。
const path = require("path");
const ROOT = path.resolve(__dirname, "../../apps/miniprogram");

const storage = new Map();
global.wx = {
  getStorageSync: (k) => (storage.has(k) ? storage.get(k) : ""),
  setStorageSync: (k, v) => storage.set(k, v),
  removeStorageSync: (k) => storage.delete(k),
  getStorageInfoSync: () => ({ keys: Array.from(storage.keys()) }),
  setNavigationBarColor: () => {},
  setBackgroundColor: () => {},
  setTabBarStyle: () => {},
  hideTabBar: () => {},
  showTabBar: () => {},
  getSystemInfoSync: () => ({ theme: "light", pixelRatio: 3 }),
  getWindowInfo: () => ({ pixelRatio: 3 }),
  getAppBaseInfo: () => ({ theme: "light" }),
  onThemeChange: () => {},
  vibrateShort: () => {},
  showToast: () => {},
  showModal: (o) => o.success && o.success({ confirm: true }),
  switchTab: () => {},
  createInnerAudioContext: () => ({ src: "", volume: 1, play() {}, stop() {}, destroy() {}, onError() {} }),
  setInnerAudioOption: () => {},
};
global.getApp = () => ({ globalData: {} });
global.App = () => {};

let compCfg = null;
global.Component = (cfg) => { compCfg = cfg; };

// 记录型 2d context：任何未知方法都当空实现，但记录其中几个关键调用
let frames = 0;
let errors = [];
let lastDraw = null;
const drawLog = [];

function makeCtx() {
  const state = { transformScale: 1 };
  const ctx = {
    _scaleX: 1,
    save() {},
    restore() {},
    clearRect() { frames += 1; },
    scale(x) { this._scaleX *= x; },
    beginPath() {},
    closePath() {},
    moveTo() {},
    lineTo() {},
    quadraticCurveTo() {},
    bezierCurveTo() {},
    arc() {},
    ellipse() {},
    fill() {},
    stroke() {},
    fillRect() {},
    strokeRect() {},
    setLineDash() {},
    clip() {},
    rect() {},
    arcTo() {},
    globalCompositeOperation: "source-over",
    filter: "none",
    shadowBlur: 0,
    shadowColor: "#000",
    createRadialGradient: () => ({ addColorStop() {} }),
    createLinearGradient: () => ({ addColorStop() {} }),
    measureText: (t) => ({ width: String(t).length * 8 }),
    fillText() {},
    translate() {},
    rotate() {},
    set globalAlpha(v) { drawLog.push(["alpha", v]); },
    set fillStyle(v) { if (typeof v === "string") drawLog.push(["fill", v]); },
    set strokeStyle(v) {},
    set lineWidth(v) {},
  };
  return ctx;
}

let rafCount = 0;
const node = {
  width: 0,
  height: 0,
  getContext: () => makeCtx(),
  requestAnimationFrame: (cb) => { rafCount += 1; return setTimeout(cb, 16); },
  cancelAnimationFrame: (id) => clearTimeout(id),
};

require(path.join(ROOT, "components/player/player.js"));
const inst = Object.assign({}, compCfg.methods);
inst.data = JSON.parse(JSON.stringify(compCfg.data));
inst.setData = (patch, cb) => { Object.assign(inst.data, patch); if (cb) cb(); };
inst.triggerEvent = () => {};
inst.createSelectorQuery = () => ({
  select: () => ({
    fields: () => ({
      exec: (cb) => cb([{ node, width: 240, height: 240 }]),
    }),
  }),
});
compCfg.lifetimes.attached.call(inst);

const appStore = require(path.join(ROOT, "utils/app-store.js"));
inst.start(appStore.getStore().getPlans()[0]);

setTimeout(() => {
  const report = [];
  report.push("visible=" + inst.data.visible + " stage=" + inst.data.stage);
  report.push("canvas 节点 = " + (inst.pandaCanvas ? "已获取" : "null"));
  report.push("ctx = " + (inst.pandaCtx ? "已创建" : "null"));
  report.push("rAF 调度次数 = " + rafCount);
  report.push("清屏次数(=绘制帧数) = " + frames);
  const alphas = new Set(drawLog.filter((d) => d[0] === "alpha").map((d) => d[1].toFixed(3)));
  report.push("不同的 globalAlpha 值数量 = " + alphas.size);
  report.push("timer = " + inst.pandaTimer);
  console.log(report.join("\n"));
  inst.stopPandaLoop();
}, 1200);

// 额外：手动跑第二帧，把异常打印出来（tick 的异常会被 safe() 吞掉）
setTimeout(() => {
  const panda = require(path.join(ROOT, "lib/panda.js"));
  try {
    const f = inst.pandaEngine.step(0.033, "light");
    panda.drawPandaCanvas(makeCtx(), 240, f, "light");
    console.log("手动第二帧：OK");
  } catch (e) {
    console.log("手动第二帧异常：" + e.message);
    console.log(e.stack.split("\n").slice(0, 6).join("\n"));
  }
  process.exit(0);
}, 1600);
