var backup = require("../../lib/backup");
var core = require("../../lib/core");
var appStore = require("../../utils/app-store");
var theme = require("../../lib/theme");

var GOAL_MIN = 1;
var GOAL_MAX = 8;
var GITHUB_URL = "https://github.com/chen893/tilemo";
var VERSION = "0.1.0";

var THEME_OPTS = [
  { v: "light", label: "浅色" },
  { v: "dark", label: "深色" },
  { v: "system", label: "跟随系统" }
];

Page({
  data: {
    themeClass: "",
    themeMode: "light",
    goal: 3,
    plans: [],
    defaultPlanId: "",
    sound: true,
    haptics: true,
    dailyQuote: true,
    themeValue: "system",
    themeOpts: THEME_OPTS,
    hasLogs: false,
    storageHint: "",
    version: VERSION,
    github: GITHUB_URL.replace("https://", "")
  },

  onLoad: function () {
    var self = this;
    this.store = appStore.getStore();
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
    try {
      backup.removeInactive();
    } catch (e) {
      // 清空或下次打开设置时会重试。
    }
    var s = this.store.getSettings();
    this.setData(theme.apply(s.theme));
    this.refresh();
  },

  refresh: function () {
    var store = this.store;
    var settings = store.getSettings();
    var plans = store.getPlans();
    var stats = core.aggregateStats(store);
    var chips = [];
    for (var i = 0; i < plans.length; i++) {
      chips.push({
        id: plans[i].id,
        name: plans[i].name,
        active: plans[i].id === settings.defaultPlanId
      });
    }
    this.setData({
      goal: settings.dailyGoalGroups,
      plans: chips,
      defaultPlanId: settings.defaultPlanId,
      sound: !!settings.sound,
      haptics: !!settings.haptics,
      dailyQuote: !!settings.dailyQuote,
      themeValue: settings.theme,
      hasLogs: stats.totalSessions > 0,
      storageHint:
        stats.totalSessions > 0
          ? "本机已记录 " + stats.totalDays + " 天、完成 " + stats.completedSessions + " 组"
          : "本机还没有训练记录，完成一次训练后即可导出备份"
    });
  },

  save: function (patch) {
    var settings = this.store.getSettings();
    for (var k in patch) {
      if (Object.prototype.hasOwnProperty.call(patch, k)) settings[k] = patch[k];
    }
    this.store.setSettings(settings);
    this.refresh();
    return settings;
  },

  onGoalMinus: function () {
    var next = this.data.goal - 1;
    if (next < GOAL_MIN) return;
    this.save({ dailyGoalGroups: next });
  },

  onGoalPlus: function () {
    var next = this.data.goal + 1;
    if (next > GOAL_MAX) return;
    this.save({ dailyGoalGroups: next });
  },

  onPickPlan: function (e) {
    var id = e.currentTarget.dataset.id;
    this.save({ defaultPlanId: id });
  },

  // 与移动端一致：整行可点，开关是自绘胶囊，不用系统 switch
  onToggleSound: function () {
    this.save({ sound: !this.data.sound });
  },

  onToggleHaptics: function () {
    this.save({ haptics: !this.data.haptics });
  },

  onToggleQuote: function () {
    this.save({ dailyQuote: !this.data.dailyQuote });
  },

  onPickTheme: function (e) {
    var v = e.currentTarget.dataset.v;
    var settings = this.save({ theme: v });
    this.setData(theme.apply(settings.theme));
  },

  // ---------- 数据 ----------
  onExport: function () {
    if (!this.data.hasLogs) {
      wx.showToast({ title: "暂无可导出的训练记录", icon: "none" });
      return;
    }
    var self = this;
    wx.showActionSheet({
      itemList: ["发送备份文件到聊天", "复制备份文本"],
      success: function (res) {
        if (res.tapIndex === 0) self.exportFile();
        else self.exportClipboard();
      }
    });
  },

  exportFile: function () {
    backup.share(this.store);
  },

  exportClipboard: function () {
    var data = this.store.exportAll();
    var days = 0;
    for (var k in data.logs) {
      if (Object.prototype.hasOwnProperty.call(data.logs, k)) days++;
    }
    wx.setClipboardData({
      data: JSON.stringify(data),
      success: function () {
        wx.showToast({ title: "已复制 " + days + " 天记录", icon: "none" });
      }
    });
  },

  onClear: function () {
    var self = this;
    wx.showModal({
      title: "清空记录与设置？",
      content: "训练记录、连续天数和偏好设置都会被删除，且无法恢复。建议先导出备份。",
      confirmText: "清空",
      confirmColor: "#C83328",
      cancelText: "取消",
      success: function (res) {
        if (!res.confirm) return;
        if (backup.isSharing()) {
          wx.showToast({ title: "请先结束备份分享", icon: "none" });
          return;
        }
        var cleared = false;
        try {
          backup.removeInactive();
          self.store.clearAll();
          cleared = true;
        } catch (e) {
          wx.showToast({ title: "未能清空全部数据，请重试", icon: "none" });
        }
        self.refresh();
        self.setData(theme.apply(self.store.getSettings().theme));
        if (cleared) wx.showToast({ title: "已清空", icon: "none" });
      }
    });
  },

  onGithub: function () {
    wx.setClipboardData({
      data: GITHUB_URL,
      success: function () {
        wx.showToast({ title: "仓库地址已复制", icon: "none" });
      }
    });
  }
});
