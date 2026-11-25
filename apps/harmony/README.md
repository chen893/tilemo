# 提了么 · HarmonyOS

原生 ArkTS + ArkUI Stage 工程。页面、组件和交互以 `apps/miniprogram` 为对照。提示音和图标沿用小程序素材。记录和偏好保存在本机。

## 开发

本机验证环境为 macOS、DevEco Studio 26.0.0.865、HarmonyOS SDK 26.0.0、DevEco CLI 1.3.0-stable、Hvigor 6.26.9、OHPM 26.0.0.630、hdc 3.2.0f 和 Mate 90 Pro API 26.0.0 模拟器。工程的目标和最低兼容 SDK 均设为 26.0.0。

从 Tilemo 根目录运行：

```sh
./apps/harmony/build.sh debug
```

Hvigor 会拒绝含中文字符的工程路径。脚本默认将源码同步到 `~/DevEcoStudioProjects/TilemoHarmony`，在该目录构建，并将产物放到 `apps/harmony/out/debug`。可用 `TILEMO_HARMONY_BUILD_DIR` 指定专用构建目录。DevEco Studio 可打开该副本。修改应落在仓库源码，避免被下次同步覆盖。构建目录的个人签名配置按本机需要管理，提交时请保留仓库配置中的空签名列表。

```sh
devecocli emulator list
devecocli emulator start 'Mate 90 Pro'
cd ~/DevEcoStudioProjects/TilemoHarmony
devecocli device list
devecocli run --skip-build --module entry --device 127.0.0.1:5555
```

用 `build.sh release` 在 `out/release` 生成发布构建产物。真机安装和应用市场分发需要对应的签名。`com.tilemo.harmony` 是本次开发使用的包名，最终发布标识需要在应用市场注册时确认。

## 同步共享代码

```sh
python3 apps/harmony/sync-core.py
pnpm check:miniprogram
pnpm --filter @tilemo/core --filter @tilemo/data test
```

生成脚本读取共享方案、类型、节拍器、日期函数和语录。鸿蒙界面、分享渲染和 Preferences 适配位于 `entry/src/main/ets`。本地备份与小程序使用相同的 JSON 字段。当前小程序提供导出和清空。

微信内置转发在鸿蒙侧调用系统分享，传递 PNG 或 JSON 文件。相册保存由系统确认。小程序内的微信按钮和系统状态栏属于宿主界面。

见 [验收记录](ACCEPTANCE.md)。
