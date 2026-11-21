// 边界探针：只测正常点击路径覆盖不到的状态
const path = require("path");
const ROOT = path.resolve(__dirname, "../../apps/miniprogram");

const storage = new Map();
const tabCalls = [];
const log = [];
let pageCfg = null;
let compCfg = null;

global.wx = {
  getStorageSync: (k) => (storage.has(k) ? storage.get(k) : ""),
  setStorageSync: (k, v) => storage.set(k, v),
  removeStorageSync: (k) => storage.delete(k),
  getStorageInfoSync: () => ({ keys: Array.from(storage.keys()) }),
  setNavigationBarColor: () => {},
  setBackgroundColor: () => {},
  setTabBarStyle: () => {},
  hideTabBar: () => tabCalls.push("hide"),
  showTabBar: () => tabCalls.push("show"),
  getSystemInfoSync: () => ({ theme: "light" }),
  getAppBaseInfo: () => ({ theme: "light" }),
  onThemeChange: () => {},
  vibrateShort: () => {},
  showToast: (o) => log.push(["toast", o.title]),
  showModal: (o) => o.success && o.success({ confirm: true }),
  showActionSheet: (o) => o.success && o.success({ tapIndex: 0 }),
  setClipboardData: (o) => o.success && o.success({}),
  switchTab: () => {},
  createInnerAudioContext: () => ({ src: "", volume: 1, play() {}, stop() {}, destroy() {}, onError() {} }),
  setInnerAudioOption: () => {},
  canvasToTempFilePath: (o) => o.success && o.success({ tempFilePath: "/tmp/card.png" }),
  saveImageToPhotosAlbum: (o) => o.success && o.success({}),
  getSetting: (o) => o.success && o.success({ authSetting: {} }),
  env: { USER_DATA_PATH: "/tmp" },
  getFileSystemManager: () => ({ writeFileSync() {} }),
  shareFileMessage: (o) => o.success && o.success({}),
};
global.getApp = () => ({ globalData: {} });
global.Page = (c) => { pageCfg = c; };
global.App = (c) => { global.__app = c; };
global.Component = (c) => { compCfg = c; };

function makeComponent(rel) {
  compCfg = null;
  delete require.cache[require.resolve(path.join(ROOT, rel))];
  require(path.join(ROOT, rel));
  const inst = Object.assign({}, compCfg.methods);
  inst.data = JSON.parse(JSON.stringify(compCfg.data || {}));
  inst.setData = (p, cb) => { Object.assign(inst.data, p); if (cb) cb(); };
  inst.triggerEvent = (n, d) => log.push(["event", n, d]);
  if (compCfg.lifetimes && compCfg.lifetimes.attached) compCfg.lifetimes.attached.call(inst);
  const ctx = makeCtx();
  inst.createSelectorQuery = () => ({
    select: () => ({
      fields: () => ({
        exec: (cb) => cb([{ node: { width: 0, height: 0, getContext: () => ctx } }]),
      }),
    }),
  });
  return inst;
}

const core = require(path.join(ROOT, "lib/core.js"));
const appStore = require(path.join(ROOT, "utils/app-store.js"));
const store = appStore.getStore();
store.clearAll();

function makeCtx() {
  const noop = () => () => {};
  return new Proxy({ measureText: (t) => ({ width: String(t).length * 30 }) }, {
    get: (t, k) => (k in t ? t[k] : noop()),
    set: (t, k, v) => { t[k] = v; return true; },
  });
}

const results = [];
function probe(name, fn) {
  try { fn(); results.push("PASS " + name); }
  catch (e) { results.push("FAIL " + name + " -> " + e.message); }
}

// A. 准备阶段点 ×：不应产生记录
probe("准备阶段关闭不写记录", () => {
  const before = (store.getDay(core.todayKey()) || { sessions: [] }).sessions.length;
  const p = makeComponent("components/player/player.js");
  p.start(store.getPlans()[0]);
  p.onCloseTap(); // 还在 prep
  p.metro.dispose();
  const after = (store.getDay(core.todayKey()) || { sessions: [] }).sessions.length;
  if (after !== before) throw new Error("prep 阶段被记了一次: " + before + " -> " + after);
});

