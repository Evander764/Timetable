import type { TimeableApi } from '@shared/ipc'

declare global {
  interface Window {
    timeable: TimeableApi
  }
}

export {}
