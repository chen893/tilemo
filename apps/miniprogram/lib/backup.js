var core = require("./core");

var activeBackupPath = "";

function removeInactive() {
  var fs = wx.getFileSystemManager();
  var directory = wx.env.USER_DATA_PATH;
  fs.readdirSync(directory).forEach(function (name) {
    if (/^tgm-data-\d{4}-\d{2}-\d{2}\.json$/.test(name)) {
      var path = directory + "/" + name;
      if (path !== activeBackupPath) fs.unlinkSync(path);
    }
  });
}

function share(store) {
  if (activeBackupPath) return;
  if (typeof wx.shareFileMessage !== "function") {
    wx.showToast({ title: "此版本无法发送文件，可选择复制备份文本", icon: "none" });
    return;
  }

  var name = "tgm-data-" + core.todayKey() + ".json";
  var fs;
  var path;
  var written = false;
  var finished = false;
  var finish = function (result) {
    if (finished) return;
    finished = true;
    activeBackupPath = "";
    try {
      if (written) fs.unlinkSync(path);
      else removeInactive();
    } catch (e) {
      wx.showToast({ title: "备份文件清理失败，请在设置中重试", icon: "none" });
      return;
    }
    var message = result && result.errMsg || "";
    if (/cancel/i.test(message)) return;
    if (!written) {
      wx.showToast({ title: "写入备份文件失败", icon: "none" });
    } else if (/fail/i.test(message)) {
      wx.showToast({ title: "发送失败，可选择复制备份文本", icon: "none" });
    }
  };

  try {
    fs = wx.getFileSystemManager();
    path = wx.env.USER_DATA_PATH + "/" + name;
    activeBackupPath = path;
    fs.writeFileSync(path, JSON.stringify(store.exportAll(), null, 2), "utf8");
    written = true;
    wx.shareFileMessage({ filePath: path, fileName: name, complete: finish });
  } catch (e) {
    if (path) finish({ errMsg: "fail" });
    else wx.showToast({ title: "无法访问备份文件目录", icon: "none" });
  }
}

module.exports = {
  removeInactive: removeInactive,
  share: share,
  isSharing: function () { return !!activeBackupPath; }
};
