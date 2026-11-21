var core = require("../../lib/core");
var appStore = require("../../utils/app-store");
var shareLib = require("../../lib/share");
var theme = require("../../lib/theme");

var DOW = ["日", "一", "二", "三", "四", "五", "六"];

Page({
  data: {
    themeClass: "",
    themeMode: "light",
    streakCurrent: 0,
    totalDays: 0,
    totalSessions: 0,
    cursorLabel: "",
    dow: DOW,
    cells: [],
    selectedKey: "",
    detail: null,
    showGoTrain: false
  },

  onLoad: function () {
    var self = this;
    this.store = appStore.getStore();
    var now = new Date();
    this.cursor = { y: now.getFullYear(), m: now.getMonth() };
    this.setData({ selectedKey: core.todayKey() });
    var s = this.store.getSettings();
    this.setData(theme.apply(s.theme));
    this.unwatch = theme.watch(function () {
      var cur = self.store.getSettings();
      if (cur.theme === "system") self.setData(theme.apply("system"));
    });
  },

  onUnload: function () {
    if (this.unwatch) this.unwatch();
  },

  onShow: function () {
    var s = this.store.getSettings();
    this.setData(theme.apply(s.theme));
    this.refresh();
  },

  onHide: function () {
    var p = this.selectComponent("#player");
    if (p) p.pauseIfRunning();
  },

  refresh: function () {
    var store = this.store;
    var stats = core.aggregateStats(store);
    var streak = store.getStreak();
    var plans = store.getPlans();
    var planMap = {};
    for (var p = 0; p < plans.length; p++) planMap[plans[p].id] = plans[p].name;

    var y = this.cursor.y;
    var m = this.cursor.m;
    var firstDay = new Date(y, m, 1).getDay();
    var daysInMonth = new Date(y, m + 1, 0).getDate();
    var todayStr = core.todayKey();
    var cells = [];
    var i;

    for (i = 0; i < firstDay; i++) {
      cells.push({ idx: "e" + i, empty: true, key: "", day: 0, level: 0, doneCount: 0, totalCount: 0 });
    }
    for (var d = 1; d <= daysInMonth; d++) {
      var key = core.ymd(new Date(y, m, d));
      var entry = store.getDay(key);
      var doneCount = core.completedCountOfDay(entry);
      var totalCount = entry && entry.sessions ? entry.sessions.length : 0;
      cells.push({
        idx: key,
        empty: false,
        key: key,
        day: d,
        level: core.levelOfDay(entry),
        doneCount: doneCount,
        totalCount: totalCount,
        cntLabel: totalCount > 0 ? (doneCount > 0 ? doneCount + "组" : "部分") : "",
        isToday: key === todayStr,
        isFuture: key > todayStr,
        selected: key === this.data.selectedKey
      });
    }

    this.setData({
      streakCurrent: streak.current || 0,
      totalDays: stats.totalDays,
      totalSessions: stats.completedSessions,
      cursorLabel: y + " · " + core.pad2(m + 1),
      cells: cells
    });

    if (this.data.selectedKey) this.applyDetail(this.data.selectedKey, planMap);
  },

  applyDetail: function (key, planMap) {
    var store = this.store;
    var entry = store.getDay(key);
    var settings = store.getSettings();
    var plans = store.getPlans();
    if (!planMap) {
      planMap = {};
      for (var p = 0; p < plans.length; p++) planMap[plans[p].id] = plans[p].name;
    }
    var sessions = [];
    if (entry && entry.sessions) {
      for (var i = 0; i < entry.sessions.length; i++) {
        var ses = entry.sessions[i];
        var clock = core.formatClock(ses.ts);
        var durText = core.formatDuration(ses.durationSec);
        sessions.push({
          idx: key + "-" + i,
          planName: planMap[ses.planId] || "自定义",
          reps: ses.completedReps,
          subText: clock ? durText + " · " + clock : durText,
          finished: !!ses.finished
        });
      }
    }
    var isToday = key === core.todayKey();
    var doneCount = core.completedCountOfDay(entry);
    var goal = entry ? entry.goalGroups : isToday ? settings.dailyGoalGroups || 3 : 0;
    this.setData({
      detail: {
        label: key.replace(/-/g, ".").slice(5) + (isToday ? " · 今天" : ""),
        count: doneCount,
        goal: goal,
        summaryText: goal > 0 ? "已完成 " + doneCount + " / " + goal + " 组" : "未训练",
        sessions: sessions
      },
      showGoTrain: isToday && sessions.length === 0
    });
  },

  onTapDay: function (e) {
    var key = e.currentTarget.dataset.key;
    var future = e.currentTarget.dataset.future;
    if (future) return;
    var cells = this.data.cells;
    for (var i = 0; i < cells.length; i++) {
      if (!cells[i].empty) cells[i].selected = cells[i].key === key;
    }
    this.setData({ cells: cells, selectedKey: key });
    this.applyDetail(key);
  },

  onPrevMonth: function () {
    var m = this.cursor.m - 1;
    var y = this.cursor.y;
    if (m < 0) {
      m = 11;
      y -= 1;
    }
    this.cursor = { y: y, m: m };
    this.setData({ selectedKey: "", detail: null, showGoTrain: false });
    this.refresh();
  },

  onNextMonth: function () {
    var m = this.cursor.m + 1;
    var y = this.cursor.y;
    if (m > 11) {
      m = 0;
      y += 1;
    }
    this.cursor = { y: y, m: m };
    this.setData({ selectedKey: "", detail: null, showGoTrain: false });
    this.refresh();
  },

  onGoTrain: function () {
    var plan = appStore.getActivePlan(this.store);
    var p = this.selectComponent("#player");
    if (!plan || !p) return;
    p.start(plan);
  },

  onPlayerClose: function (e) {
    this.refresh();
    var d = e.detail || {};
    var self = this;
    if (d.share === "daily") {
      this.openShare("daily");
    } else if (d.milestone) {
      var m = d.milestone;
      setTimeout(function () {
        self.openShare("milestone", m);
      }, 280);
    }
  },

  openShare: function (type, milestone) {
    var store = this.store;
    var settings = store.getSettings();
    var card = shareLib.buildCardData(store, settings, {
      type: type,
      theme: this.data.themeMode,
      milestone: milestone || null,
      quoteIndex: new Date().getDate()
    });
    var sc = this.selectComponent("#shareCard");
    if (sc) sc.open(card);
  },

  onShareAppMessage: function (event) {
    var card = this.selectComponent("#shareCard");
    return {
      title: "每天一分钟，攒出来的记录",
      path: "/pages/home/home",
      imageUrl: (card && card.shareImage(event)) || "/assets/share-cover.png"
    };
  }
});
