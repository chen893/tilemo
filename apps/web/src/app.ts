import "./app.css";
import { Store as StoreClass, LocalStorageAdapter, DEFAULT_PLANS, DEFAULT_SETTINGS } from "@tilemo/data";
import {
  recordSession as _recordSession,
  recomputeStreak as _recomputeStreak,
  aggregateStats,
  dayMeetsGoal,
  heatLevel,
  levelOfDay,
  ymd,
  todayKey,
  pad2,
  clamp,
  QUOTES,
} from "@tilemo/core";
import { openShareCard } from "./share";
import {
  detectStreakMilestone,
  gatherCardData,
  type CardData,
  type MilestoneCopy,
  type CardType,
} from "@tilemo/share-card";

const Store = new StoreClass(new LocalStorageAdapter());
// Originals called recordSession(plan,...)/recomputeStreak() with a global Store;
// core takes the store as the first arg, so wrap them to preserve call sites verbatim.
function recordSession(plan: any, completedReps: number, durationSec: number, finished: boolean) {
  return _recordSession(Store, plan, completedReps, durationSec, finished);
}
function recomputeStreak() {
  return _recomputeStreak(Store);
}

/* ---------- 成就卡片分享：数据采集 ---------- */
function currentTheme(): "light" | "dark" {
  return document.documentElement.getAttribute("data-theme") === "dark" ? "dark" : "light";
}

function gatherShareData(type: CardType, milestone?: MilestoneCopy): CardData {
  return gatherCardData(Store, settings, { theme: currentTheme(), type: type, milestone: milestone });
}

/** 注入分享触发按钮：完成态「分享这次」+ home「分享我的坚持」。 */
function mountShareTriggers() {
  if (!document.getElementById("share-done-btn")) {
    var b1 = document.createElement("button");
    b1.id = "share-done-btn";
    b1.className = "share-done-btn";
    b1.textContent = "分享这次";
    b1.addEventListener("click", function () {
      openShareCard(function () {
        return gatherShareData("daily");
      });
    });
    var metroDone = document.getElementById("metro-done");
    if (metroDone) metroDone.appendChild(b1);
  }
  // 首页右上角分享图标（主动入口 → 回顾卡）
  if (!document.getElementById("share-fab")) {
    var fab = document.createElement("button");
    fab.id = "share-fab";
    fab.className = "share-fab";
    fab.setAttribute("aria-label", "分享我的坚持");
    fab.textContent = "↗";
    fab.addEventListener("click", function () {
      openShareCard(function () {
        return gatherShareData("review");
      });
    });
    document.body.appendChild(fab);
  }
}

/* ---------- 共享 helper ---------- */
var WD_SHORT = ["日", "一", "二", "三", "四", "五", "六"];
var WD_LONG = ["周日", "周一", "周二", "周三", "周四", "周五", "周六"];

function findPlan(id: string) {
  return plans.find(function (p) {
    return p.id === id;
  });
}
function sessionRowHtml(
  ses: { planId: string; completedReps: number; durationSec: number; finished: boolean },
  rowClass: string,
  doneText: string,
  partialText: string,
): string {
  var plan = findPlan(ses.planId);
  var name = plan ? plan.name : "自定义";
  var mins = Math.round((ses.durationSec / 60) * 10) / 10;
  return (
    '<div class="' + rowClass + '">' +
      "<div>" +
        '<div class="plan">' + name + " · " + ses.completedReps + " 次</div>" +
        '<div class="meta">' + mins + " 分钟</div>" +
      "</div>" +
      '<span class="tag' + (ses.finished ? "" : " is-partial") + '">' + (ses.finished ? doneText : partialText) + "</span>" +
    "</div>"
  );
}
function exportJson() {
  var data = Store.exportAll();
  var blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
  var url = URL.createObjectURL(blob);
  var a = document.createElement("a");
  a.href = url;
  a.download = "tgm-data-" + todayKey() + ".json";
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(function () {
    URL.revokeObjectURL(url);
  }, 1000);
  showToast("已导出 JSON 文件到本地");
}
// 视图 → (移动渲染器, 桌面渲染器)；switchView/refreshAll 共用，加视图只改这里
var RENDERERS: Record<string, { m: () => void; d: () => void }> = {
  home: { m: renderHome, d: renderDeskHome },
  train: { m: renderTrain, d: renderDeskTrain },
  history: { m: renderHistory, d: renderDeskHistory },
  settings: { m: renderSettings, d: renderDeskSettings },
};

/* ============================================================
   今天提了么 — v5「会呼吸的张弛体」
   功能逻辑 + localStorage 数据模型 1:1 沿自 v4（tgm:* 键名不变）
   视觉层 PIVOT：有机曲线 / 呼吸 / 绷紧的弦 / 暖身体色
   无联网、无外部依赖。
   ============================================================ */


var prefersReducedMotion = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;


function $(sel: string, root?: any): any { return (root||document).querySelector(sel); }
function $all(sel: string, root?: any): any[] { return Array.prototype.slice.call((root||document).querySelectorAll(sel)); }

/* ============================================================
   UI 渲染
   ============================================================ */
var settings = Store.getSettings();
var plans = Store.getPlans();

function applyTheme(){
  var t = settings.theme;
  var resolved;
  if (t === "system"){
    resolved = (window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches) ? "dark" : "light";
  } else resolved = t;
  document.documentElement.setAttribute("data-theme", resolved);
  var meta = document.querySelector('meta[name="theme-color"]');
  if (meta){
    meta.setAttribute("content", resolved === "dark" ? "#1F1814" : "#FAF3EC");
  }
}
applyTheme();
if (window.matchMedia){
  try {
    window.matchMedia("(prefers-color-scheme: dark)").addEventListener("change", function(){
      if (settings.theme === "system") applyTheme();
    });
  } catch(e){
    try {
      window.matchMedia("(prefers-color-scheme: dark)").addListener(function(){
        if (settings.theme === "system") applyTheme();
      });
    } catch(e2){}
  }
}

/* ---------- 视图切换（双壳：移动 #app + 桌面 #desk-shell） ----------
   isDesktop() 决定当前视口走哪一套壳；两套壳共用一个 currentView 状态。
   switchView 同时切换两套壳的 active 视图（DOM 都在文件里，按视口显隐）。
   render 时只渲染当前活动壳对应视图，避免无谓渲染。 */
var VIEWS = ["home","train","history","settings"];
var currentView = "home";

function isDesktop(){
  return window.matchMedia && window.matchMedia("(min-width: 1024px)").matches;
}

function moveTabIndicator(name){
  // 移动 tabbar 指示条
  var indicator = $("#tab-indicator");
  if (indicator){
    var target = document.querySelector('.tab[data-view="'+name+'"]') as any;
    if (target){
      var x = target.offsetLeft;
      var w = target.offsetWidth;
      indicator.style.width = w + "px";
      indicator.style.transform = "translateX(" + x + "px)";
    }
  }
}

function switchView(name){
  currentView = name;

  // —— 移动壳 #app 视图（绝对定位层叠） ——
  VIEWS.forEach(function(v){
    var el = document.getElementById("view-"+v);
    if (!el) return;
    if (v === name){ el.classList.add("is-active"); el.removeAttribute("inert"); }
    else { el.classList.remove("is-active"); el.setAttribute("inert", ""); }
  });
  $all(".tab").forEach(function(t){
    t.classList.toggle("is-active", t.getAttribute("data-view") === name);
  });
  // —— 桌面壳 #desk-shell 视图 ——
  VIEWS.forEach(function(v){
    var el = document.getElementById("desk-"+v);
    if (!el) return;
    el.classList.toggle("is-active", v === name);
    if (v === name) el.removeAttribute("inert");
    else el.setAttribute("inert", "");
  });
  $all(".desk-nav-item").forEach(function(t){
    t.classList.toggle("is-active", t.getAttribute("data-view") === name);
  });

  moveTabIndicator(name);

  // —— 桌面壳：header 随视图更新（eyebrow + title）——
  if (isDesktop()) setDeskHeader(name);

  // —— 渲染：只渲染当前活动壳的对应视图 ——
  var r = RENDERERS[name];
  if (r) (isDesktop() ? r.d : r.m)();
}

