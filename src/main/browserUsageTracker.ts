import { execFile } from 'node:child_process'
import { promisify } from 'node:util'
import type { AppDataPatch } from '@shared/ipc'
import type { AppData } from '@shared/types/app'
import { normalizeBrowserPageSample, type NormalizedBrowserPageSample } from '@shared/utils/browserUsage'

type BrowserUsageTrackerServices = {
  getData: () => AppData
  recordUsage: (sample: NormalizedBrowserPageSample, durationSeconds: number) => Promise<AppDataPatch>
  onDataPatched: (patch: AppDataPatch) => void
}

type ActiveBrowserWindow = {
  isBrowser?: boolean
  processName?: string
  browser?: string
  title?: string
  url?: string
}

const execFileAsync = promisify(execFile)
const POWERSHELL_TIMEOUT_MS = 3500
const MAX_RECORDED_SAMPLE_SECONDS = 120
const DEFAULT_SAMPLE_INTERVAL_SECONDS = 10
const MIN_SAMPLE_INTERVAL_SECONDS = 5
const MAX_SAMPLE_INTERVAL_SECONDS = 60

const BROWSER_LABELS: Record<string, string> = {
  chrome: 'Google Chrome',
  msedge: 'Microsoft Edge',
  firefox: 'Mozilla Firefox',
  brave: 'Brave',
  opera: 'Opera',
  opera_gx: 'Opera GX',
  vivaldi: 'Vivaldi',
  adspower: 'AdsPower',
  'adspower global': 'AdsPower',
  adspower_global: 'AdsPower',
}

type AiAppDefinition = {
  id: string
  label: string
  processNames?: string[]
  titlePatterns?: RegExp[]
}

type AiWebService = {
  id: string
  label: string
  domains: string[]
}

const AI_WEB_SERVICES: AiWebService[] = [
  { id: 'chatgpt', label: 'ChatGPT', domains: ['chatgpt.com', 'chat.openai.com'] },
  { id: 'kimi', label: 'Kimi', domains: ['kimi.moonshot.cn', 'kimi.com', 'moonshot.cn'] },
  { id: 'deepseek', label: 'DeepSeek', domains: ['chat.deepseek.com', 'deepseek.com'] },
  { id: 'gemini', label: 'Gemini', domains: ['gemini.google.com', 'bard.google.com'] },
  { id: 'claude', label: 'Claude', domains: ['claude.ai'] },
]

const TERMINAL_PROCESS_NAMES = new Set([
  'windowsterminal',
  'windows terminal',
  'wt',
  'powershell',
  'pwsh',
  'cmd',
  'conhost',
  'wezterm-gui',
  'wezterm',
  'alacritty',
  'tabby',
])

const AI_APP_DEFINITIONS: AiAppDefinition[] = [
  { id: 'codex', label: 'Codex', processNames: ['codex'], titlePatterns: [/\bcodex\b/i] },
  { id: 'claude-code', label: 'Claude Code', titlePatterns: [/\bclaude\s+code\b/i] },
  { id: 'claude', label: 'Claude', processNames: ['claude desktop', 'claude'], titlePatterns: [/\bclaude\b/i] },
  { id: 'chatgpt', label: 'ChatGPT', processNames: ['chatgpt'], titlePatterns: [/\bchatgpt\b/i] },
  { id: 'kimi', label: 'Kimi', processNames: ['kimi'], titlePatterns: [/\bkimi\b/i, /\bmoonshot\b/i] },
  { id: 'deepseek', label: 'DeepSeek', processNames: ['deepseek'], titlePatterns: [/\bdeepseek\b/i] },
  { id: 'gemini', label: 'Gemini', processNames: ['gemini'], titlePatterns: [/\bgemini\b/i] },
  { id: 'cursor', label: 'Cursor', processNames: ['cursor'], titlePatterns: [/\bcursor\b/i] },
  { id: 'windsurf', label: 'Windsurf', processNames: ['windsurf'], titlePatterns: [/\bwindsurf\b/i] },
  { id: 'github-copilot', label: 'GitHub Copilot', titlePatterns: [/\bcopilot\b/i] },
  { id: 'cline', label: 'Cline', titlePatterns: [/\bcline\b/i] },
  { id: 'roo-code', label: 'Roo Code', titlePatterns: [/\broo\s+code\b/i] },
  { id: 'gemini-cli', label: 'Gemini CLI', titlePatterns: [/\bgemini\s+cli\b/i] },
  { id: 'qwen-code', label: 'Qwen Code', titlePatterns: [/\bqwen\s+code\b/i] },
  { id: 'aider', label: 'Aider', processNames: ['aider'], titlePatterns: [/\baider\b/i] },
]

