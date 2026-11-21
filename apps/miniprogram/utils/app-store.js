// 单例数据层：页面统一从这里取 Store，后续接云端时只替换这一层。
var storeLib = require("../lib/store");
var core = require("../lib/core");

var instance = null;

function getStore() {
  if (!instance) instance = new storeLib.Store(storeLib.createWxAdapter());
  return instance;
}

function getActivePlan(store) {
  var plans = store.getPlans();
  var settings = store.getSettings();
  var found = null;
  for (var i = 0; i < plans.length; i++) {
    if (plans[i].id === settings.defaultPlanId) found = plans[i];
  }
  return found || plans[0];
}

function getTodayProgress(store) {
  var day = store.getDay(core.todayKey());
  var settings = store.getSettings();
  var goal = settings.dailyGoalGroups || 1;
  var done = core.completedCountOfDay(day);
  var total = day && day.sessions ? day.sessions.length : 0;
  return {
    done: done,
    total: total,
    goal: goal,
    level: core.levelOfDay(day)
  };
}

module.exports = {
  getStore: getStore,
  getActivePlan: getActivePlan,
  getTodayProgress: getTodayProgress
};
