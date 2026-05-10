import type { TimetableApi } from '@shared/ipc'

declare global {
  const __APP_VERSION__: string

  interface Window {
    timeable: TimetableApi
  }
}

export {}
