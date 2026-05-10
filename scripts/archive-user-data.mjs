import { copyFile, cp, mkdir, readdir, stat, writeFile } from 'node:fs/promises'
import { existsSync } from 'node:fs'
import { basename, join } from 'node:path'
import { env } from 'node:process'

const appDataRoot = env.APPDATA ? join(env.APPDATA, 'Timetable') : null
const archiveRoot = 'D:\\software\\Timetable_data_archive'
const timestamp = formatLocalTimestamp(new Date())
const archiveDir = join(archiveRoot, timestamp)

function formatLocalTimestamp(date) {
  const pad = (value) => String(value).padStart(2, '0')
  return [
    date.getFullYear(),
    pad(date.getMonth() + 1),
    pad(date.getDate()),
    '-',
    pad(date.getHours()),
    pad(date.getMinutes()),
    pad(date.getSeconds()),
  ].join('')
}

async function copyIfExists(source, targetName, manifest) {
  if (!source || !existsSync(source)) {
    manifest.missing.push(source)
    return
  }

  const target = join(archiveDir, targetName)
  const sourceStat = await stat(source)
  if (sourceStat.isDirectory()) {
    await cp(source, target, { recursive: true, force: true })
  } else {
    await copyFile(source, target)
  }
  manifest.copied.push(source)
}

async function findLatestBackup(backupsDir) {
  if (!existsSync(backupsDir)) {
    return null
  }

  const entries = await readdir(backupsDir, { withFileTypes: true })
  const files = await Promise.all(
    entries
      .filter((entry) => entry.isFile() && entry.name.endsWith('.json'))
      .map(async (entry) => {
        const filePath = join(backupsDir, entry.name)
        return { filePath, mtimeMs: (await stat(filePath)).mtimeMs }
      }),
  )

  return files.sort((left, right) => right.mtimeMs - left.mtimeMs)[0]?.filePath ?? null
}

async function main() {
  if (!appDataRoot) {
    throw new Error('APPDATA is not available, cannot locate Timetable user data.')
  }

  await mkdir(archiveDir, { recursive: true })

  const manifest = {
    createdAt: new Date().toISOString(),
    sourceAppDataDir: appDataRoot,
    archiveDir,
    copied: [],
    missing: [],
  }

  await copyIfExists(join(appDataRoot, 'app-data.json'), 'app-data.live.json', manifest)

  const backupsDir = join(appDataRoot, 'backups')
  const latestBackup = await findLatestBackup(backupsDir)
  if (latestBackup) {
    await copyIfExists(latestBackup, 'latest-backup.json', manifest)
  } else {
    manifest.missing.push(join(backupsDir, '*.json'))
  }
  await copyIfExists(backupsDir, 'backups', manifest)

  for (const candidate of ['daily-usage', 'usage', 'browser-usage']) {
    await copyIfExists(join(appDataRoot, candidate), basename(candidate), manifest)
  }

  await writeFile(join(archiveDir, 'manifest.json'), `${JSON.stringify(manifest, null, 2)}\n`, 'utf8')
  console.log(archiveDir)
}

main().catch((error) => {
  console.error(error)
  process.exitCode = 1
})
