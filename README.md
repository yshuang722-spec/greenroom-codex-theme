# Green Room — Codex Windows 主题

Green Room 为 Windows 桌面版 Codex 提供深绿外观、背景动效、模型状态提示、统一滚动条和系统托盘开关。主题监视器在本机运行，支持热更新、兼容性检测以及关闭时恢复原外观。

本仓库只包含客户端主题与托盘控制器，不包含 Codex 启动动画。

## 安装与使用

1. 下载仓库文件并解压到一个固定文件夹，不要单独移动里面的文件。
2. 双击 `GreenRoomTray-Win11.exe`，绿色 Codex 图标会出现在系统托盘。
3. 右键托盘图标并选择“开启”。如果客户端尚未以主题所需的本地调试参数启动，脚本会提示并等待客户端完全退出，然后重新启动并检查主题状态。
4. 选择“关闭”会移除主题样式并恢复主题启动前的外观设置；之后完全退出客户端，再按平常方式启动即可。

托盘菜单还可设置 Windows 登录时自动启动。主题运行期间，编辑根目录中的 `theme.css` 或 `effects.js` 会自动热更新。首次开启或客户端升级后若加载失败，右键托盘图标查看提示，并运行 `Check.cmd` 获取状态。

## 仓库结构

- 根目录：主题样式、运行时、启用／检查／恢复入口和可直接运行的托盘程序。
- `assets/`：托盘图标与图标源文件。
- `scripts/`：托盘 C# 源码及 Windows 构建脚本。
- `state/`：运行时自动生成的状态和恢复备份，不纳入版本控制。请保留此目录中的备份，直到确认外观已恢复。

## 开发与构建

需要 Node.js 22（或 Codex 随附的 Node 运行时）以及 Windows .NET Framework C# 编译器。

```powershell
node --test .\compatibility.test.mjs
powershell -NoProfile -ExecutionPolicy Bypass -File .\scripts\Build-GreenRoomTray.ps1
```

构建会在仓库根目录生成 `GreenRoomTray-Win11.exe`，并在 `assets/` 更新图标。

## 兼容性与隐私

主题针对 Windows 桌面版 Codex 的 Electron 界面实现。本机开发与视觉检查使用 Codex `26.1007.2314.0`；客户端内部模块和页面结构可能随升级变化，因此测试通过不代表新版客户端已完成视觉验收。运行 `Check.cmd` 检查当前客户端的主题状态。

运行时通过 `127.0.0.1:19335` 的本机调试接口操作客户端外观并检查必要的界面功能。它不会连接远程服务、读取或上传聊天内容，也不会修改客户端安装包。启用时会保存外观备份到 `state/`，恢复时使用该备份。

项目修改记录见 [更新日志](CHANGELOG.md)。

## 许可证

本项目按 MIT 许可证发布，见 [LICENSE](LICENSE)。Green Room 是社区独立制作的非官方主题，与 OpenAI 官方无关，也不代表 OpenAI 官方立场。
