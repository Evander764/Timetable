import { spawn } from 'node:child_process'
import { createHash } from 'node:crypto'
import { mkdir, writeFile } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import { app, dialog, type BrowserWindow, type MessageBoxOptions } from 'electron'
import type { GithubUpdateInfo, GithubUpdateInstallResult } from '@shared/ipc'
import type { AppStorage } from './storage'

const GITHUB_UPDATE_REPO = 'Evander764/Timetable'
const GITHUB_UPDATE_ENDPOINT = `https://api.github.com/repos/${GITHUB_UPDATE_REPO}/releases/latest`
const GITHUB_UPDATE_USER_AGENT = 'Timetable-Updater'
const SHA256_ASSET_NAME = 'SHA256SUMS.txt'

type GithubReleaseAsset = {
  name?: string
  size?: number
  browser_download_url?: string
}

type GithubRelease = {
  tag_name?: string
  name?: string
  published_at?: string
  body?: string
  assets?: GithubReleaseAsset[]
}

type GithubUpdateCandidate = GithubUpdateInfo & {
  asarDownloadUrl?: string
  shaDownloadUrl?: string
}

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

function toPublicUpdateInfo(candidate: GithubUpdateCandidate): GithubUpdateInfo {
  return {
    available: candidate.available,
    currentVersion: candidate.currentVersion,
    latestVersion: candidate.latestVersion,
    releaseName: candidate.releaseName,
    publishedAt: candidate.publishedAt,
    body: candidate.body,
    assetName: candidate.assetName,
    assetSize: candidate.assetSize,
    error: candidate.error,
  }
}

async function getGithubUpdateCandidate(): Promise<GithubUpdateCandidate> {
  const currentVersion = app.getVersion()
  if (!app.isPackaged) {
    return { available: false, currentVersion }
  }

  try {
    const releaseResponse = await fetchWithTimeout(GITHUB_UPDATE_ENDPOINT, 8_000)
    const release = await releaseResponse.json() as GithubRelease
    const latestVersion = String(release?.tag_name ?? '').replace(/^v/i, '')

    if (!latestVersion || !isNewerVersion(latestVersion, currentVersion)) {
      return {
        available: false,
        currentVersion,
        latestVersion: latestVersion || undefined,
        releaseName: release.name,
        publishedAt: release.published_at,
        body: release.body,
      }
    }

    const assets = Array.isArray(release.assets) ? release.assets : []
    const asarAsset = assets.find((asset) => asset?.name === 'app.asar')
      ?? assets.find((asset) => String(asset?.name ?? '').toLowerCase().endsWith('.asar'))
    const shaAsset = assets.find((asset) => asset?.name === SHA256_ASSET_NAME)

    if (!asarAsset?.browser_download_url) {
      return {
        available: true,
        currentVersion,
        latestVersion,
        releaseName: release.name,
        publishedAt: release.published_at,
        body: release.body,
        error: 'GitHub release 中没有 app.asar 资源。',
      }
    }

    return {
      available: true,
      currentVersion,
      latestVersion,
      releaseName: release.name,
      publishedAt: release.published_at,
      body: release.body,
      assetName: asarAsset.name,
      assetSize: asarAsset.size,
      asarDownloadUrl: asarAsset.browser_download_url,
      shaDownloadUrl: shaAsset?.browser_download_url,
    }
  } catch (error) {
    return {
      available: false,
      currentVersion,
      error: error instanceof Error ? error.message : String(error),
    }
  }
}

export async function checkForGithubUpdate(): Promise<GithubUpdateInfo> {
  return toPublicUpdateInfo(await getGithubUpdateCandidate())
}

export async function promptForGithubUpdate(storage: AppStorage, window: BrowserWindow | null): Promise<void> {
  const data = storage.getData()
  if (!data.appSettings.autoCheckForUpdates) {
    return
  }

  await storage.updateSettings({ appSettings: { lastUpdateCheckAt: new Date().toISOString() } })
  const update = await getGithubUpdateCandidate()
  if (!update.available || update.error) {
    return
  }

  const sizeLabel = update.assetSize ? `\n下载大小：${Math.round(update.assetSize / 1024 / 1024)} MB` : ''
  const body = update.body ? `\n\n${update.body.slice(0, 900)}` : ''
  const messageBoxOptions: MessageBoxOptions = {
    type: 'info',
    buttons: ['立即更新', '稍后'],
    defaultId: 0,
    cancelId: 1,
    title: '发现 Timetable 新版本',
    message: `发现新版本 v${update.latestVersion}`,
    detail: `当前版本：v${update.currentVersion}${sizeLabel}${body}`,
  }
  const result = window ? await dialog.showMessageBox(window, messageBoxOptions) : await dialog.showMessageBox(messageBoxOptions)

  if (result.response !== 0) {
    return
  }

  await installGithubUpdate(storage, update)
}

export async function installGithubUpdate(storage: AppStorage, candidate?: GithubUpdateCandidate): Promise<GithubUpdateInstallResult> {
  const update = candidate ?? await getGithubUpdateCandidate()
  if (!update.available) {
    return { started: false, error: '当前已经是最新版本。' }
  }
  if (update.error) {
    return { started: false, error: update.error }
  }
  if (!update.asarDownloadUrl || !update.latestVersion) {
    return { started: false, error: '新版资源不完整。' }
  }

  try {
    await storage.createBackup('pre-update', true)

    const updatesDir = join(app.getPath('userData'), 'updates')
    await mkdir(updatesDir, { recursive: true })

    const downloadedAsarPath = join(updatesDir, `app-${update.latestVersion}.asar`)
    const assetResponse = await fetchWithTimeout(update.asarDownloadUrl, 120_000)
    const assetBuffer = Buffer.from(await assetResponse.arrayBuffer())
    await verifySha256(update, assetBuffer)
    await writeFile(downloadedAsarPath, assetBuffer)

    return { started: await installDownloadedAsar(downloadedAsarPath, update.latestVersion) }
  } catch (error) {
    return {
      started: false,
      error: error instanceof Error ? error.message : String(error),
    }
  }
}

async function verifySha256(update: GithubUpdateCandidate, buffer: Buffer): Promise<void> {
  if (!update.shaDownloadUrl || !update.assetName) {
    throw new Error('新版缺少 SHA256SUMS.txt，已取消安装。')
  }

  const shaResponse = await fetchWithTimeout(update.shaDownloadUrl, 20_000)
  const text = await shaResponse.text()
  const expected = parseSha256(text, update.assetName)
  if (!expected) {
    throw new Error(`SHA256SUMS.txt 中没有 ${update.assetName}。`)
  }

  const actual = createHash('sha256').update(buffer).digest('hex').toLowerCase()
  if (actual !== expected.toLowerCase()) {
    throw new Error('新版资源校验失败，已取消安装。')
  }
}

function parseSha256(text: string, assetName: string): string | null {
  for (const line of text.split(/\r?\n/)) {
    const match = line.trim().match(/^([a-fA-F0-9]{64})\s+\*?(.+)$/)
    if (match && match[2].trim() === assetName) {
      return match[1]
    }
  }
  return null
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
      windowsHide: true,
    },
  )

  child.unref()
  console.info(`Installing Timetable update ${latestVersion} from GitHub release.`)
  app.quit()

  return true
}
