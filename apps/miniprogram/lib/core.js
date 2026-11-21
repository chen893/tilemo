// 移植自 packages/core/src（time / domain / quotes / metro），保持 1:1。
// 小程序无法直接加载 TypeScript 源码，这里是 CommonJS 版本；
// 改动逻辑时必须同步 packages/core，并跑它的单元测试。

function pad2(n) {
  return (n < 10 ? "0" : "") + n;
}

function ymd(date) {
  return date.getFullYear() + "-" + pad2(date.getMonth() + 1) + "-" + pad2(date.getDate());
}

function todayKey() {
  return ymd(new Date());
}

function clamp(v, a, b) {
  return Math.max(a, Math.min(b, v));
}

function planDurationSec(plan) {
  if (!plan) return 0;
  return Math.max(0, (plan.contract + plan.relax) * plan.reps * plan.sets);
}

function formatDuration(sec) {
  var s = Math.max(1, Math.round(sec || 0));
  if (s < 60) return s + " 秒";
  var m = Math.floor(s / 60);
  var rem = s % 60;
  return rem === 0 ? m + " 分钟" : m + " 分 " + rem + " 秒";
}

function formatPlanDuration(plan) {
  return "约 " + formatDuration(planDurationSec(plan));
}

function formatClock(ts) {
  if (!ts || ts <= 0) return "";
  var d = new Date(ts);
  return pad2(d.getHours()) + ":" + pad2(d.getMinutes());
}

var QUOTES = [
  "今天比昨天多提一组，就赢了。",
  "习惯不是一次立志，是今天又做了一次。",
  "提起来的时候，别忘了呼吸。",
  "没人看见，但你自己知道。",
  "三分钟，给自己一个交代。",
  "看不见的肌肉，看得见的坚持。",
  "今天累了？做最短的那组也算。",
  "慢慢来，肌肉记得住每一次收紧。",
  "不是非要做满，是做了就好。",
  "盆底也是肌肉，也需要被温柔对待。",
  "安静地完成它，像完成一次呼吸。",
  "坚持的形状，是一格一格亮起来的。",
  "你今天的这一次，已经算数。",
  "比昨天更稳一点，就够了。",
  "身体记得你为它做的每一件小事。",
  "做的时候不数数，跟着节拍就好。",
  "今天先开始，剩下的交给时间。",
  "不焦虑、不催促，只是一组。",
  "你比你以为的更自律。",
  "把这一组，当作给自己的礼物。",
  "做完就去忙别的，它自己会变好。",
  "又一天，又一组，又稳了一点。"
];

function completedCountOfDay(day) {
  if (!day || !day.sessions || !day.sessions.length) return 0;
  var n = 0;
  for (var i = 0; i < day.sessions.length; i++) {
    if (day.sessions[i].finished !== false) n++;
  }
  return n;
}

function dayMeetsGoal(day) {
  if (!day || !day.sessions || !day.sessions.length) return false;
  return completedCountOfDay(day) >= day.goalGroups;
}

function heatLevel(sessions, goalGroups) {
  var n = sessions && sessions.length ? sessions.length : 0;
  var goal = goalGroups || 1;
  if (n === 0) return 0;
  var ratio = n / goal;
  if (ratio >= 1.2) return 3;
  if (ratio >= 1) return 2;
  return 1;
}

function levelOfDay(day) {
  if (!day) return 0;
  var done = completedCountOfDay(day);
  if (done === 0 && day.sessions && day.sessions.length > 0) return 1;
  return heatLevel({ length: done }, day.goalGroups);
}

function recomputeStreak(store) {
  var today = new Date();
  var cursor = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  var streak = 0;

  if (!dayMeetsGoal(store.getDay(ymd(cursor)))) {
    cursor.setDate(cursor.getDate() - 1);
  }

  while (true) {
    var entry = store.getDay(ymd(cursor));
    if (dayMeetsGoal(entry)) {
      streak++;
      cursor.setDate(cursor.getDate() - 1);
    } else {
      break;
    }
    if (streak > 3650) break;
  }

  var s = store.getStreak();
  s.current = streak;
  s.longest = Math.max(s.longest || 0, streak);
  s.lastCheckedDate = todayKey();
  store.setStreak(s);
  return s;
}

function recordSession(store, plan, completedReps, durationSec, finished) {
  var k = todayKey();
  var existing = store.getDay(k);
  var day = existing || {
    date: k,
    goalGroups: store.getSettings().dailyGoalGroups,
    sessions: [],
    manualOverride: false
  };
  day.sessions.push({
    ts: Date.now(),
    planId: plan.id,
    completedReps: completedReps,
    durationSec: Math.round(durationSec),
    finished: finished
  });
  store.setDay(k, day);
  recomputeStreak(store);
}

