# Timetable Architecture Notes

This file is the local architecture handoff for future Codex sessions. Read it before changing the app.

## Product Shape

Timetable is a local-first Windows desktop planner built with Electron, React, TypeScript, electron-vite, Tailwind CSS, Zustand, and local JSON persistence.

The app has no backend. The important runtime artifact is the Electron `userData` directory and its `app-data.json` file, not the source checkout itself.

## Runtime Layers

```text
Electron main process
  -> AppStorage: local data, schema migration, atomic saves, backups
  -> WindowManager facade: coordinates main window and desktop overlay BrowserWindows
  -> windowing controllers: main window, overlay windows, pure geometry helpers
  -> IPC handlers: bridge renderer requests to storage/windows/system APIs
  -> BrowserUsageTracker: Windows active-browser and AI-tool usage sampling
  -> Tray/startup helpers

Preload
  -> exposes window.timeable via contextBridge
  -> renderer never calls Electron or Node APIs directly

Renderer
  -> React app using HashRouter
  -> Zustand appStore wraps window.timeable calls
  -> normal pages under src/renderer/pages
  -> desktop widgets under src/renderer/overlay

Shared
  -> AppData types, IPC types, reducer, defaults, migrations, pure utilities
  -> imported by both main and renderer where safe
```

## Key Entrypoints

- `src/main/index.ts`: app bootstrap. Creates storage, windows, tray, IPC, and browser usage tracking.
- `src/main/storage.ts`: authoritative local data service. Handles load, normalize, migration, atomic save, backup, restore, export, and usage snapshots.
- `src/main/windows.ts`: public WindowManager facade used by bootstrap and IPC.
- `src/main/windowing/mainWindowController.ts`: owns the frameless main window.
- `src/main/windowing/overlayWindowController.ts`: owns separate transparent overlay windows.
- `src/main/windowing/geometry.ts`: pure window sizing, bounds, opacity, and edge-collapse helpers.
- `src/main/ipc.ts`: registers all IPC handlers.
- `src/preload/index.ts`: exposes the typed `window.timeable` API.
- `src/renderer/App.tsx`: route tree for normal pages and overlay routes.
- `src/renderer/store/appStore.ts`: renderer state and async actions around `window.timeable`.
- `src/shared/types/app.ts`: `AppData` and domain model types.
- `src/shared/ipc.ts`: shared renderer/main API contract.
- `src/shared/data/defaults.ts`: default `AppData`.
- `src/shared/data/migrations.ts`: `schemaVersion` migration entrypoint.
- `src/shared/data/reducer.ts`: pure mutations for courses, tasks, goals, memos, settings, and widgets.

## Data Model And Persistence

The main persisted object is `AppData`.

Current important fields:

- `schemaVersion`: top-level data schema version.
- `courses`
- `dailyTasks`
- `longTermGoals`
- `memos`
- `countdownItems`: user-created countdown targets.
- `principleCard`
- `countdownCard`: countdown widget settings plus optional `pinnedItemId`.
- `desktopSettings`
- `appSettings`
- `browserUsage`

Persistence rules:

- Data file path is `app.getPath('userData')/app-data.json`.
- Saves are atomic: write a temp file beside `app-data.json`, then rename it over the target.
- Corrupt JSON is preserved as `app-data.corrupt-<timestamp>.json`, then defaults are recreated.
- Legacy or missing schema data flows through `migrateAppData()` before normalization.
- Daily, migration, and manual backups live under `userData/backups`.
- Backup summaries use `DataBackupSummary` from `src/shared/ipc.ts`.
- The "Data and Startup" renderer page exposes backup listing and restore UI.

Important local-machine constraint:

- This machine has previously had both `AppData/Roaming/Timetable` and `AppData/Roaming/timeable`.
- Do not assume the lowercase or uppercase directory is authoritative.
- For upgrade/replacement work, validate JSON contents and the actual Electron `userData` path.

## Window And Overlay Model

The main app window is a frameless BrowserWindow loading the normal React route tree.

Desktop widgets are not DOM overlays inside the main window. They are separate transparent BrowserWindows managed by `WindowManager`, each loading:

```text
#/overlay/<widgetKey>
```

Known widget keys:

- `mainPanel`
- `dailyTasks`
- `memo`
- `countdown`
- `principle`