// B. 做 1 次收紧后点结束：记「部分」，reps=1
probe("中途结束记部分完成", () => {
  const p = makeComponent("components/player/player.js");
  p.start(store.getPlans()[0]);
  p.metro.beginRunning();
  p.metro.onPhaseEnd(); // contract -> relax
  p.metro.onPhaseEnd(); // relax -> 记 1 次
  if (p.metro.startedReps !== 1) throw new Error("收紧计数错: " + p.metro.startedReps);
  p.onEnd();
  const day = store.getDay(core.todayKey());
  const last = day.sessions[day.sessions.length - 1];
  if (!last || last.completedReps !== 1 || last.finished !== false) {
    throw new Error("记录的字段不对: " + JSON.stringify(last));
  }
  p.metro.dispose();
});

// C. 连续两次完整训练：两条记录，节拍器归零
probe("连续两次训练不串状态", () => {
  store.clearAll();
  const p = makeComponent("components/player/player.js");
  const plan = store.getPlans()[0];
  p.start(plan);
  p.metro.beginRunning();
  p.metro.finishAll(true);
  p.onDoneOk();
  p.start(plan);
  if (p.metro.setIdx !== 0 || p.metro.startedReps !== 0) {
    throw new Error("第二次开训没归零: setIdx=" + p.metro.setIdx + " reps=" + p.metro.startedReps);
  }
  p.metro.beginRunning();
  p.metro.finishAll(true);
  p.onDoneOk();
  const n = store.getDay(core.todayKey()).sessions.length;
  if (n !== 2) throw new Error("应有 2 条记录，实际 " + n);
  p.metro.dispose();
});

// D. 完成后立刻点「分享这次」：detail 里 share 与 milestone 并存
probe("完成后点分享的事件载荷", () => {
  log.length = 0;
  const p = makeComponent("components/player/player.js");
  p.start(store.getPlans()[0]);
  p.metro.beginRunning();
  p.metro.finishAll(true);
  p.onShare();
  const closes = log.filter((x) => x[0] === "event" && x[1] === "close");
  if (closes.length !== 1) throw new Error("close 触发 " + closes.length + " 次");
  const d = closes[0][2];
  results.push("     载荷: share=" + JSON.stringify(d.share) + " milestone=" + (d.milestone ? d.milestone.badge : "null"));
  p.metro.dispose();
});

// E. 跨天连续：仅昨天达标，今天没做 → streak=1
probe("跨天连续天数", () => {
  store.clearAll();
  const y = new Date();
  y.setDate(y.getDate() - 1);
  const yk = core.ymd(y);
  const goal = store.getSettings().dailyGoalGroups;
  const sessions = [];
  for (let i = 0; i < goal; i++) sessions.push({ ts: y.getTime(), planId: "standard", completedReps: 10, durationSec: 60, finished: true });
  store.setDay(yk, { date: yk, goalGroups: goal, sessions, manualOverride: false });
  core.recomputeStreak(store);
  const s = store.getStreak();
  if (s.current !== 1) throw new Error("昨天达标应 streak=1，实际 " + s.current);
  // 再补今天一组，达标后才应变成 2
  const p = makeComponent("components/player/player.js");
  p.start(store.getPlans()[0]);
  p.metro.beginRunning();
  p.metro.finishAll(true);
  p.onDoneOk();
  const s2 = store.getStreak();
  results.push("     今天完成后 streak=" + s2.current + "（目标 " + goal + " 组/天）");
  p.metro.dispose();
});

// F. 清空后再读：设置与 streak 是否回到默认
probe("清空后的重置范围", () => {
  store.setSettings(Object.assign({}, store.getSettings(), { dailyGoalGroups: 5, sound: false }));
  store.clearAll();
  const s = store.getSettings();
  const st = store.getStreak();
  results.push("     清空后 dailyGoalGroups=" + s.dailyGoalGroups + " sound=" + s.sound + " longest=" + (st.longest || 0));
});

