// 无 IDE 的本地冒烟测试：用最小 wx / Page / Component 运行时驱动页面逻辑。
const path = require("path");
const assert = require("node:assert/strict");
const ROOT = path.resolve(__dirname, "../../apps/miniprogram");

const storage = new Map();
const files = new Map();
const clipboard = [];
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
  hideTabBar: () => {},
  showTabBar: () => {},
  getSystemInfoSync: () => ({ theme: "light" }),
  getAppBaseInfo: () => ({ theme: "light" }),
  onThemeChange: () => {},
  vibrateShort: () => {},
  showToast: (o) => log.push(["toast", o.title]),
  showModal: (o) => o.success && o.success({ confirm: true }),
  showActionSheet: (o) => o.success && o.success({ tapIndex: 0 }),
  setClipboardData: (o) => { clipboard.push(o.data); if (o.success) o.success({}); },
  switchTab: () => {},
  createInnerAudioContext: () => ({
    src: "",
    volume: 1,
    play() {},
    stop() {},
    destroy() {},
    onError() {},
  }),
  setInnerAudioOption: () => {},
  canvasToTempFilePath: (o) => o.success && o.success({ tempFilePath: "/tmp/card.png" }),
  saveImageToPhotosAlbum: (o) => o.success && o.success({}),
  getSetting: (o) => o.success && o.success({ authSetting: {} }),
  env: { USER_DATA_PATH: "/tmp" },
  getFileSystemManager: () => ({
    writeFileSync: (name, data) => files.set(name, data),
    readdirSync: () => Array.from(files.keys(), (name) => path.basename(name)),
    unlinkSync: (name) => files.delete(name),
  }),
  shareFileMessage: (o) => { if (o.success) o.success({}); if (o.complete) o.complete({}); },
};

global.getApp = () => ({ globalData: {} });
global.Page = (cfg) => { pageCfg = cfg; };
global.App = (cfg) => { global.__app = cfg; };
global.Component = (cfg) => { compCfg = cfg; };

function makePage(relPath) {
  pageCfg = null;
  delete require.cache[require.resolve(path.join(ROOT, relPath))];
  require(path.join(ROOT, relPath));
  const cfg = pageCfg;
  const inst = Object.assign({}, cfg);
  inst.data = JSON.parse(JSON.stringify(cfg.data || {}));
  inst.setData = function (patch, cb) {
    Object.assign(this.data, patch);
    if (cb) cb();
  };
  inst.selectComponent = (id) => stubComponent(id);
  return inst;
}

function makeComponent(relPath) {
  compCfg = null;
  delete require.cache[require.resolve(path.join(ROOT, relPath))];
  require(path.join(ROOT, relPath));
  const cfg = compCfg;
  const inst = Object.assign({}, cfg.methods);
  inst.data = JSON.parse(JSON.stringify(cfg.data || {}));
  inst.setData = function (patch, cb) {
    Object.assign(this.data, patch);
    if (cb) cb();
  };
  inst.triggerEvent = (name, detail) => log.push(["event", name, detail]);
  if (cfg.lifetimes && cfg.lifetimes.attached) cfg.lifetimes.attached.call(inst);
  inst.createSelectorQuery = () => ({
    select: () => ({
      fields: () => ({
        exec: (cb) => {
          const ctx = makeCtx();
          cb([{ node: { width: 0, height: 0, getContext: () => ctx } }]);
        },
      }),
    }),
  });
  return inst;
}

function makeCtx() {
  const calls = [];
  const noop = (name) => (...a) => calls.push([name, ...a]);
  return new Proxy(
    {
      __calls: calls,
      measureText: (t) => ({ width: String(t).length * 30 }),
    },
    {
      get(target, prop) {
        if (prop in target) return target[prop];
        return noop(prop);
      },
      set(target, prop, v) {
        target[prop] = v;
        return true;
      },
    }
  );
}

let activePlayer = null;
let activeShare = null;
function stubComponent(id) {
  if (id === "#player") return activePlayer;
  if (id === "#shareCard") return activeShare;
  return { start() {}, open() {} };
}