const ACTIVE_BROWSER_SCRIPT = String.raw`
$ErrorActionPreference = 'Stop'
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8

Add-Type -TypeDefinition @"
using System;
using System.Runtime.InteropServices;
using System.Text;

public static class TimeableWin32 {
  [DllImport("user32.dll")]
  public static extern IntPtr GetForegroundWindow();

  [DllImport("user32.dll")]
  public static extern uint GetWindowThreadProcessId(IntPtr hWnd, out uint processId);

  [DllImport("user32.dll", CharSet = CharSet.Unicode, SetLastError = true)]
  public static extern int GetWindowText(IntPtr hWnd, StringBuilder text, int count);
}
"@

function Write-TimeableJson($payload) {
  $payload | ConvertTo-Json -Compress -Depth 5
}

function Get-WindowTitle($handle) {
  $builder = New-Object System.Text.StringBuilder 1024
  [void][TimeableWin32]::GetWindowText($handle, $builder, $builder.Capacity)
  return $builder.ToString()
}

function Get-ElementValue($element) {
  try {
    $pattern = $null
    if ($element.TryGetCurrentPattern([System.Windows.Automation.ValuePattern]::Pattern, [ref]$pattern)) {
      return $pattern.Current.Value
    }
  } catch {
    return $null
  }

  return $null
}

function Looks-LikeUrl($value) {
  if ([string]::IsNullOrWhiteSpace($value)) {
    return $false
  }

  $trimmed = $value.Trim()
  return $trimmed -match '^(https?://)?(localhost|[0-9]{1,3}(\.[0-9]{1,3}){3}|[a-zA-Z0-9-]+(\.[a-zA-Z0-9-]+)+)(:\d+)?([/?#]|$)'
}

try {
  $handle = [TimeableWin32]::GetForegroundWindow()
  if ($handle -eq [IntPtr]::Zero) {
    Write-TimeableJson @{ isBrowser = $false }
    exit 0
  }

  [uint32]$processId = 0
  [void][TimeableWin32]::GetWindowThreadProcessId($handle, [ref]$processId)
  $process = Get-Process -Id $processId -ErrorAction SilentlyContinue
  if ($null -eq $process) {
    Write-TimeableJson @{ isBrowser = $false }
    exit 0
  }

  $processName = $process.ProcessName.ToLowerInvariant()
  $browserMap = @{
    chrome = 'Google Chrome'
    msedge = 'Microsoft Edge'
    firefox = 'Mozilla Firefox'
    brave = 'Brave'
    opera = 'Opera'
    opera_gx = 'Opera GX'
    vivaldi = 'Vivaldi'
    adspower = 'AdsPower'
    'adspower global' = 'AdsPower'
    adspower_global = 'AdsPower'
  }

  if (-not $browserMap.ContainsKey($processName)) {
    Write-TimeableJson @{
      isBrowser = $false
      processName = $processName
      title = Get-WindowTitle $handle
    }
    exit 0
  }

  Add-Type -AssemblyName UIAutomationClient
  Add-Type -AssemblyName UIAutomationTypes

  $root = [System.Windows.Automation.AutomationElement]::FromHandle($handle)
  $editCondition = New-Object System.Windows.Automation.PropertyCondition(
    [System.Windows.Automation.AutomationElement]::ControlTypeProperty,
    [System.Windows.Automation.ControlType]::Edit
  )
  $edits = $root.FindAll([System.Windows.Automation.TreeScope]::Descendants, $editCondition)
  $url = $null

  for ($index = 0; $index -lt $edits.Count; $index++) {
    $candidate = Get-ElementValue $edits.Item($index)
    if (Looks-LikeUrl $candidate) {
      $url = $candidate.Trim()
      break
    }
  }

  Write-TimeableJson @{
    isBrowser = $true
    processName = $processName
    browser = $browserMap[$processName]
    title = Get-WindowTitle $handle
    url = $url
  }
} catch {
  Write-TimeableJson @{
    isBrowser = $false
    error = $_.Exception.Message
  }
}
`

export class BrowserUsageTracker {
  private timer?: NodeJS.Timeout
  private running = false
  private previousSample: NormalizedBrowserPageSample | null = null
  private previousSampleAt = 0

  constructor(private readonly services: BrowserUsageTrackerServices) {}

  start(): void {
    if (this.running) {
      return
    }

    this.running = true
    this.previousSampleAt = Date.now()
    void this.tick()
  }

  stop(): void {
    this.running = false
    clearTimeout(this.timer)
    this.timer = undefined
    this.previousSample = null
    this.previousSampleAt = 0
  }

  private async tick(): Promise<void> {
    const now = Date.now()
    const data = this.services.getData()
    const intervalSeconds = getSampleIntervalSeconds(data)

    try {
      if (!data.appSettings.browserTrackingEnabled) {
        this.previousSample = null
        this.previousSampleAt = now
        return
      }

      const currentSample = await readActiveBrowserSample()
      if (this.previousSample) {
        const elapsedSeconds = Math.min(
          (now - this.previousSampleAt) / 1000,
          Math.max(intervalSeconds * 2.5, intervalSeconds + 3),
          MAX_RECORDED_SAMPLE_SECONDS,
        )
        if (elapsedSeconds >= 1) {
          const patch = await this.services.recordUsage(this.previousSample, elapsedSeconds)
          this.services.onDataPatched(patch)
        }
      }

      this.previousSample = currentSample
      this.previousSampleAt = now
    } finally {
      this.scheduleNext(intervalSeconds)
    }
  }

