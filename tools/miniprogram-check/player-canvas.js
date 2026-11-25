// 校验本轮 canvas 修复是否真的生效：重试挂载 / 单帧容错 / rAF 降级 / 序列号防重入 / 老库 ellipse 兼容。
const path = require("path");
const ROOT = path.resolve(__dirname, "../../apps/miniprogram");

const results = [];
function report(ok, name, detail) {
  results.push((ok ? "PASS " : "FAIL ") + name + (detail ? " -> " + detail : ""));
}

// ---------- 最小运行时 ----------
function boot(opts) {
  const storage = new Map();
  const state = { frames: 0, rafCalls: 0, queryCalls: 0 };
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
    nextTick: (cb) => setTimeout(cb, 0),
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

  function makeCtxModel(model) {
    const ctx = {
      _scale: 1,
      save() {}, restore() {}, translate() {}, rotate() {}, scale(x) { this._scale *= x; },
      beginPath() {}, closePath() {}, moveTo() {}, lineTo() {},
      quadraticCurveTo() {}, bezierCurveTo() {}, arc() {},
      fill() {}, stroke() {}, fillRect() {}, strokeRect() {}, rect() {}, arcTo() {},
      clearRect() { state.frames += 1; if (model && model.throwOnClear) throw new Error("boom"); },
      setLineDash() {}, clip() {}, createRadialGradient: () => ({ addColorStop() {} }),
      createLinearGradient: () => ({ addColorStop() {} }), measureText: (t) => ({ width: String(t).length * 8 }),
      fillText() {}, globalAlpha: 1, fillStyle: "", strokeStyle: "", lineWidth: 1,
      lineCap: "round", lineJoin: "round", lineDashOffset: 0,
    };
    if (model && model.throwOnClip) {
      ctx.clip = () => { throw new Error("ctx.clip is not a function"); };
    }
    if (model && model.noEllipse) delete ctx.ellipse;
    else ctx.ellipse = () => { if (model && model.throwOnEllipse) throw new Error("no ellipse"); };
    return ctx;
  }

  function makeNode(model) {
    const node = {
      width: 0,
      height: 0,
      getContext: () => (model && model.nullCtx ? null : makeCtxModel(model)),
      cancelAnimationFrame: (id) => clearTimeout(id),
    };
    if (model && model.brokenRaf) {
      node.requestAnimationFrame = () => { throw new Error("rAF not supported"); };
    } else if (model && model.noRaf) {
      // 不提供 requestAnimationFrame
    } else {
      node.requestAnimationFrame = (cb) => { state.rafCalls += 1; return setTimeout(cb, 16); };
    }
    return node;
  }

  delete require.cache[require.resolve(path.join(ROOT, "components/player/player.js"))];
  delete require.cache[require.resolve(path.join(ROOT, "lib/panda.js"))];
  require(path.join(ROOT, "components/player/player.js"));

  const inst = Object.assign({}, compCfg.methods);
  inst.data = JSON.parse(JSON.stringify(compCfg.data));
  inst.setData = (patch, cb) => { Object.assign(inst.data, patch); if (cb) cb(); };
  inst.triggerEvent = () => {};
  inst.createSelectorQuery = () => ({
    select: () => ({
      fields: () => ({
        exec: (cb) => {
          state.queryCalls += 1;
          const n = opts.nodes ? opts.nodes(state.queryCalls - 1) : null;
          setTimeout(() => cb([n]), 2);
        },
      }),
    }),
  });
  compCfg.lifetimes.attached.call(inst);
  return { inst, state, makeNode, makeCtxModel };
}

const appStore = require(path.join(ROOT, "utils/app-store.js"));
const plan = () => appStore.getStore().getPlans()[0];

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

