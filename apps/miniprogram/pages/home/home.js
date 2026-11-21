var core = require("../../lib/core");
var appStore = require("../../utils/app-store");
var shareLib = require("../../lib/share");
var theme = require("../../lib/theme");

var WEEK = ["周日", "周一", "周二", "周三", "周四", "周五", "周六"];

function themeFields(setting) {
  var fields = theme.apply(setting);
  fields.shareIcon = theme.icon("share", fields.themeMode);
  return fields;
}

Page({
  data: {
    themeClass: "",
    themeMode: "light",
    shareIcon: "/assets/icons/share.png",
    dateLabel: "",
    quote: "",
    done: 0,
    goal: 1,
    isDone: false,
    streakCurrent: 0,
    streakLongest: 0,
    week: [],
    planName: "",
    planDuration: "",
    ctaText: "开始训练"
  },

  onLoad: function () {
    var self = this;
    this.store = appStore.getStore();
    var s = this.store.getSettings();
    this.setData(themeFields(s.theme));
    this.unwatch = theme.watch(function () {
      var cur = self.store.getSettings();
      if (cur.theme === "system") self.setData(themeFields("system"));
    });
  },

  onUnload: function () {
    if (this.unwatch) this.unwatch();
  },

  onShow: function () {
    var s = this.store.getSettings();
    this.setData(themeFields(s.theme));
    this.loadAll();
  },

  onHide: function () {
    var p = this.selectComponent("#player");
    if (p) p.pauseIfRunning();
  },

  loadAll: function () {
    var store = this.store;
    var settings = store.getSettings();
    var streak = store.getStreak();
    var progress = appStore.getTodayProgress(store);
    var activePlan = appStore.getActivePlan(store);
    var now = new Date();
    var isDone = progress.done >= progress.goal && progress.done > 0;
    var week = [];
    var days = core.lastDays(7);
    var todayStr = core.todayKey();

    for (var i = 0; i < days.length; i++) {
      var d = days[i];
      var entry = store.getDay(d.key);
      week.push({
        key: d.key,
        label: d.label,
        level: core.levelOfDay(entry),
        isToday: d.key === todayStr
      });
    }

    var quote = "";
    if (settings.dailyQuote) {
      if (isDone) {
        quote = "今日目标已达成，想加练随时再来一组。";
      } else {
        var seed = now.getDate() + now.getMonth() * 31;
        quote = core.pickQuote(seed);
      }
    }

    this.setData({
      dateLabel: now.getMonth() + 1 + "." + core.pad2(now.getDate()) + " " + WEEK[now.getDay()],
      quote: quote,
      done: progress.done,
      goal: progress.goal,
      isDone: isDone,
      streakCurrent: streak.current || 0,
      streakLongest: streak.longest || streak.current || 0,
      week: week,
      planName: activePlan ? activePlan.name : "",
      planDuration: activePlan ? core.formatPlanDuration(activePlan) : "",
      ctaText: isDone ? "再练一组" : "开始训练"
    });
  },

  onStart: function () {
    var plan = appStore.getActivePlan(this.store);
    if (!plan) return;
    this.selectComponent("#player").start(plan);
  },

  onSwitchPlan: function () {
    wx.switchTab({ url: "/pages/train/train" });
  },

  onPlayerClose: function (e) {
    this.loadAll();
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

  onShare: function () {
    this.openShare("review");
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
    this.selectComponent("#shareCard").open(card);
  },

  onShareAppMessage: function (event) {
    var card = this.selectComponent("#shareCard");
    return {
      title: "今天，提了么？",
      path: "/pages/home/home",
      imageUrl: (card && card.shareImage(event)) || "/assets/share-cover.png"
    };
  }
});