  private scheduleNext(intervalSeconds: number): void {
    if (!this.running) {
      return
    }

    clearTimeout(this.timer)
    this.timer = setTimeout(() => {
      void this.tick()
    }, intervalSeconds * 1000)
  }
}

async function readActiveBrowserSample(): Promise<NormalizedBrowserPageSample | null> {
  if (process.platform !== 'win32') {
    return null
  }

  try {
    const { stdout } = await execFileAsync('powershell.exe', [
      '-NoProfile',
      '-NonInteractive',
      '-ExecutionPolicy',
      'Bypass',
      '-Command',
      ACTIVE_BROWSER_SCRIPT,
    ], {
      encoding: 'utf8',
      timeout: POWERSHELL_TIMEOUT_MS,
      windowsHide: true,
      maxBuffer: 1024 * 128,
    })
    const activeWindow = parseActiveBrowserWindow(stdout)
    if (!activeWindow) {
      return null
    }

    const processName = activeWindow.processName?.toLowerCase() ?? ''
    if (activeWindow.isBrowser && activeWindow.url) {
      const browser = activeWindow.browser ?? BROWSER_LABELS[processName] ?? processName
      const aiWebService = detectAiWebService(activeWindow.url)
      if (aiWebService) {
        return normalizeBrowserPageSample({
          url: `app://ai/${aiWebService.id}`,
          title: aiWebService.label,
          browser: aiWebService.label,
          usageType: 'ai',
          processName,
          observedAt: new Date().toISOString(),
        })
      }

      return normalizeBrowserPageSample({
        url: activeWindow.url,
        title: cleanBrowserTitle(activeWindow.title ?? '', browser),
        browser,
        usageType: 'web',
        processName,
        observedAt: new Date().toISOString(),
      })
    }

    if (isAdsPowerProcess(processName)) {
      return normalizeBrowserPageSample({
        url: 'app://ai/claude',
        title: 'Claude',
        browser: 'Claude',
        usageType: 'ai',
        processName,
        observedAt: new Date().toISOString(),
      })
    }

    const aiApp = detectAiApp(activeWindow)
    if (!aiApp) {
      return null
    }

    return normalizeBrowserPageSample({
      url: `app://ai/${aiApp.id}`,
      title: aiApp.label,
      browser: aiApp.label,
      usageType: 'ai',
      processName,
      observedAt: new Date().toISOString(),
    })
  } catch {
    return null
  }
}

function parseActiveBrowserWindow(output: string): ActiveBrowserWindow | null {
  const start = output.indexOf('{')
  const end = output.lastIndexOf('}')
  if (start === -1 || end === -1 || end <= start) {
    return null
  }

  try {
    return JSON.parse(output.slice(start, end + 1)) as ActiveBrowserWindow
  } catch {
    return null
  }
}

function cleanBrowserTitle(title: string, browser: string): string {
  return title
    .replace(new RegExp(`\\s[-–—]\\s${escapeRegExp(browser)}$`, 'i'), '')
    .replace(/\s[-–—]\s(Google Chrome|Microsoft Edge|Mozilla Firefox|Brave|Opera GX|Opera|Vivaldi)$/i, '')
    .trim()
}

function detectAiApp(activeWindow: ActiveBrowserWindow): AiAppDefinition | null {
  const processName = activeWindow.processName?.toLowerCase().trim() ?? ''
  const title = activeWindow.title?.trim() ?? ''
  const haystack = `${processName} ${title}`
  const terminalWindow = TERMINAL_PROCESS_NAMES.has(processName)
  if (terminalWindow && /\bclaude\b/i.test(title)) {
    return AI_APP_DEFINITIONS.find((candidate) => candidate.id === 'claude-code') ?? null
  }

  for (const app of AI_APP_DEFINITIONS) {
    if (app.processNames?.some((name) => name === processName)) {
      return app
    }

    if (app.titlePatterns?.some((pattern) => pattern.test(haystack))) {
      return app
    }
  }

  return null
}

function detectAiWebService(rawUrl: string): AiWebService | null {
  const normalizedUrl = /^[a-z][a-z\d+.-]*:\/\//i.test(rawUrl.trim()) ? rawUrl.trim() : `https://${rawUrl.trim()}`
  try {
    const host = new URL(normalizedUrl).hostname.toLowerCase().replace(/^www\./, '')
    return AI_WEB_SERVICES.find((service) => service.domains.some((domain) => host === domain || host.endsWith(`.${domain}`))) ?? null
  } catch {
    return null
  }
}

function isAdsPowerProcess(processName: string): boolean {
  return processName === 'adspower' || processName === 'adspower global' || processName === 'adspower_global'
}

function getSampleIntervalSeconds(data: AppData): number {
  const configured = data.appSettings.browserTrackingIntervalSeconds
  if (!Number.isFinite(configured)) {
    return DEFAULT_SAMPLE_INTERVAL_SECONDS
  }

  return Math.min(MAX_SAMPLE_INTERVAL_SECONDS, Math.max(MIN_SAMPLE_INTERVAL_SECONDS, Math.round(configured)))
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}