/* refreshAll —— 数据变化（打卡/训练完成/设置改动）后刷新当前活动壳的当前视图。
   桌面壳切到 home 时也要刷 home（CTA 状态变化）；移动壳同理。
   同源 localStorage，双壳看到的永远是同一份数据。 */
function refreshAll(){
  var r = RENDERERS[currentView];
  if (r) (isDesktop() ? r.d : r.m)();
  if (isDesktop()) renderDeskNavFoot();
}

$all(".tab").forEach(function(t){
  t.addEventListener("click", function(){
    switchView(t.getAttribute("data-view"));
  });
});
$all(".desk-nav-item").forEach(function(t){
  t.addEventListener("click", function(){
    switchView(t.getAttribute("data-view"));
  });
});

/* ---------- 报头（移动 masthead） ---------- */
function renderMasthead(){
  var d = new Date();
  var wd = WD_LONG[d.getDay()];
  var stampHtml = (d.getMonth()+1) + "." + pad2(d.getDate()) + ' <span class="dow">' + wd + '</span>';
  $("#masthead-stamp").innerHTML = stampHtml;

  var day = Store.getDay(todayKey());
  var done = day ? day.sessions.length : 0;
  var goal = settings.dailyGoalGroups;
  var onText, offText, isOn;
  if (done >= goal && done > 0){
    onText = "今天，提了"; isOn = true;
  } else if (done > 0){
    offText = done + "/" + goal; isOn = false;
  } else {
    offText = "待打卡"; isOn = false;
  }
  var st = $("#masthead-status");
  if (isOn){ st.textContent = onText; st.classList.add("is-on"); }
  else { st.textContent = offText; st.classList.remove("is-on"); }
  // —— 桌面壳 header 同步 ——
  var deskStamp = $("#desk-stamp");
  if (deskStamp) deskStamp.innerHTML = stampHtml;
  // header 右上 status 徽：只在 home 视图显示（今日进度语义），
  // 其它视图 header 不再泄漏 2/3。今日进度改由侧栏 .desk-nav-today 常驻承担。
  var deskStatus = $("#desk-status");
  if (deskStatus){
    if (currentView === "home"){
      deskStatus.classList.remove("is-hidden");
      if (isOn){ deskStatus.textContent = onText; deskStatus.classList.add("is-on"); }
      else { deskStatus.textContent = offText; deskStatus.classList.remove("is-on"); }
    } else {
      deskStatus.classList.add("is-hidden");
    }
  }
  // 侧栏常驻今日进度徽（所有视图都更新）
  renderDeskTodayIndicator(done, goal, isOn);
}

/* —— 桌面壳 header：eyebrow + title 随视图切换 ——
   解决 v11 只有 renderDeskHome 设置 header 的 bug。
   home: 日课 / 今天，提了么？
   train: 训练 / 选一组开始
   history: 记录 / 你的足迹
   settings: 设置 / 偏好 */
var DESK_HEADER = {
  home:    { eyebrow: "日课", title: '今天，<span class="em">提了</span>么？' },
  train:   { eyebrow: "训练", title: '挑<span class="em">一组</span>开始' },
  history: { eyebrow: "记录", title: '你的<span class="em">足迹</span>' },
  settings:{ eyebrow: "设置", title: '调成你的<span class="em">样子</span>' }
};
function setDeskHeader(view){
  var info = DESK_HEADER[view] || DESK_HEADER.home;
  var eb = $("#desk-eyebrow");
  if (eb) eb.innerHTML = '<span class="seed"></span>' + info.eyebrow;
  var title = $("#desk-title");
  if (title) title.innerHTML = info.title;
  // 今日进度徽（2/3）只在 home 视图的 header 出现；
  // 其它视图隐藏 header 徽，进度改由侧栏 .desk-nav-today 常驻承担。
  var status = $("#desk-status");
  if (status){
    if (view === "home"){
      // home：刷新徽内容（由 renderMasthead 写入文案）并显示
      status.classList.remove("is-hidden");
    } else {
      status.classList.add("is-hidden");
    }
  }
}

/* —— 桌面侧栏常驻今日进度徽（环形 + 数字）—— */
function renderDeskTodayIndicator(done, goal, isOn){
  var root = $("#desk-nav-today");
  if (!root) return;
  var d = (done == null) ? 0 : done;
  var g = goal || settings.dailyGoalGroups || 1;
  var on = isOn || (d >= g && d > 0);
  root.classList.toggle("is-done", on);
  var dn = $("#desk-nav-today-done");
  if (dn) dn.textContent = d;
  var dg = $("#desk-nav-today-goal");
  if (dg) dg.textContent = g;
  var num = $("#desk-nav-today-n");
  if (num) num.textContent = d;
  // 环形进度：周长 2πr = 2π·15 ≈ 94.2
  var ring = $("#desk-nav-today-ring");
  if (ring){
    var C = 94.2;
    var pct = Math.min(1, d / g);
    ring.setAttribute("stroke-dashoffset", String(C * (1 - pct)));
  }
}

/* ---------- V1 今日 ---------- */
function renderHome(){
  renderMasthead();

  var quoteEl = $("#home-quote");
  if (settings.dailyQuote){
    quoteEl.style.display = "";
    var seed = new Date().getDate() + new Date().getMonth()*31;
    quoteEl.textContent = QUOTES[seed % QUOTES.length];
  } else {
    quoteEl.style.display = "none";
  }

  var day = Store.getDay(todayKey());
  var done = day ? day.sessions.length : 0;
  var goal = settings.dailyGoalGroups;
  var isDone = (done >= goal && done > 0);

  animateCount($("#home-done"), done);
  $("#home-goal-num").textContent = goal;
  $("#string-ratio").textContent = done + " / " + goal;

  var progEl = $("#home-progress");
  progEl.classList.toggle("is-done", isDone);

  // 弦的张弛：未完成绷紧（向上拱），完成松弛下垂
  // 弦长 ~280px（10→290），绷紧态矢高做到弦长 12-18%，且 done 越少越紧
  var stringHero = $("#string-hero");
  var stringPath = $("#string-path");
  stringHero.classList.toggle("is-done", isDone);
  if (isDone){
    // 松弛下垂：中央向下沉降 ~40px，一眼读出"释放"
    stringPath.setAttribute("d", "M 10 26 Q 150 66 290 26");
  } else {
    // 绷紧：向上拱的紧绷弧。done=0 最紧 46px(~16.4%)，逐组放松到 ~30px 仍清晰可读
    var tension = clamp(46 - done * 8, 30, 46);
    stringPath.setAttribute("d", "M 10 36 Q 150 " + (36 - tension) + " 290 36");
  }

  // 主问句的张弛状态
  var questionEl = $("#home-question");
  questionEl.classList.toggle("is-tense", !isDone);
  questionEl.classList.toggle("is-settled", isDone);

  var cta = $("#home-cta");
  var ctaText = $("#home-cta-text");
  if (isDone){
    cta.classList.add("is-done");
    ctaText.textContent = done > goal ? "今天，提了。再来一组" : "今天，提了。继续保持";
  } else {
    cta.classList.remove("is-done");
    ctaText.textContent = "开始一组训练";
  }

  cta.onclick = function(){
    var plan = findPlan(settings.defaultPlanId) || plans[0];
    Metro.open(plan);
  };

  var s = Store.getStreak();
  var streakBlock = $("#streak-block");
  if (s.current > 0){
    streakBlock.classList.add("is-show");
    animateCount($("#streak-num"), s.current);
  } else {
    streakBlock.classList.remove("is-show");
  }

  renderMiniHeatmap();
}
function animateCount(el, target){
  var from = parseInt(el.textContent, 10);
  if (isNaN(from)) from = 0;
  if (from === target){ el.textContent = target; return; }
  if (prefersReducedMotion){ el.textContent = target; return; }
  var dur = 500;
  var t0 = null;
  function step(ts){
    if (!t0) t0 = ts;
    var p = Math.min(1, (ts - t0)/dur);
    var eased = 1 - Math.pow(1 - p, 3);
    el.textContent = Math.round(from + (target - from) * eased);
    if (p < 1) requestAnimationFrame(step);
    else el.textContent = target;
  }
  requestAnimationFrame(step);
}

