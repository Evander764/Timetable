import { Menu, Tray, nativeImage } from 'electron'

type AppTrayOptions = {
  showMainWindow: () => Promise<void>
  hideMainWindow: () => void
  quitApplication: () => Promise<void>
}

const TRAY_ICON_DATA_URL =
  'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAACAAAAAgCAYAAABzenr0AAAAAXNSR0IArs4c6QAAAARnQU1BAACxjwv8YQUAAAAJcEhZcwAADsMAAA7DAcdvqGQAAAG8SURBVFhH7VahUsNAEEXiYIa5Kw4kEonsJ1QikTgq2luqwCH5BGRnapBoFH/QSmRlZN0us5cJzO0ml1wucbyZJzLZ2/c2t7e5o6N/9IRZ0PUEaFqRn2XMoLh4omMDdGcA18bhwQJRHQ3gu13i/ckDncocvcEJLeBeisWJhXU4Z+MyX2dwFQbwSydPoMPdBOhS5m4FLzIOv1XCXsSC+0RqNMJXPph4RSzOVnQltRTKZsv87A3kolqbkxtHLqy42lI7tnpdYALwVWr+gquPdfsgBhwezILOpbZHedz0olpu/jQ/NzXvY3T4IrU9LOCHCm5inoGd1K46v3HCKeYYACJ1IqzDGxkUZaYBu6RZaGBJMxUUY64Bh3NhIKEBmZkGDNBzYGDi8FYGRZlv4DE0ADSVQVFmGuCCAwM8HGRQlJkGuOkDA95Eyj8gywDupbYHN4YOHoEO36S2B29D0jDqyej9kf9WcsGQ5Duj1AxQNmPzHzGH/HXVCK4Dd+gYW6GOXgwcPKQJNfm6oBxOWMhkKeQikiqX8CcDcC0TdyE3XKc97wI+Onx+2xsUCzacdA1Phb87OJzzvlbk51FFx8IPLEGiuwqPuOUAAAAASUVORK5CYII='

export class AppTray {
  private tray: Tray

  constructor(private readonly options: AppTrayOptions) {
    const icon = nativeImage.createFromDataURL(TRAY_ICON_DATA_URL)
    icon.setTemplateImage(false)
    this.tray = new Tray(icon)
    this.tray.setToolTip('Timetable')
    this.tray.setContextMenu(this.createMenu())
    this.tray.on('click', () => {
      void this.options.showMainWindow()
    })
    this.tray.on('double-click', () => {
      void this.options.showMainWindow()
    })
  }

  destroy(): void {
    this.tray.destroy()
  }

  private createMenu(): Electron.Menu {
    return Menu.buildFromTemplate([
      {
        label: '显示 Timetable',
        click: () => {
          void this.options.showMainWindow()
        },
      },
      {
        label: '隐藏到托盘',
        click: () => this.options.hideMainWindow(),
      },
      { type: 'separator' },
      {
        label: '彻底退出',
        click: () => {
          void this.options.quitApplication()
        },
      },
    ])
  }
}
