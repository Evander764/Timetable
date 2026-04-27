# Timetable

Timetable is a local-first Windows desktop planner for courses, tasks, goals, memos, countdown cards, principle cards, and desktop widgets.

## Privacy And Data

- This repository does not include personal application data.
- Runtime data is created locally at Electron `userData/app-data.json`.
- Updating the app package does not replace the user's existing JSON data.
- Exported backups and local release artifacts are ignored by Git.

## Auto Update

On startup, packaged builds check the latest GitHub Release at:

```text
https://github.com/Evander764/Timetable/releases/latest
```

If the release tag is newer than the local app version, Timetable downloads the release asset named `app.asar`, backs up the current package, replaces it, and restarts the app. User data stays in the Electron `userData` directory and is reused by the new version.

## Development

```bash
npm install
npm run dev
```

Useful commands:

```bash
npm run lint
npm test
npm run build
npm run pack:win
npm run dist:win
npm run dist:portable
npm run release:win
```

## Release Notes

For an auto-updatable release:

1. Increase `package.json` version.
2. Build or prepare a new `app.asar`.
3. Create a GitHub Release with tag `vX.Y.Z`.
4. Upload the new `app.asar` as a release asset.

The first public clean release is `v0.2.0`.