function renderWeekDots(mountSelector, cellClass){
  var wrap = $(mountSelector);
  if (!wrap) return;
  wrap.innerHTML = "";
  var today = new Date();
  var todayStr = todayKey();
  for (var i=6;i>=0;i--){
    var d = new Date(today.getFullYear(), today.getMonth(), today.getDate()-i);
    var entry = Store.getDay(ymd(d));
    var lvl = levelOfDay(entry);
    var cell = document.createElement("div");
    cell.className = cellClass;
    cell.setAttribute("data-level", "" + lvl);
    if (ymd(d) === todayStr) cell.classList.add("is-today");
    cell.title = (d.getMonth()+1)+"/"+d.getDate()+" · "+((entry && entry.sessions.length)||0)+" 组";
    var blob = document.createElement("div");
    blob.className = "blob";
    var lbl = document.createElement("span");
    lbl.className = "lbl";
    lbl.textContent = WD_SHORT[d.getDay()];
    var dd = document.createElement("span");
    dd.className = "dd";
    dd.textContent = pad2(d.getDate());
    cell.appendChild(blob);
    cell.appendChild(lbl);
    cell.appendChild(dd);
    wrap.appendChild(cell);
  }
}
function renderMiniHeatmap(){ renderWeekDots("#mini-dots", "mini-dot"); }

/* ============================================================
   桌面壳 render（V11）—— 与移动壳读同一 Store，桌面布局/组件重表达
   ============================================================ */
function renderDeskNavFoot(){
  var s = Store.getStreak();
  animateCount($("#desk-streak-num"), s.current);
  animateCount($("#desk-streak-big"), s.current);
  var longestEl = $("#desk-streak-longest");
  if (longestEl) longestEl.textContent = s.longest || 0;
  // 同步今日进度徽（数据变化后）
  var day = Store.getDay(todayKey());
  var done = day ? day.sessions.length : 0;
  var goal = settings.dailyGoalGroups;
  var isOn = (done >= goal && done > 0);
  renderDeskTodayIndicator(done, goal, isOn);
}

/* —— 桌面 今日 dashboard —— */
function renderDeskHome(){
  setDeskHeader("home");
  renderMasthead();   // 同步 stamp + status（含桌面 header）

  // 每日一句
  var quoteEl = $("#desk-quote");
  if (settings.dailyQuote){
    quoteEl.style.display = "";
    var seed = new Date().getDate() + new Date().getMonth()*31;
    quoteEl.textContent = QUOTES[seed % QUOTES.length];
  } else {
    quoteEl.style.display = "none";
  }

  var day = Store.getDay(todayKey());
  var done = day ? day.sessions.length : 0;
  var goal = settings.dailyGoalGroups;
  var isDone = (done >= goal && done > 0);

  animateCount($("#desk-done"), done);
  $("#desk-goal-num").textContent = goal;
  $("#desk-string-ratio").textContent = done + " / " + goal;

  var progEl = $("#desk-progress");
  progEl.classList.toggle("is-done", isDone);

  // 绷紧的弦（桌面更宽更明显）
  var stringHero = $("#desk-string");
  var stringPath = $("#desk-string-path");
  stringHero.classList.toggle("is-done", isDone);
  if (isDone){
    stringPath.setAttribute("d", "M 10 36 Q 150 78 290 36");
  } else {
    var tension = clamp(50 - done * 9, 32, 50);
    stringPath.setAttribute("d", "M 10 46 Q 150 " + (46 - tension) + " 290 46");
  }

  // 主问句张弛
  var questionEl = $("#desk-question");
  questionEl.classList.toggle("is-tense", !isDone);
  questionEl.classList.toggle("is-settled", isDone);

  // CTA
  var cta = $("#desk-cta");
  var ctaText = $("#desk-cta-text");
  if (isDone){
    cta.classList.add("is-done");
    ctaText.textContent = done > goal ? "今天，提了。再来一组" : "今天，提了。继续保持";
  } else {
    cta.classList.remove("is-done");
    ctaText.textContent = "开始一组训练";
  }

  // 今日 sessions 列表
  var mount = $("#desk-sessions-mount");
  if (!day || !day.sessions || !day.sessions.length){
    mount.innerHTML = '<div class="desk-sessions-empty">今天还没有训练。点上面开始一组。</div>';
  } else {
    var html = "";
    day.sessions.forEach(function(ses){
      html += sessionRowHtml(ses, "desk-session-row", "已完成", "未完成");
    });
    mount.innerHTML = html;
  }

  // 连续天数（侧栏 + 主区）
  renderDeskNavFoot();

  // 7 天呼吸点
  renderDeskWeek();

  // 本周节奏（首页右栏第 3 模块）
  renderDeskCadence();
}

/* —— 本周节奏：最近 7 天的组数 + 达标率 + 柱条 —— */
function renderDeskCadence(){
  var root = $("#desk-cadence-stats");
  if (!root) return;
  var goal = settings.dailyGoalGroups || 1;
  var today = new Date();
  var todayStr = todayKey();
  var totalSets = 0, metDays = 0, maxSets = 0;
  var days = [];
  for (var i=6;i>=0;i--){
    var d = new Date(today.getFullYear(), today.getMonth(), today.getDate()-i);
    var entry = Store.getDay(ymd(d));
    var n = (entry && entry.sessions && entry.sessions.length) || 0;
    totalSets += n;
    if (n >= goal && n > 0) metDays++;
    if (n > maxSets) maxSets = n;
    days.push({ key: ymd(d), n: n, goal: goal });
  }
  var avg = Math.round(totalSets / 7 * 10) / 10;
  var statsHtml =
    '<div class="desk-cadence-stats">'+
      '<div class="desk-cadence-stat"><div class="l">7 天总组数</div><div class="v">'+totalSets+'<span class="u">组</span></div></div>'+
      '<div class="desk-cadence-stat"><div class="l">日均</div><div class="v">'+avg+'<span class="u">组</span></div></div>'+
    '</div>';
  // 柱条：高度按 maxSets 缩放映射到 0..88px，让多/少一眼可辨。
  //   0 值不给实心柱（CSS 里画虚线占位），>0 才按比例填充。
  //   满高参考 = 容器 96px − 上下边距；公式：h = n/maxSets * 88，clamp 最小 10px（非 0 值至少有可见高度）。
  var FULL = 88;
  var barsHtml = '<div class="desk-cadence-bar">';
  days.forEach(function(dy){
    var lvl = heatLevel({ length: dy.n }, dy.goal);
    var h, bv;
    if (dy.n === 0){
      h = 6;     // CSS 会用 !important 覆盖为虚线占位
      bv = '·';  // 空心标记
    } else {
      h = maxSets > 0 ? Math.max(10, Math.round(dy.n / maxSets * FULL)) : FULL;
      bv = dy.n;
    }
    barsHtml += '<div class="bar'+(dy.key===todayStr?' is-today':'')+'" data-level="'+lvl+'" style="height:'+h+'px" title="'+dy.n+' 组">'+
      '<span class="bv">'+bv+'</span>'+
    '</div>';
  });
  barsHtml += '</div>';
  var note = metDays >= 5
    ? '本周已达标 '+metDays+' 天，节奏很稳。'
    : metDays >= 3
      ? '本周达标 '+metDays+' 天，继续。'
      : '本周达标 '+metDays+' 天，从今天开始也不晚。';
  barsHtml += '<div class="desk-cadence-note">'+note+'</div>';
  root.innerHTML = statsHtml + barsHtml;
}

function renderDeskWeek(){ renderWeekDots("#desk-week", "desk-week-dot"); }

