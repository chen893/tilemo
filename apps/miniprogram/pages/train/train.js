var core = require("../../lib/core");
var appStore = require("../../utils/app-store");
var shareLib = require("../../lib/share");
var theme = require("../../lib/theme");

Page({
  data: {
    themeClass: "",
    themeMode: "light",
    plans: [],
    defaultPlanId: "",
    showGuide: false
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
    var s = this.store.getSettings();
    this.setData(theme.apply(s.theme));
    this.loadAll();
  },

  onHide: function () {
    var p = this.selectComponent("#player");
    if (p) p.pauseIfRunning();
  },

  loadAll: function () {
    var store = this.store;
    var settings = store.getSettings();
    var raw = store.getPlans();
    var plans = [];
    for (var i = 0; i < raw.length; i++) {
      var p = raw[i];
      plans.push({
        id: p.id,
        name: p.name,
        desc: p.desc,
        contract: p.contract,
        relax: p.relax,
        reps: p.reps,
        sets: p.sets,
        idxLabel: core.pad2(i + 1) + " / " + core.pad2(raw.length),
        durationLabel: core.formatPlanDuration(p)
      });
    }
    this.setData({ plans: plans, defaultPlanId: settings.defaultPlanId });
  },

  onToggleGuide: function () {
    this.setData({ showGuide: !this.data.showGuide });
  },

  onPick: function (e) {
    var id = e.currentTarget.dataset.id;
    var plans = this.data.plans;
    var plan = null;
    for (var i = 0; i < plans.length; i++) {
      if (plans[i].id === id) plan = plans[i];
    }
    if (!plan) return;
    this.selectComponent("#player").start(plan);
  },

  onPlayerClose: function (e) {
    this.loadAll();
    var d = e.detail || {};
    if (d.share === "daily") {
      this.openShare("daily");
    } else if (d.milestone) {
      var m = d.milestone;
      var self = this;
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
    this.selectComponent("#shareCard").open(card);
  },

  onShareAppMessage: function (event) {
    var card = this.selectComponent("#shareCard");
    return {
      title: "一组一分钟，试一个方案",
      path: "/pages/home/home",
      imageUrl: (card && card.shareImage(event)) || "/assets/share-cover.png"
    };
  }
});
