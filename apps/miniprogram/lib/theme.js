// 主题：settings.theme = system | light | dark → 实际 light / dark。
// 页面根节点用 {{themeClass}} 切变量，同时同步导航栏、tabBar 与窗口底色。

var LIGHT = {
  paper: "#FAF3EC",
  front: "#000000"
};

var DARK = {
  paper: "#1F1814",
  front: "#ffffff"
};

var lastMode = null;

function systemTheme() {
  try {
    if (wx.getAppBaseInfo) return wx.getAppBaseInfo().theme || "light";
    return wx.getSystemInfoSync().theme || "light";
  } catch (e) {
    return "light";
  }
}

function resolve(setting) {
  if (setting === "light" || setting === "dark") return setting;
  return systemTheme() === "dark" ? "dark" : "light";
}

function paintChrome(mode) {
  if (mode === lastMode) return;
  lastMode = mode;
  var c = mode === "dark" ? DARK : LIGHT;
  wx.setNavigationBarColor({
    frontColor: c.front,
    backgroundColor: c.paper,
    fail: function () {}
  });
  try {
    wx.setBackgroundColor({
      backgroundColor: c.paper,
      backgroundColorTop: c.paper,
      backgroundColorBottom: c.paper,
      fail: function () {}
    });
  } catch (e) {}
  try {
    wx.setTabBarStyle({
      color: mode === "dark" ? "#B5A595" : "#6F5F50",
      selectedColor: mode === "dark" ? "#FF6B5E" : "#C8402E",
      // tabBar 底色用 paper-soft（移动端 tabbar backgroundColor 同此）
      backgroundColor: mode === "dark" ? "#2A201A" : "#F3E8DC",
      borderStyle: mode === "dark" ? "black" : "white",
      fail: function () {}
    });
  } catch (e) {}
  // 图标也分深浅两套，深色底上用浅一号的线，避免糊成一团
  paintIcons(mode === "dark");
}

var TABS = ["home", "train", "history", "settings"];

function paintIcons(dark) {
  for (var i = 0; i < TABS.length; i++) {
    var name = TABS[i];
    try {
      wx.setTabBarItem({
        index: i,
        iconPath: "assets/tab/" + name + (dark ? "-d" : "") + ".png",
        selectedIconPath: "assets/tab/" + name + (dark ? "-d-on" : "-on") + ".png",
        fail: function () {}
      });
    } catch (e) {}
  }
}

// 页面内图标（非 tabBar）：图片不能着色，深浅两套分别出图。
function icon(name, mode) {
  return "/assets/icons/" + name + (mode === "dark" ? "-d" : "") + ".png";
}

// 返回页面可直接 setData 的字段；同时把系统控件的颜色改掉。
function apply(setting) {
  var mode = resolve(setting);
  paintChrome(mode);
  return {
    themeMode: mode,
    themeClass: mode === "dark" ? "t-dark" : ""
  };
}

// 仅在 theme=system 时需要跟随系统切换。
function watch(handler) {
  if (!wx.onThemeChange) return function () {};
  wx.onThemeChange(function (res) {
    handler(res.theme === "dark" ? "dark" : "light");
  });
  return function () {
    if (wx.offThemeChange) wx.offThemeChange(function () {});
  };
}

module.exports = {
  resolve: resolve,
  apply: apply,
  icon: icon,
  watch: watch
};