/* —— 桌面 训练（方案列表 + 详情面板） —— */
var deskSelectedPlanId = null;
function renderDeskTrain(){
  setDeskHeader("train");
  // 默认选中 = 默认方案
  if (!deskSelectedPlanId || !findPlan(deskSelectedPlanId)){
    deskSelectedPlanId = settings.defaultPlanId;
  }
  var list = $("#desk-plan-list");
  list.innerHTML = "";
  plans.forEach(function(p, idx){
    var card = document.createElement("li");
    card.className = "desk-plan-card";
    if (p.id === deskSelectedPlanId) card.classList.add("is-selected");
    card.innerHTML =
      '<div class="desk-plan-card-top">'+
        '<h3 class="desk-plan-card-name">'+p.name+'</h3>'+
        '<span class="desk-plan-card-index">'+pad2(idx+1)+' / '+pad2(plans.length)+'</span>'+
      '</div>'+
      (p.id === settings.defaultPlanId ? '<span class="desk-plan-default-tag">默认方案</span>' : '')+
      '<p class="desk-plan-card-desc">'+p.desc+'</p>'+
      '<div class="desk-plan-card-params">'+
        '<span class="desk-plan-chip">收紧<span class="v">'+p.contract+'s</span></span>'+
        '<span class="desk-plan-chip">放松<span class="v">'+p.relax+'s</span></span>'+
        '<span class="desk-plan-chip">次<span class="v">'+p.reps+'</span></span>'+
        '<span class="desk-plan-chip">组<span class="v">'+p.sets+'</span></span>'+
      '</div>';
    card.addEventListener("click", function(){
      deskSelectedPlanId = p.id;
      renderDeskTrain();
    });
    list.appendChild(card);
  });

  // 详情面板
  var sel = findPlan(deskSelectedPlanId) || plans[0];
  var detail = $("#desk-plan-detail");
  var totalSec = (sel.contract + sel.relax) * sel.reps * sel.sets;
  var totalMin = Math.round(totalSec/60*10)/10;
  detail.innerHTML =
    '<div class="eyebrow"><span class="seed"></span>方案预览</div>'+
    '<h3 class="name">'+sel.name+'</h3>'+
    '<p class="desc">'+sel.desc+'</p>'+
    '<div class="desk-plan-detail-grid">'+
      '<div class="desk-plan-stat"><div class="l">收紧</div><div class="v">'+sel.contract+'<span class="u">秒</span></div></div>'+
      '<div class="desk-plan-stat"><div class="l">放松</div><div class="v">'+sel.relax+'<span class="u">秒</span></div></div>'+
      '<div class="desk-plan-stat"><div class="l">每组</div><div class="v">'+sel.reps+'<span class="u">次</span></div></div>'+
      '<div class="desk-plan-stat"><div class="l">组数</div><div class="v">'+sel.sets+'<span class="u">组</span></div></div>'+
    '</div>'+
    '<div class="desk-plan-stat" style="margin-bottom:var(--s-5); display:flex; justify-content:space-between; align-items:baseline;">'+
      '<div class="l">预计耗时</div>'+
      '<div class="v" style="font-size:var(--t-xl);">'+totalMin+'<span class="u">分钟</span></div>'+
    '</div>'+
    '<button class="desk-cta" id="desk-plan-start" aria-label="开始这组训练">'+
      '<span>开始这组训练</span><span class="arrow" aria-hidden="true">→</span>'+
    '</button>';
  $("#desk-plan-start").addEventListener("click", function(){
    Metro.open(sel);
  });
}

/* —— 桌面 记录：年度热力 + 统计 + 日详情 —— */
var deskHeatYear = new Date().getFullYear();
var deskSelectedDayKey = null;

function renderDeskHistory(){
  setDeskHeader("history");
  var s = Store.getStreak();
  animateCount($("#desk-stat-streak"), s.current);
  var stats = aggregateStats(Store);
  animateCount($("#desk-stat-days"), stats.totalDays);
  animateCount($("#desk-stat-sessions"), stats.totalSessions);
  animateCount($("#desk-stat-met"), stats.metDays);
  renderDeskHeatmap();
}

function renderDeskHeatmap(){
  $("#desk-heat-year").textContent = deskHeatYear;
  // 下一年度按钮：不能超过当前年份
  var nextBtn = $("#desk-heat-next");
  if (nextBtn) nextBtn.disabled = (deskHeatYear >= new Date().getFullYear());
  var monthsEl = $("#desk-heat-months");
  monthsEl.innerHTML = "";
  var monthLabels = ["1月","2月","3月","4月","5月","6月","7月","8月","9月","10月","11月","12月"];
  monthLabels.forEach(function(lb){
    var s = document.createElement("span");
    s.textContent = lb;
    monthsEl.appendChild(s);
  });

  var grid = $("#desk-heat-grid");
  grid.innerHTML = "";

  var year = deskHeatYear;
  var jan1 = new Date(year, 0, 1);
  var jan1Dow = jan1.getDay();  // 0=日 … 6=六
  var dec31 = new Date(year, 11, 31);
  var totalDays = Math.round(((dec31 as any) - (jan1 as any))/86400000) + 1;

  // 先填前置空格（让 1月1日 落到对应 weekday 列）
  for (var i=0;i<jan1Dow;i++){
    var e = document.createElement("div");
    e.className = "desk-heat-cell empty";
    grid.appendChild(e);
  }

  var todayStr = todayKey();
  for (var d=1; d<=totalDays; d++){
    var dateObj = new Date(year, 0, d);
    var key = ymd(dateObj);
    var entry = Store.getDay(key);
    var lvl = levelOfDay(entry);
    var cell = document.createElement("button");
    cell.className = "desk-heat-cell";
    cell.setAttribute("data-level", "" + lvl);
    if (key === todayStr) cell.classList.add("is-today");
    if (key === deskSelectedDayKey) cell.classList.add("is-selected");
    var cnt = (entry && entry.sessions && entry.sessions.length) || 0;
    cell.title = (dateObj.getMonth()+1)+"月"+dateObj.getDate()+"日 · "+cnt+" 组";
    (function(cell, key, entry, dateObj){
      cell.addEventListener("click", function(){
        deskSelectedDayKey = key;
        renderDeskDayDetail(key, entry, dateObj);
        $all("#desk-heat-grid .desk-heat-cell.is-selected").forEach(function(c){ c.classList.remove("is-selected"); });
        cell.classList.add("is-selected");
      });
    })(cell, key, entry, dateObj);
    grid.appendChild(cell);
  }

  // 默认选今天（如果当年包含今天）
  if (!deskSelectedDayKey){
    var t = new Date();
    if (t.getFullYear() === year){
      var tKey = todayKey();
      var tEntry = Store.getDay(tKey);
      deskSelectedDayKey = tKey;
      renderDeskDayDetail(tKey, tEntry, t);
      $all("#desk-heat-grid .desk-heat-cell").forEach(function(c){
        if (c.classList.contains("is-today")) c.classList.add("is-selected");
      });
    } else {
      var mount = $("#desk-day-mount");
      mount.innerHTML = '<div class="desk-day-detail">'+
        '<div class="desk-day-detail-head"><span class="d">'+year+' 年</span></div>'+
        '<div class="desk-day-empty">点左侧任意一天查看详情。</div>'+
      '</div>';
    }
  } else {
    var sel = Store.getDay(deskSelectedDayKey);
    var ds = deskSelectedDayKey.split("-");
    renderDeskDayDetail(deskSelectedDayKey, sel, new Date(parseInt(ds[0]), parseInt(ds[1])-1, parseInt(ds[2])));
  }
}

function renderDeskDayDetail(key, entry, dateObj){
  var mount = $("#desk-day-mount");
  if (!entry || !entry.sessions || !entry.sessions.length){
    mount.innerHTML =
      '<div class="desk-day-detail">'+
        '<div class="desk-day-detail-head"><span class="d">'+(dateObj.getMonth()+1)+'.'+pad2(dateObj.getDate())+'</span></div>'+
        '<div class="desk-day-empty">这一天没有记录。安静的一天。</div>'+
      '</div>';
    return;
  }
  var html = '<div class="desk-day-detail">'+
    '<div class="desk-day-detail-head">'+
      '<span class="d">'+(dateObj.getMonth()+1)+'.'+pad2(dateObj.getDate())+'</span>'+
      '<span class="s">'+entry.sessions.length+' / '+entry.goalGroups+' 组</span>'+
    '</div>';
  entry.sessions.forEach(function(ses){
    html += sessionRowHtml(ses, "desk-session-row", "已完成", "未完成");
  });
  html += '</div>';
  mount.innerHTML = html;
}

