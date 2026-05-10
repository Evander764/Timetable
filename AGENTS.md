# Timetable.OS Agent Notes

## Source And Runtime

- Source of truth: `D:\software\时间管理窗`.
- Local runtime target: `D:\software\Timetable_latest_standalone_20260425233036\win-unpacked`.
- User data lives outside source at `%APPDATA%\Timetable\app-data.json`.
- User data archives live under `D:\software\Timetable_data_archive`.

## Hard Rules

- Make product changes in source (`src`, `public`, `scripts`, `docs`) and rebuild.
- Do not manually patch `win-unpacked\resources\app.asar` except for emergency repair; migrate any emergency patch back into source before the next normal build.
- Do not copy private user data into `src`, `docs`, defaults, tests, or git-tracked fixtures.
- Keep generated artifacts (`out`, `release`, `coverage`, logs) out of hand-authored documentation except as command outputs or deployment targets.

## Standard Verification

Run from `D:\software\时间管理窗` after code changes:

```bash
npm.cmd run typecheck
npm.cmd run lint
npm.cmd test
npm.cmd run build
```

For packaged behavior changes, also run:

```bash
npm.cmd run pack:win
npm.cmd run deploy:local
```

For main-process or renderer bundle changes, syntax-check generated bundles:

```bash
node --check out/main/index.js
node --check out/renderer/assets/index-*.js
```

## Local EXE Policy

Windows Application Control can block newly generated `Timetable.exe` files on this machine. If a new deployed executable is blocked, keep or restore a previously allowed `Timetable.exe` shell and use it with the current deployed `resources/app.asar`. Verify the `app.asar` contains expected source strings before reporting success.

## Current Ritual Behavior

- Entry animation is controlled by `ritualIntroEnabled` and is not limited to once per day.
- Exit animation is triggered by the dedicated `archive` window action, surfaced as `结束今日`.
- Entry modes: `door`, `curtain`, `meteor`, `sunrise`.
- Exit modes: `door`, `curtain`, `moon`.
- Ritual music is generated locally with Web Audio; do not add copied melodies or external audio assets.