Overlay behavior owned by `OverlayWindowController` behind the `WindowManager` facade:

- create/destroy overlay windows based on `desktopSettings.widgets`
- always-on-top and opacity
- drag/resize bounds persistence
- screen-bound constraints
- edge auto-hide and hover expansion

Be careful changing overlay behavior. It couples renderer widget config, Electron window bounds, and persisted widget settings.

Keep `WindowManager` public methods stable unless all callers are updated. `index.ts` and `ipc.ts` should not need to know whether main-window or overlay-window internals changed.

## Renderer State Flow

Normal update path:

```text
page component
  -> useAppStore action
  -> window.timeable API
  -> IPC handler
  -> AppStorage update
  -> WindowManager sync/broadcast
  -> renderer receives data:changed
```

Full-data updates still use `data:changed`.

High-frequency updates may use `data:patched`:

- `widget/replace` patches update one desktop widget after overlay movement, resize, or widget config changes.
- `browserUsage/dayReplace` patches update one browser-usage day after background sampling.

The full `data:changed` path remains the compatibility contract for startup, ordinary business mutations, settings, restore, export, and any change that is not explicitly patchable. Renderer code should apply patches only on top of already-loaded `AppData`; if data is not loaded yet, wait for `loadData()` or the next full `data:changed`.

## Countdown Items

The countdown page supports multiple user-created `countdownItems`.

The desktop countdown overlay still uses the single `countdown` widget key and one BrowserWindow. It displays `countdownCard.pinnedItemId` when that item exists. If no item is pinned, the pinned item was deleted, or there are no custom countdowns, the overlay falls back to the original "today remaining" countdown plus task completion summary.

## Browser Usage Tracking

`src/main/browserUsageTracker.ts` is Windows-specific and uses PowerShell/UIAutomation to inspect the foreground window.

It detects:

- browser URLs
- AI web services such as ChatGPT, Claude, Gemini, DeepSeek, Kimi
- AI desktop/terminal tools by process/title heuristics

This should remain isolated from app startup correctness. Failures should degrade to no usage sample, not prevent the app from running.

## Build And Test

Scripts:

- `npm run dev`: electron-vite dev
- `npm run typecheck`: app and node TypeScript checks
- `npm test`: Vitest with coverage
- `npm run build`: typecheck plus electron-vite build
- `npm run pack:win`: unpacked Windows build
- `npm run dist:win`: NSIS installer
- `npm run dist:portable`: portable executable
- `npm run release:win`: installer plus portable

`vitest.config.ts` excludes historical and generated folders such as `sources`, `release`, `downloads`, and `backups`. Do not remove those excludes unless the historical snapshots are intentionally brought under test.

## Release And Local Install Notes

For local replacement or upgrade tasks:

- First verify the actual running executable:

```powershell
Get-Process Timetable,Timeable -ErrorAction SilentlyContinue | Select-Object ProcessName,Id,Path
```

- Do not infer the active app from newest folder names.
- Verify the desktop shortcut target if the user launches through a shortcut.
- Preserve and validate local user data before switching builds.
- The active local release can be outside the current source build output.

## Current Optimization State

Implemented:

- top-level `AppData.schemaVersion`
- migration entrypoint
- atomic `app-data.json` saves
- corrupt JSON preservation
- daily/migration/manual backups
- backup listing and restore API
- backup/restore UI on the Data and Startup page
- user-created countdown items with one pinned desktop countdown
- settings widget deep-merge behavior
- `WindowManager` split into main-window controller, overlay-window controller, and pure geometry helpers
- `data:patched` broadcasts for high-frequency widget and browser-usage updates
- tests for storage safety and reducer widget merge behavior
- tests for pure window geometry behavior

Still good next steps:

- isolate browser usage tracking further from storage/UI broadcast load
- clean repository hygiene around generated artifacts and historical source snapshots
- add renderer tests if a renderer test harness is introduced

## Change Guidelines

- Prefer existing patterns over new frameworks.
- Keep data migrations pure and testable.
- Keep renderer access to system APIs behind `window.timeable`.
- Never bypass `AppStorage` for persisted app data.
- When modifying user data behavior, add storage tests first.
- When modifying overlays, test bounds, resize, hide/show, and persisted widget settings.
- Keep release folders, backups, downloads, and source snapshots out of normal app logic.
