import { APP_DATA_SCHEMA_VERSION, type AppData } from '@shared/types/app'

export type MigratableAppData = Partial<Omit<AppData, 'appSettings'>> & {
  appSettings?: Partial<AppData['appSettings']>
}

export type AppDataMigrationResult = {
  data: MigratableAppData
  migrated: boolean
  fromVersion: number
  toVersion: number
}

export function migrateAppData(raw: MigratableAppData, dataPath: string): AppDataMigrationResult {
  const fromVersion = getSchemaVersion(raw.schemaVersion)
  if (fromVersion > APP_DATA_SCHEMA_VERSION) {
    throw new Error(`Unsupported app data schema version: ${fromVersion}`)
  }

  const withCountdownItems = fromVersion < 2
    ? {
        ...raw,
        countdownItems: raw.countdownItems ?? [],
      }
    : raw

  return {
    data: {
      ...withCountdownItems,
      schemaVersion: APP_DATA_SCHEMA_VERSION,
      appSettings: {
        ...withCountdownItems.appSettings,
        dataPath,
      },
    },
    migrated: fromVersion !== APP_DATA_SCHEMA_VERSION,
    fromVersion,
    toVersion: APP_DATA_SCHEMA_VERSION,
  }
}

function getSchemaVersion(value: unknown): number {
  if (typeof value !== 'number' || !Number.isInteger(value) || value < 1) {
    return 0
  }

  return value
}
