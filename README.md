# Timetable

Timetable 是一个本地优先的 Windows 桌面规划工具，用来管理课程表、每日任务、长期目标、备忘录、倒计时、道理卡片、桌面挂件和时间统计。

## 直接下载

[点击下载 Windows 安装包 setup.exe](https://github.com/Evander764/Timetable/releases/download/v0.3.0/Timetable-0.3.0-x64-setup.exe)

不想安装时，也可以下载解压版：

[下载 win-unpacked 压缩包](https://github.com/Evander764/Timetable/releases/download/v0.3.0/Timetable-win-unpacked-v0.3.0.zip)

## 运行提示

- 当前版本支持 Windows x64。
- 安装包是普通用户安装，不需要管理员权限。
- 当前安装包没有数字签名，Windows 可能显示“未知发布者”或 SmartScreen 提示。
- 如果你信任这个仓库，可以在提示中点击“更多信息”，然后选择“仍要运行”。
- Release 附带 `SHA256SUMS.txt`，可用于校验下载文件。

## 主要功能

- 课程表：支持学期开始日期、总周数、单/双周课程、自定义课表时间。
- 今日行动中心：自动判断正在上课、下一节课、今日课程结束或今日无课。
- 道理卡片：支持多张卡片、手动切换、自动轮换和翻页动画。
- 桌面挂件：支持主面板、倒计时、备忘录、任务卡片和道理卡片。
- 时间统计：按天统计前台网页和 AI 应用使用时间，AdsPower 不会被计入 Claude。
- 托盘退出：可设置右上角关闭按钮是退出程序还是隐藏到托盘，也可开启“仅托盘退出”。
- 数据备份：支持自动备份、手动备份、备份恢复和恢复前保护备份。

## 数据与隐私

- 这个仓库不包含任何个人应用数据。
- 应用运行数据保存在 Electron 的 `userData/app-data.json`。
- 备份文件保存在 `userData/backups`。
- 更新应用包不会覆盖原来的 JSON 数据。
- 导出的备份、本地构建产物和运行日志不会提交到 Git。

## 自动更新

打包后的应用启动时会检查 GitHub 最新 Release：

```text
https://github.com/Evander764/Timetable/releases/latest
```

发现新版本后，应用会显示版本说明和确认按钮。用户确认后，程序会先备份当前用户数据，再下载 Release 中的 `app.asar`，校验 `SHA256SUMS.txt`，替换资源包并自动重启。用户数据仍然保留在本机 `userData` 目录，新版本会继续使用原来的数据。

## 本地开发

```bash
npm install
npm run dev
```

常用命令：

```bash
npm run lint
npm test
npm run build
npm run pack:win
npm run dist:win
npm run dist:portable
npm run release:win
```

## 发布新版本

1. 提高 `package.json` 和 `package-lock.json` 的版本号。
2. 执行 `npm run release:win`。
3. 上传 `app.asar`、`setup.exe`、便携版、win-unpacked zip 和 `SHA256SUMS.txt`。
4. 创建 GitHub Release，例如 `v0.3.0`。

当前最新公开版本是 `v0.3.0`。
