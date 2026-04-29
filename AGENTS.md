# Agent Instructions

Before changing this project, read `ARCHITECTURE.md` at the repository root.

Use that file as the source of truth for:

- Electron main/preload/renderer/shared boundaries
- local JSON persistence and backup behavior
- overlay BrowserWindow architecture
- release and local install verification notes

Do not treat `release`, `downloads`, `backups`, `coverage`, `out`, `node_modules`, or `sources` as normal source areas unless the user explicitly asks to work on those artifacts.
