// 收紧 / 放松 的轻提示音：两个 8KB 的短音，装载在代码包里。
// 复用 apps/mobile 的同一对 wav（880Hz / 660Hz），保证两端听感一致。

var SRC_HIGH = "/assets/audio/beep_high.wav";
var SRC_LOW = "/assets/audio/beep_low.wav";

var pool = null;

function ensure() {
  if (pool) return pool;
  var hi = wx.createInnerAudioContext({ useWebAudioImplement: false });
  var lo = wx.createInnerAudioContext({ useWebAudioImplement: false });
  hi.src = SRC_HIGH;
  lo.src = SRC_LOW;
  hi.volume = 0.7;
  lo.volume = 0.7;
  hi.onError(function () {});
  lo.onError(function () {});
  // 静音键打开时也能出声（对应移动端 playsInSilentModeIOS）。
  try {
    wx.setInnerAudioOption({ obeyMuteSwitch: false, mixWithOther: true });
  } catch (e) {}
  pool = { hi: hi, lo: lo };
  return pool;
}

// phase: "contract" | "relax"
function play(phase) {
  // 宿主不支持音频（H5 预览、基础库过旧）时 createInnerAudioContext 会抛错，
  // 这里整体兜住：声音只是增强，不能影响节拍推进。
  try {
    var p = ensure();
    var ctx = phase === "contract" ? p.hi : p.lo;
    ctx.stop();
    ctx.play();
  } catch (e) {}
}

function dispose() {
  if (!pool) return;
  try {
    pool.hi.destroy();
    pool.lo.destroy();
  } catch (e) {}
  pool = null;
}

module.exports = {
  play: play,
  dispose: dispose
};