async function main() {
  // A. 前 3 次 node=null，第 4 次给正常节点 → 必须最终渲染
  {
    const env = boot({ nodes: (i) => (i < 3 ? { node: null, width: 0, height: 0 } : { node: env.makeNode(), width: 240, height: 240 }) });
    env.inst.start(plan());
    await sleep(1200);
    const ok = !!env.inst.pandaCtx && env.state.frames > 20;
    report(ok, "A 节点延迟挂载会自动重试并开始渲染", "重试查询 " + env.state.queryCalls + " 次，帧数 " + env.state.frames);
    env.inst.stopPandaLoop();
  }

  // B. node 永远是 null → 有限次重试后放弃，不崩、不留定时器
  {
    const env = boot({ nodes: () => ({ node: null, width: 0, height: 0 }) });
    env.inst.start(plan());
    await sleep(1400);
    const gaveUp = env.state.queryCalls >= 15 && env.state.queryCalls <= 16;
    const quiet = env.inst.pandaCtx === null && env.inst.pandaInitTimer === null;
    report(gaveUp && quiet, "B 节点始终拿不到时有限重试后静默放弃",
      "查询 " + env.state.queryCalls + " 次，initTimer=" + env.inst.pandaInitTimer);
    env.inst.stopPandaLoop();
  }

  // C. 绘制每帧抛错 → 循环不能死，后续帧仍继续尝试
  {
    let model = { throwOnClip: true };
    const env = boot({ nodes: () => ({ node: env.makeNode(model), width: 240, height: 240 }) });
    env.inst.start(plan());
    await sleep(400);
    const mid = env.state.frames;
    await sleep(400);
    const after = env.state.frames;
    report(after > mid + 10, "C 单帧绘制抛错不中断循环", mid + " 帧 -> " + after + " 帧");
    env.inst.stopPandaLoop();
  }

  // D. requestAnimationFrame 抛错 → 自动降级 setTimeout 继续跑
  {
    const env = boot({ nodes: () => ({ node: env.makeNode({ brokenRaf: true }), width: 240, height: 240 }) });
    env.inst.start(plan());
    await sleep(600);
    report(env.state.frames > 8 && env.inst.pandaUseTimeout === true,
      "D rAF 不可用时降级 setTimeout", "帧数 " + env.state.frames + " timeout=" + env.inst.pandaUseTimeout);
    env.inst.stopPandaLoop();
  }

  // E. 老基础库没有 ctx.ellipse → traceEllipse 兜底，绘制不抛错
  {
    const env = boot({ nodes: () => ({ node: env.makeNode({ noEllipse: true }), width: 240, height: 240 }) });
    env.inst.start(plan());
    await sleep(300);
    const panda = require(path.join(ROOT, "lib/panda.js"));
    let err = "";
    try {
      panda.drawPandaCanvas(env.makeCtxModel({ noEllipse: true }), 240, env.inst.pandaEngine.step(0.016, "light"), "light");
    } catch (e) { err = e.message; }
    report(!err, "E 无 ellipse 的上下文可正常绘制", err || "ok");
    env.inst.stopPandaLoop();
  }

  // F. 连续 start 两次 → 只保留一条循环（帧率不翻倍）
  {
    const env = boot({ nodes: () => ({ node: env.makeNode(), width: 240, height: 240 }) });
    env.inst.start(plan());
    await sleep(120);
    env.inst.start(plan());
    await sleep(300);
    const f1 = env.state.frames;
    await sleep(500);
    const f2 = env.state.frames;
    const fps = (f2 - f1) / 0.5;
    report(fps < 80, "F 重复 start 不会叠加循环", "约 " + Math.round(fps) + " 帧/秒");
    env.inst.stopPandaLoop();
  }

  // H. node 拿到但宽高为 0（wx:if 刚挂载、布局未完成）→ 也应重试
  {
    const env = boot({
      nodes: (i) => ({ node: env.makeNode(), width: i < 2 ? 0 : 240, height: i < 2 ? 0 : 240 }),
    });
    env.inst.start(plan());
    await sleep(900);
    report(!!env.inst.pandaCtx && env.state.frames > 10,
      "H 宽高为 0 时继续重试直到拿到尺寸", "查询 " + env.state.queryCalls + " 次，帧数 " + env.state.frames);
    env.inst.stopPandaLoop();
  }

  // I. 画面参数必须随时间变化（不是一张静止图）
  {
    const env = boot({ nodes: () => ({ node: env.makeNode(), width: 240, height: 240 }) });
    env.inst.start(plan());
    await sleep(300);
    const a = env.inst.pandaEngine.disp.lift;
    const a2 = env.inst.pandaEngine.clock;
    await sleep(500);
    const b = env.inst.pandaEngine.disp.lift;
    const b2 = env.inst.pandaEngine.clock;
    report(b2 > a2 + 0.3 && Math.abs(b - a) > 0.001,
      "I 动画状态随时间推进", "lift " + a.toFixed(3) + " -> " + b.toFixed(3));
    env.inst.stopPandaLoop();
  }

  // J. 关闭后必须停止绘制，不能留循环
  {
    const env = boot({ nodes: () => ({ node: env.makeNode(), width: 240, height: 240 }) });
    env.inst.start(plan());
    await sleep(250);
    env.inst.stopPandaLoop();
    const frozen = env.state.frames;
    await sleep(300);
    report(env.state.frames - frozen <= 1, "J 关闭后绘制停止", frozen + " -> " + env.state.frames);
  }

  // G. 完成态只改 transform，不改 canvas 实际宽高
  {
    const fs = require("fs");
    const wxss = fs.readFileSync(path.join(ROOT, "components/player/player.wxss"), "utf8");
    const js = fs.readFileSync(path.join(ROOT, "components/player/player.js"), "utf8");
    const onlyTransform = /\.panda-wrap\.is-done\s*{[^}]*transform:\s*scale\(0?\.8\)/.test(wxss) && !/\.panda-wrap\.is-done\s*{[^}]*width:/.test(wxss);
    const resizeOnce = (js.match(/canvas\.width\s*=/g) || []).length === 1;
    report(onlyTransform && resizeOnce, "G 完成态用 transform 缩放，不重设 canvas 宽高",
      "transform=" + onlyTransform + " resizeOnlyInInit=" + resizeOnce);
  }

  console.log(results.join("\n"));
  const failed = results.filter((r) => r.startsWith("FAIL")).length;
  setTimeout(() => process.exit(failed ? 1 : 0), 20);
}

main();
