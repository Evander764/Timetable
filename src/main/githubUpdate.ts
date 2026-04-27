import { spawn } from 'node:child_process'
import { mkdir, writeFile } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import { app } from 'electron'

const GITHUB_UPDATE_REPO = 'Evander764/Timetable'
const GITHUB_UPDATE_ENDPOINT = `https://api.github.com/repos/${GITHUB_UPDATE_REPO}/releases/latest`
const GITHUB_UPDATE_USER_AGENT = 'Timetable-Updater'

function parseVersionParts(version: string): number[] {
  return String(version ?? '')
    .trim()
    .replace(/^v/i, '')
    .split(/[.-]/)
    .map((part) => {
      const value = Number.parseInt(part, 10)
      return Number.isFinite(value) ? value : 0
    })
}

function isNewerVersion(candidate: string, current: string): boolean {
  const nextParts = parseVersionParts(candidate)
  const currentParts = parseVersionParts(current)
  const length = Math.max(nextParts.length, currentParts.length, 3)

  for (let index = 0; index < length; index += 1) {
    const nextValue = nextParts[index] ?? 0
    const currentValue = currentParts[index] ?? 0

    if (nextValue > currentValue) {
      return true
    }

    if (nextValue < currentValue) {
      return false
    }
  }

  return false
}

async function fetchWithTimeout(url: string, timeoutMs: number): Promise<Response> {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), timeoutMs)

  try {
    const response = await fetch(url, {
      headers: {
        Accept: 'application/vnd.github+json',
        'User-Agent': GITHUB_UPDATE_USER_AGENT,
      },
      signal: controller.signal,
    })

    if (!response.ok) {
      throw new Error(`GitHub update request failed: ${response.status}`)
    }

    return response
  } finally {
    clearTimeout(timer)
  }
}

function getPackagedAsarPath(): string | null {
  if (!app.isPackaged) {
    return null
  }

  return join(process.resourcesPath, 'app.asar')
}

function formatUpdateTimestamp(): string {
  return new Date().toISOString().replace(/[-:TZ.]/g, '').slice(0, 14)
}

async function installDownloadedAsar(downloadedAsarPath: string, latestVersion: string): Promise<boolean> {
  const targetAsar = getPackagedAsarPath()

  if (!targetAsar) {
    return false
  }

  const updatesDir = dirname(downloadedAsarPath)
  const backupAsar = join(dirname(targetAsar), `app.asar.bak_update_${formatUpdateTimestamp()}`)
  const scriptPath = join(updatesDir, 'install-github-update.ps1')
  const script = [
    'param(',
    '  [int]$ProcessId,',
    '  [string]$Source,',
    '  [string]$Target,',
    '  [string]$Backup,',
    '  [string]$ExePath',
    ')',
    "$ErrorActionPreference = 'Stop'",
    'Wait-Process -Id $ProcessId -ErrorAction SilentlyContinue',
    'Start-Sleep -Seconds 1',
    'Copy-Item -LiteralPath $Target -Destination $Backup -Force',
    'Move-Item -LiteralPath $Source -Destination $Target -Force',
    '$workDir = Split-Path -Parent $ExePath',
    'Start-Process -FilePath $ExePath -WorkingDirectory $workDir',
  ].join('\n')

  await writeFile(scriptPath, script, 'utf8')

  const child = spawn(
    'powershell.exe',
    [
      '-NoProfile',
      '-ExecutionPolicy',
      'Bypass',
      '-File',
      scriptPath,
      '-ProcessId',
      String(process.pid),
      '-Source',
      downloadedAsarPath,
      '-Target',
      targetAsar,
      '-Backup',
      backupAsar,
      '-ExePath',
      process.execPath,
    ],
    {
      detached: true,
      stdio: 'ignore',
    },
  )

  child.unref()
  console.info(`Installing Timetable update ${latestVersion} from GitHub release.`)
  app.quit()

  return true
}

export async function checkForGithubUpdate(): Promise<boolean> {
  if (!app.isPackaged) {
    return false
  }

  try {
    const releaseResponse = await fetchWithTimeout(GITHUB_UPDATE_ENDPOINT, 8_000)
    const release = await releaseResponse.json() as {
      tag_name?: string
      assets?: Array<{ name?: string; browser_download_url?: string }>
    }
    const latestVersion = String(release?.tag_name ?? '').replace(/^v/i, '')

    if (!latestVersion || !isNewerVersion(latestVersion, app.getVersion())) {
      return false
    }

    const assets = Array.isArray(release.assets) ? release.assets : []
    const asarAsset = assets.find((asset) => asset?.name === 'app.asar')
      ?? assets.find((asset) => String(asset?.name ?? '').toLowerCase().endsWith('.asar'))

    if (!asarAsset?.browser_download_url) {
      console.warn('GitHub update found, but no app.asar asset is attached.')
      return false
    }

    const updatesDir = join(app.getPath('userData'), 'updates')
    await mkdir(updatesDir, { recursive: true })

    const downloadedAsarPath = join(updatesDir, `app-${latestVersion}.asar`)
    const assetResponse = await fetchWithTimeout(asarAsset.browser_download_url, 120_000)
    const assetBuffer = Buffer.from(await assetResponse.arrayBuffer())
    await writeFile(downloadedAsarPath, assetBuffer)

    return installDownloadedAsar(downloadedAsarPath, latestVersion)
  } catch (error) {
    console.warn('GitHub update check skipped.', error)
    return false
  }
}