/* —— 桌面 设置（分类分栏） —— */
function renderDeskSettings(){
  setDeskHeader("settings");
  $("#desk-goal-val").textContent = settings.dailyGoalGroups;
  $("#desk-goal-minus").disabled = settings.dailyGoalGroups <= 1;
  $("#desk-goal-plus").disabled  = settings.dailyGoalGroups >= 8;

  $("#desk-toggle-sound").setAttribute("aria-checked", settings.sound ? "true" : "false");
  $("#desk-toggle-haptics").setAttribute("aria-checked", settings.haptics ? "true" : "false");
  $("#desk-toggle-quote").setAttribute("aria-checked", settings.dailyQuote ? "true" : "false");

  $all("#desk-seg-theme button").forEach(function(b){
    b.setAttribute("aria-pressed", b.getAttribute("data-v") === settings.theme ? "true" : "false");
  });
  $all(".desk-nav-theme button").forEach(function(b){
    b.setAttribute("aria-pressed", b.getAttribute("data-v") === settings.theme ? "true" : "false");
  });

  var sel = $("#desk-plan-select");
  sel.innerHTML = "";
  plans.forEach(function(p){
    var b = document.createElement("button");
    b.textContent = p.name;
    b.setAttribute("aria-pressed", p.id === settings.defaultPlanId ? "true" : "false");
    sel.appendChild(b);
  });

  // —— 填实各分类右面板 ——
  // 注：每日目标分类走"配置导向"——stepper + 日均动态建议 + 一句说明，
  //     不再渲染历史 stat 卡（累计组数/达标天数/当前目标复读），避免与首页/记录页重复稀释配置上下文。
  renderDeskSetPlanOverview();
  renderDeskSetDataOverview();
  renderDeskSetAboutCounts();
  // 目标小建议随目标值微调
  renderDeskSetGoalTip();
}

/* —— 目标分类：日均动态建议 tip（基于近 7 天日均给目标建议）—— */

function renderDeskSetGoalTip(){
  var tip = $("#desk-goal-tip");
  if (!tip) return;
  var goal = settings.dailyGoalGroups;
  var keys = Store.allLogKeys();
  var recentSets = 0;
  var today = new Date();
  for (var i=0;i<7;i++){
    var d = new Date(today.getFullYear(), today.getMonth(), today.getDate()-i);
    var e = Store.getDay(ymd(d));
    recentSets += (e && e.sessions && e.sessions.length) || 0;
  }
  var recentAvg = recentSets/7;
  var msg;
  if (recentAvg === 0){
    msg = '从能稳定坚持的组数开始，宁少勿断。能连续 7 天的组数，就是属于你的「达标」。';
  } else if (recentAvg >= goal){
    msg = "你近 7 天日均 "+recentAvg.toFixed(1)+" 组，已超过当前目标 "+goal+" 组。可以试试调高一档挑战自己。";
  } else if (recentAvg >= goal * 0.7){
    msg = "你近 7 天日均 "+recentAvg.toFixed(1)+" 组，距离目标 "+goal+" 组只差一点。保持就好，不必硬调。";
  } else {
    msg = "你近 7 天日均 "+recentAvg.toFixed(1)+" 组，低于目标 "+goal+" 组。若连续断打卡，可以考虑先把目标调低，先养习惯再加量。";
  }
  tip.textContent = msg;
}

/* —— 训练方案分类：当前默认方案的参数总览 —— */
function renderDeskSetPlanOverview(){
  var root = $("#desk-plan-overview");
  if (!root) return;
  var def = findPlan(settings.defaultPlanId) || plans[0];
  var totalSec = (def.contract + def.relax) * def.reps * def.sets;
  var totalMin = Math.round(totalSec/60*10)/10;
  root.innerHTML =
    '<div class="row"><span class="k">当前默认</span><span class="vv">'+def.name+'</span></div>'+
    '<div class="row"><span class="k">收紧 / 放松</span><span class="vv">'+def.contract+'s / '+def.relax+'s</span></div>'+
    '<div class="row"><span class="k">每组次数</span><span class="vv">'+def.reps+' 次</span></div>'+
    '<div class="row"><span class="k">组数</span><span class="vv">'+def.sets+' 组</span></div>'+
    '<div class="row"><span class="k">预计耗时</span><span class="vv">'+totalMin+' 分钟</span></div>';
}

/* —— 数据分类：当前存储的数据概览 —— */
function renderDeskSetDataOverview(){
  var root = $("#desk-data-overview");
  if (!root) return;
  var stats = aggregateStats(Store);
  var lastStr = stats.lastTs ? new Date(stats.lastTs).toLocaleString("zh-CN", { month:"numeric", day:"numeric", hour:"2-digit", minute:"2-digit" }) : "—";
  root.innerHTML =
    '<div class="row"><span class="k">已记录天数</span><span class="vv">'+stats.totalDays+' 天</span></div>'+
    '<div class="row"><span class="k">已记录组数</span><span class="vv">'+stats.totalSessions+' 组</span></div>'+
    '<div class="row"><span class="k">最近一次</span><span class="vv">'+lastStr+'</span></div>';
}

/* —— 关于分类：数据条目计数 —— */
function renderDeskSetAboutCounts(){
  var el = $("#desk-about-counts");
  if (!el) return;
  var stats = aggregateStats(Store);
  el.textContent = stats.totalSessions + " 条训练 / " + stats.keysCount + " 个日子";
}

/* —— 桌面壳独有事件绑定（仅绑一次） —— */
function bindDeskEvents(){
  // 今日 CTA
  var deskCta = $("#desk-cta");
  if (deskCta){
    deskCta.addEventListener("click", function(){
      var plan = findPlan(settings.defaultPlanId) || plans[0];
      Metro.open(plan);
    });
  }

  // 设置分类切换
  $all(".desk-set-cat").forEach(function(cat){
    cat.addEventListener("click", function(){
      var c = cat.getAttribute("data-cat");
      $all(".desk-set-cat").forEach(function(x){ x.classList.toggle("is-active", x === cat); });
      $all(".desk-set-panel").forEach(function(p){
        p.classList.toggle("is-active", p.getAttribute("data-cat") === c);
      });
    });
  });

  // 目标步进
  $("#desk-goal-minus").addEventListener("click", function(){
    settings.dailyGoalGroups = clamp(settings.dailyGoalGroups-1, 1, 8);
    Store.setSettings(settings);
    recomputeStreak();
    renderDeskSettings();
  });
  $("#desk-goal-plus").addEventListener("click", function(){
    settings.dailyGoalGroups = clamp(settings.dailyGoalGroups+1, 1, 8);
    Store.setSettings(settings);
    recomputeStreak();
    renderDeskSettings();
  });

  // 默认方案选择
  $("#desk-plan-select").addEventListener("click", function(e){
    var b = e.target.closest("button");
    if (!b) return;
    var idx = Array.prototype.indexOf.call(this.children, b);
    var p = plans[idx];
    if (!p) return;
    settings.defaultPlanId = p.id;
    Store.setSettings(settings);
    renderDeskSettings();
  });

  // toggles
  function bindDeskToggle(id, key){
    $(id).addEventListener("click", function(){
      settings[key] = !settings[key];
      Store.setSettings(settings);
      this.setAttribute("aria-checked", settings[key] ? "true" : "false");
      if (key === "dailyQuote" && currentView === "home") renderDeskHome();
    });
  }
  bindDeskToggle("#desk-toggle-sound", "sound");
  bindDeskToggle("#desk-toggle-haptics", "haptics");
  bindDeskToggle("#desk-toggle-quote", "dailyQuote");

  // 主题分段（设置面板内）
  $all("#desk-seg-theme button").forEach(function(b){
    b.addEventListener("click", function(){
      settings.theme = b.getAttribute("data-v");
      Store.setSettings(settings);
      applyTheme();
      renderDeskSettings();
    });
  });
  // 主题分段（侧栏 footer 内）
  $all(".desk-nav-theme button").forEach(function(b){
    b.addEventListener("click", function(){
      settings.theme = b.getAttribute("data-v");
      Store.setSettings(settings);
      applyTheme();
      renderDeskSettings();
    });
  });

  // 导出
  $("#desk-btn-export").addEventListener("click", exportJson);

  // 年度热力导航（明确为"上一年度/下一年度"年份切换；超过当前年份禁用）
  $("#desk-heat-prev").addEventListener("click", function(){
    deskHeatYear--;
    deskSelectedDayKey = null;
    renderDeskHeatmap();
  });
  $("#desk-heat-next").addEventListener("click", function(){
    if (deskHeatYear >= new Date().getFullYear()) return;
    deskHeatYear++;
    deskSelectedDayKey = null;
    renderDeskHeatmap();
  });
}

