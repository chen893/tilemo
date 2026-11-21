var appStore = require("./utils/app-store");
var backup = require("./lib/backup");

App({
  onLaunch: function () {
    // 提前实例化，首屏读本地数据时无需等待
    this.globalData.store = appStore.getStore();
    try {
      backup.removeInactive();
    } catch (e) {
      // 旧备份清理失败时，进入设置或清空记录会再次尝试。
    }
  },
  globalData: {
    store: null
  }
});
