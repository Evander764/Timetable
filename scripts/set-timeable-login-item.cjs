const { app } = require('electron')

const targetPath = process.argv[2]
const legacyTargetPath = targetPath.replace(/Timetable\.exe$/i, 'Timeable.exe')

if (!targetPath) {
  console.error('Usage: electron scripts/set-timeable-login-item.cjs <path-to-Timetable.exe>')
  process.exit(1)
}

app.setAppUserModelId('com.timetable.app')

app.whenReady().then(() => {
  app.setAppUserModelId('com.timeable.app')
  app.setLoginItemSettings({
    openAtLogin: false,
    path: legacyTargetPath,
    args: [],
  })

  app.setAppUserModelId('com.timetable.app')
  app.setLoginItemSettings({
    openAtLogin: true,
    openAsHidden: false,
    path: targetPath,
    args: [],
  })

  const settings = app.getLoginItemSettings({
    path: targetPath,
    args: [],
  })

  console.log(JSON.stringify(settings, null, 2))
  app.quit()
})