/* ---------- V2 训练 ---------- */
function renderTrain(){
  var list = $("#plan-list");
  list.innerHTML = "";
  plans.forEach(function(p, idx){
    var card = document.createElement("button");
    card.className = "plan-card";
    if (p.id === settings.defaultPlanId) card.classList.add("is-default");
    card.innerHTML =
      '<div class="plan-card-top">'+
        '<h3 class="plan-card-name">'+p.name+'</h3>'+
        '<span class="plan-card-index">'+pad2(idx+1)+' / '+pad2(plans.length)+'</span>'+
      '</div>'+
      (p.id === settings.defaultPlanId ? '<span class="plan-card-default-tag">默认方案</span>' : '')+
      '<p class="plan-card-desc">'+p.desc+'</p>'+
      '<div class="plan-card-params">'+
        '<span class="plan-chip">收紧<span class="v">'+p.contract+'s</span></span>'+
        '<span class="plan-chip">放松<span class="v">'+p.relax+'s</span></span>'+
        '<span class="plan-chip">次<span class="v">'+p.reps+'</span></span>'+
        '<span class="plan-chip">组<span class="v">'+p.sets+'</span></span>'+
      '</div>';
    card.addEventListener("click", function(){ Metro.open(p); });
    list.appendChild(card);
  });
}

/* ---------- V3 记录 ---------- */
var calCursor = (function(){
  var d = new Date();
  return { y: d.getFullYear(), m: d.getMonth() };
})();
function renderHistory(){
  var s = Store.getStreak();
  animateCount($("#stat-streak"), s.current);
  var stats = aggregateStats(Store);
  animateCount($("#stat-total-days"), stats.totalDays);
  animateCount($("#stat-total-sessions"), stats.totalSessions);

  var dowRow = $("#cal-dow-row");
  dowRow.innerHTML = "";
  WD_SHORT.forEach(function(w){
    var el = document.createElement("div");
    el.className = "cal-dow";
    el.textContent = w;
    dowRow.appendChild(el);
  });
  renderCalendar();
}
function renderCalendar(){
  var grid = $("#cal-grid");
  grid.innerHTML = "";
  var y = calCursor.y, m = calCursor.m;
  $("#cal-title").innerHTML = '<span class="y">'+y+'</span>' + pad2(m+1);

  var firstDay = new Date(y, m, 1).getDay();
  var daysInMonth = new Date(y, m+1, 0).getDate();
  var todayStr = todayKey();

  for (var i=0;i<firstDay;i++){
    var empty = document.createElement("div");
    empty.className = "cal-cell empty";
    grid.appendChild(empty);
  }
  for (var d=1; d<=daysInMonth; d++){
    var dateObj = new Date(y, m, d);
    var key = ymd(dateObj);
    var entry = Store.getDay(key);
    var lvl = levelOfDay(entry);
    var cell = document.createElement("button");
    cell.className = "cal-cell";
    cell.setAttribute("data-level", "" + lvl);
    var cnt = (entry && entry.sessions && entry.sessions.length) || 0;
    cell.innerHTML = '<span class="n">'+d+'</span>' + (cnt>0 ? '<span class="cnt">'+cnt+'组</span>' : '');
    if (key === todayStr) cell.classList.add("is-today");
    (function(cell, key, entry, dateObj){
      cell.onclick = function(){ openDayDetail(key, entry, dateObj); };
    })(cell, key, entry, dateObj);
    grid.appendChild(cell);
  }

  if (currentDetailKey) {
    var entry = Store.getDay(currentDetailKey);
    var ds = currentDetailKey.split("-");
    openDayDetail(currentDetailKey, entry, new Date(parseInt(ds[0]), parseInt(ds[1])-1, parseInt(ds[2])));
  }
}
var currentDetailKey = null;
function openDayDetail(key, entry, dateObj){
  currentDetailKey = key;
  $all(".cal-cell.is-selected").forEach(function(c){ c.classList.remove("is-selected"); });
  $all(".cal-cell").forEach(function(c){
    if (c.querySelector(".n") && c.querySelector(".n").textContent === String(dateObj.getDate()) && !c.classList.contains("empty")){
      c.classList.add("is-selected");
    }
  });

  var mount = $("#day-detail-mount");
  if (!entry || !entry.sessions || !entry.sessions.length){
    mount.innerHTML =
      '<div class="day-detail">'+
        '<div class="day-detail-head"><span class="d">'+(dateObj.getMonth()+1)+'.'+pad2(dateObj.getDate())+'</span></div>'+
        '<div class="day-empty">这一天没有记录。安静的一天。</div>'+
      '</div>';
    return;
  }
  var html = '<div class="day-detail">'+
    '<div class="day-detail-head">'+
      '<span class="d">'+(dateObj.getMonth()+1)+'.'+pad2(dateObj.getDate())+'</span>'+
      '<span class="s">'+entry.sessions.length+' / '+entry.goalGroups+' 组</span>'+
    '</div>';
  entry.sessions.forEach(function(ses){
    html += sessionRowHtml(ses, "session-item", "完成", "部分");
  });
  html += '</div>';
  mount.innerHTML = html;
}

$("#cal-prev").addEventListener("click", function(){
  calCursor.m--; if (calCursor.m<0){ calCursor.m=11; calCursor.y--; }
  renderCalendar();
});
$("#cal-next").addEventListener("click", function(){
  calCursor.m++; if (calCursor.m>11){ calCursor.m=0; calCursor.y++; }
  renderCalendar();
});

/* ---------- V4 设置 ---------- */
function renderSettings(){
  $("#goal-val").textContent = settings.dailyGoalGroups;
  $("#goal-minus").disabled = settings.dailyGoalGroups <= 1;
  $("#goal-plus").disabled  = settings.dailyGoalGroups >= 8;

  $("#toggle-sound").setAttribute("aria-checked", settings.sound ? "true" : "false");
  $("#toggle-haptics").setAttribute("aria-checked", settings.haptics ? "true" : "false");
  $("#toggle-quote").setAttribute("aria-checked", settings.dailyQuote ? "true" : "false");

  $all("#seg-theme button").forEach(function(b){
    b.setAttribute("aria-pressed", b.getAttribute("data-v") === settings.theme ? "true" : "false");
  });

  var sel = $("#plan-select");
  sel.innerHTML = "";
  plans.forEach(function(p){
    var b = document.createElement("button");
    b.textContent = p.name;
    b.setAttribute("aria-pressed", p.id === settings.defaultPlanId ? "true" : "false");
    b.addEventListener("click", function(){
      settings.defaultPlanId = p.id;
      Store.setSettings(settings);
      renderSettings();
    });
    sel.appendChild(b);
  });
}

$("#goal-minus").addEventListener("click", function(){
  settings.dailyGoalGroups = clamp(settings.dailyGoalGroups-1, 1, 8);
  Store.setSettings(settings);
  recomputeStreak();
  renderSettings();
});
$("#goal-plus").addEventListener("click", function(){
  settings.dailyGoalGroups = clamp(settings.dailyGoalGroups+1, 1, 8);
  Store.setSettings(settings);
  recomputeStreak();
  renderSettings();
});
function bindToggle(id, key){
  $(id).addEventListener("click", function(){
    settings[key] = !settings[key];
    Store.setSettings(settings);
    this.setAttribute("aria-checked", settings[key] ? "true" : "false");
    if (key === "dailyQuote") renderHome();
  });
}
bindToggle("#toggle-sound", "sound");
bindToggle("#toggle-haptics", "haptics");
bindToggle("#toggle-quote", "dailyQuote");

