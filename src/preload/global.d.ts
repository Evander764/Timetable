import type { TimetableApi } from '@shared/ipc'

declare global {
  interface Window {
    timeable: TimetableApi
  }
}

export {}