function aggregateStats(store) {
  var totalDays = 0;
  var totalSessions = 0;
  var completedSessions = 0;
  var metDays = 0;
  var lastTs = 0;
  var keysCount = 0;
  var entries = store.allDayEntries();
  for (var i = 0; i < entries.length; i++) {
    var entry = entries[i].entry;
    keysCount++;
    var n = entry && entry.sessions ? entry.sessions.length : 0;
    if (n > 0) totalDays++;
    totalSessions += n;
    completedSessions += completedCountOfDay(entry);
    if (dayMeetsGoal(entry)) metDays++;
    if (entry && entry.sessions) {
      for (var j = 0; j < entry.sessions.length; j++) {
        if (entry.sessions[j].ts > lastTs) lastTs = entry.sessions[j].ts;
      }
    }
  }
  return {
    totalDays: totalDays,
    totalSessions: totalSessions,
    completedSessions: completedSessions,
    metDays: metDays,
    lastTs: lastTs,
    keysCount: keysCount
  };
}

// 与 packages/share-card/src/quotes.ts 同一份文案（铁律：不出现具体身体部位）。
var STREAK_MILESTONES = [
  { value: 1, eyebrow: "DAY 1", headline: "开始了。", badge: "第一天" },
  { value: 7, eyebrow: "DAY 7", headline: "第一周，兑现了。", badge: "一周" },
  { value: 30, eyebrow: "DAY 30", headline: "三十天，身体记得。", badge: "三十天" },
  { value: 100, eyebrow: "DAY 100", headline: "一百天，已经是习惯了。", badge: "一百天" },
  { value: 365, eyebrow: "DAY 365", headline: "一年，一格一格亮着。", badge: "一年" }
];

var REVIEW_HEADLINES = [
  "坚持的形状，是一格一格亮起来的",
  "日复一日，身体在悄悄记住",
  "看得见的，是你不声不响的坚持"
];

function pickQuote(index) {
  var n = QUOTES.length;
  return QUOTES[((index % n) + n) % n];
}

function pickReviewHeadline(index) {
  var n = REVIEW_HEADLINES.length;
  return REVIEW_HEADLINES[((index % n) + n) % n];
}

// prev < value <= next 命中，取最大的一档（一次可能跨多档）
function detectStreakMilestone(prev, next) {
  var hit = null;
  for (var i = 0; i < STREAK_MILESTONES.length; i++) {
    var m = STREAK_MILESTONES[i];
    if (prev < m.value && next >= m.value) hit = m;
  }
  return hit;
}

// 最近 n 天（含今天），用于首页本周条与回顾卡热力
function lastDays(n) {
  var WD = ["日", "一", "二", "三", "四", "五", "六"];
  var out = [];
  var now = new Date();
  for (var i = n - 1; i >= 0; i--) {
    var d = new Date(now.getFullYear(), now.getMonth(), now.getDate() - i);
    out.push({
      key: ymd(d),
      weekday: d.getDay(),
      label: WD[d.getDay()]
    });
  }
  return out;
}

// 节拍器状态机：与 packages/core/src/metro.ts 相同的阶段推进
// （准备 3-2-1 → 收紧 → 放松 → 记一次 → 下一组 → 完成）。
function Metro(hooks) {
  this.hooks = hooks || {};
  this.plan = null;
  this._state = "idle";
  this.stage = "prep";
  this.phase = "contract";
  this.remaining = 0;
  this.prepN = 3;
  this.setIdx = 0;
  this.repIdx = 0;
  this.startedReps = 0;
  this.totalElapsed = 0;
  this.doneSub = "";
  this.tickHandle = null;
  this.timer = null;
  this.listeners = [];
}

Metro.prototype.subscribe = function (listener) {
  var self = this;
  this.listeners.push(listener);
  listener(this.snapshot());
  return function () {
    var i = self.listeners.indexOf(listener);
    if (i >= 0) self.listeners.splice(i, 1);
  };
};

Metro.prototype.snapshot = function () {
  return {
    state: this._state,
    stage: this.stage,
    phase: this.phase,
    remaining: this.remaining,
    prepN: this.prepN,
    setIdx: this.setIdx,
    sets: this.plan ? this.plan.sets : 0,
    reps: this.plan ? this.plan.reps : 0,
    startedReps: this.startedReps,
    totalReps: this.plan ? this.plan.reps * this.plan.sets : 0,
    doneSub: this.doneSub,
    planId: this.plan ? this.plan.id : null
  };
};

Metro.prototype.open = function (plan) {
  this.disposeTimers();
  this.plan = plan;
  this._state = "prep";
  this.stage = "prep";
  this.setIdx = 0;
  this.repIdx = 0;
  this.phase = "contract";
  this.startedReps = 0;
  this.totalElapsed = 0;
  this.doneSub = "";
  this.prepN = 3;
  this.emit();
  this.runPrep(3);
};

Metro.prototype.runPrep = function (n) {
  var self = this;
  this.prepN = n;
  this.emit();
  this.timer = setTimeout(function () {
    if (n > 1) {
      self.timer = setTimeout(function () {
        self.runPrep(n - 1);
      }, 60);
    } else {
      self.timer = setTimeout(function () {
        self.beginRunning();
      }, 600);
    }
  }, 600);
};