$all("#seg-theme button").forEach(function(b){
  b.addEventListener("click", function(){
    settings.theme = b.getAttribute("data-v");
    Store.setSettings(settings);
    applyTheme();
    renderSettings();
  });
});

$("#btn-export").addEventListener("click", exportJson);

/* ---------- Toast ---------- */
var toastTimer = null;
function showToast(msg){
  var t = $("#toast");
  t.textContent = msg;
  t.classList.add("is-show");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(function(){ t.classList.remove("is-show"); }, 2400);
}

/* ============================================================
   V5 节拍器（有机呼吸形 / 单一同步 setPhase）
   ============================================================ */
var Metro = (function(){
  var plan = null;
  var state = "idle"; // idle | prep | running | paused | done
  var setIdx = 0, repIdx = 0;
  var phase = "contract"; // contract | relax
  var remaining = 0;
  var tickHandle = null;
  var phaseStartTs = 0;
  var totalElapsed = 0;
  var startedReps = 0;
  var streakBeforeSession = 0;
  var audioCtx = null;

  var el = {
    root:    $("#metronome"),
    prep:    $("#metro-prep"),
    prepNum: $("#prep-num"),
    breath:  $("#metro-breath"),
    count:   $("#breath-count"),
    phase:   $("#breath-phase"),
    progress: $("#metro-progress"),
    pauseBtn: $("#metro-pause"),
    pauseText: $("#pause-text"),
    pauseIcon: $("#pause-icon"),
    endBtn:  $("#metro-end"),
    closeBtn: $("#metro-close"),
    done:    $("#metro-done"),
    doneSub: $("#done-sub"),
    stage:   $("#metro-stage")
  };

  function open(p){
    plan = p;
    state = "prep";
    setIdx = 0; repIdx = 0; phase = "contract";
    startedReps = 0; totalElapsed = 0;
    streakBeforeSession = Store.getStreak().current;
    el.prep.style.display = "";
    el.breath.style.display = "none";
    el.done.style.display = "none";
    el.prepNum.textContent = "3";
    el.root.classList.remove("is-contract", "is-relax");
    el.root.classList.add("is-open");
    document.getElementById("tabbar").classList.add("is-hidden");
    updateProgressText();
    runPrep(3);
  }

  function runPrep(n){
    el.prepNum.textContent = String(n);
    if (!prefersReducedMotion){
      el.prepNum.style.transition = "transform 600ms var(--ease-breath), opacity 600ms var(--ease-breath)";
      el.prepNum.style.transform = "scale(1.15)";
      el.prepNum.style.opacity = "0";
    }
    setTimeout(function(){
      el.prepNum.style.transition = "none";
      el.prepNum.style.transform = "scale(1)";
      el.prepNum.style.opacity = "1";
      if (n > 1){
        setTimeout(function(){ runPrep(n-1); }, 60);
      } else {
        setTimeout(function(){ beginRunning(); }, 600);
      }
    }, 600);
  }

  function beginRunning(){
    state = "running";
    el.prep.style.display = "none";
    el.breath.style.display = "";
    el.done.style.display = "none";
    // display:none→block 不触发 transition：先确保"无 phase"基础态、强制 reflow
    // 让基础态先绘制，再加 is-contract，首个收紧才会从基础态过渡（动起来、与倒数同步）
    el.root.classList.remove("is-contract", "is-relax");
    void el.breath.offsetWidth;
    setIdx = 0; repIdx = 0; phase = "contract";
    startedReps = 0;
    setPhase("contract");
  }

  function updateProgressText(){
    var totalReps = plan.reps * plan.sets;
    var doneReps = startedReps;
    el.progress.innerHTML =
      '<span class="num">'+pad2(setIdx+1)+'</span><span class="sep">/</span><span class="num">'+pad2(plan.sets)+'</span> 组 '+
      '<span class="sep">·</span> '+
      '<span class="num">'+pad2(doneReps+1)+'</span><span class="sep">/</span><span class="num">'+pad2(totalReps)+'</span> 次';
  }

  function setBreathDur(sec){
    // 呼吸形动画时长与本拍秒数绑定
    var dur = (prefersReducedMotion ? 1 : Math.round(sec*1000)) + "ms";
    document.documentElement.style.setProperty("--dur-breath", dur);
  }

  /* setPhase —— 单一同步函数（v5 纪律延续 v4）
     同一同步块内一次性更新：形 class（scale+色） / phase 文本 / aria-live /
     倒计时数字色 / phase 词背景 / 计时方向 / 触感与提示音 */
  function setPhase(p){
    phase = p;
    var secs = (p === "contract") ? plan.contract : plan.relax;
    remaining = secs;

    // 1) 呼吸形动画时长与本拍秒数绑定
    setBreathDur(secs);

    // 2) phase class —— 切换形 scale+色（全部由 CSS 同源驱动）
    //    收紧：缩小 0.82 + 升温 accent-hot
    //    放松：扩大 1.05 + 降温 accent-soft
    el.root.classList.toggle("is-contract", p === "contract");
    el.root.classList.toggle("is-relax", p === "relax");

    // 3) phase 文本
    el.phase.textContent = (p === "contract") ? "收 · 紧" : "放 · 松";

    // 4) 倒计时数字 + aria-live
    el.count.textContent = String(remaining);

    // 5) 触感与提示音（依 settings）
    feedback(p);

    phaseStartTs = Date.now();
    startTick();
  }

  function startTick(){
    stopTick();
    tickHandle = setInterval(function(){
      if (state !== "running") return;
      remaining -= 1;
      totalElapsed += 1000;   // durationSec 累加点（与 v3/v4 修复一致）
      if (remaining <= 0){
        stopTick();
        onPhaseEnd();
      } else {
        el.count.textContent = String(remaining);
      }
    }, 1000);
  }
  function stopTick(){ if (tickHandle){ clearInterval(tickHandle); tickHandle = null; } }

  function onPhaseEnd(){
    if (phase === "contract"){
      setPhase("relax");
    } else {
      startedReps++;
      repIdx++;
      updateProgressText();
      if (repIdx >= plan.reps){
        repIdx = 0;
        setIdx++;
        if (setIdx >= plan.sets){
          finishAll(true);
          return;
        }
      }
      setPhase("contract");
    }
  }

  function feedback(p){
    if (settings.haptics && navigator.vibrate){
      try { navigator.vibrate(p === "contract" ? 8 : 4); } catch(e){}
    }
    if (settings.sound){
      try {
        if (!audioCtx){
          var AC = (window as any).AudioContext || (window as any).webkitAudioContext;
          if (AC) audioCtx = new AC();
        }
        if (audioCtx){
          var osc = audioCtx.createOscillator();
          var gain = audioCtx.createGain();
          osc.type = "sine";
          osc.frequency.value = (p === "contract") ? 880 : 660;
          var now = audioCtx.currentTime;
          gain.gain.setValueAtTime(0, now);
          gain.gain.linearRampToValueAtTime(0.06, now + 0.01);
          gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.06);
          osc.connect(gain).connect(audioCtx.destination);
          osc.start(now);
          osc.stop(now + 0.07);
        }
      } catch(e){}
    }
  }

  function finishAll(finished){
    state = "done";
    stopTick();
    var dur = totalElapsedSec();
    recordSession(plan, plan.reps * plan.sets, dur, finished);
    el.breath.style.display = "none";
    el.done.style.display = "";
    el.doneSub.textContent = finished
      ? ("完成了 " + (plan.reps*plan.sets) + " 次收紧，做得好。")
      : ("做了 " + startedReps + " 次，也算数。");
    setTimeout(function(){
      close(true);
    }, 1800);
  }

  function totalElapsedSec(){
    return totalElapsed / 1000;
  }

  function pause(){
    if (state !== "running") return;
    state = "paused";
    stopTick();
    el.pauseText.textContent = "继续";
    el.pauseIcon.innerHTML = '<polygon points="6 4 20 12 6 20 6 4" fill="currentColor" stroke="none"/>';
    el.pauseIcon.setAttribute("fill","currentColor");
    el.pauseIcon.setAttribute("stroke","none");
  }
  function resume(){
    if (state !== "paused") return;
    state = "running";
    el.pauseText.textContent = "暂停";
    el.pauseIcon.innerHTML = '<rect x="6" y="5" width="4" height="14" rx="1" fill="currentColor" stroke="none"/><rect x="14" y="5" width="4" height="14" rx="1" fill="currentColor" stroke="none"/>';
    startTick();
  }

  function endEarly(){
    if (state === "prep" || state === "idle"){
      close(false);
      return;
    }
    stopTick();
    var finished = false;
    var doneReps = startedReps;
    var dur = totalElapsedSec();
    if (doneReps > 0){
      recordSession(plan, doneReps, dur, finished);
    }
    close(false);
  }

  function close(isCompletion){
    stopTick();
    state = "idle";
    el.root.classList.remove("is-open");
    el.root.classList.remove("is-contract", "is-relax");
    // 顺序硬约束：先切视图与恢复 tabbar，后触发庆祝
    switchView("home");
    document.getElementById("tabbar").classList.remove("is-hidden");
    // 完成态 OR 提前结束让今天达标都触发庆祝（一次温柔的沉降脉冲）
    if (isCompletion || startedReps > 0){
      var day = Store.getDay(todayKey());
      if (day && day.sessions.length >= day.goalGroups){
        // 移动壳 CTA 庆祝
        var cta = $("#home-cta");
        if (cta){
          cta.classList.add("is-settling");
          setTimeout(function(){ cta.classList.remove("is-settling"); }, 1600);
        }
        // 桌面壳 CTA 庆祝
        var deskCta = $("#desk-cta");
        if (deskCta){
          deskCta.classList.add("is-settling");
          setTimeout(function(){ deskCta.classList.remove("is-settling"); }, 1600);
        }
      }
      // 连续天数里程碑：跨阈值自动弹成就卡片（晚于 CTA 庆祝）
      var ns = Store.getStreak().current;
      var ms = detectStreakMilestone(streakBeforeSession, ns);
      if (ms){
        setTimeout(function(){
          openShareCard(function(){ return gatherShareData("milestone", ms); });
        }, 900);
      }
    }
    // 数据变化（session 已写入），刷新当前活动壳（switchView 已刷 home，这里再保险一次）
    refreshAll();
  }

  el.pauseBtn.addEventListener("click", function(){
    if (state === "running") pause();
    else if (state === "paused") resume();
  });
  el.endBtn.addEventListener("click", endEarly);
  el.closeBtn.addEventListener("click", endEarly);

  return { open: open };
})();

