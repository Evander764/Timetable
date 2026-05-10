import { describe, expect, it } from 'vitest'
import { createDefaultAppData } from '@shared/data/defaults'
import {
  buildEntryRitualHtml,
  buildExitRitualHtml,
  buildWorkRitualHtml,
  getEntryRitualDurationMs,
  getExitRitualDurationMs,
  getWorkRitualDurationMs,
} from './ritualHtml'

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

  it('builds entry rituals with distinct visual and audio modes', () => {
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
    expect(meteor).toContain('meteor-trail')
    expect(meteor).toContain('meteor-head')
    expect(meteor).toContain('shower-meteor')
    expect(meteor).toContain('meteor-warm-tail')
    expect(meteor).toContain('tear-flare')
    expect(meteor).not.toContain('plasma-tail')
    expect(meteor).not.toContain('tail-shard')
    expect(meteor).not.toContain('meteor-spark')
    expect(meteor).toContain('black-cloth')
    expect(meteor).toContain('dawn-rift')
    expect(meteor).toContain('tear-edge')
    expect(meteor).toContain('clothUpper')
    expect(meteor).toContain('clothLower')
    expect(meteor).toContain('dawnRift')
    expect(meteor).toContain('meteorFlight')
    expect(meteor).not.toContain('meteor-tail')
    expect(meteor).not.toContain('right:-40vw')
    expect(meteor).not.toContain('translate(-128vw,45vh)')
    expect(curtain).toContain('curtain-shadow')
    expect(curtain).toContain('curtainLift')
    expect(sunrise).toContain('data-ritual-mode="sunrise"')
    expect(sunrise).toContain('SUNRISE_LEDGER')
    expect(sunrise).toContain('ritualMode = "sunrise"')
    expect(sunrise).toContain('class="sun"')
    expect(getEntryRitualDurationMs({ ...data.appSettings, ritualEntryMode: 'meteor' })).toBe(11600)
    expect(getEntryRitualDurationMs({ ...data.appSettings, ritualEntryMode: 'sunrise' })).toBe(10800)
  })

  it('builds work rituals separately from startup entry rituals', () => {
    const data = createDefaultAppData('C:/tmp/app-data.json')
    const workbench = buildWorkRitualHtml({ ...data.appSettings, workRitualMode: 'workbench' }, '2026-05-09')
    const stamp = buildWorkRitualHtml({ ...data.appSettings, workRitualMode: 'stamp' }, '2026-05-09')
    const focus = buildWorkRitualHtml({ ...data.appSettings, workRitualMode: 'focus' }, '2026-05-09')

    expect(workbench).toContain('data-ritual-kind="work"')
    expect(workbench).toContain('data-ritual-mode="workbench"')
    expect(workbench).toContain('WORKBENCH_ONLINE')
    expect(workbench).toContain('进入工作状态')
    expect(workbench).toContain('ritualMode = "workbench"')
    expect(stamp).toContain('data-ritual-kind="work"')
    expect(stamp).toContain('data-ritual-mode="stamp"')
    expect(stamp).toContain('STAMP_PROTOCOL')
    expect(stamp).toContain('开始执行')
    expect(stamp).toContain('ritualMode = "stamp"')
    expect(focus).toContain('data-ritual-kind="work"')
    expect(focus).toContain('data-ritual-mode="focus"')
    expect(focus).toContain('FOCUS_LOCK')
    expect(focus).toContain('进入工作状态')
    expect(focus).toContain('ritualMode = "focus"')
    expect(getWorkRitualDurationMs({ ...data.appSettings, workRitualMode: 'workbench' })).toBe(10600)
    expect(getWorkRitualDurationMs({ ...data.appSettings, workRitualMode: 'stamp' })).toBe(9900)
    expect(getWorkRitualDurationMs({ ...data.appSettings, workRitualMode: 'focus' })).toBe(10400)
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
