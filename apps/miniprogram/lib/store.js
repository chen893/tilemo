// 移植自 packages/data/src（types / defaults / store / adapter）。
// 存储键与数据结构与 Web、App 完全一致（tgm:settings、tgm:plans、tgm:streak、
// tgm:log:YYYY-MM-DD），便于后续把已有本地数据导入。

var K_SETTINGS = "tgm:settings";
var K_PLANS = "tgm:plans";
var K_STREAK = "tgm:streak";
var K_LOG_INDEX = "tgm:logIndex";
var K_LOG_PREFIX = "tgm:log:";

var DEFAULT_PLANS = [
  { id: "plan_beginner", name: "入门", desc: "从最短的 3 秒开始，建立感觉。", contract: 3, relax: 3, reps: 10, sets: 1, builtin: true },
  { id: "plan_steady", name: "巩固", desc: "稍长一些，让肌肉记住收紧。", contract: 5, relax: 5, reps: 12, sets: 2, builtin: true },
  { id: "plan_advanced", name: "进阶", desc: "长收紧短放松，挑战耐力。", contract: 8, relax: 4, reps: 15, sets: 3, builtin: true },
  { id: "plan_quick", name: "快速一组", desc: "忙的时候，40 秒也好过不做。", contract: 3, relax: 2, reps: 8, sets: 1, builtin: true }
];

var DEFAULT_SETTINGS = {
  dailyGoalGroups: 3,
  defaultPlanId: "plan_beginner",
  theme: "system",
  sound: true,
  haptics: true,
  dailyQuote: true
};

var DEFAULT_STREAK = { current: 0, longest: 0, lastCheckedDate: null };

function cloneDay(d) {
  return {
    date: d.date,
    goalGroups: d.goalGroups,
    sessions: d.sessions ? d.sessions.slice() : [],
    manualOverride: !!d.manualOverride
  };
}

function Store(adapter) {
  this.adapter = adapter;
  this.dayCache = {};
}

Store.prototype.isMemOnly = function () {
  return this.adapter.isMemOnly ? this.adapter.isMemOnly() : false;
};

Store.prototype.getSettings = function () {
  var raw = this.adapter.getItem(K_SETTINGS);
  if (!raw) return Object.assign({}, DEFAULT_SETTINGS);
  try {
    return Object.assign({}, DEFAULT_SETTINGS, JSON.parse(raw));
  } catch (e) {
    return Object.assign({}, DEFAULT_SETTINGS);
  }
};

Store.prototype.setSettings = function (s) {
  this.adapter.setItem(K_SETTINGS, JSON.stringify(s));
};

Store.prototype.getPlans = function () {
  var raw = this.adapter.getItem(K_PLANS);
  if (!raw) {
    this.adapter.setItem(K_PLANS, JSON.stringify(DEFAULT_PLANS));
    return DEFAULT_PLANS.slice();
  }
  try {
    return JSON.parse(raw);
  } catch (e) {
    return DEFAULT_PLANS.slice();
  }
};

Store.prototype.setPlans = function (p) {
  this.adapter.setItem(K_PLANS, JSON.stringify(p));
};

Store.prototype.getDay = function (key) {
  if (Object.prototype.hasOwnProperty.call(this.dayCache, key)) {
    var cached = this.dayCache[key];
    return cached ? cloneDay(cached) : null;
  }
  var raw = this.adapter.getItem(K_LOG_PREFIX + key);
  var v = null;
  if (raw) {
    try {
      v = JSON.parse(raw);
    } catch (e) {
      v = null;
    }
  }
  this.dayCache[key] = v;
  return v ? cloneDay(v) : null;
};

Store.prototype.setDay = function (key, data) {
  this.adapter.setItem(K_LOG_PREFIX + key, JSON.stringify(data));
  this.dayCache[key] = cloneDay(data);
  this._addToLogIndex(key);
};