/* ============================================================
   初始化
   ============================================================ */
function init(){
  if (Store.isMemOnly()){
    showToast("当前为隐身模式，数据不会保留");
  }

  // 绑定桌面壳独有事件（节拍器/toggle/步进/分类/导出/年度热力导航等）
  bindDeskEvents();

  // 注入分享触发按钮
  mountShareTriggers();

  // 桌面壳：初始 aria-hidden 与状态同步
  var deskShell = document.getElementById("desk-shell");
  if (deskShell){
    deskShell.setAttribute("aria-hidden", isDesktop() ? "false" : "true");
  }

  switchView("home");

  // 首屏指示条无动画就位（移动 tabbar）
  var indicator = $("#tab-indicator");
  moveTabIndicator("home");
  requestAnimationFrame(function(){
    requestAnimationFrame(function(){
      if (indicator) indicator.classList.remove("no-anim");
    });
  });

  // 跨断点 / 尺寸变化：双壳都需要重定位指示条 + 重渲染当前视图
  // （CSS 显隐由 media query 接管，JS 只负责补渲染）
  var prevDesktop = isDesktop();
  var resizeTimer: ReturnType<typeof setTimeout> | null = null;
  window.addEventListener("resize", function () {
    if (resizeTimer) clearTimeout(resizeTimer);
    resizeTimer = setTimeout(function () {
      var activeTab = document.querySelector(".tab.is-active");
      if (activeTab) moveTabIndicator(activeTab.getAttribute("data-view"));
      var nowDesktop = isDesktop();
      if (nowDesktop !== prevDesktop) {
        prevDesktop = nowDesktop;
        if (deskShell) deskShell.setAttribute("aria-hidden", nowDesktop ? "false" : "true");
        switchView(currentView);
      }
    }, 150);
  });

  // PWA：注入 web app manifest（Blob URL，无独立文件）+ apple 元，让手机可"添加到主屏幕"
  // 仅 http(s) 协议下注入：PWA 安装本就需要 http(s)，file:// 下 Blob manifest 的
  // 相对 start_url/scope 无法解析为绝对 URL 会持续刷 warning，故 file:// 跳过 → console 干净
  if (location.protocol === "http:" || location.protocol === "https:") {
    installPWA();
  }

  // fresh-load 断言（仅无任何 log 且今日未打卡时）
  var logKeys = Store.allLogKeys();
  var todayEntry = Store.getDay(todayKey());
  var isFreshLoad = (logKeys.length === 0) && !(todayEntry && todayEntry.sessions && todayEntry.sessions.length);
  if (isFreshLoad){
    var metroEl = document.getElementById("metronome");
    console.assert(!metroEl.classList.contains("is-open"), "[tgm] metro should not auto-open on fresh load");
    console.assert(getComputedStyle(metroEl).display === "none", "[tgm] metro display should be none on fresh load");
    console.assert(!(todayEntry && todayEntry.sessions && todayEntry.sessions.length), "[tgm] no session on fresh load");
  }
}

/* ---------- PWA manifest 注入（运行时 Blob URL，无独立文件，无 SW，不影响离线） ---------- */
function installPWA(){
  try {
    // inline SVG → data URL 作 icon（暖朱有机 blob 种子）
    var iconSvg =
      '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">'+
        '<rect width="512" height="512" fill="#E85A4F"/>'+
        '<path fill="#F4B4A8" d="M256 80 C 360 80 432 160 432 256 C 432 360 348 432 256 432 C 168 432 80 360 80 256 C 80 168 156 80 256 80 Z"/>'+
        '<circle cx="256" cy="256" r="78" fill="#fff" opacity="0.92"/>'+
      '</svg>';
    var iconUrl = "data:image/svg+xml;utf8," + encodeURIComponent(iconSvg);

    var manifest = {
      name: "今天提了么",
      short_name: "提了么",
      description: "每天问你一句、陪你提一组、替你记一笔的安静小工具。",
      start_url: ".",
      scope: ".",
      display: "standalone",
      orientation: "portrait",
      background_color: "#FAF3EC",
      theme_color: "#FAF3EC",
      icons: [
        { src: iconUrl, sizes: "192x192", type: "image/svg+xml", purpose: "any maskable" },
        { src: iconUrl, sizes: "512x512", type: "image/svg+xml", purpose: "any maskable" }
      ]
    };
    var blob = new Blob([JSON.stringify(manifest)], { type: "application/manifest+json" });
    var url = URL.createObjectURL(blob);
    var link = document.createElement("link");
    link.rel = "manifest";
    link.href = url;
    document.head.appendChild(link);

    // apple 主屏图标（inline SVG 数据 URL）
    var apple = document.createElement("link");
    apple.rel = "apple-touch-icon";
    apple.href = iconUrl;
    document.head.appendChild(apple);

    if (!document.querySelector('meta[name="apple-mobile-web-app-capable"]')){
      var m = document.createElement("meta");
      m.name = "apple-mobile-web-app-capable";
      m.content = "yes";
      document.head.appendChild(m);
    }
    if (!document.querySelector('meta[name="apple-mobile-web-app-status-bar-style"]')){
      var s = document.createElement("meta");
      s.name = "apple-mobile-web-app-status-bar-style";
      s.content = "default";
      document.head.appendChild(s);
    }
    if (!document.querySelector('meta[name="apple-mobile-web-app-title"]')){
      var t = document.createElement("meta");
      t.name = "apple-mobile-web-app-title";
      t.content = "今天提了么";
      document.head.appendChild(t);
    }
  } catch(e){
    // manifest 注入失败不应影响主功能
  }
}
init();