const results = [];
function check(name, fn) {
  try {
    fn();
    results.push("PASS " + name);
  } catch (e) {
    results.push("FAIL " + name + " -> " + e.message + "\n" + (e.stack || "").split("\n").slice(1, 4).join("\n"));
  }
}

const core = require(path.join(ROOT, "lib/core.js"));
const appStore = require(path.join(ROOT, "utils/app-store.js"));

// 预置三条记录，覆盖连续 / 明细 / 热力
check("seed data", () => {
  const store = appStore.getStore();
  const plan = store.getPlans()[0];
  for (let i = 0; i < 3; i++) {
    core.recordSession(store, plan, 10, 60, true);
  }
  const streak = store.getStreak();
  if (streak.current < 1) throw new Error("连续天数没有算出来: " + JSON.stringify(streak));
});

check("home 页渲染", () => {
  activePlayer = makeComponent("components/player/player.js");
  activeShare = makeComponent("components/share-card/share-card.js");
  const page = makePage("pages/home/home.js");
  page.onLoad();
  page.onShow();
  if (!page.data.dateLabel) throw new Error("dateLabel 为空");
  if (page.data.week.length !== 7) throw new Error("本周条不是 7 天");
  if (page.data.done <= 0) throw new Error("今日组数为 0");
  if (!page.data.ctaText) throw new Error("ctaText 为空");
  if (!/^\/assets\/icons\/share(-d)?\.png$/.test(page.data.shareIcon)) throw new Error("分享图标路径不对: " + page.data.shareIcon);
  page.onShare();
  page.onStart();
  page.onPlayerClose({ detail: { finished: true, milestone: null } });
});

check("train 页渲染", () => {
  const page = makePage("pages/train/train.js");
  page.onLoad();
  page.onShow();
  if (page.data.plans.length !== 4) throw new Error("方案数量不对");
  if (!page.data.plans[0].idxLabel) throw new Error("缺序号");
  page.onPick({ currentTarget: { dataset: { id: page.data.plans[1].id } } });
  page.onPlayerClose({ detail: { finished: true, milestone: { badge: "一周" } } });
});

check("history 页渲染 + 选日 + 翻月", () => {
  activePlayer = makeComponent("components/player/player.js");
  activeShare = makeComponent("components/share-card/share-card.js");
  const page = makePage("pages/history/history.js");
  page.onLoad();
  page.onShow();
  if (!page.data.cells.length) throw new Error("月历为空");
  if (!page.data.totalSessions) throw new Error("总组数为 0");
  const today = core.todayKey();
  page.onTapDay({ currentTarget: { dataset: { key: today } } });
  if (!page.data.detail) throw new Error("没有弹出当天明细");
  if (!page.data.detail.sessions.length) throw new Error("明细里没有训练记录");
  page.onPrevMonth();
  page.onNextMonth();
  // 从记录页也能直接开练（对应移动端「去训练 →」）
  page.onGoTrain();
  if (!activePlayer.data.visible) throw new Error("记录页点「去训练」没有开播放层");
  activePlayer.metro.endEarly();
  page.onPlayerClose({ detail: { finished: true, share: "daily" } });
});

check("settings 页读写 + 主题切换", () => {
  const page = makePage("pages/settings/settings.js");
  page.onLoad();
  page.onShow();
  page.onGoalPlus();
  if (page.data.goal !== 4) throw new Error("目标没加 1");
  page.onPickTheme({ currentTarget: { dataset: { v: "dark" } } });
  if (page.data.themeClass !== "t-dark") throw new Error("深色主题没生效");
  page.onPickTheme({ currentTarget: { dataset: { v: "light" } } });
  if (page.data.themeClass !== "") throw new Error("浅色主题没恢复");
  const beforeSound = page.data.sound;
  page.onToggleSound();
  if (page.data.sound === beforeSound) throw new Error("声音开关没切换");
  page.onToggleHaptics();
  page.onToggleQuote();
  page.onExport();
  page.exportFile();
  page.exportClipboard();
  page.onClear();
});

