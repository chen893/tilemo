// 训练播放层：全屏覆盖，驱动 lib/core 的 Metro 状态机。
// 双通道视觉编码：收紧（暖红向心） vs 放松（鼠尾草绿舒展）；
// 暂停态中央明确标注「已暂停」，完成回执停留至用户主动操作。

var core = require("../../lib/core");
var appStore = require("../../utils/app-store");
var audio = require("../../lib/audio");
var themeUtil = require("../../lib/theme");
var panda = require("../../lib/panda");

function safe(fn) {
  try {
    fn();
  } catch (e) {
    // 静默
  }
}

Component({
  options: {
    styleIsolation: "apply-shared"
  },

  properties: {},

  data: {
    visible: false,
    stage: "prep",
    phase: "contract",
    phaseText: "",
    cueText: "",
    remaining: 3,
    prepN: 3,
    planSummary: "",
    planDetail: "",
    progressText: "",
    pauseLabel: "",
    doneSummary: "",
    progressPct: 0,
    phaseSec: 1,
    doneSub: "",
    paused: false
  },

  lifetimes: {
    attached: function () {
      this.metro = null;
      this.currentPlan = null;
      this.unsubscribe = null;
      this.lastPhase = "";
      this.pendingMilestone = null;
      this.wantShare = "";
      this.pandaEngine = new panda.PandaEngine();
      this.pandaCanvas = null;
      this.pandaCtx = null;
      this.pandaSize = 240;
      this.pandaTimer = null;
      this.pandaLastTs = 0;
      this.themeMode = "light";
    },
    detached: function () {
      this.stopPandaLoop();
      this.teardown();
      audio.dispose();
      this.setTabBarHidden(false);
    }
  },

  methods: {
    teardown: function () {
      if (this.unsubscribe) {
        this.unsubscribe();
        this.unsubscribe = null;
      }
      if (this.metro) {
        this.metro.dispose();
        this.metro = null;
      }
    },

    ensureMetro: function () {
      if (this.metro) return this.metro;
      var self = this;
      this.metro = new core.Metro({
        onRecord: function (plan, reps, dur, finished) {
          var store = appStore.getStore();
          var prev = store.getStreak().current || 0;
          core.recordSession(store, plan, reps, dur, finished);
          self.pendingMilestone = null;
          if (finished) {
            var next = store.getStreak().current || 0;
            var hit = core.detectStreakMilestone(prev, next);
            if (hit) self.pendingMilestone = hit;
          }
        },
        onAfterClose: function (completion) {
          var milestone = self.pendingMilestone;
          var share = self.wantShare;
          self.pendingMilestone = null;
          self.wantShare = "";
          self.stopPandaLoop();
          self.setData({ visible: false, paused: false, doneSub: "", doneSummary: "" });
          self.setTabBarHidden(false);
          self.triggerEvent("close", {
            finished: !!completion,
            milestone: milestone,
            share: share
          });
        }
      });
      return this.metro;
    },

    start: function (plan) {
      if (!plan) return;
      var metro = this.ensureMetro();
      var self = this;
      this.currentPlan = plan;
      this.lastPhase = "";
      this.pendingMilestone = null;
      this.settings = appStore.getStore().getSettings();
      this.themeMode = themeUtil.resolve(this.settings && this.settings.theme);
      this.pandaEngine.reset();

      if (this.unsubscribe) this.unsubscribe();
      this.unsubscribe = metro.subscribe(function (s) {
        self.sync(s);
      });

      this.setData({
        visible: true,
        paused: false,
        doneSub: "",
        doneSummary: "",
        planSummary: plan.name + " · " + core.formatPlanDuration(plan),
        planDetail:
          "收紧 " +
          plan.contract +
          " 秒 · 放松 " +
          plan.relax +
          " 秒 · " +
          plan.reps +
          " 次 × " +
          plan.sets +
          " 组"
      }, function () {
        self.initPandaCanvas();
      });
      this.setTabBarHidden(true);
      metro.open(plan);
    },

    initPandaCanvas: function () {
      var self = this;
      this.stopPandaLoop();
      safe(function () {
        var query = self.createSelectorQuery();
        query
          .select("#pandaCanvas")
          .fields({ node: true, size: true })
          .exec(function (res) {
            if (!res || !res[0] || !res[0].node) return;
            var canvas = res[0].node;
            var w = res[0].width || 240;
            var h = res[0].height || 240;
            var size = Math.min(w, h);
            var dpr = 2;
            try {
              dpr = (wx.getWindowInfo ? wx.getWindowInfo().pixelRatio : wx.getSystemInfoSync().pixelRatio) || 2;
            } catch (e) {}
            canvas.width = Math.round(size * dpr);
            canvas.height = Math.round(size * dpr);
            var ctx = canvas.getContext("2d");
            ctx.scale(dpr, dpr);
            self.pandaCanvas = canvas;
            self.pandaCtx = ctx;
            self.pandaSize = size;
            self.pandaLastTs = Date.now();
            self.startPandaLoop();
          });
      });
    },

    startPandaLoop: function () {
      var self = this;
      this.stopPandaLoop();
      function tick() {
        if (!self.pandaCtx || !self.data.visible) return;
        var now = Date.now();
        var dt = Math.min(0.05, Math.max(0.001, (now - self.pandaLastTs) / 1000));
        self.pandaLastTs = now;
        var frame = self.pandaEngine.step(dt, self.themeMode);
        panda.drawPandaCanvas(self.pandaCtx, self.pandaSize, frame, self.themeMode);
        if (self.pandaCanvas && self.pandaCanvas.requestAnimationFrame) {
          self.pandaTimer = self.pandaCanvas.requestAnimationFrame(tick);
        } else {
          self.pandaTimer = setTimeout(tick, 33);
        }
      }
      tick();
    },

    stopPandaLoop: function () {
      if (this.pandaTimer) {
        if (this.pandaCanvas && this.pandaCanvas.cancelAnimationFrame) {
          try {
            this.pandaCanvas.cancelAnimationFrame(this.pandaTimer);
          } catch (e) {}
        }
        clearTimeout(this.pandaTimer);
        this.pandaTimer = null;
      }
    },

    sync: function (s) {
      var plan = this.currentPlan || {};
      var copy = panda.getPandaCopy(s, plan.contract || 3);
      var phaseText = copy.pillText;
      var cueText = copy.cueText;

      this.pandaEngine.sync({
        stage: s.stage,
        state: s.state,
        phase: s.phase,
        remaining: s.remaining,
        startedReps: s.startedReps,
        contractSec: plan.contract || 3,
        relaxSec: plan.relax || 3
      });

      var progressText =
        (s.sets || 1) > 1
          ? "第 " + (s.setIdx + 1) + "/" + s.sets + " 组 · " + s.startedReps + " / " + (s.totalReps || 0) + " 次"
          : s.startedReps + " / " + (s.totalReps || 0) + " 次";
      var paused = s.state === "paused";
      var pauseLabel = paused ? "已暂停" : "";
      var pct = s.totalReps ? Math.round((s.startedReps / s.totalReps) * 100) : 0;
      var phaseSec = s.phase === "contract" ? plan.contract || 1 : plan.relax || 1;
      var settings = this.settings || appStore.getStore().getSettings();

      var doneSummary = "";
      if (s.stage === "done") {
        var prog = appStore.getTodayProgress(appStore.getStore());
        doneSummary = "今日 " + prog.done + " / " + prog.goal + " 组";
      }

      this.setData({
        stage: s.stage,
        phase: s.phase,
        phaseText: phaseText,
        cueText: cueText,
        remaining: s.remaining,
        prepN: s.prepN,
        progressText: progressText,
        pauseLabel: pauseLabel,
        doneSummary: doneSummary,
        progressPct: pct,
        phaseSec: phaseSec,
        doneSub: s.doneSub,
        paused: paused
      });

      if (s.stage === "breath" && s.state === "running" && s.phase !== this.lastPhase) {
        this.lastPhase = s.phase;
        if (settings.haptics) {
          safe(function () {
            if (wx.vibrateShort) {
              wx.vibrateShort({ type: s.phase === "contract" ? "medium" : "light", fail: function () {} });
            }
          });
        }
        if (settings.sound) safe(function () { audio.play(s.phase); });
      }
    },

    setTabBarHidden: function (hidden) {
      function call(retried) {
        safe(function () {
          if (hidden) {
            if (!wx.hideTabBar) return;
            wx.hideTabBar({
              animation: false,
              fail: function () {
                if (!retried) setTimeout(function () { call(true); }, 120);
              }
            });
          } else if (wx.showTabBar) {
            wx.showTabBar({ animation: false, fail: function () {} });
          }
        });
      }
      call(false);
    },

    onTogglePause: function () {
      if (this.metro) this.metro.togglePause();
    },

    pauseIfRunning: function () {
      if (this.metro && this.metro._state === "running") {
        this.metro.pause();
        return true;
      }
      return false;
    },

    onEnd: function () {
      if (this.metro) this.metro.endEarly();
    },

    onCloseTap: function () {
      if (!this.metro) return;
      if (this.data.stage === "done") this.metro.close(true);
      else this.metro.endEarly();
    },

    onShare: function () {
      this.wantShare = "daily";
      if (this.metro) this.metro.close(true);
    },

    onDoneOk: function () {
      if (this.metro) this.metro.close(true);
    },

    noop: function () {}
  }
});
