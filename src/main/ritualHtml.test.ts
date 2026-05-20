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
    expect(meteor).toContain('meteor-canvas')
    expect(meteor).toContain('scrim-canvas')
    expect(meteor).toContain('dawn-bright')
    expect(meteor).toContain("getContext('2d')")
    expect(meteor).toContain('requestAnimationFrame')
    expect(meteor).toContain('tearScrim')
    expect(meteor).toContain("palette:'hot'")
    expect(meteor).toContain('sparks')
    expect(meteor).toContain("globalCompositeOperation='destination-out'")
    expect(meteor).toContain('const addRiser')
    expect(meteor).toContain('const addWhoosh')
    expect(meteor).toContain('const addHit')
    expect(meteor).toContain('const addWarmChord')
    expect(meteor).toContain('addRiser(ctx, master, 2.0, 4.75')
    expect(meteor).toContain('addHit(ctx, master, 4.62')
    expect(meteor).toContain('addWarmChord(ctx, master, 6.05')
    expect(meteor).not.toContain('<audio')
    expect(meteor).not.toContain('.mp3')
    expect(meteor).not.toContain('.wav')
    expect(meteor).not.toContain('.ogg')
    expect(meteor).toContain('prefers-reduced-motion')
    expect(meteor).toContain('4%,12%{opacity:1')
    expect(meteor).toContain('18%,100%{opacity:0')
    expect(meteor).toContain("x0:-.05,y0:.04,x1:1.05,y1:1.17,life:1200,size:2.4,sparks:1.3,palette:'cool',tearMax:0")
    expect(meteor).toContain("x0:-.05,y0:.22,x1:1.05,y1:1.35,life:1300,size:3.2,sparks:2.2,palette:'warm',tearMax:0")
    expect(meteor).toContain('x0:1.05,y0:.55,x1:-.05,y1:1.68')
    expect(meteor).toContain('x0:1.05,y0:.70,x1:-.05,y1:1.83')
    expect(meteor).not.toContain('class="rift')
    expect(meteor).not.toContain('rift-glow')
    expect(meteor).not.toContain('rift-body')
    expect(meteor).not.toContain('rift-core')
    expect(meteor).not.toContain('riftExpand')
    expect(meteor).not.toContain('class="meteor m1"')
    expect(meteor).not.toContain('veilFade')
    expect(meteor).not.toContain('black-cloth')
    expect(meteor).not.toContain('meteor-flight')
    expect(meteor).not.toContain('tear-flare')
    expect(meteor).not.toContain('tear-edge')
    expect(meteor).not.toContain('shower-meteor')
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