Metro.prototype.beginRunning = function () {
  this._state = "running";
  this.stage = "breath";
  this.setIdx = 0;
  this.repIdx = 0;
  this.startedReps = 0;
  this.setPhase("contract");
};

Metro.prototype.setPhase = function (p) {
  this.phase = p;
  this.remaining = p === "contract" ? this.plan.contract : this.plan.relax;
  this.emit();
  this.startTick();
};

Metro.prototype.startTick = function () {
  var self = this;
  this.stopTick();
  this.tickHandle = setInterval(function () {
    if (self._state !== "running") return;
    self.remaining -= 1;
    self.totalElapsed += 1000;
    if (self.remaining <= 0) {
      self.stopTick();
      self.onPhaseEnd();
    } else {
      self.emit();
    }
  }, 1000);
};

Metro.prototype.stopTick = function () {
  if (this.tickHandle) {
    clearInterval(this.tickHandle);
    this.tickHandle = null;
  }
};

Metro.prototype.onPhaseEnd = function () {
  if (this.phase === "contract") {
    this.setPhase("relax");
    return;
  }
  this.startedReps += 1;
  this.repIdx += 1;
  if (this.repIdx >= this.plan.reps) {
    this.repIdx = 0;
    this.setIdx += 1;
    if (this.setIdx >= this.plan.sets) {
      this.finishAll(true);
      return;
    }
  }
  this.setPhase("contract");
};

Metro.prototype.finishAll = function (finished) {
  this._state = "done";
  this.stopTick();
  var dur = this.totalElapsed / 1000;
  var total = this.plan.reps * this.plan.sets;
  if (this.hooks.onRecord) this.hooks.onRecord(this.plan, total, dur, finished);
  this.doneSub = finished
    ? "完成了 " + total + " 次收紧，做得好。"
    : "做了 " + this.startedReps + " 次，也算数。";
  this.stage = "done";
  this.emit();
  // 完成回执不再自动关闭，停留等待用户主动点击「返回今日」或「分享这次」。
};

Metro.prototype.togglePause = function () {
  if (this._state === "running") this.pause();
  else if (this._state === "paused") this.resume();
};

Metro.prototype.pause = function () {
  if (this._state !== "running") return;
  this._state = "paused";
  this.stopTick();
  this.emit();
};

Metro.prototype.resume = function () {
  if (this._state !== "paused") return;
  this._state = "running";
  this.emit();
  this.startTick();
};

Metro.prototype.endEarly = function () {
  // 已完成（done 阶段）时不再记录，否则会与 finishAll 里那次记录重复
  if (this._state === "done") {
    this.close(true);
    return;
  }
  if (this._state === "prep" || this._state === "idle") {
    this.close(false);
    return;
  }
  this.stopTick();
  var dur = this.totalElapsed / 1000;
  if (this.startedReps > 0 && this.hooks.onRecord) {
    this.hooks.onRecord(this.plan, this.startedReps, dur, false);
  }
  this.close(false);
};

Metro.prototype.close = function (completion) {
  this.disposeTimers();
  this.stopTick();
  var sr = this.startedReps;
  this._state = "idle";
  this.startedReps = 0;
  this.totalElapsed = 0;
  this.emit();
  if (this.hooks.onAfterClose) this.hooks.onAfterClose(completion, sr);
};

Metro.prototype.dispose = function () {
  this.disposeTimers();
  this.stopTick();
  this.listeners = [];
};

Metro.prototype.disposeTimers = function () {
  if (this.timer) {
    clearTimeout(this.timer);
    this.timer = null;
  }
};

Metro.prototype.emit = function () {
  var s = this.snapshot();
  var list = this.listeners.slice();
  for (var i = 0; i < list.length; i++) {
    // 单个监听器抛错不能打断状态机：emit 常被定时器回调调用，
    // 异常若冒出去，后续的 startTick / 阶段推进就永远执行不到（H5 预览里
    // wx.vibrateShort 不受支持时曾整段卡在准备阶段第 1 秒）。
    try {
      list[i](s);
    } catch (e) {
      if (typeof console !== "undefined" && console.error) {
        console.error("[metro] listener failed", e);
      }
    }
  }
};

module.exports = {
  pad2: pad2,
  ymd: ymd,
  todayKey: todayKey,
  clamp: clamp,
  planDurationSec: planDurationSec,
  formatDuration: formatDuration,
  formatPlanDuration: formatPlanDuration,
  formatClock: formatClock,
  QUOTES: QUOTES,
  completedCountOfDay: completedCountOfDay,
  dayMeetsGoal: dayMeetsGoal,
  heatLevel: heatLevel,
  levelOfDay: levelOfDay,
  recomputeStreak: recomputeStreak,
  recordSession: recordSession,
  aggregateStats: aggregateStats,
  STREAK_MILESTONES: STREAK_MILESTONES,
  REVIEW_HEADLINES: REVIEW_HEADLINES,
  pickQuote: pickQuote,
  pickReviewHeadline: pickReviewHeadline,
  detectStreakMilestone: detectStreakMilestone,
  lastDays: lastDays,
  Metro: Metro
};