Store.prototype._getLogIndex = function () {
  var raw = this.adapter.getItem(K_LOG_INDEX);
  if (!raw) return [];
  try {
    var parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch (e) {
    return [];
  }
};

Store.prototype._addToLogIndex = function (dayKey) {
  var idx = this._getLogIndex();
  if (idx.indexOf(dayKey) === -1) {
    idx.push(dayKey);
    this.adapter.setItem(K_LOG_INDEX, JSON.stringify(idx));
  }
};

Store.prototype.getStreak = function () {
  var raw = this.adapter.getItem(K_STREAK);
  if (!raw) return Object.assign({}, DEFAULT_STREAK);
  try {
    return JSON.parse(raw);
  } catch (e) {
    return Object.assign({}, DEFAULT_STREAK);
  }
};

Store.prototype.setStreak = function (s) {
  this.adapter.setItem(K_STREAK, JSON.stringify(s));
};

Store.prototype.allLogKeys = function () {
  var seen = {};
  var out = [];
  var keys = this.adapter.getAllKeys() || [];
  var i;
  for (i = 0; i < keys.length; i++) {
    if (keys[i].indexOf(K_LOG_PREFIX) === 0 && !seen[keys[i]]) {
      seen[keys[i]] = true;
      out.push(keys[i]);
    }
  }
  var idx = this._getLogIndex();
  for (i = 0; i < idx.length; i++) {
    var full = K_LOG_PREFIX + idx[i];
    if (!seen[full] && this.adapter.getItem(full)) {
      seen[full] = true;
      out.push(full);
    }
  }
  return out;
};

Store.prototype.allDayEntries = function () {
  var keys = this.allLogKeys();
  var out = [];
  for (var i = 0; i < keys.length; i++) {
    var key = keys[i].substring(K_LOG_PREFIX.length);
    out.push({ key: key, entry: this.getDay(key) });
  }
  return out;
};

Store.prototype.exportAll = function () {
  var out = {
    settings: this.getSettings(),
    plans: this.getPlans(),
    logs: {},
    streak: this.getStreak()
  };
  var keys = this.allLogKeys();
  for (var i = 0; i < keys.length; i++) {
    var raw = this.adapter.getItem(keys[i]);
    if (raw) {
      try {
        out.logs[keys[i].substring(K_LOG_PREFIX.length)] = JSON.parse(raw);
      } catch (e) {
        // 单条损坏不影响整体导出
      }
    }
  }
  return out;
};

Store.prototype.clearAll = function () {
  try {
    var keys = this.adapter.getAllKeys(true);
    var tilemoKeys = new Set(keys.filter(function (key) { return key.indexOf("tgm:") === 0; }));
    this._getLogIndex().forEach(function (day) { tilemoKeys.add(K_LOG_PREFIX + day); });
    [K_SETTINGS, K_PLANS, K_STREAK, K_LOG_INDEX].forEach(function (key) { tilemoKeys.add(key); });
    var adapter = this.adapter;
    tilemoKeys.forEach(function (key) { adapter.removeItem(key); });
  } finally {
    this.dayCache = {};
  }
};

// wx 本地存储是同步接口，与 Store 需要的 SyncStorageAdapter 一致。
function createWxAdapter() {
  return {
    getItem: function (key) {
      try {
        var v = wx.getStorageSync(key);
        return v === "" || v === null || v === undefined ? null : v;
      } catch (e) {
        return null;
      }
    },
    setItem: function (key, value) {
      try {
        wx.setStorageSync(key, value);
      } catch (e) {
        // 存储写满时静默失败，页面仍可继续本次训练
      }
    },
    removeItem: function (key) {
      wx.removeStorageSync(key);
    },
    getAllKeys: function (strict) {
      try {
        var keys = wx.getStorageInfoSync().keys;
        if (!Array.isArray(keys)) throw new Error("无法读取本地存储键");
        return keys;
      } catch (e) {
        if (strict) throw e;
        return [];
      }
    },
    isMemOnly: function () {
      return false;
    }
  };
}

module.exports = {
  Store: Store,
  DEFAULT_PLANS: DEFAULT_PLANS,
  DEFAULT_SETTINGS: DEFAULT_SETTINGS,
  createWxAdapter: createWxAdapter,
  LOG_PREFIX: K_LOG_PREFIX
};