// G. 记录页：翻到未来月、点空日
probe("记录页未来月与空日", () => {
  let inst = null;
  pageCfg = null;
  delete require.cache[require.resolve(path.join(ROOT, "pages/history/history.js"))];
  require(path.join(ROOT, "pages/history/history.js"));
  inst = Object.assign({}, pageCfg);
  inst.data = JSON.parse(JSON.stringify(pageCfg.data || {}));
  inst.setData = (p, cb) => { Object.assign(inst.data, p); if (cb) cb(); };
  inst.selectComponent = () => makeComponent("components/player/player.js");
  inst.onLoad();
  inst.onShow();
  inst.onNextMonth();
  inst.onNextMonth();
  const cells = inst.data.cells || [];
  const firstReal = cells.find((c) => !c.empty);
  inst.onTapDay({ currentTarget: { dataset: { key: firstReal.key } } });
  if (!inst.data.detail) throw new Error("未来月点日期没有 detail");
  if (inst.data.detail.count !== 0) throw new Error("未来月不应有记录");
  if (inst.data.showGoTrain) throw new Error("非今天却出现「去训练」入口");
});

// I. 反馈能力不可用时训练必须照常推进（H5 预览 wx.vibrateShort 直接抛错）
probe("震动 API 抛错不阻断训练", () => {
  const raw = wx.vibrateShort;
  wx.vibrateShort = () => { throw new Error("wx.vibrateShort 暂不支持 H5 预览"); };
  try {
    store.clearAll();
    const p = makeComponent("components/player/player.js");
    p.start(store.getPlans()[0]);
    p.metro.beginRunning();
    if (p.data.stage !== "breath") throw new Error("没进呼吸阶段: " + p.data.stage);
    if (!p.data.remaining) throw new Error("倒计时没起: " + p.data.remaining);
    p.metro.onPhaseEnd();
    if (p.metro._state !== "running") throw new Error("状态机被打断: " + p.metro._state);
    p.metro.dispose();
  } finally {
    wx.vibrateShort = raw;
  }
});

probe("音频 API 抛错不阻断训练", () => {
  const raw = wx.createInnerAudioContext;
  wx.createInnerAudioContext = () => { throw new Error("createInnerAudioContext 不可用"); };
  try {
    const p = makeComponent("components/player/player.js");
    p.start(store.getPlans()[0]);
    p.metro.beginRunning();
    if (p.data.stage !== "breath") throw new Error("没进呼吸阶段: " + p.data.stage);
    p.metro.dispose();
  } finally {
    wx.createInnerAudioContext = raw;
    require(path.join(ROOT, "lib/audio.js")).dispose();
  }
});

probe("tabBar 隐藏覆盖准备/呼吸/完成三阶段", () => {
  tabCalls.length = 0;
  const p = makeComponent("components/player/player.js");
  p.start(store.getPlans()[0]);
  const afterStart = tabCalls.filter((x) => x === "hide").length;
  if (afterStart !== 1) throw new Error("开始时应隐藏 1 次，实际 " + afterStart);
  p.metro.beginRunning();          // 呼吸阶段
  p.metro.finishAll(true);         // 完成阶段
  const hides = tabCalls.filter((x) => x === "hide").length;
  if (hides !== 1) throw new Error("中途不应重复 hide，实际 " + hides);
  const shows = tabCalls.filter((x) => x === "show").length;
  if (shows !== 0) throw new Error("训练中不应 show，实际 " + shows);
  p.onDoneOk();                    // 关闭
  const shows2 = tabCalls.filter((x) => x === "show").length;
  if (shows2 !== 1) throw new Error("关闭时应恢复 1 次，实际 " + shows2);
  p.metro.dispose();
});

// H. 分享卡 quoteIndex 边界（canvas 绘制是异步的，等一拍再断言）
async function shareProbe() {
  const shareLib = require(path.join(ROOT, "lib/share.js"));
  const card = makeComponent("components/share-card/share-card.js");
  for (const i of [0, -1, 21, 22, 999]) {
    const data = shareLib.buildCardData(store, store.getSettings(), { type: "daily", theme: "dark", quoteIndex: i });
    if (!data.sub) throw new Error("quoteIndex=" + i + " 文案为空");
    card.open(data);
    await new Promise((r) => setTimeout(r, 120));
    if (!card.tempPath) throw new Error("quoteIndex=" + i + " 没出图");
  }
  results.push("PASS 分享卡文案下标边界");
}

shareProbe()
  .catch((e) => results.push("FAIL 分享卡文案下标边界 -> " + e.message))
  .then(() => {
    console.log(results.join("\n"));
    const failed = results.some((r) => r.startsWith("FAIL"));
    setTimeout(() => process.exit(failed ? 1 : 0), 50);
  });
