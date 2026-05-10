# Timetable.OS Source-First Workflow

`D:\software\时间管理窗` is the source of truth for Timetable.OS development.

## Rules

- Make formal product changes in `src`, `public`, or `scripts`.
- Do not patch `D:\software\Timetable_latest_standalone_20260425233036\win-unpacked\resources\app.asar` directly except for emergency repair.
- Keep user data outside the source tree. Use `npm.cmd run archive:user-data` to copy runtime data to `D:\software\Timetable_data_archive`.
- After source changes, run checks from this source directory:
  - `npm.cmd run typecheck`
  - `npm.cmd run lint`
  - `npm.cmd test`
  - `npm.cmd run build`
- For main-process or renderer bundle changes, also run:
  - `node --check out/main/index.js`
  - `node --check out/renderer/assets/index-*.js`
- Package with `npm.cmd run pack:win`.
- Deploy the packaged `win-unpacked` with `npm.cmd run deploy:local`.

## Runtime Target

The default local runtime target is:

`D:\software\Timetable_latest_standalone_20260425233036`

`deploy:local` stops Timetable processes from that target, backs up the current `win-unpacked` folder beside it, then copies the packaged `win-unpacked` output into place.

## Windows Application Control Workaround

On this machine, newly generated `Timetable.exe` files can be blocked by Windows Application Control policy. If that happens:

1. Preserve a previously allowed `Timetable.exe` from the runtime target or a known-good backup.
2. Run `npm.cmd run pack:win` and `npm.cmd run deploy:local` normally so the current `resources/app.asar` is deployed.
3. Copy the allowed executable shell back over `D:\software\Timetable_latest_standalone_20260425233036\win-unpacked\Timetable.exe`.
4. Start the app from the runtime target and verify the deployed `app.asar` contains the expected source strings.

This is a local execution workaround only. Do not treat it as permission to hand-edit `app.asar`; source remains authoritative.

## Emergency Patch Tool

The packaged-ASAR patch tool in `%APPDATA%\TimetableOSPatchTools` is retained only as a fallback. If it is used, migrate the same behavior back into this source project before the next normal build.
