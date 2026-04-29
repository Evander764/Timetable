# Timetable

Timetable 是一个本地 Windows 桌面应用，用来统一管理课程表、每日任务、长期目标、备忘录、倒计时卡片和桌面悬浮挂件。

## 技术栈

- Electron
- React
- TypeScript
- electron-vite
- Tailwind CSS
- Zustand
- lucide-react
- 本地 JSON 持久化

## 开发命令

```bash
npm install
npm run dev
```

其他命令：

```bash
npm run lint
npm test
npm run build
npm run pack:win
npm run dist:win
npm run dist:portable
npm run release:win
```

## 数据存储

- 默认数据文件位于 Electron `userData` 目录下的 `app-data.json`
- 所有数据仅保存在本地
- 修改后默认自动保存，带 500ms debounce
- 支持导出当前数据为 JSON 文件

## 主要功能

- 控制中心窗口：总览、桌面面板、课程表、每日任务、长期任务、备忘录、倒计时卡片、道理卡片、背景与设置、数据与启动
- 桌面透明挂件：主面板、每日任务、进行中备忘、倒计时、道理卡片
- 桌面卡片位置、尺寸、透明度和显隐状态持久化
- 开机启动、本地背景图切换、数据导出

## Windows 打包

- `npm run pack:win`：生成未安装的目录版本，便于本地检查打包结果
- `npm run dist:win`：生成 Windows `nsis` 安装包
- `npm run dist:portable`：生成 Windows 便携版可执行文件
- `npm run release:win`：一次性生成安装包和便携版

默认输出目录会带版本号和时间戳，避免覆盖旧产物：

```text
release/<version>-<yyyymmddhhmmss>/
```

## 测试覆盖

当前包含以下自动化测试：

- 课程显示规则与下一节课计算
- 每日任务完成率、连续打卡与重复规则
- 长期目标阶段推进
- 数据 reducer 更新
- JSON 默认数据创建与自动保存