check("取消转发不会复制训练备份，导出文件会被清理", () => {
  const page = makePage("pages/settings/settings.js");
  page.onLoad();
  const share = wx.shareFileMessage;
  const clipboardCount = clipboard.length;
  try {
    page.exportFile();
    assert.equal(files.size, 0, "成功发送后仍有备份文件");
    wx.shareFileMessage = (options) => {
      assert.ok(files.has(options.filePath), "发送时备份文件不存在");
      const result = { errMsg: "shareFileMessage:fail cancel" };
      if (options.fail) options.fail(result);
      if (options.complete) options.complete(result);
    };
    page.exportFile();
    assert.equal(clipboard.length, clipboardCount, "取消分享时写入了剪贴板");
    assert.equal(files.size, 0, "取消分享后仍有备份文件");
    delete wx.shareFileMessage;
    page.exportFile();
    assert.equal(clipboard.length, clipboardCount, "不支持分享时写入了剪贴板");
  } finally {
    wx.shareFileMessage = share;
    files.clear();
  }
});

check("删除失败后保留真实状态，重试可以清除旧备份和记录", () => {
  const page = makePage("pages/settings/settings.js");
  page.onLoad();
  const key = "tgm:log:" + core.todayKey();
  core.recordSession(page.store, page.store.getPlans()[0], 10, 60, true);
  const remove = wx.removeStorageSync;
  const before = log.length;
  try {
    wx.removeStorageSync = (name) => {
      if (name === key) throw new Error("存储暂不可用");
      remove(name);
    };
    page.onClear();
    assert.ok(storage.has(key));
    assert.ok(page.data.hasLogs);
    assert.ok(!log.slice(before).some((entry) => entry[1] === "已清空"));
  } finally {
    wx.removeStorageSync = remove;
  }
  files.set("/tmp/tgm-data-2026-01-01.json", "{}");
  files.set("/tmp/other.json", "{}");
  page.onClear();
  assert.ok(!storage.has(key));
  assert.deepEqual(Array.from(files.keys()), ["/tmp/other.json"]);
  files.clear();
});

check("普通转发不使用预览过的训练卡", () => {
  for (const name of ["home", "train", "history"]) {
    const page = makePage(`pages/${name}/${name}.js`);
    page.cardImage = "/tmp/previous-card.png";
    const image = page.onShareAppMessage({ from: "menu" }).imageUrl;
    assert.ok(image && image.startsWith("/assets/"));
  }
});

check("player 走完一整组", () => {
  const store = appStore.getStore();
  const plan = store.getPlans()[0];
  const before = (store.getDay(core.todayKey()) || { sessions: [] }).sessions.length;
  const player = makeComponent("components/player/player.js");
  player.start(plan);
  if (!player.data.visible) throw new Error("覆盖层没打开");
  player.metro.beginRunning();
  if (player.data.stage !== "breath") throw new Error("准备阶段没推进到呼吸");
  player.onTogglePause();
  if (!player.data.paused) throw new Error("暂停没生效");
  player.onTogglePause();
  player.metro.finishAll(true);
  const after = (store.getDay(core.todayKey()) || { sessions: [] }).sessions.length;
  if (after !== before + 1) throw new Error("完成一组没有入库: " + before + " -> " + after);
  player.onDoneOk();
  const after2 = (store.getDay(core.todayKey()) || { sessions: [] }).sessions.length;
  if (after2 !== after) throw new Error("点「好的」重复入库: " + after + " -> " + after2);
});

async function shareCheck() {
  const store = appStore.getStore();
  const settings = store.getSettings();
  const shareLib = require(path.join(ROOT, "lib/share.js"));
  const comp = makeComponent("components/share-card/share-card.js");
  for (const type of ["daily", "review", "milestone"]) {
    const opts = { type, theme: "dark", quoteIndex: 3 };
    if (type === "milestone") opts.milestone = core.STREAK_MILESTONES[2];
    const card = shareLib.buildCardData(store, settings, opts);
    comp.open(card);
    await new Promise((r) => setTimeout(r, 120));
    if (!comp.tempPath) throw new Error(type + " 卡没生成图片");
    if (!card.headline) throw new Error(type + " 卡没有标题");
  }
  comp.onSave();
  results.push("PASS 分享卡三种类型绘制");
}

