import { describe, expect, it } from 'vitest'
import { createDefaultAppData } from '@shared/data/defaults'
import {
  createBrowserUsageDaySnapshot,
  getBrowserUsagePages,
  getUsageDisplayDomain,
  getUsageDisplayTitle,
  getUsageEntryType,
  normalizeBrowserPageSample,
  recordBrowserUsageSample,
} from '@shared/utils/browserUsage'

describe('browser usage utils', () => {
  it('normalizes http URLs and page metadata', () => {
    const sample = normalizeBrowserPageSample({
      url: 'HTTPS://User:Secret@WWW.Example.COM/docs?q=1#section',
      title: '  Example Docs  ',
      browser: 'Google Chrome',
      observedAt: '2026-04-25T09:00:00.000Z',
    })

    expect(sample).toEqual({
      url: 'https://www.example.com/docs?q=1',
      title: 'Example Docs',
      domain: 'example.com',
      browser: 'Google Chrome',
      usageType: 'web',
      observedAt: '2026-04-25T09:00:00.000Z',
    })
  })

  it('rejects non-page browser values', () => {
    expect(normalizeBrowserPageSample({
      url: 'Search Google or type a URL',
      title: 'New tab',
      browser: 'Google Chrome',
      observedAt: '2026-04-25T09:00:00.000Z',
    })).toBeNull()

    expect(normalizeBrowserPageSample({
      url: 'plain-search-query',
      title: 'Search',
      browser: 'Google Chrome',
      observedAt: '2026-04-25T09:00:00.000Z',
    })).toBeNull()
  })

  it('accepts localhost pages', () => {
    expect(normalizeBrowserPageSample({
      url: 'localhost:5173/browser-usage',
      title: 'Local App',
      browser: 'Google Chrome',
      observedAt: '2026-04-25T09:00:00.000Z',
    })).toMatchObject({
      url: 'https://localhost:5173/browser-usage',
      domain: 'localhost',
    })
  })

  it('normalizes AI app usage entries', () => {
    expect(normalizeBrowserPageSample({
      url: 'app://ai/codex',
      title: 'Codex - Timeable',
      browser: 'Codex',
      usageType: 'ai',
      processName: 'codex',
      observedAt: '2026-04-25T09:00:00.000Z',
    })).toEqual({
      url: 'app://ai/codex',
      title: 'Codex - Timeable',
      domain: 'Codex',
      browser: 'Codex',
      usageType: 'ai',
      processName: 'codex',
      observedAt: '2026-04-25T09:00:00.000Z',
    })
  })

  it('treats AI website history as private AI usage on display', () => {
    const page = {
      url: 'https://chatgpt.com/c/private-conversation-id',
      title: 'Sensitive conversation title',
      domain: 'chatgpt.com',
      browser: 'Google Chrome',
      totalSeconds: 60,
      firstSeenAt: '2026-04-25T09:00:00.000Z',
      lastSeenAt: '2026-04-25T09:01:00.000Z',
    }

    expect(getUsageEntryType(page)).toBe('ai')
    expect(getUsageDisplayTitle(page)).toBe('ChatGPT')
    expect(getUsageDisplayDomain(page)).toBe('ChatGPT')
  })

  it('merges AI website variants into one service row', () => {
    const data = createDefaultAppData('test-data.json')
    data.browserUsage['2026-04-25'] = {
      date: '2026-04-25',
      totalSeconds: 105,
      pages: {
        'https://chatgpt.com/c/private-a': {
          url: 'https://chatgpt.com/c/private-a',
          title: 'Private ChatGPT title A',
          domain: 'chatgpt.com',
          browser: 'Google Chrome',
          totalSeconds: 30,
          firstSeenAt: '2026-04-25T09:00:00.000Z',
          lastSeenAt: '2026-04-25T09:00:30.000Z',
        },
        'https://chat.openai.com/c/private-b': {
          url: 'https://chat.openai.com/c/private-b',
          title: 'Private ChatGPT title B',
          domain: 'chat.openai.com',
          browser: 'Microsoft Edge',
          totalSeconds: 40,
          firstSeenAt: '2026-04-25T09:01:00.000Z',
          lastSeenAt: '2026-04-25T09:01:40.000Z',
        },
        'app://ai/chatgpt': {
          url: 'app://ai/chatgpt',
          title: 'ChatGPT',
          domain: 'ChatGPT',
          browser: 'ChatGPT',
          usageType: 'ai',
          totalSeconds: 20,
          firstSeenAt: '2026-04-25T09:02:00.000Z',
          lastSeenAt: '2026-04-25T09:02:20.000Z',
        },
        'app://ai/chat-gpt': {
          url: 'app://ai/chat-gpt',
          title: 'Chat GPT',
          domain: 'Chat GPT',
          browser: 'Chat GPT',
          usageType: 'ai',
          totalSeconds: 15,
          firstSeenAt: '2026-04-25T09:02:20.000Z',
          lastSeenAt: '2026-04-25T09:02:35.000Z',
        },
      },
    }

    const pages = getBrowserUsagePages(data, '2026-04-25')

    expect(pages).toHaveLength(1)
    expect(pages[0]).toMatchObject({
      url: 'app://ai/chatgpt',
      title: 'ChatGPT',
      domain: 'ChatGPT',
      browser: 'ChatGPT',
      usageType: 'ai',
      totalSeconds: 105,
      firstSeenAt: '2026-04-25T09:00:00.000Z',
      lastSeenAt: '2026-04-25T09:02:35.000Z',
    })
    expect(getUsageDisplayTitle(pages[0])).toBe('ChatGPT')
    expect(getUsageDisplayDomain(pages[0])).toBe('ChatGPT')
  })

  it('creates privacy-safe daily usage snapshots', () => {
    const data = createDefaultAppData('test-data.json')
    data.browserUsage['2026-04-25'] = {
      date: '2026-04-25',
      totalSeconds: 120,
      pages: {
        'https://example.com/docs': {
          url: 'https://example.com/docs',
          title: 'Docs',
          domain: 'example.com',
          browser: 'Microsoft Edge',
          totalSeconds: 80,
          firstSeenAt: '2026-04-25T09:00:00.000Z',
          lastSeenAt: '2026-04-25T09:01:20.000Z',
        },
        'https://chatgpt.com/c/private-a': {
          url: 'https://chatgpt.com/c/private-a',
          title: 'Private ChatGPT title A',
          domain: 'chatgpt.com',
          browser: 'Google Chrome',
          totalSeconds: 40,
          firstSeenAt: '2026-04-25T09:02:00.000Z',
          lastSeenAt: '2026-04-25T09:02:40.000Z',
        },
      },
    }

    const snapshot = createBrowserUsageDaySnapshot(data, '2026-04-25', '2026-04-25T10:00:00.000Z')

    expect(snapshot).toMatchObject({
      schemaVersion: 1,
      date: '2026-04-25',
      savedAt: '2026-04-25T10:00:00.000Z',
      totalSeconds: 120,
      webSeconds: 80,
      aiSeconds: 40,
      webPageCount: 1,
      aiServiceCount: 1,
    })
    expect(snapshot.entries).toHaveLength(2)
    expect(snapshot.entries[0]).toMatchObject({
      type: 'web',
      title: 'Docs',
      url: 'https://example.com/docs',
      browser: 'Microsoft Edge',
      percent: 67,
    })
    expect(snapshot.entries[1]).toMatchObject({
      type: 'ai',
      title: 'ChatGPT',
      source: 'ChatGPT',
      percent: 33,
    })
    expect(snapshot.entries[1]).not.toHaveProperty('url')
    expect(snapshot.entries[1]).not.toHaveProperty('browser')
  })

  it('accumulates usage by day and URL', () => {
    const data = createDefaultAppData('test-data.json')
    const first = normalizeBrowserPageSample({
      url: 'example.com/docs',
      title: 'Docs',
      browser: 'Microsoft Edge',
      observedAt: '2026-04-25T09:00:00.000Z',
    })
    const second = normalizeBrowserPageSample({
      url: 'https://example.com/docs',
      title: 'Docs updated',
      browser: 'Microsoft Edge',
      observedAt: '2026-04-25T09:01:00.000Z',
    })

    expect(first).not.toBeNull()
    expect(second).not.toBeNull()

    let next = recordBrowserUsageSample(data, first!, 30)
    next = recordBrowserUsageSample(next, second!, 45)

    const pages = getBrowserUsagePages(next, '2026-04-25')
    expect(next.browserUsage['2026-04-25'].totalSeconds).toBe(75)
    expect(pages).toHaveLength(1)
    expect(pages[0]).toMatchObject({
      url: 'https://example.com/docs',
      title: 'Docs updated',
      totalSeconds: 75,
    })
  })
})
