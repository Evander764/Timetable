import { describe, expect, it } from 'vitest'
import { createDefaultAppData } from '@shared/data/defaults'
import { buildEntryRitualHtml, buildExitRitualHtml, getEntryRitualDurationMs, getExitRitualDurationMs } from './ritualHtml'

describe('ritual HTML generation', () => {
  it('injects original Web Audio script when ritual music is enabled', () => {
    const data = createDefaultAppData('C:/tmp/app-data.json')
    const html = buildEntryRitualHtml(data.appSettings, '2026-05-09')

    expect(html).toContain('data-ritual-kind="entry"')
    expect(html).toContain('data-ritual-mode="door"')
    expect(html).toContain('AudioContext')
    expect(html).toContain('createOscillator')
    expect(html).toContain('DAY_LEDGER // 2026-05-09')
    expect(html).toContain('开启灿烂的一天')
  })

  it('does not create an AudioContext when ritual music is disabled', () => {
    const data = createDefaultAppData('C:/tmp/app-data.json')
    const html = buildEntryRitualHtml(
      {
        ...data.appSettings,
        ritualMusicEnabled: false,
      },
      '2026-05-09',
    )

    expect(html).not.toContain('AudioContext')
    expect(html).toContain('data-ritual-kind="entry"')
  })

  it('builds exit ritual copy and audio without blocking archive flow', () => {
    const data = createDefaultAppData('C:/tmp/app-data.json')
    const html = buildExitRitualHtml({
      ...data.appSettings,
      ritualExitLine1: '明天',
      ritualExitLine2: '从现在开始',
    })

    expect(html).toContain('data-ritual-kind="exit"')
    expect(html).toContain('data-ritual-mode="door"')
    expect(html).toContain('明天')
    expect(html).toContain('从现在开始')
    expect(html).toContain('Autoplay or audio device failures must never block the ritual window.')
  })

  it('builds curtain, meteor, and sunrise entry rituals with distinct audio modes', () => {
    const data = createDefaultAppData('C:/tmp/app-data.json')
    const curtain = buildEntryRitualHtml({ ...data.appSettings, ritualEntryMode: 'curtain' }, '2026-05-09')
    const meteor = buildEntryRitualHtml({ ...data.appSettings, ritualEntryMode: 'meteor' }, '2026-05-09')
    const sunrise = buildEntryRitualHtml({ ...data.appSettings, ritualEntryMode: 'sunrise' }, '2026-05-09')

    expect(curtain).toContain('data-ritual-mode="curtain"')
    expect(curtain).toContain('CURTAIN_RISE')
    expect(curtain).toContain('ritualMode = "curtain"')
    expect(meteor).toContain('data-ritual-mode="meteor"')
    expect(meteor).toContain('METEOR_DAWN')
    expect(meteor).toContain('ritualMode = "meteor"')
    expect(meteor).toContain('meteor-tail')
    expect(meteor).toContain('right:-40vw')
    expect(meteor).toContain('translate(-128vw,45vh)')
    expect(meteor).toContain('left:12vw')
    expect(curtain).toContain('curtain-shadow')
    expect(curtain).toContain('curtainLift')
    expect(sunrise).toContain('data-ritual-mode="sunrise"')
    expect(sunrise).toContain('SUNRISE_LEDGER')
    expect(sunrise).toContain('ritualMode = "sunrise"')
    expect(sunrise).toContain('class="sun"')
    expect(getEntryRitualDurationMs({ ...data.appSettings, ritualEntryMode: 'meteor' })).toBe(11600)
    expect(getEntryRitualDurationMs({ ...data.appSettings, ritualEntryMode: 'sunrise' })).toBe(10800)
  })

  it('builds curtain and moon exit rituals with distinct audio modes', () => {
    const data = createDefaultAppData('C:/tmp/app-data.json')
    const curtain = buildExitRitualHtml({ ...data.appSettings, ritualExitMode: 'curtain' })
    const moon = buildExitRitualHtml({ ...data.appSettings, ritualExitMode: 'moon' })

    expect(curtain).toContain('data-ritual-mode="curtain"')
    expect(curtain).toContain('curtainDown')
    expect(curtain).toContain('curtain-shadow')
    expect(curtain).toContain('ritualMode = "curtain"')
    expect(moon).toContain('data-ritual-mode="moon"')
    expect(moon).toContain('moon')
    expect(moon).toContain('moon-glow')
    expect(moon).not.toContain('moon::after')
    expect(moon).toContain('ritualMode = "moon"')
    expect(getExitRitualDurationMs({ ...data.appSettings, ritualExitMode: 'moon' })).toBe(10400)
  })
})