async function sharePrivacyCheck() {
  const card = makeComponent("components/share-card/share-card.js");
  activeShare = card;
  const page = makePage("pages/home/home.js");
  const store = appStore.getStore();
  const data = require(path.join(ROOT, "lib/share.js")).buildCardData(store, store.getSettings(), { type: "review" });
  const menu = { from: "menu" };
  const cover = page.onShareAppMessage(menu).imageUrl;
  const cardButton = (version) => ({ from: "button", target: { dataset: { cardVersion: version } } });
  const exportCanvas = wx.canvasToTempFilePath;
  const pending = [];
  try {
    wx.canvasToTempFilePath = (options) => pending.push(options);
    card.open(data);
    await new Promise((resolve) => setTimeout(resolve, 120));
    assert.equal(pending.length, 1);
    card.close();
    card.open(data);
    pending[0].success({ tempFilePath: "/tmp/old-card.png" });
    assert.equal(card.data.readyVersion, 0);
    assert.equal(page.onShareAppMessage(menu).imageUrl, cover);
    await new Promise((resolve) => setTimeout(resolve, 120));
    assert.equal(pending.length, 2);
    pending[1].success({ tempFilePath: "/tmp/current-card.png" });
    const button = cardButton(card.data.readyVersion);
    assert.equal(page.onShareAppMessage(button).imageUrl, "/tmp/current-card.png");
    assert.equal(page.onShareAppMessage(menu).imageUrl, cover);
    assert.equal(page.onShareAppMessage({ from: "button" }).imageUrl, cover);
    card.close();
    assert.equal(page.onShareAppMessage(button).imageUrl, cover);
  } finally {
    wx.canvasToTempFilePath = exportCanvas;
  }
  results.push("PASS 转发只使用当前已生成的卡片");
}

check("里程碑识别", () => {
  if (!core.detectStreakMilestone(0, 1)) throw new Error("DAY 1 未识别");
  if (!core.detectStreakMilestone(6, 7)) throw new Error("DAY 7 未识别");
  if (core.detectStreakMilestone(7, 8)) throw new Error("不该命中");
});

// 静态回归：呼吸圆必须由 keyframes 驱动，不能被改回 transition
check("呼吸动画由 keyframes 驱动（首段收紧不能静止）", () => {
  const fs = require("fs");
  const wxss = fs.readFileSync(path.join(ROOT, "components/player/player.wxss"), "utf8");
  const wxml = fs.readFileSync(path.join(ROOT, "components/player/player.wxml"), "utf8");
  ["@keyframes blob-contract", "@keyframes blob-relax"].forEach((k) => {
    if (!wxss.includes(k)) throw new Error("缺少 " + k);
  });
  if (!/animation-name:\s*blob-contract/.test(wxss)) throw new Error("is-contract 未绑动画名");
  if (/transition-property:\s*transform/.test(wxss)) throw new Error("又被改回 transition 了");
  if (!/animation-duration:\s*\{\{phaseSec\}\}s/.test(wxml)) throw new Error("wxml 没有把时长传给 animation");
  if (/transition-duration/.test(wxml)) throw new Error("wxml 还在写 transition-duration");
});

shareCheck()
  .catch((e) => results.push("FAIL 分享卡三种类型绘制 -> " + e.message))
  .then(sharePrivacyCheck)
  .catch((e) => results.push("FAIL 转发只使用当前已生成的卡片 -> " + e.message))
  .then(() => {
    console.log(results.join("\n"));
    console.log("\n日志:", JSON.stringify(log.slice(0, 12)));
    // Metro 的 interval 还挂着，主动退出，避免命令行挂死
    const failed = results.filter((r) => r.startsWith("FAIL")).length;
    setTimeout(() => process.exit(failed ? 1 : 0), 20);
  });
