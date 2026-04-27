# Timetable

Timetable 是一个本地优先的 Windows 桌面规划工具，用来管理课程表、每日任务、长期目标、备忘录、倒计时卡片、道理卡片和桌面挂件。

## 直接下载

[点击下载 Windows 安装包 setup.exe](https://github.com/Evander764/Timetable/releases/download/v0.2.0/Timetable-0.2.0-x64-setup.exe)

如果你不想安装，也可以下载解压版：

[下载 win-unpacked 压缩包](https://github.com/Evander764/Timetable/releases/download/v0.2.0/Timetable-win-unpacked-v0.2.0.zip)

## 运行提示

- 当前版本支持 Windows x64。
- 安装包是普通用户安装，不需要管理员权限。
- 当前安装包没有数字签名，Windows 可能会显示“未知发布者”或 SmartScreen 提示。
- 如果你信任这个仓库，可以在提示中点击“更多信息”，然后选择“仍要运行”。
- 安装包 SHA256：

```text
ED69C082431ABE10057224A9AFFD4E9E382B884044A33E9CA3425C38B30E244D
```

## 数据与隐私

- 这个仓库不包含任何个人应用数据。
- 应用运行数据保存在 Electron 的 `userData/app-data.json`。
- 更新应用包不会覆盖原来的 JSON 数据。
- 导出的备份、本地构建产物和运行日志不会提交到 Git。

## 自动更新

打包后的应用每次启动时都会检查 GitHub 最新 Release：

```text
https://github.com/Evander764/Timetable/releases/latest
```

如果发现更高版本，应用会下载 Release 里的 `app.asar`，备份当前包，替换新包并自动重启。用户数据仍然留在本机 `userData` 目录，新版本会继续使用原来的数据。

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

1. 提高 `package.json` 里的版本号。
2. 构建或准备新的 `app.asar`。
3. 创建 GitHub Release，例如 `v0.3.0`。
4. 上传新的 `app.asar`。
5. 如果要给普通用户下载，再上传新的 `setup.exe`。

当前第一个公开版本是 `v0.2.0`。
