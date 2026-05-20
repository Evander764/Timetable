# Timetable.OS

Timetable.OS is a local-first Windows desktop planner for courses, daily tasks, long-term goals, memos, countdowns, principle cards, desktop widgets, time statistics, and ritualized day start/end flows.

## Current Local Version

- App version: `0.3.8`
- Source of truth: `D:\software\时间管理窗`
- Local runtime target: `D:\software\Timetable_latest_standalone_20260425233036\win-unpacked`
- User data: `%APPDATA%\Timetable\app-data.json`
- User data archive root: `D:\software\Timetable_data_archive`

This repository does not store private user data. Runtime data and backups stay outside the source tree.

## Features

- Course ledger: term start date, total weeks, odd/even week courses, and custom timetable slots.
- Today calibration: vertical daily workflow with the main question, next node, execution queue, and archive action.
- Daily tasks: recurring tasks, completion tracking, priority, and desktop task widgets.
- Long-term goals: staged goals, subtasks, progress, and status tracking.
- Memo archive: active/ended memos and optional desktop display.
- Countdown events: countdown card and event list, with day-based timing aligned to Beijing time by default.
- Principle cards: multiple cards, standalone/embedded display, rotation, and desktop widget support.
- Desktop widgets: main panel, task widget, memo widget, countdown widget, and principle widget.
- Time audit: day-level browser and AI usage tracking.
- Rituals: configurable entry, work-start, and exit animation modes with local Web Audio synthesis.

## Ritual Modes

Entry modes:

- `开门光缝`
- `升起帷幕`
- `流星破晓`
- `日出破晓`

Exit modes:

- `关门归档`
- `降下帷幕`
- `月升归档`

Work ritual modes:

- `工作台点亮`
- `印章落定`
- `晨光聚焦`

Entry playback is controlled by the `每日入场仪式` setting and is no longer limited to once per day. Work rituals are launched manually from `今日校准台` or previewed in settings; they are not startup animations. Exit playback is triggered by the dedicated `结束今日` archive action.

## Local Development

Install dependencies:

```bash
npm install
```

Run during development:

```bash
npm run dev
```

Checks:

```bash
npm.cmd run typecheck
npm.cmd run lint
npm.cmd test
npm.cmd run build
```

Package and deploy to the local runtime target:

```bash
npm.cmd run pack:win
npm.cmd run deploy:local
```

After building, syntax-check the generated bundles when changing main-process or renderer behavior:

```bash
node --check out/main/index.js
node --check out/renderer/assets/index-*.js
```

## Local Deployment Note

On this machine, newly generated `Timetable.exe` files can be blocked by Windows Application Control policy. If the deployed executable is blocked but an earlier `Timetable.exe` is allowed, keep the allowed executable shell and deploy the current `resources/app.asar`. The product code still comes from source and the current packaged resource bundle.

## Data And Privacy

- The source tree must not include `%APPDATA%\Timetable\app-data.json`.
- Use `npm.cmd run archive:user-data` when a manual data snapshot is needed.
- Application package updates must not overwrite user JSON data.
- Generated release folders, runtime logs, coverage output, and local archives are build artifacts, not source facts.
