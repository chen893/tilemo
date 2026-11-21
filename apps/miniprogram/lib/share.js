// 移植自 packages/share-card（types / build / gather）。数据口径与 Web、App 一致，
// 只有渲染不同：移动端用 RN 视图截图，这里用 canvas 2d 绘制。
// 二维码在移动端指向落地页；小程序本身可被直接分享，故不画 QR，改由微信转发承载。

var core = require("./core");

var CARD_W = 1080;
var CARD_H = 1350;
var BRAND = "今天，提了么";
var REVIEW_DAYS = 30;

var LIGHT = {
  paper: "#FAF3EC",
  paperSoft: "#F3E8DC",
  paperDeep: "#EBDDCB",
  ink: "#2B2320",
  accent: "#E85A4F",
  accentSoft: "#F4B4A8",
  success: "#C8402E",
  text: "#2B2320",
  text2: "#5C4F47",
  text3: "#6F5F50",
  rule: "rgba(43,35,32,0.12)",
  ruleStrong: "rgba(43,35,32,0.24)",
  heat1: "#F0DCC9",
  heat2: "#E8B59A",
  heat3: "#E85A4F"
};

var DARK = {
  paper: "#1F1814",
  paperSoft: "#2A201A",
  paperDeep: "#352821",
  ink: "#F2E8DC",
  accent: "#FF6B5E",
  accentSoft: "#8A4538",
  success: "#F26B5F",
  text: "#F2E8DC",
  text2: "#C4B5A6",
  text3: "#A09080",
  rule: "rgba(242,232,220,0.14)",
  ruleStrong: "rgba(242,232,220,0.30)",
  heat1: "#3D2E24",
  heat2: "#6B4234",
  heat3: "#FF6B5E"
};

function heatColor(colors, level) {
  if (level <= 0) return colors.paperDeep;
  if (level === 1) return colors.heat1;
  if (level === 2) return colors.heat2;
  return colors.heat3;
}

// opts: { type: daily|milestone|review, theme, milestone, quoteIndex }
function buildCardData(store, settings, opts) {
  var theme = opts.theme === "dark" ? "dark" : "light";
  var colors = theme === "dark" ? DARK : LIGHT;
  var type = opts.type;
  if (type === "milestone" && !opts.milestone) type = "daily";
  var streak = store.getStreak();
  var today = store.getDay(core.todayKey());
  var goalDone = today && today.sessions ? today.sessions.length : 0;
  var goalTotal = settings.dailyGoalGroups || 1;

  var data = {
    type: type,
    theme: theme,
    colors: colors,
    eyebrow: "",
    headline: "",
    sub: core.pickQuote(opts.quoteIndex || 0),
    badge: "",
    streakDays: streak.current || 0,
    goalDone: goalDone,
    goalTotal: goalTotal,
    brand: BRAND
  };

  if (type === "milestone" && opts.milestone) {
    // 里程碑文案来自 core.STREAK_MILESTONES；缺字段时兜底，避免画出空卡
    data.eyebrow = opts.milestone.eyebrow || "DAY " + (opts.milestone.value || "");
    data.headline = opts.milestone.headline || "又坚持了一天。";
    data.badge = opts.milestone.badge || "";
  } else if (type === "review") {
    data.headline = core.pickReviewHeadline(opts.quoteIndex || 0);
    var heat = [];
    var n = REVIEW_DAYS;
    for (var i = n - 1; i >= 0; i--) {
      var d = new Date();
      d = new Date(d.getFullYear(), d.getMonth(), d.getDate() - i);
      heat.push(core.levelOfDay(store.getDay(core.ymd(d))));
    }
    data.heat = heat;
    data.heatCols = 6;
  } else {
    data.eyebrow = "今天";
    data.headline = goalTotal > 0 && goalDone >= goalTotal ? "今天，提了。" : "又稳了一点。";
  }

  return data;
}

module.exports = {
  CARD_W: CARD_W,
  CARD_H: CARD_H,
  BRAND: BRAND,
  heatColor: heatColor,
  buildCardData: buildCardData
};
