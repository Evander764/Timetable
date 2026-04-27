import { app } from 'electron'

export function setLaunchAtStartup(enabled: boolean): void {
  app.setLoginItemSettings({
    openAtLogin: enabled,
    openAsHidden: false,
  })
}

export function getLaunchAtStartup(): boolean {
  return app.getLoginItemSettings().openAtLogin
}
