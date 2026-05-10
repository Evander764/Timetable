import { cp, mkdir, readdir, rename, rm, stat } from 'node:fs/promises'
import { dirname, join, resolve } from 'node:path'
import { spawn } from 'node:child_process'
import { fileURLToPath } from 'node:url'

const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const defaultTarget = 'D:\\software\\Timetable_latest_standalone_20260425233036'
const targetArgIndex = process.argv.findIndex((arg) => arg === '--target')
const targetRoot = resolve(targetArgIndex >= 0 ? process.argv[targetArgIndex + 1] : defaultTarget)
const targetWinUnpacked = join(targetRoot, 'win-unpacked')
const releaseRoot = join(projectRoot, 'release')

const sourceWinUnpacked = await findLatestWinUnpacked(releaseRoot)
if (!sourceWinUnpacked) {
  throw new Error('No packaged win-unpacked output found. Run npm.cmd run pack:win first.')
}

await stopTimetableProcesses(targetRoot)

const backupRoot = buildBackupPath(targetRoot)
try {
  await stat(targetWinUnpacked)
  await mkdir(dirname(backupRoot), { recursive: true })
  await rename(targetWinUnpacked, backupRoot)
  console.log(`Backed up current win-unpacked to ${backupRoot}`)
} catch (error) {
  if (error.code !== 'ENOENT') {
    throw error
  }
}

await mkdir(targetRoot, { recursive: true })
try {
  await cp(sourceWinUnpacked, targetWinUnpacked, { recursive: true })
  console.log(`Deployed ${sourceWinUnpacked} -> ${targetWinUnpacked}`)
} catch (error) {
  await rm(targetWinUnpacked, { recursive: true, force: true })
  try {
    await rename(backupRoot, targetWinUnpacked)
  } catch {
    // Keep the original deployment error as the actionable failure.
  }
  throw error
}

async function findLatestWinUnpacked(root) {
  const entries = await readdir(root, { withFileTypes: true })
  const candidates = []
  for (const entry of entries) {
    if (!entry.isDirectory()) {
      continue
    }
    const releaseDir = join(root, entry.name)
    const winUnpacked = join(releaseDir, 'win-unpacked')
    try {
      const info = await stat(winUnpacked)
      if (info.isDirectory()) {
        const releaseInfo = await stat(releaseDir)
        candidates.push({ path: winUnpacked, mtimeMs: releaseInfo.mtimeMs })
      }
    } catch {
      // Ignore release folders that are not --dir outputs.
    }
  }

  candidates.sort((left, right) => right.mtimeMs - left.mtimeMs)
  return candidates[0]?.path
}

function buildBackupPath(target) {
  const parent = dirname(target)
  const stamp = new Date().toISOString().replace(/[-:TZ.]/g, '').slice(0, 14)
  return join(parent, `Timetable_win-unpacked_backup_${stamp}_source_first`)
}

function stopTimetableProcesses(target) {
  const escapedTarget = target.replaceAll("'", "''")
  const command = `
    Get-Process |
      Where-Object { ($_.ProcessName -like '*Timetable*' -or $_.ProcessName -like '*timetable*') -and $_.Path -like '${escapedTarget}*' } |
      Stop-Process -Force
  `
  return new Promise((resolvePromise, reject) => {
    const child = spawn('powershell.exe', ['-NoProfile', '-ExecutionPolicy', 'Bypass', '-Command', command], {
      stdio: 'inherit',
      windowsHide: true,
    })
    child.on('error', reject)
    child.on('exit', (code) => {
      if (code === 0) {
        resolvePromise()
        return
      }
      reject(new Error(`Failed to stop Timetable processes; powershell exited with ${code ?? 'unknown'}.`))
    })
  })
}
