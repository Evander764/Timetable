import type { AppSettings, RitualEntryMode, RitualExitMode, RitualWorkMode } from '@shared/types/app'

const ENTRY_RITUAL_DURATIONS_MS: Record<RitualEntryMode, number> = {
  door: 10_800,
  curtain: 9_800,
  meteor: 11_600,
  sunrise: 10_800,
}

const WORK_RITUAL_DURATIONS_MS: Record<RitualWorkMode, number> = {
  workbench: 10_600,
  stamp: 9_900,
  focus: 10_400,
}

const EXIT_RITUAL_DURATIONS_MS: Record<RitualExitMode, number> = {
  door: 9_800,
  curtain: 9_200,
  moon: 10_400,
}

const ENTRY_FINAL_TEXT = '开启灿烂的一天'
const WORK_STATE_TEXT = '进入工作状态'
const STAMP_FINAL_TEXT = '开始执行'

export const ENTRY_RITUAL_DURATION_MS = ENTRY_RITUAL_DURATIONS_MS.door
export const EXIT_RITUAL_DURATION_MS = EXIT_RITUAL_DURATIONS_MS.door

function escapeHtml(value: unknown): string {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;')
}

function normalizeMusicVolume(value: number): number {
  if (!Number.isFinite(value)) {
    return 0.12
  }
  return Math.min(0.3, Math.max(0, value))
}

function normalizeEntryMode(value: unknown): RitualEntryMode {
  return value === 'curtain' || value === 'meteor' || value === 'sunrise' || value === 'door' ? value : 'door'
}

function normalizeExitMode(value: unknown): RitualExitMode {
  return value === 'curtain' || value === 'moon' || value === 'door' ? value : 'door'
}

function normalizeWorkMode(value: unknown): RitualWorkMode {
  return value === 'stamp' || value === 'focus' || value === 'workbench' ? value : 'workbench'
}

export function getEntryRitualDurationMs(appSettings: AppSettings): number {
  return ENTRY_RITUAL_DURATIONS_MS[normalizeEntryMode(appSettings.ritualEntryMode)]
}

export function getExitRitualDurationMs(appSettings: AppSettings): number {
  return EXIT_RITUAL_DURATIONS_MS[normalizeExitMode(appSettings.ritualExitMode)]
}

export function getWorkRitualDurationMs(appSettings: AppSettings): number {
  return WORK_RITUAL_DURATIONS_MS[normalizeWorkMode(appSettings.workRitualMode)]
}

function buildRitualAudioScript(
  kind: 'entry' | 'exit' | 'work',
  appSettings: AppSettings,
  durationSeconds: number,
  mode: RitualEntryMode | RitualExitMode | RitualWorkMode,
): string {
  const volume = normalizeMusicVolume(appSettings.ritualMusicVolume)
  if (appSettings.ritualMusicEnabled === false || volume <= 0) {
    return ''
  }

  return `<script>
(() => {
  const ritualKind = ${JSON.stringify(kind)};
  const ritualMode = ${JSON.stringify(mode)};
  const targetVolume = ${volume.toFixed(3)};
  const durationSeconds = ${durationSeconds.toFixed(2)};
  const AudioCtor = window.AudioContext || window.webkitAudioContext;
  if (!AudioCtor) return;

  const ramp = (param, value, at) => {
    try {
      param.linearRampToValueAtTime(value, at);
    } catch (_) {
      param.setValueAtTime(value, at);
    }
  };

  const addTone = (ctx, destination, frequency, type, gainValue, startAt, endAt, sweepTo) => {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(frequency, ctx.currentTime + startAt);
    if (typeof sweepTo === 'number') ramp(osc.frequency, sweepTo, ctx.currentTime + endAt);
    gain.gain.setValueAtTime(0.0001, ctx.currentTime + startAt);
    ramp(gain.gain, gainValue, ctx.currentTime + startAt + 0.55);
    ramp(gain.gain, 0.0001, ctx.currentTime + endAt);
    osc.connect(gain);
    gain.connect(destination);
    osc.start(ctx.currentTime + startAt);
    osc.stop(ctx.currentTime + endAt + 0.08);
  };

  const addNoise = (ctx, destination, startAt, endAt, gainValue, filterType, frequency) => {
    const seconds = Math.max(0.2, endAt - startAt);
    const buffer = ctx.createBuffer(1, Math.floor(ctx.sampleRate * seconds), ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < data.length; i += 1) data[i] = (Math.random() * 2 - 1) * 0.18;
    const source = ctx.createBufferSource();
    const filter = ctx.createBiquadFilter();
    const gain = ctx.createGain();
    filter.type = filterType;
    filter.frequency.setValueAtTime(frequency, ctx.currentTime + startAt);
    ramp(filter.frequency, Math.max(180, frequency * 0.62), ctx.currentTime + endAt);
    gain.gain.setValueAtTime(0.0001, ctx.currentTime + startAt);
    ramp(gain.gain, gainValue, ctx.currentTime + startAt + 0.7);
    ramp(gain.gain, 0.0001, ctx.currentTime + endAt);
    source.buffer = buffer;
    source.connect(filter);
    filter.connect(gain);
    gain.connect(destination);
    source.start(ctx.currentTime + startAt);
    source.stop(ctx.currentTime + endAt + 0.05);
  };

  const addBell = (ctx, destination, at, frequency, gainValue = 0.1) => {
    addTone(ctx, destination, frequency, 'sine', gainValue, at, at + 2.45, frequency * 0.985);
    addTone(ctx, destination, frequency * 2.004, 'triangle', gainValue * 0.28, at + 0.02, at + 1.8, frequency * 1.97);
  };

  const addImpact = (ctx, destination, at, frequency, gainValue) => {
    addTone(ctx, destination, frequency, 'sine', gainValue, at, at + 1.6, frequency * 0.42);
    addTone(ctx, destination, frequency * 1.5, 'triangle', gainValue * 0.22, at + 0.03, at + 1.2, frequency * 0.62);
  };

  const addClick = (ctx, destination, at, frequency, gainValue) => {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'square';
    osc.frequency.setValueAtTime(frequency, ctx.currentTime + at);
    gain.gain.setValueAtTime(0.0001, ctx.currentTime + at);
    ramp(gain.gain, gainValue, ctx.currentTime + at + 0.012);
    ramp(gain.gain, 0.0001, ctx.currentTime + at + 0.16);
    osc.connect(gain);
    gain.connect(destination);
    osc.start(ctx.currentTime + at);
    osc.stop(ctx.currentTime + at + 0.18);
  };

  const playEntry = (ctx, master) => {
    ramp(master.gain, targetVolume, ctx.currentTime + 1.1);
    ramp(master.gain, targetVolume * 0.82, ctx.currentTime + durationSeconds - 1.35);
    ramp(master.gain, 0.0001, ctx.currentTime + durationSeconds - 0.16);

    if (ritualMode === 'meteor') {
      addTone(ctx, master, 36, 'sine', 0.38, 0, durationSeconds - 0.3, 52);
      addTone(ctx, master, 72, 'triangle', 0.13, 0.6, durationSeconds - 1.0, 108);
      addTone(ctx, master, 520, 'sine', 0.035, 2.55, 4.08, 2900);
      addTone(ctx, master, 1180, 'triangle', 0.024, 2.62, 3.9, 4200);
      addNoise(ctx, master, 2.38, 4.58, 0.13, 'highpass', 4200);
      addClick(ctx, master, 3.18, 1800, 0.035);
      addImpact(ctx, master, 4.42, 48, 0.34);
      addBell(ctx, master, 5.35, 392, 0.06);
      addTone(ctx, master, 196, 'sine', 0.072, 5.4, durationSeconds - 0.9, 330);
      addTone(ctx, master, 294, 'triangle', 0.04, 6.0, durationSeconds - 1.0, 441);
      return;
    }

    if (ritualMode === 'sunrise') {
      addTone(ctx, master, 42, 'sine', 0.36, 0, durationSeconds - 0.25, 58);
      addTone(ctx, master, 84, 'triangle', 0.15, 0.6, durationSeconds - 0.8, 126);
      addTone(ctx, master, 126, 'sine', 0.08, 2.2, durationSeconds - 0.8, 188);
      addTone(ctx, master, 252, 'sine', 0.045, 4.2, durationSeconds - 1.0, 336);
      addNoise(ctx, master, 1.6, durationSeconds - 0.6, 0.05, 'lowpass', 1800);
      addBell(ctx, master, 5.9, 523.25, 0.055);
      return;
    }

    if (ritualMode === 'curtain') {
      addTone(ctx, master, 52, 'sine', 0.38, 0, durationSeconds - 0.2, 68);
      addTone(ctx, master, 104, 'triangle', 0.15, 0.3, durationSeconds - 0.8, 132);
      addNoise(ctx, master, 0.1, durationSeconds - 0.45, 0.07, 'lowpass', 920);
      addBell(ctx, master, 4.7, 392, 0.07);
      addTone(ctx, master, 196, 'sine', 0.055, 3.0, durationSeconds - 0.9, 248);
      return;
    }

    if (ritualMode === 'workbench') {
      addTone(ctx, master, 44, 'sine', 0.34, 0, durationSeconds - 0.28, 58);
      addTone(ctx, master, 88, 'triangle', 0.13, 0.4, durationSeconds - 0.8, 132);
      addNoise(ctx, master, 0.8, durationSeconds - 0.7, 0.045, 'lowpass', 1300);
      addClick(ctx, master, 2.08, 860, 0.04);
      addClick(ctx, master, 2.78, 1120, 0.035);
      addClick(ctx, master, 3.46, 1460, 0.034);
      addClick(ctx, master, 4.28, 1860, 0.032);
      addBell(ctx, master, 5.75, 493.88, 0.055);
      addTone(ctx, master, 247, 'sine', 0.05, 5.8, durationSeconds - 1.0, 392);
      return;
    }

    if (ritualMode === 'stamp') {
      addTone(ctx, master, 50, 'sine', 0.28, 0, durationSeconds - 0.2, 42);
      addNoise(ctx, master, 0.2, durationSeconds - 0.8, 0.064, 'lowpass', 720);
      addClick(ctx, master, 3.55, 420, 0.03);
      addImpact(ctx, master, 5.05, 62, 0.36);
      addBell(ctx, master, 5.65, 329.63, 0.05);
      addTone(ctx, master, 165, 'triangle', 0.052, 5.8, durationSeconds - 1.0, 247);
      return;
    }

    if (ritualMode === 'focus') {
      addTone(ctx, master, 42, 'sine', 0.32, 0, durationSeconds - 0.25, 60);
      addTone(ctx, master, 84, 'triangle', 0.13, 0.5, durationSeconds - 0.9, 126);
      addTone(ctx, master, 168, 'sine', 0.055, 2.4, durationSeconds - 0.9, 252);
      addNoise(ctx, master, 1.1, durationSeconds - 0.7, 0.05, 'highpass', 1900);
      addBell(ctx, master, 4.95, 440, 0.05);
      addBell(ctx, master, 6.45, 659.25, 0.04);
      return;
    }

    addTone(ctx, master, 48, 'sine', 0.46, 0, durationSeconds - 0.2, 54);
    addTone(ctx, master, 72, 'triangle', 0.18, 0.45, durationSeconds - 0.6, 81);
    addTone(ctx, master, 126, 'sine', 0.1, 2.2, durationSeconds - 1.0, 162);
    addTone(ctx, master, 216, 'sine', 0.05, 5.1, durationSeconds - 0.8, 288);
    addNoise(ctx, master, 0.5, durationSeconds - 0.4, 0.08, 'highpass', 1800);
  };

  const playExit = (ctx, master) => {
    ramp(master.gain, targetVolume * 0.95, ctx.currentTime + 0.45);
    ramp(master.gain, targetVolume * 0.48, ctx.currentTime + durationSeconds - 2.1);
    ramp(master.gain, 0.0001, ctx.currentTime + durationSeconds - 0.18);

    if (ritualMode === 'curtain') {
      addTone(ctx, master, 72, 'sine', 0.33, 0, durationSeconds - 0.1, 38);
      addTone(ctx, master, 144, 'triangle', 0.1, 0.25, durationSeconds - 0.7, 76);
      addNoise(ctx, master, 0.1, durationSeconds - 0.8, 0.1, 'lowpass', 600);
      addBell(ctx, master, 1.3, 246.94, 0.08);
      addBell(ctx, master, 5.9, 164.81, 0.06);
      return;
    }

    if (ritualMode === 'moon') {
      addTone(ctx, master, 58, 'sine', 0.28, 0, durationSeconds - 0.1, 43);
      addTone(ctx, master, 116, 'triangle', 0.12, 0.2, durationSeconds - 0.8, 87);
      addTone(ctx, master, 247, 'sine', 0.055, 2.8, durationSeconds - 1.2, 185);
      addNoise(ctx, master, 0.5, durationSeconds - 0.8, 0.045, 'highpass', 2400);
      addBell(ctx, master, 2.0, 329.63, 0.075);
      addBell(ctx, master, 6.7, 261.63, 0.06);
      return;
    }

    addTone(ctx, master, 82, 'sine', 0.34, 0, durationSeconds - 0.1, 34);
    addTone(ctx, master, 123, 'triangle', 0.13, 0.2, durationSeconds - 0.6, 58);
    addTone(ctx, master, 196, 'sine', 0.07, 1.2, durationSeconds - 2.4, 92);
    addNoise(ctx, master, 0.2, durationSeconds - 1.1, 0.075, 'highpass', 1200);
    addBell(ctx, master, 1.0, 392);
    addBell(ctx, master, 3.9, 277);
    addBell(ctx, master, 7.0, 185);
  };

  const start = async () => {
    try {
      const ctx = new AudioCtor();
      const master = ctx.createGain();
      const compressor = ctx.createDynamicsCompressor();
      compressor.threshold.value = -25;
      compressor.knee.value = 18;
      compressor.ratio.value = 6;
      master.gain.setValueAtTime(0.0001, ctx.currentTime);
      master.connect(compressor);
      compressor.connect(ctx.destination);

      if (ritualKind === 'exit') playExit(ctx, master);
      else playEntry(ctx, master);

      await ctx.resume().catch(() => undefined);
      window.setTimeout(() => void ctx.close().catch(() => undefined), (durationSeconds + 0.5) * 1000);
    } catch (_) {
      // Autoplay or audio device failures must never block the ritual window.
    }
  };

  window.addEventListener('DOMContentLoaded', () => void start(), { once: true });
})();
</script>`
}

function buildBaseHead(css: string, audioScript: string): string {
  return `<meta charset="utf-8"><style>
html,body{width:100%;height:100%;margin:0;overflow:hidden;background:#030303;color:#f7f1e3;font-family:"Microsoft YaHei UI","PingFang SC","Hiragino Sans GB","Noto Serif SC",serif}
*{box-sizing:border-box}
.stage{position:fixed;inset:0;display:grid;place-items:center;overflow:hidden;background:#030303;isolation:isolate}
.stage::after{content:"";position:absolute;inset:-12%;z-index:20;pointer-events:none;background:radial-gradient(circle at 50% 46%,transparent 0 46%,rgba(0,0,0,.34) 76%,rgba(0,0,0,.7) 100%);mix-blend-mode:multiply}
.copy{position:relative;z-index:12;display:grid;justify-items:center;gap:14px;text-align:center;padding:0 36px}
.label{font:700 12px Consolas,"Courier New",monospace;color:#aeb5c0;letter-spacing:.2em;text-transform:uppercase}
.brand{font:800 34px/1 Georgia,"Times New Roman","Songti SC",serif;letter-spacing:.03em;color:#fffaf0;text-shadow:0 0 36px rgba(255,255,255,.18)}
.title{font:700 clamp(42px,5.6vw,88px)/1.13 "STSong","Songti SC","Noto Serif SC","Microsoft YaHei UI",serif;max-width:1160px;letter-spacing:.02em;text-wrap:balance;text-shadow:0 20px 70px rgba(0,0,0,.62)}
.enter{position:absolute;z-index:18;left:50%;top:55.5%;width:min(1120px,88vw);transform:translate(-50%,38px);text-align:center;color:#fff5dd;font:600 clamp(46px,7.2vw,116px)/1.04 "STSong","Songti SC","Noto Serif SC","Microsoft YaHei UI",serif;letter-spacing:.12em;text-shadow:0 0 24px rgba(255,247,215,.42),0 0 90px rgba(255,119,32,.36),0 28px 88px rgba(0,0,0,.72);opacity:0}
.enter::before{content:"TIMETABLE.OS // BEGIN";display:block;margin:0 auto 18px;color:rgba(255,246,220,.72);font:700 11px/1 Consolas,"Courier New",monospace;letter-spacing:.32em;text-shadow:none}
.line1{font:600 clamp(58px,8vw,136px)/1 "STSong","Songti SC","Noto Serif SC","Microsoft YaHei UI",serif;letter-spacing:.1em;text-shadow:0 0 36px rgba(255,255,255,.2)}
.line2{font:500 clamp(28px,4vw,72px)/1.2 "STSong","Songti SC","Noto Serif SC","Microsoft YaHei UI",serif;color:#c7cbd3;letter-spacing:.14em;text-shadow:0 0 28px rgba(255,255,255,.12)}
.grain{position:absolute;inset:-50%;z-index:19;pointer-events:none;opacity:.12;background-image:radial-gradient(circle,rgba(255,255,255,.5) 0 1px,transparent 1px);background-size:4px 4px;animation:grain 1.2s steps(2,end) infinite}
@keyframes grain{0%{transform:translate3d(0,0,0)}50%{transform:translate3d(2%,1%,0)}100%{transform:translate3d(-1%,2%,0)}}
@media (prefers-reduced-motion:reduce){.grain{animation:none}.stage::after{opacity:.55}}
${css}
</style>${audioScript}`
}

function buildEntryCopy(appSettings: AppSettings, todayKey: string, label: string): string {
  const entryText = escapeHtml(appSettings.ritualEntryText || '如果今天是最后一天，你打算怎么过？')
  return `<section class="copy"><div class="brand">TIMETABLE.OS</div><div class="label">${label} // ${escapeHtml(todayKey)}</div><div class="title">${entryText}</div></section>`
}

function buildDoorEntry(appSettings: AppSettings, todayKey: string): string {
  const durationSeconds = getEntryRitualDurationMs(appSettings) / 1000
  const css = `
.door-stage{background:#020202}
.door-stage .floor{position:absolute;inset:auto -10% -18% -10%;height:45%;z-index:4;background:radial-gradient(ellipse at 50% 0%,rgba(255,198,116,.38),transparent 46%),linear-gradient(180deg,rgba(255,255,255,.07),rgba(0,0,0,.92));transform:perspective(760px) rotateX(68deg);opacity:0;animation:floorLight 10.6s ease forwards}
.door{position:absolute;top:0;bottom:0;z-index:8;width:50.6vw;background:linear-gradient(90deg,#050505,#101010 42%,#030303);box-shadow:inset 0 0 0 1px rgba(255,255,255,.07),inset 0 0 80px rgba(0,0,0,.88)}
.left{left:0;transform-origin:left center;animation:leftDoor 10.6s cubic-bezier(.55,0,.1,1) forwards}
.right{right:0;transform-origin:right center;animation:rightDoor 10.6s cubic-bezier(.55,0,.1,1) forwards}
.rift{position:absolute;top:-6%;bottom:-6%;left:50%;z-index:7;width:2px;transform:translateX(-50%);background:#fffefa;box-shadow:0 0 34px rgba(255,255,255,.95),0 0 130px rgba(255,107,30,.65),0 0 260px rgba(255,209,118,.38);animation:rift 10.6s cubic-bezier(.45,0,.12,1) forwards}
.volumetric{position:absolute;inset:-10%;z-index:5;background:conic-gradient(from 86deg at 50% 42%,transparent 0 38deg,rgba(255,224,170,.46) 46deg,transparent 62deg 298deg,rgba(255,224,170,.36) 314deg,transparent 332deg);filter:blur(30px);opacity:0;animation:volumetric 10.6s ease forwards}
.copy{animation:copyOut 10.6s ease forwards}
.enter{animation:entryFinal 10.6s cubic-bezier(.18,.82,.18,1) forwards}
@keyframes leftDoor{0%,28%{transform:translateX(0)}40%{transform:translateX(-3.5vw) skewY(.25deg)}58%{transform:translateX(-20vw) skewY(.5deg)}82%,100%{transform:translateX(-56vw)}}
@keyframes rightDoor{0%,28%{transform:translateX(0)}40%{transform:translateX(3.5vw) skewY(-.25deg)}58%{transform:translateX(20vw) skewY(-.5deg)}82%,100%{transform:translateX(56vw)}}
@keyframes rift{0%,28%{width:2px;opacity:.92}40%{width:10px;opacity:1}60%{width:30vw;opacity:.92}82%{width:116vw;opacity:.2}100%{width:118vw;opacity:0}}
@keyframes volumetric{0%,32%{opacity:0}48%{opacity:.52}74%{opacity:.8}100%{opacity:0}}
@keyframes floorLight{0%,34%{opacity:0}55%{opacity:.75}100%{opacity:.18}}
@keyframes copyOut{0%{opacity:0;transform:translateY(18px)}10%,24%{opacity:1;transform:translateY(0)}34%,100%{opacity:0;transform:translateY(-18px)}}
@keyframes entryFinal{0%,78%{opacity:0;transform:translate(-50%,38px) scale(.98);filter:blur(6px)}88%,96%{opacity:1;transform:translate(-50%,0) scale(1);filter:blur(0)}100%{opacity:0;transform:translate(-50%,-14px) scale(1.01);filter:blur(4px)}}
@media (prefers-reduced-motion:reduce){.left,.right,.rift,.volumetric,.floor,.copy,.enter{animation-duration:1.6s}}
`
  return `<!doctype html><html><head>${buildBaseHead(css, buildRitualAudioScript('entry', appSettings, durationSeconds, 'door'))}</head><body data-ritual-kind="entry" data-ritual-mode="door"><main class="stage door-stage"><span class="volumetric"></span><span class="floor"></span><span class="door left"></span><span class="door right"></span><span class="rift"></span>${buildEntryCopy(appSettings, todayKey, 'DAY_LEDGER')}<div class="enter">${ENTRY_FINAL_TEXT}</div><span class="grain"></span></main></body></html>`
}

function buildCurtainEntry(appSettings: AppSettings, todayKey: string): string {
  const durationSeconds = getEntryRitualDurationMs(appSettings) / 1000
  const css = `
.curtain-stage{background:#030303}
.stage-light{position:absolute;inset:0;z-index:1;background:radial-gradient(ellipse at 50% 76%,rgba(255,219,158,.78),transparent 24%),radial-gradient(ellipse at 50% 112%,rgba(255,248,220,.92),transparent 33%),linear-gradient(180deg,#050506 0%,#121620 44%,#f5d7a7 100%);opacity:0;animation:stageLight 9.6s ease forwards}
.spot{position:absolute;z-index:2;left:50%;bottom:-24%;width:76vw;height:76vh;transform:translateX(-50%);background:radial-gradient(ellipse at 50% 100%,rgba(255,240,202,.76),rgba(255,174,82,.22) 36%,transparent 70%);filter:blur(16px);opacity:0;animation:spot 9.6s ease forwards}
.curtain-shadow{position:absolute;left:-5%;right:-5%;top:0;z-index:9;height:28vh;background:linear-gradient(180deg,rgba(0,0,0,.78),rgba(0,0,0,0));filter:blur(18px);opacity:0;animation:curtainShadow 9.6s ease forwards}
.curtain{position:absolute;inset:-4vh 0 auto 0;z-index:10;height:116vh;overflow:hidden;background:linear-gradient(90deg,#020202 0%,#0b0b0d 12%,#030303 24%,#151416 38%,#050505 50%,#121214 64%,#030303 78%,#0b0b0d 90%,#020202 100%);box-shadow:inset 0 -28px 68px rgba(255,255,255,.055),0 34px 110px rgba(0,0,0,.82);clip-path:polygon(0 0,100% 0,100% 91%,92% 94%,82% 92%,68% 96%,50% 93%,32% 96%,18% 92%,8% 94%,0 91%);animation:curtainLift 9.6s cubic-bezier(.72,0,.12,1) forwards}
.curtain::before{content:"";position:absolute;inset:0;background:linear-gradient(90deg,transparent 0 8%,rgba(255,255,255,.052) 12%,transparent 18% 26%,rgba(255,255,255,.045) 32%,transparent 39% 47%,rgba(255,255,255,.05) 53%,transparent 61% 70%,rgba(255,255,255,.045) 77%,transparent 84% 100%),radial-gradient(ellipse at 50% 100%,rgba(255,255,255,.075),transparent 34%);filter:blur(.35px)}
.curtain::after{content:"";position:absolute;left:0;right:0;bottom:0;height:42px;background:linear-gradient(180deg,#1f1f21,#040404);box-shadow:0 0 46px rgba(255,255,255,.12),0 18px 70px rgba(0,0,0,.8)}
.copy{animation:copyOut 9.6s ease forwards}
.enter{animation:entryFinal 9.6s cubic-bezier(.18,.82,.18,1) forwards}
@keyframes stageLight{0%,24%{opacity:0}52%{opacity:.55}82%,100%{opacity:1}}
@keyframes spot{0%,34%{opacity:0;transform:translateX(-50%) scale(.86)}62%{opacity:.72;transform:translateX(-50%) scale(1.05)}100%{opacity:.35;transform:translateX(-50%) scale(1.18)}}
@keyframes curtainShadow{0%,24%{opacity:0}48%{opacity:.48}82%,100%{opacity:.1}}
@keyframes curtainLift{0%,25%{transform:translateY(0)}44%{transform:translateY(-10vh)}78%,100%{transform:translateY(-118vh)}}
@keyframes copyOut{0%{opacity:0;transform:translateY(18px)}10%,24%{opacity:1;transform:translateY(0)}34%,100%{opacity:0;transform:translateY(-18px)}}
@keyframes entryFinal{0%,76%{opacity:0;transform:translate(-50%,38px) scale(.98);filter:blur(6px)}86%,96%{opacity:1;transform:translate(-50%,0) scale(1);filter:blur(0)}100%{opacity:0;transform:translate(-50%,-14px) scale(1.01);filter:blur(4px)}}
@media (prefers-reduced-motion:reduce){.stage-light,.spot,.curtain-shadow,.curtain,.copy,.enter{animation-duration:1.6s}.curtain{transform:translateY(-118vh)}}
`
  return `<!doctype html><html><head>${buildBaseHead(css, buildRitualAudioScript('entry', appSettings, durationSeconds, 'curtain'))}</head><body data-ritual-kind="entry" data-ritual-mode="curtain"><main class="stage curtain-stage"><span class="stage-light"></span><span class="spot"></span><span class="curtain-shadow"></span>${buildEntryCopy(appSettings, todayKey, 'CURTAIN_RISE')}<span class="curtain"></span><div class="enter">${ENTRY_FINAL_TEXT}</div><span class="grain"></span></main></body></html>`
}

function buildMeteorEntry(appSettings: AppSettings, todayKey: string): string {
  const durationSeconds = getEntryRitualDurationMs(appSettings) / 1000
  const css = `
.meteor-stage{background:#01030a}
.stars{position:absolute;inset:-10%;z-index:1;background-image:radial-gradient(circle at 12% 20%,rgba(255,255,255,.72) 0 1px,transparent 1.45px),radial-gradient(circle at 76% 16%,rgba(210,228,255,.5) 0 1px,transparent 1.55px),radial-gradient(circle at 58% 40%,rgba(255,255,255,.42) 0 1px,transparent 1.6px),radial-gradient(circle at 34% 64%,rgba(255,214,166,.36) 0 1px,transparent 1.55px);background-size:350px 250px,430px 310px,285px 245px,520px 370px;animation:stars 11.4s ease forwards}
.dawn-field{position:absolute;inset:0;z-index:2;background:radial-gradient(ellipse at 18% 84%,rgba(255,207,132,.98),transparent 26%),radial-gradient(ellipse at 38% 108%,rgba(255,251,226,1),transparent 34%),radial-gradient(circle at 74% 22%,rgba(103,150,255,.3),transparent 30%),linear-gradient(180deg,#01030a 0%,#081226 42%,#dc8044 75%,#fff2c9 100%);opacity:0;animation:dawnField 11.4s cubic-bezier(.18,.74,.16,1) forwards}
.aurora{position:absolute;inset:-20%;z-index:3;background:conic-gradient(from 224deg at 44% 40%,transparent 0 32deg,rgba(116,168,255,.24) 42deg,rgba(255,181,98,.34) 58deg,transparent 72deg 360deg);filter:blur(46px);opacity:0;animation:aurora 11.4s ease forwards}
.black-cloth{position:absolute;inset:-8%;z-index:5;background:linear-gradient(120deg,#000 0%,#030407 34%,#13151a 50%,#020203 67%,#000 100%);box-shadow:inset 0 0 120px rgba(255,255,255,.035),inset 0 0 300px rgba(0,0,0,.94);will-change:clip-path,transform,opacity}
.black-cloth::before{content:"";position:absolute;inset:0;background:linear-gradient(90deg,rgba(255,255,255,.034),transparent 12% 25%,rgba(255,255,255,.026) 33%,transparent 44% 62%,rgba(255,255,255,.026) 72%,transparent),radial-gradient(ellipse at 50% 42%,rgba(255,255,255,.045),transparent 38%);mix-blend-mode:screen;opacity:.64}
.cloth-upper{clip-path:polygon(0 0,100% 0,100% 3%,95% 7%,91% 9%,87% 12%,82% 14%,78% 18%,73% 20%,69% 24%,64% 26%,60% 31%,55% 33%,51% 37%,46% 39%,42% 44%,37% 47%,33% 51%,28% 54%,24% 58%,19% 61%,15% 66%,10% 69%,6% 73%,0 76%);animation:clothUpper 11.4s cubic-bezier(.16,.84,.12,1) forwards}
.cloth-lower{clip-path:polygon(100% 4%,95% 9%,91% 12%,87% 15%,82% 18%,78% 22%,73% 25%,69% 28%,64% 31%,60% 36%,55% 39%,51% 42%,46% 46%,42% 49%,37% 53%,33% 56%,28% 60%,24% 63%,19% 67%,15% 70%,10% 74%,6% 77%,0 81%,0 100%,100% 100%);animation:clothLower 11.4s cubic-bezier(.16,.84,.12,1) forwards}
.dawn-rift{position:absolute;z-index:7;right:-12vw;top:9vh;width:132vw;height:9vh;overflow:hidden;border-radius:999px;transform:rotate(-31deg) scaleX(0);transform-origin:right center;background:linear-gradient(90deg,rgba(255,255,255,.96),rgba(220,238,255,.9) 9%,rgba(255,230,168,.84) 22%,rgba(255,133,48,.48) 50%,rgba(100,148,255,.14) 82%,transparent);box-shadow:0 0 28px rgba(255,255,255,.58),0 0 110px rgba(255,121,36,.42),0 0 240px rgba(255,226,154,.28);filter:blur(.2px);animation:dawnRift 11.4s cubic-bezier(.08,.82,.08,1) forwards}
.dawn-rift::before{content:"";position:absolute;inset:36% 0 34%;background:linear-gradient(90deg,#fff,rgba(221,239,255,.92) 10%,rgba(255,247,206,.9) 22%,rgba(255,132,54,.48) 52%,transparent 90%);filter:blur(5px);opacity:.82}
.dawn-rift::after{content:"";position:absolute;left:0;right:16%;top:50%;height:1px;background:linear-gradient(90deg,rgba(255,255,255,.9),rgba(255,233,190,.54),transparent);box-shadow:0 0 12px rgba(255,255,255,.44);opacity:.7}
.tear-flare{position:absolute;z-index:6;right:-18vw;top:5vh;width:145vw;height:25vh;transform:rotate(-31deg) scaleX(0);transform-origin:right center;background:linear-gradient(90deg,rgba(255,255,255,.32),rgba(255,238,184,.24) 22%,rgba(255,126,46,.12) 48%,transparent 82%);filter:blur(28px);opacity:0;animation:tearFlare 11.4s cubic-bezier(.12,.78,.12,1) forwards}
.tear-edge{position:absolute;z-index:8;right:-11vw;top:9vh;width:130vw;height:2px;border-radius:999px;transform:rotate(-31deg) scaleX(0);transform-origin:right center;background:linear-gradient(90deg,rgba(255,255,255,.86),rgba(215,234,255,.66) 9%,rgba(255,150,69,.38) 34%,rgba(11,12,16,.36) 76%,transparent);box-shadow:0 0 12px rgba(255,255,255,.44),0 0 42px rgba(255,111,36,.26);opacity:0;animation:tearEdge 11.4s cubic-bezier(.1,.82,.12,1) forwards}
.tear-edge.upper{margin-top:1.8vh}
.tear-edge.lower{margin-top:7.2vh;filter:blur(.6px);opacity:0;animation-name:tearEdgeLower}
.meteor-flight{position:absolute;z-index:12;right:4vw;top:7vh;width:0;height:0;opacity:0;transform:rotate(-31deg);animation:meteorFlight 11.4s cubic-bezier(.3,.04,.28,1) forwards}
.meteor-head{position:absolute;left:-8px;top:-8px;width:16px;height:16px;border-radius:50%;background:radial-gradient(circle at 34% 32%,#fff 0 24%,#eef8ff 42%,#9ec9ff 68%,rgba(118,176,255,.16) 100%);box-shadow:0 0 18px rgba(255,255,255,.98),0 0 46px rgba(188,224,255,.9),0 0 112px rgba(118,176,255,.6),0 0 190px rgba(255,190,116,.24);animation:meteorHead 11.4s ease forwards}
.meteor-trail{position:absolute;left:6px;top:-2px;width:42vw;height:4px;border-radius:999px;transform-origin:left center;transform:scaleX(0);background:linear-gradient(90deg,rgba(255,255,255,.97) 0%,rgba(222,240,255,.9) 8%,rgba(255,233,190,.62) 28%,rgba(255,151,72,.36) 55%,rgba(255,92,38,.12) 84%,transparent);filter:blur(.45px);animation:meteorTrail 11.4s cubic-bezier(.18,.62,.28,1) forwards}
.meteor-trail::before{content:"";position:absolute;inset:-10px 0;background:linear-gradient(90deg,rgba(255,255,255,.5) 0%,rgba(184,220,255,.34) 14%,rgba(255,190,120,.24) 48%,transparent 84%);filter:blur(13px);border-radius:999px;pointer-events:none}
.meteor-trail::after{content:"";position:absolute;left:0;right:36%;top:-5px;bottom:-5px;background:linear-gradient(90deg,rgba(255,255,255,.62),rgba(221,240,255,.36) 34%,transparent 82%);filter:blur(3px);border-radius:999px;pointer-events:none;animation:tailPulse 11.4s ease forwards}
.meteor-warm-tail{position:absolute;left:15%;right:0;top:1px;height:2px;border-radius:999px;background:linear-gradient(90deg,rgba(255,213,162,.72),rgba(255,126,51,.48) 48%,rgba(255,83,24,.14) 78%,transparent);box-shadow:0 0 22px rgba(255,128,42,.38),0 0 74px rgba(255,107,30,.22);animation:warmTail 11.4s ease forwards}
.shower-meteor{position:absolute;z-index:10;right:var(--right);top:var(--top);width:0;height:0;opacity:0;pointer-events:none;transform:rotate(var(--angle));animation:showerFall var(--duration) cubic-bezier(.28,.04,.22,1) var(--delay) forwards}
.shower-meteor::before{content:"";position:absolute;left:-4px;top:-4px;width:8px;height:8px;border-radius:50%;background:radial-gradient(circle at 34% 34%,#fff 0 28%,#e7f3ff 52%,rgba(134,194,255,.18) 100%);box-shadow:0 0 10px rgba(255,255,255,.9),0 0 25px rgba(170,214,255,.64),0 0 56px rgba(255,184,105,.28)}
.shower-meteor::after{content:"";position:absolute;left:3px;top:-1px;width:var(--tail);height:2px;border-radius:999px;background:linear-gradient(90deg,rgba(255,255,255,.92),rgba(218,238,255,.64) 15%,rgba(255,207,151,.44) 42%,rgba(255,125,54,.2) 72%,transparent);filter:blur(.55px);transform-origin:left center}
.shower-meteor.s1{--right:18vw;--top:4vh;--angle:-32deg;--tail:18vw;--duration:4.7s;--delay:2.35s;--dx:-62vw;--dy:36vh}
.shower-meteor.s2{--right:38vw;--top:1vh;--angle:-26deg;--tail:15vw;--duration:4.2s;--delay:2.9s;--dx:-48vw;--dy:22vh}
.shower-meteor.s3{--right:10vw;--top:20vh;--angle:-33deg;--tail:13vw;--duration:3.9s;--delay:3.45s;--dx:-52vw;--dy:31vh}
.shower-meteor.s4{--right:56vw;--top:8vh;--angle:-30deg;--tail:11vw;--duration:3.7s;--delay:3.85s;--dx:-40vw;--dy:24vh}
.shower-meteor.s5{--right:28vw;--top:29vh;--angle:-35deg;--tail:10vw;--duration:3.4s;--delay:4.35s;--dx:-38vw;--dy:28vh}
.shower-meteor.s6{--right:68vw;--top:18vh;--angle:-27deg;--tail:9vw;--duration:3.3s;--delay:4.7s;--dx:-34vw;--dy:18vh}
.shower-meteor.s7{--right:6vw;--top:2vh;--angle:-31deg;--tail:12vw;--duration:3.8s;--delay:5.0s;--dx:-46vw;--dy:27vh}
.tear-particle{position:absolute;z-index:9;width:9px;height:2px;border-radius:999px;background:rgba(255,249,224,.92);box-shadow:0 0 18px rgba(255,255,255,.58),0 0 42px rgba(255,118,42,.4);opacity:0;transform:rotate(-31deg)}
.tear-particle.p1{right:30vw;top:33vh;animation:particleOne 11.4s ease forwards}
.tear-particle.p2{right:48vw;top:43vh;animation:particleTwo 11.4s ease forwards}
.tear-particle.p3{right:64vw;top:53vh;animation:particleThree 11.4s ease forwards}
.tear-particle.p4{right:20vw;top:27vh;animation:particleFour 11.4s ease forwards}
.shock{position:absolute;z-index:8;left:6vw;bottom:13vh;width:18vw;aspect-ratio:1;border:1px solid rgba(255,247,222,.84);border-radius:50%;box-shadow:0 0 64px rgba(255,255,255,.5),inset 0 0 82px rgba(255,180,92,.42);opacity:0;transform:scale(.2);animation:shock 11.4s ease forwards}
.horizon{position:absolute;left:-5%;right:-5%;bottom:-2%;z-index:4;height:30vh;background:linear-gradient(180deg,transparent,rgba(0,0,0,.48) 72%,#020202);clip-path:polygon(0 50%,12% 42%,25% 58%,38% 36%,49% 55%,63% 39%,76% 61%,88% 48%,100% 57%,100% 100%,0 100%);opacity:.66}
.copy{animation:copyOut 11.4s ease forwards}
.enter{top:61%;width:min(1280px,92vw);font-size:clamp(40px,5.5vw,88px);line-height:1.05;font-weight:500;letter-spacing:.045em;text-shadow:0 0 34px rgba(255,247,215,.6),0 0 128px rgba(255,119,32,.46),0 28px 100px rgba(0,0,0,.72);animation:entryFinal 11.4s cubic-bezier(.18,.82,.18,1) forwards}
@keyframes stars{0%,30%{opacity:1;transform:scale(1)}66%{opacity:.38;transform:scale(1.04)}100%{opacity:.08;transform:scale(1.08)}}
@keyframes dawnField{0%,35%{opacity:0;filter:brightness(.74) saturate(.9)}52%{opacity:.52;filter:brightness(1.55) saturate(1.08)}76%,100%{opacity:1;filter:brightness(2.08) saturate(1.2)}}
@keyframes aurora{0%,31%{opacity:0;transform:rotate(0)}52%{opacity:.86}74%,100%{opacity:.3;transform:rotate(5deg)}}
@keyframes clothUpper{0%,29%{transform:translate(0,0);opacity:1;filter:brightness(1)}44%{transform:translate(-1.1vw,-1vh);opacity:.96}66%{transform:translate(-5vw,-6vh) skewX(-1.4deg);opacity:.66;filter:brightness(.74)}90%,100%{transform:translate(-9vw,-11vh) skewX(-2.4deg);opacity:.13;filter:brightness(.54)}}
@keyframes clothLower{0%,29%{transform:translate(0,0);opacity:1;filter:brightness(1)}44%{transform:translate(1.2vw,1.2vh);opacity:.97}66%{transform:translate(5.2vw,6.3vh) skewX(1.4deg);opacity:.69;filter:brightness(.74)}90%,100%{transform:translate(9.2vw,11.2vh) skewX(2.4deg);opacity:.14;filter:brightness(.54)}}
@keyframes dawnRift{0%,25%{opacity:0;transform:rotate(-31deg) scaleX(0);filter:blur(6px) brightness(.7)}32%{opacity:.76;transform:rotate(-31deg) scaleX(.18);filter:blur(1.8px) brightness(1.3)}45%{opacity:.86;transform:rotate(-31deg) scaleX(.72);filter:blur(.2px) brightness(1.82)}57%{opacity:.74;transform:rotate(-31deg) scaleX(1);filter:blur(.8px) brightness(2)}82%,100%{opacity:.17;transform:rotate(-31deg) scaleX(1.05);filter:blur(15px) brightness(1.44)}}
@keyframes tearFlare{0%,25%{opacity:0;transform:rotate(-31deg) scaleX(0)}38%{opacity:.46;transform:rotate(-31deg) scaleX(.45)}56%{opacity:.62;transform:rotate(-31deg) scaleX(1)}86%,100%{opacity:0;transform:rotate(-31deg) scaleX(1.08)}}
@keyframes tearEdge{0%,25%{opacity:0;transform:rotate(-31deg) scaleX(0)}35%{opacity:1;transform:rotate(-31deg) scaleX(.3)}49%{opacity:.94;transform:rotate(-31deg) scaleX(.82)}63%{opacity:.52;transform:rotate(-31deg) scaleX(1)}88%,100%{opacity:.08;transform:rotate(-31deg) scaleX(1.04)}}
@keyframes tearEdgeLower{0%,26%{opacity:0;transform:rotate(-31deg) scaleX(0)}36%{opacity:.86;transform:rotate(-31deg) scaleX(.28)}50%{opacity:.8;transform:rotate(-31deg) scaleX(.82)}64%{opacity:.36;transform:rotate(-31deg) scaleX(1)}88%,100%{opacity:.06;transform:rotate(-31deg) scaleX(1.04)}}
@keyframes meteorFlight{0%,21%{opacity:0;transform:translate(0,0) rotate(-31deg)}24%{opacity:1}48%{opacity:1;transform:translate(-91vw,47vh) rotate(-31deg)}55%{opacity:.92;transform:translate(-112vw,58vh) rotate(-31deg)}62%,100%{opacity:0;transform:translate(-132vw,69vh) rotate(-31deg)}}
@keyframes meteorHead{0%,21%{transform:scale(.78);filter:brightness(.92)}24%{transform:scale(1.04);filter:brightness(1.32)}42%{transform:scale(1.14);filter:brightness(1.62)}60%,100%{transform:scale(.62);filter:brightness(.7)}}
@keyframes meteorTrail{0%,21%{opacity:0;transform:scaleX(0)}27%{opacity:.94;transform:scaleX(.24)}38%{opacity:1;transform:scaleX(.98)}48%{opacity:.96;transform:scaleX(.72)}58%{opacity:.46;transform:scaleX(.36)}64%,100%{opacity:0;transform:scaleX(.12)}}
@keyframes tailPulse{0%,24%{opacity:0}32%{opacity:.82}43%{opacity:.48}51%{opacity:.74}62%,100%{opacity:0}}
@keyframes warmTail{0%,24%{opacity:0;transform:scaleX(.1)}34%{opacity:.88;transform:scaleX(1)}49%{opacity:.62;transform:scaleX(.64)}61%,100%{opacity:0;transform:scaleX(.08)}}
@keyframes showerFall{0%{opacity:0;transform:translate(0,0) rotate(var(--angle)) scale(.76)}12%{opacity:.86}70%{opacity:.9;transform:translate(var(--dx),var(--dy)) rotate(var(--angle)) scale(1)}100%{opacity:0;transform:translate(calc(var(--dx) * 1.2),calc(var(--dy) * 1.16)) rotate(var(--angle)) scale(.66)}}
@keyframes particleOne{0%,38%{opacity:0;transform:translate(0,0) rotate(-31deg) scaleX(.3)}49%{opacity:.88;transform:translate(-4vw,4vh) rotate(-16deg) scaleX(1)}66%,100%{opacity:0;transform:translate(-10vw,12vh) rotate(2deg) scaleX(.2)}}
@keyframes particleTwo{0%,40%{opacity:0;transform:translate(0,0) rotate(-31deg) scaleX(.3)}51%{opacity:.72;transform:translate(3vw,-2vh) rotate(-42deg) scaleX(.8)}67%,100%{opacity:0;transform:translate(9vw,-6vh) rotate(-56deg) scaleX(.2)}}
@keyframes particleThree{0%,42%{opacity:0;transform:translate(0,0) rotate(-31deg) scaleX(.3)}53%{opacity:.66;transform:translate(-2vw,3vh) rotate(-8deg) scaleX(.74)}70%,100%{opacity:0;transform:translate(-7vw,9vh) rotate(8deg) scaleX(.18)}}
@keyframes particleFour{0%,45%{opacity:0;transform:translate(0,0) rotate(-31deg) scaleX(.3)}56%{opacity:.7;transform:translate(2vw,4vh) rotate(18deg) scaleX(.84)}72%,100%{opacity:0;transform:translate(6vw,12vh) rotate(32deg) scaleX(.18)}}
@keyframes shock{0%,48%{opacity:0;transform:scale(.18)}55%{opacity:.96;transform:scale(1)}72%,100%{opacity:0;transform:scale(3.5)}}
@keyframes copyOut{0%{opacity:0;transform:translateY(18px)}9%,23%{opacity:1;transform:translateY(0)}32%,100%{opacity:0;transform:translateY(-18px)}}
@keyframes entryFinal{0%,74%{opacity:0;transform:translate(-50%,34px) scale(.98);filter:blur(8px)}84%,96%{opacity:1;transform:translate(-50%,0) scale(1);filter:blur(0)}100%{opacity:0;transform:translate(-50%,-14px) scale(1.01);filter:blur(5px)}}
@media (prefers-reduced-motion:reduce){.stars,.dawn-field,.aurora,.black-cloth,.dawn-rift,.tear-flare,.tear-edge,.meteor-flight,.meteor-head,.meteor-trail,.meteor-warm-tail,.shower-meteor,.tear-particle,.shock,.copy,.enter{animation-duration:1.6s;animation-delay:0s}}
`
  return `<!doctype html><html><head>${buildBaseHead(css, buildRitualAudioScript('entry', appSettings, durationSeconds, 'meteor'))}</head><body data-ritual-kind="entry" data-ritual-mode="meteor"><main class="stage meteor-stage"><span class="stars"></span><span class="dawn-field"></span><span class="aurora"></span><span class="black-cloth cloth-upper"></span><span class="black-cloth cloth-lower"></span><span class="dawn-rift"></span><span class="tear-flare"></span><span class="tear-edge upper"></span><span class="tear-edge lower"></span><span class="meteor-flight"><span class="meteor-trail"><i class="meteor-warm-tail"></i></span><span class="meteor-head"></span></span><span class="shower-meteor s1"></span><span class="shower-meteor s2"></span><span class="shower-meteor s3"></span><span class="shower-meteor s4"></span><span class="shower-meteor s5"></span><span class="shower-meteor s6"></span><span class="shower-meteor s7"></span><span class="tear-particle p1"></span><span class="tear-particle p2"></span><span class="tear-particle p3"></span><span class="tear-particle p4"></span><span class="shock"></span><span class="horizon"></span>${buildEntryCopy(appSettings, todayKey, 'METEOR_DAWN')}<div class="enter">${ENTRY_FINAL_TEXT}</div><span class="grain"></span></main></body></html>`
}

function buildSunriseEntry(appSettings: AppSettings, todayKey: string): string {
  const durationSeconds = getEntryRitualDurationMs(appSettings) / 1000
  const css = `
.sunrise-stage{background:#02040a}
.sky{position:absolute;inset:0;z-index:1;background:linear-gradient(180deg,#05070f 0%,#17243d 42%,#b6643d 74%,#fff1c8 100%);filter:brightness(.72);animation:skyWake 10.6s ease forwards}
.rays{position:absolute;z-index:3;left:50%;bottom:2vh;width:118vw;height:92vh;transform:translateX(-50%);background:conic-gradient(from 194deg at 50% 100%,transparent 0 7deg,rgba(255,239,190,.32) 12deg,transparent 20deg 38deg,rgba(255,192,94,.22) 44deg,transparent 54deg 360deg);filter:blur(20px);opacity:0;animation:rays 10.6s ease forwards}
.sun{position:absolute;z-index:4;left:50%;bottom:-20vh;width:clamp(160px,18vw,280px);height:clamp(160px,18vw,280px);border-radius:50%;background:radial-gradient(circle,#fff8cf 0 26%,#ffd17d 46%,#ff7b39 72%,rgba(255,104,38,.15) 100%);box-shadow:0 0 40px rgba(255,244,200,.8),0 0 160px rgba(255,132,54,.6),0 0 320px rgba(255,203,120,.36);transform:translateX(-50%);animation:sunRise 10.6s cubic-bezier(.2,.72,.1,1) forwards}
.haze{position:absolute;inset:auto -10% 0 -10%;z-index:5;height:42vh;background:linear-gradient(180deg,rgba(255,248,220,0),rgba(255,248,220,.42) 40%,rgba(255,255,246,.82));filter:blur(18px);opacity:0;animation:haze 10.6s ease forwards}
.mountains{position:absolute;left:-4%;right:-4%;bottom:0;z-index:7;height:34vh;background:linear-gradient(180deg,rgba(11,12,15,.72),#020202);clip-path:polygon(0 54%,8% 45%,18% 58%,31% 34%,42% 61%,55% 30%,66% 58%,79% 39%,90% 62%,100% 51%,100% 100%,0 100%);opacity:.9}
.copy{animation:copyOut 10.6s ease forwards}
.enter{top:54.5%;animation:entryFinal 10.6s cubic-bezier(.18,.82,.18,1) forwards}
@keyframes skyWake{0%,28%{filter:brightness(.72) saturate(.92)}58%{filter:brightness(1.3) saturate(1.18)}100%{filter:brightness(1.8) saturate(1.25)}}
@keyframes sunRise{0%,26%{bottom:-22vh;opacity:0}44%{opacity:1}78%,100%{bottom:38vh;opacity:1}}
@keyframes rays{0%,38%{opacity:0;transform:translateX(-50%) scale(.8) rotate(-2deg)}62%{opacity:.76}100%{opacity:.36;transform:translateX(-50%) scale(1.15) rotate(2deg)}}
@keyframes haze{0%,40%{opacity:0}70%,100%{opacity:1}}
@keyframes copyOut{0%{opacity:0;transform:translateY(18px)}10%,24%{opacity:1;transform:translateY(0)}34%,100%{opacity:0;transform:translateY(-18px)}}
@keyframes entryFinal{0%,76%{opacity:0;transform:translate(-50%,38px) scale(.98);filter:blur(8px)}86%,96%{opacity:1;transform:translate(-50%,0) scale(1);filter:blur(0)}100%{opacity:0;transform:translate(-50%,-14px) scale(1.01);filter:blur(5px)}}
@media (prefers-reduced-motion:reduce){.sky,.rays,.sun,.haze,.copy,.enter{animation-duration:1.6s}}
`
  return `<!doctype html><html><head>${buildBaseHead(css, buildRitualAudioScript('entry', appSettings, durationSeconds, 'sunrise'))}</head><body data-ritual-kind="entry" data-ritual-mode="sunrise"><main class="stage sunrise-stage"><span class="sky"></span><span class="rays"></span><span class="sun"></span><span class="haze"></span><span class="mountains"></span>${buildEntryCopy(appSettings, todayKey, 'SUNRISE_LEDGER')}<div class="enter">${ENTRY_FINAL_TEXT}</div><span class="grain"></span></main></body></html>`
}

function buildWorkbenchEntry(appSettings: AppSettings, todayKey: string): string {
  const durationSeconds = getWorkRitualDurationMs(appSettings) / 1000
  const css = `
.workbench-stage{background:#020202}
.bench-grid{position:absolute;inset:-8%;z-index:1;background-image:linear-gradient(rgba(255,255,255,.06) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,.06) 1px,transparent 1px);background-size:56px 56px;opacity:0;transform:perspective(900px) rotateX(58deg) translateY(8vh);transform-origin:50% 78%;animation:gridWake 10.4s ease forwards}
.bench-glow{position:absolute;inset:0;z-index:2;background:radial-gradient(ellipse at 50% 72%,rgba(255,126,42,.46),transparent 28%),radial-gradient(ellipse at 50% 38%,rgba(255,255,255,.12),transparent 28%);opacity:0;animation:benchGlow 10.4s ease forwards}
.terminal-plane{position:absolute;z-index:6;left:50%;top:54%;width:min(980px,78vw);height:min(420px,44vh);border:1px solid rgba(255,245,214,.22);background:linear-gradient(180deg,rgba(255,255,255,.085),rgba(255,255,255,.025));box-shadow:0 0 0 1px rgba(255,255,255,.035),0 32px 130px rgba(0,0,0,.72),inset 0 0 120px rgba(255,255,255,.025);transform:translate(-50%,-50%) perspective(980px) rotateX(18deg) scale(.92);opacity:0;animation:planeWake 10.4s cubic-bezier(.18,.8,.12,1) forwards}
.terminal-plane::before{content:"";position:absolute;inset:28px;background:linear-gradient(90deg,transparent,rgba(255,255,255,.12),transparent);opacity:0;animation:scanLine 10.4s ease forwards}
.axis{position:absolute;left:9%;right:9%;top:52%;height:2px;background:linear-gradient(90deg,transparent,rgba(255,250,224,.9),transparent);box-shadow:0 0 22px rgba(255,255,255,.34);transform:scaleX(0);transform-origin:left center;animation:axisWake 10.4s ease forwards}
.work-node{position:absolute;top:calc(52% - 7px);width:14px;height:14px;border-radius:50%;background:#fff9e8;box-shadow:0 0 24px rgba(255,255,255,.8),0 0 68px rgba(255,111,35,.55);opacity:0;transform:scale(.4)}
.work-node.n1{left:16%;animation:nodeWake 10.4s ease 3.2s forwards}
.work-node.n2{left:38%;animation:nodeWake 10.4s ease 3.85s forwards}
.work-node.n3{left:61%;animation:nodeWake 10.4s ease 4.5s forwards}
.work-node.n4{left:82%;animation:nodeWake 10.4s ease 5.15s forwards}
.work-readout{position:absolute;left:9%;right:9%;bottom:10%;display:grid;grid-template-columns:repeat(3,1fr);gap:14px;opacity:0;animation:readoutWake 10.4s ease forwards}
.work-readout span{border:1px solid rgba(255,245,214,.16);padding:14px 16px;color:#e7e0d3;font:700 11px/1.4 Consolas,"Courier New",monospace;letter-spacing:.16em;background:rgba(0,0,0,.3)}
.work-stamp{position:absolute;right:8%;top:12%;width:132px;height:132px;border:2px solid rgba(255,112,36,.8);border-radius:50%;display:grid;place-items:center;color:#ff6f24;font:800 12px/1.1 Consolas,"Courier New",monospace;letter-spacing:.18em;opacity:0;transform:rotate(-12deg) scale(.72);box-shadow:0 0 34px rgba(255,88,22,.22);animation:workStamp 10.4s cubic-bezier(.18,.8,.16,1) forwards}
.copy{animation:copyOut 10.4s ease forwards}
.enter{top:58%;animation:workFinal 10.4s cubic-bezier(.18,.82,.18,1) forwards}
@keyframes gridWake{0%,20%{opacity:0;transform:perspective(900px) rotateX(58deg) translateY(10vh)}46%{opacity:.42}100%{opacity:.14;transform:perspective(900px) rotateX(58deg) translateY(0)}}
@keyframes benchGlow{0%,30%{opacity:0}58%{opacity:.78}100%{opacity:.22}}
@keyframes planeWake{0%,28%{opacity:0;transform:translate(-50%,-45%) perspective(980px) rotateX(26deg) scale(.86)}46%{opacity:1;transform:translate(-50%,-50%) perspective(980px) rotateX(18deg) scale(1)}86%,100%{opacity:.62;transform:translate(-50%,-50%) perspective(980px) rotateX(18deg) scale(1.02)}}
@keyframes scanLine{0%,36%{opacity:0;transform:translateX(-40%)}48%,70%{opacity:.9}86%,100%{opacity:0;transform:translateX(40%)}}
@keyframes axisWake{0%,34%{transform:scaleX(0);opacity:0}56%,100%{transform:scaleX(1);opacity:1}}
@keyframes nodeWake{0%{opacity:0;transform:scale(.35)}12%,88%{opacity:1;transform:scale(1)}100%{opacity:.58;transform:scale(.86)}}
@keyframes readoutWake{0%,52%{opacity:0;transform:translateY(18px)}68%,100%{opacity:1;transform:translateY(0)}}
@keyframes workStamp{0%,60%{opacity:0;transform:rotate(-12deg) scale(.72)}69%{opacity:1;transform:rotate(-8deg) scale(1.05)}82%,100%{opacity:.62;transform:rotate(-8deg) scale(.92)}}
@keyframes copyOut{0%{opacity:0;transform:translateY(18px)}9%,23%{opacity:1;transform:translateY(0)}34%,100%{opacity:0;transform:translateY(-18px)}}
@keyframes workFinal{0%,74%{opacity:0;transform:translate(-50%,34px) scale(.98);filter:blur(8px)}84%,94%{opacity:1;transform:translate(-50%,0) scale(1);filter:blur(0)}100%{opacity:0;transform:translate(-50%,-12px) scale(1.01);filter:blur(4px)}}
@media (prefers-reduced-motion:reduce){.bench-grid,.bench-glow,.terminal-plane,.terminal-plane::before,.axis,.work-node,.work-readout,.work-stamp,.copy,.enter{animation-duration:1.6s;animation-delay:0s}}
`
  return `<!doctype html><html><head>${buildBaseHead(css, buildRitualAudioScript('work', appSettings, durationSeconds, 'workbench'))}</head><body data-ritual-kind="work" data-ritual-mode="workbench"><main class="stage workbench-stage"><span class="bench-grid"></span><span class="bench-glow"></span><div class="terminal-plane"><span class="axis"></span><span class="work-node n1"></span><span class="work-node n2"></span><span class="work-node n3"></span><span class="work-node n4"></span><div class="work-readout"><span>COURSE NODE</span><span>TASK QUEUE</span><span>SYSTEM READY</span></div><span class="work-stamp">ONLINE</span></div>${buildEntryCopy(appSettings, todayKey, 'WORKBENCH_ONLINE')}<div class="enter">${WORK_STATE_TEXT}</div><span class="grain"></span></main></body></html>`
}

function buildStampEntry(appSettings: AppSettings, todayKey: string): string {
  const durationSeconds = getWorkRitualDurationMs(appSettings) / 1000
  const css = `
.stamp-stage{background:#f2eee5;color:#151515}
.paper-field{position:absolute;inset:0;z-index:1;background:linear-gradient(90deg,rgba(0,0,0,.055) 1px,transparent 1px),linear-gradient(rgba(0,0,0,.04) 1px,transparent 1px),radial-gradient(ellipse at 50% 44%,rgba(255,255,255,.96),rgba(242,238,229,.84) 52%,rgba(210,206,196,.78));background-size:72px 72px,72px 72px,auto;animation:paperWake 9.8s ease forwards}
.stamp-stage .brand,.stamp-stage .title{color:#151515;text-shadow:0 18px 54px rgba(0,0,0,.14)}
.stamp-stage .label{color:#6f7580}
.scan{position:absolute;inset:0;z-index:3;background:linear-gradient(180deg,transparent,rgba(255,95,24,.26),transparent);height:24vh;transform:translateY(-28vh);opacity:0;animation:stampScan 9.8s ease forwards}
.archive-sheet{position:absolute;z-index:4;left:50%;top:54%;width:min(880px,76vw);height:min(430px,44vh);border:1px solid rgba(20,20,20,.16);background:rgba(255,255,255,.52);box-shadow:0 32px 90px rgba(20,20,20,.12);transform:translate(-50%,-50%) rotate(-1.2deg) scale(.95);opacity:0;animation:sheetIn 9.8s cubic-bezier(.18,.82,.18,1) forwards}
.archive-sheet::before{content:"EXECUTION LEDGER";position:absolute;left:34px;top:28px;color:#8a9098;font:800 12px/1 Consolas,"Courier New",monospace;letter-spacing:.22em}
.archive-sheet::after{content:"";position:absolute;left:34px;right:34px;top:76px;bottom:40px;background:repeating-linear-gradient(180deg,rgba(20,20,20,.12) 0 1px,transparent 1px 46px);opacity:.68}
.seal{position:absolute;z-index:10;left:50%;top:55%;width:clamp(180px,18vw,280px);height:clamp(180px,18vw,280px);border:3px solid rgba(255,82,18,.82);border-radius:50%;display:grid;place-items:center;color:#ff5212;font:900 clamp(24px,3.2vw,48px)/1 "STSong","Songti SC","Microsoft YaHei UI",serif;letter-spacing:.18em;opacity:0;transform:translate(-50%,-50%) rotate(-11deg) scale(2.2);box-shadow:0 0 0 8px rgba(255,82,18,.08),0 0 80px rgba(255,82,18,.18);animation:sealDrop 9.8s cubic-bezier(.18,.82,.16,1) forwards}
.seal::before{content:"TIMETABLE.OS";position:absolute;top:18%;font:800 11px/1 Consolas,"Courier New",monospace;letter-spacing:.26em}
.seal::after{content:"BEGIN";position:absolute;bottom:18%;font:800 11px/1 Consolas,"Courier New",monospace;letter-spacing:.3em}
.copy{animation:copyOut 9.8s ease forwards}
.enter{top:55%;color:#151515;text-shadow:0 10px 44px rgba(255,82,18,.2);animation:stampFinal 9.8s cubic-bezier(.18,.82,.18,1) forwards}
.enter::before{color:rgba(20,20,20,.55)}
@keyframes paperWake{0%{filter:brightness(.86)}56%,100%{filter:brightness(1.05)}}
@keyframes stampScan{0%,30%{opacity:0;transform:translateY(-28vh)}45%{opacity:.78}68%,100%{opacity:0;transform:translateY(104vh)}}
@keyframes sheetIn{0%,34%{opacity:0;transform:translate(-50%,-45%) rotate(-1.2deg) scale(.9)}52%,100%{opacity:1;transform:translate(-50%,-50%) rotate(-1.2deg) scale(1)}}
@keyframes sealDrop{0%,50%{opacity:0;transform:translate(-50%,-50%) rotate(-11deg) scale(2.2);filter:blur(8px)}64%{opacity:1;transform:translate(-50%,-50%) rotate(-11deg) scale(.92);filter:blur(0)}73%,88%{opacity:.95;transform:translate(-50%,-50%) rotate(-11deg) scale(1)}100%{opacity:0;transform:translate(-50%,-50%) rotate(-11deg) scale(1.08);filter:blur(4px)}}
@keyframes copyOut{0%{opacity:0;transform:translateY(18px)}9%,23%{opacity:1;transform:translateY(0)}34%,100%{opacity:0;transform:translateY(-18px)}}
@keyframes stampFinal{0%,78%{opacity:0;transform:translate(-50%,28px) scale(.98);filter:blur(6px)}86%,94%{opacity:1;transform:translate(-50%,0) scale(1);filter:blur(0)}100%{opacity:0;transform:translate(-50%,-12px) scale(1.02);filter:blur(4px)}}
@media (prefers-reduced-motion:reduce){.paper-field,.scan,.archive-sheet,.seal,.copy,.enter{animation-duration:1.6s}}
`
  return `<!doctype html><html><head>${buildBaseHead(css, buildRitualAudioScript('work', appSettings, durationSeconds, 'stamp'))}</head><body data-ritual-kind="work" data-ritual-mode="stamp"><main class="stage stamp-stage"><span class="paper-field"></span><span class="scan"></span><span class="archive-sheet"></span>${buildEntryCopy(appSettings, todayKey, 'STAMP_PROTOCOL')}<span class="seal">执行</span><div class="enter">${STAMP_FINAL_TEXT}</div><span class="grain"></span></main></body></html>`
}

function buildFocusEntry(appSettings: AppSettings, todayKey: string): string {
  const durationSeconds = getWorkRitualDurationMs(appSettings) / 1000
  const css = `
.focus-stage{background:#020202}
.focus-sky{position:absolute;inset:0;z-index:1;background:radial-gradient(circle at 50% 50%,rgba(255,249,225,.12),transparent 16%),linear-gradient(180deg,#030408 0%,#111723 48%,#f0c78c 100%);filter:brightness(.58);animation:focusSky 10.2s ease forwards}
.aperture{position:absolute;inset:-20%;z-index:4;background:radial-gradient(circle at 50% 46%,transparent 0 10%,rgba(0,0,0,.12) 22%,rgba(0,0,0,.88) 54%,#020202 100%);animation:apertureOpen 10.2s cubic-bezier(.18,.82,.14,1) forwards}
.beam{position:absolute;z-index:3;left:50%;top:50%;width:92vw;height:92vw;border-radius:50%;transform:translate(-50%,-50%) scale(.22);background:radial-gradient(circle,rgba(255,249,222,.84),rgba(255,167,80,.26) 22%,rgba(255,255,255,.08) 34%,transparent 56%);filter:blur(18px);opacity:0;animation:beamFocus 10.2s ease forwards}
.focus-lines{position:absolute;inset:0;z-index:5;background:linear-gradient(90deg,transparent 0 48%,rgba(255,247,220,.5) 50%,transparent 52% 100%),linear-gradient(180deg,transparent 0 48%,rgba(255,247,220,.36) 50%,transparent 52% 100%);opacity:0;animation:focusLines 10.2s ease forwards}
.focus-ring{position:absolute;z-index:6;left:50%;top:50%;width:min(660px,62vw);aspect-ratio:1;border:1px solid rgba(255,246,220,.62);border-radius:50%;transform:translate(-50%,-50%) scale(.24);opacity:0;box-shadow:0 0 60px rgba(255,255,255,.16),inset 0 0 40px rgba(255,255,255,.08);animation:focusRing 10.2s cubic-bezier(.18,.82,.14,1) forwards}
.focus-ring::before,.focus-ring::after{content:"";position:absolute;inset:12%;border:1px solid rgba(255,246,220,.28);border-radius:50%}
.focus-ring::after{inset:28%;border-color:rgba(255,126,42,.38)}
.copy{animation:copyOut 10.2s ease forwards}
.enter{top:55%;animation:focusFinal 10.2s cubic-bezier(.18,.82,.18,1) forwards}
@keyframes focusSky{0%,28%{filter:brightness(.58) saturate(.86)}58%{filter:brightness(1.25) saturate(1.18)}100%{filter:brightness(1.68) saturate(1.24)}}
@keyframes apertureOpen{0%,26%{transform:scale(1);opacity:1}50%{transform:scale(.72);opacity:.92}80%,100%{transform:scale(1.45);opacity:0}}
@keyframes beamFocus{0%,28%{opacity:0;transform:translate(-50%,-50%) scale(.18)}50%{opacity:.92;transform:translate(-50%,-50%) scale(.48)}76%,100%{opacity:.3;transform:translate(-50%,-50%) scale(1.08)}}
@keyframes focusLines{0%,38%{opacity:0;filter:blur(8px)}52%,68%{opacity:.72;filter:blur(0)}88%,100%{opacity:0;filter:blur(8px)}}
@keyframes focusRing{0%,34%{opacity:0;transform:translate(-50%,-50%) scale(.24)}58%{opacity:.95;transform:translate(-50%,-50%) scale(1)}82%,100%{opacity:0;transform:translate(-50%,-50%) scale(1.36)}}
@keyframes copyOut{0%{opacity:0;transform:translateY(18px)}9%,24%{opacity:1;transform:translateY(0)}36%,100%{opacity:0;transform:translateY(-18px)}}
@keyframes focusFinal{0%,76%{opacity:0;transform:translate(-50%,34px) scale(.98);filter:blur(8px)}86%,95%{opacity:1;transform:translate(-50%,0) scale(1);filter:blur(0)}100%{opacity:0;transform:translate(-50%,-12px) scale(1.01);filter:blur(4px)}}
@media (prefers-reduced-motion:reduce){.focus-sky,.aperture,.beam,.focus-lines,.focus-ring,.copy,.enter{animation-duration:1.6s}}
`
  return `<!doctype html><html><head>${buildBaseHead(css, buildRitualAudioScript('work', appSettings, durationSeconds, 'focus'))}</head><body data-ritual-kind="work" data-ritual-mode="focus"><main class="stage focus-stage"><span class="focus-sky"></span><span class="beam"></span><span class="aperture"></span><span class="focus-lines"></span><span class="focus-ring"></span>${buildEntryCopy(appSettings, todayKey, 'FOCUS_LOCK')}<div class="enter">${WORK_STATE_TEXT}</div><span class="grain"></span></main></body></html>`
}

function buildDoorExit(appSettings: AppSettings): string {
  const durationSeconds = getExitRitualDurationMs(appSettings) / 1000
  const line1 = escapeHtml(appSettings.ritualExitLine1 || '明天')
  const line2 = escapeHtml(appSettings.ritualExitLine2 || '从现在开始')
  const css = `
.exit-door-stage{background:linear-gradient(180deg,#f6eee0 0%,#8b8c91 42%,#090909 100%);animation:roomDim 9.6s ease forwards}
.day-glow{position:absolute;inset:0;z-index:1;background:radial-gradient(circle at 50% 42%,rgba(255,255,255,.64),transparent 28%),radial-gradient(ellipse at 50% 82%,rgba(255,151,76,.58),transparent 33%);animation:glowClose 9.6s ease forwards}
.door{position:absolute;top:0;bottom:0;z-index:8;width:50.6vw;background:linear-gradient(90deg,#050505,#111 46%,#030303);box-shadow:inset 0 0 0 1px rgba(255,255,255,.08),inset 0 0 90px rgba(0,0,0,.9)}
.left{left:0;transform:translateX(-56vw);animation:leftClose 9.6s cubic-bezier(.09,.72,.12,1) forwards}
.right{right:0;transform:translateX(56vw);animation:rightClose 9.6s cubic-bezier(.09,.72,.12,1) forwards}
.slit{position:absolute;top:-5%;bottom:-5%;left:50%;z-index:7;width:116vw;transform:translateX(-50%);background:#fff9e8;box-shadow:0 0 36px rgba(255,255,255,.95),0 0 130px rgba(255,140,58,.62);animation:slitClose 9.6s cubic-bezier(.09,.72,.12,1) forwards}
.seal{position:absolute;z-index:11;left:50%;top:50%;width:120px;height:120px;border:1px solid rgba(255,244,216,.42);border-radius:50%;transform:translate(-50%,-50%) scale(.3);opacity:0;box-shadow:0 0 60px rgba(255,255,255,.28);animation:seal 9.6s ease forwards}
.copy{opacity:0;transform:translateY(18px);animation:exitCopy 9.6s ease forwards}
@keyframes roomDim{0%{filter:brightness(1.08)}68%,100%{filter:brightness(.32)}}
@keyframes glowClose{0%{opacity:1}62%{opacity:.45}82%,100%{opacity:0}}
@keyframes leftClose{0%{transform:translateX(-56vw)}36%{transform:translateX(-20vw)}62%{transform:translateX(-3vw)}82%,100%{transform:translateX(0)}}
@keyframes rightClose{0%{transform:translateX(56vw)}36%{transform:translateX(20vw)}62%{transform:translateX(3vw)}82%,100%{transform:translateX(0)}}
@keyframes slitClose{0%{width:116vw;opacity:.2}36%{width:38vw;opacity:.68}62%{width:4vw;opacity:1}82%,100%{width:0;opacity:0}}
@keyframes seal{0%,78%{opacity:0;transform:translate(-50%,-50%) scale(.3)}90%{opacity:.75;transform:translate(-50%,-50%) scale(1)}100%{opacity:0;transform:translate(-50%,-50%) scale(1.22)}}
@keyframes exitCopy{0%,78%{opacity:0;transform:translateY(18px);filter:blur(6px)}92%,100%{opacity:1;transform:translateY(0);filter:blur(0)}}
@media (prefers-reduced-motion:reduce){.exit-door-stage,.day-glow,.left,.right,.slit,.seal,.copy{animation-duration:1.6s}}
`
  return `<!doctype html><html><head>${buildBaseHead(css, buildRitualAudioScript('exit', appSettings, durationSeconds, 'door'))}</head><body data-ritual-kind="exit" data-ritual-mode="door"><main class="stage exit-door-stage"><span class="day-glow"></span><span class="door left"></span><span class="door right"></span><span class="slit"></span><span class="seal"></span><section class="copy"><div class="line1">${line1}</div><div class="line2">${line2}</div></section><span class="grain"></span></main></body></html>`
}

function buildCurtainExit(appSettings: AppSettings): string {
  const durationSeconds = getExitRitualDurationMs(appSettings) / 1000
  const line1 = escapeHtml(appSettings.ritualExitLine1 || '明天')
  const line2 = escapeHtml(appSettings.ritualExitLine2 || '从现在开始')
  const css = `
.exit-curtain-stage{background:radial-gradient(ellipse at 50% 72%,rgba(255,229,178,.64),transparent 25%),linear-gradient(180deg,#f7ecd8 0%,#4c494a 54%,#040404 100%);animation:dim 9s ease forwards}
.proscenium{position:absolute;inset:0;z-index:2;background:linear-gradient(90deg,rgba(0,0,0,.42),transparent 20% 80%,rgba(0,0,0,.42)),linear-gradient(180deg,rgba(0,0,0,.22),transparent 42%,rgba(0,0,0,.65));opacity:.92;animation:prosceniumDim 9s ease forwards}
.spot{position:absolute;z-index:1;left:50%;bottom:-20%;width:86vw;height:76vh;transform:translateX(-50%);background:radial-gradient(ellipse at 50% 100%,rgba(255,240,201,.76),rgba(255,176,86,.23) 36%,transparent 72%);filter:blur(16px);animation:spotClose 9s ease forwards}
.curtain{position:absolute;inset:-120vh 0 auto 0;z-index:9;height:120vh;overflow:hidden;background:linear-gradient(90deg,#020202 0%,#0d0d0f 13%,#050505 27%,#141416 42%,#050505 58%,#111113 75%,#020202 100%);box-shadow:0 44px 140px rgba(0,0,0,.86),inset 0 -28px 60px rgba(255,255,255,.055);animation:curtainDown 9s cubic-bezier(.08,.72,.12,1) forwards}
.curtain::before{content:"";position:absolute;inset:0;background:linear-gradient(90deg,transparent 0 7%,rgba(255,255,255,.055) 11%,transparent 16% 25%,rgba(255,255,255,.045) 31%,transparent 38% 47%,rgba(255,255,255,.05) 52%,transparent 61% 70%,rgba(255,255,255,.045) 77%,transparent 84% 100%),radial-gradient(ellipse at 50% 100%,rgba(255,255,255,.08),transparent 38%);filter:blur(.3px)}
.curtain::after{content:"";position:absolute;left:0;right:0;bottom:0;height:42px;background:linear-gradient(180deg,#1b1b1d,#040404);box-shadow:0 0 46px rgba(255,255,255,.12),0 22px 80px rgba(0,0,0,.82)}
.curtain-shadow{position:absolute;left:-5%;right:-5%;top:0;z-index:8;height:30vh;background:linear-gradient(180deg,rgba(0,0,0,.78),rgba(0,0,0,0));filter:blur(18px);opacity:0;animation:curtainShadow 9s ease forwards}
.copy{z-index:12;opacity:0;transform:translateY(18px);animation:exitCopy 9s ease forwards}
@keyframes dim{0%{filter:brightness(1.08)}72%,100%{filter:brightness(.3)}}
@keyframes prosceniumDim{0%{opacity:.72}72%,100%{opacity:.96}}
@keyframes spotClose{0%{opacity:.9;transform:translateX(-50%) scale(1.05)}70%{opacity:.24;transform:translateX(-50%) scale(.84)}100%{opacity:0;transform:translateX(-50%) scale(.72)}}
@keyframes curtainDown{0%{transform:translateY(0)}30%{transform:translateY(38vh)}70%{transform:translateY(110vh)}100%{transform:translateY(120vh)}}
@keyframes curtainShadow{0%,16%{opacity:0}48%{opacity:.55}88%,100%{opacity:.18}}
@keyframes exitCopy{0%,76%{opacity:0;transform:translateY(18px);filter:blur(6px)}92%,100%{opacity:1;transform:translateY(0);filter:blur(0)}}
@media (prefers-reduced-motion:reduce){.exit-curtain-stage,.proscenium,.spot,.curtain,.curtain-shadow,.copy{animation-duration:1.6s}}
`
  return `<!doctype html><html><head>${buildBaseHead(css, buildRitualAudioScript('exit', appSettings, durationSeconds, 'curtain'))}</head><body data-ritual-kind="exit" data-ritual-mode="curtain"><main class="stage exit-curtain-stage"><span class="spot"></span><span class="proscenium"></span><span class="curtain-shadow"></span><span class="curtain"></span><section class="copy"><div class="line1">${line1}</div><div class="line2">${line2}</div></section><span class="grain"></span></main></body></html>`
}

function buildMoonExit(appSettings: AppSettings): string {
  const durationSeconds = getExitRitualDurationMs(appSettings) / 1000
  const line1 = escapeHtml(appSettings.ritualExitLine1 || '明天')
  const line2 = escapeHtml(appSettings.ritualExitLine2 || '从现在开始')
  const css = `
.moon-stage{background:#05070d}
.sky{position:absolute;inset:0;z-index:1;background:radial-gradient(circle at 13% 18%,rgba(255,255,255,.32) 0 1px,transparent 1.6px),radial-gradient(circle at 80% 24%,rgba(255,255,255,.22) 0 1px,transparent 1.5px),linear-gradient(180deg,#f5e8cf 0%,#656c87 42%,#080b14 100%);animation:night 10.2s ease forwards}
.night-overlay{position:absolute;inset:0;z-index:2;background:linear-gradient(180deg,rgba(0,0,0,0) 0%,rgba(0,0,0,.38) 48%,rgba(0,0,0,.88) 100%);opacity:0;animation:nightOverlay 10.2s ease forwards}
.stars{position:absolute;inset:-10%;z-index:3;background-image:radial-gradient(circle at 16% 20%,rgba(255,255,255,.6) 0 1px,transparent 1.5px),radial-gradient(circle at 70% 18%,rgba(255,255,255,.46) 0 1px,transparent 1.4px),radial-gradient(circle at 42% 38%,rgba(255,255,255,.36) 0 1px,transparent 1.5px);background-size:330px 260px,420px 320px,520px 380px;opacity:0;animation:starsIn 10.2s ease forwards}
.moon{position:absolute;z-index:5;left:74%;bottom:-18vh;width:clamp(96px,10vw,154px);height:clamp(96px,10vw,154px);border-radius:50%;background:radial-gradient(circle at 36% 28%,#fffdf1 0 24%,#fbf1d9 48%,#e7dcc1 76%,#c9c0ac 100%);box-shadow:0 0 30px rgba(255,250,226,.72),0 0 120px rgba(255,250,226,.34),0 0 250px rgba(156,186,255,.16);transform:translateX(-50%);animation:moonRise 10.2s cubic-bezier(.18,.74,.1,1) forwards}
.moon-glow{position:absolute;z-index:4;left:74%;bottom:-24vh;width:clamp(230px,26vw,420px);height:clamp(230px,26vw,420px);border-radius:50%;background:radial-gradient(circle,rgba(255,250,226,.22),rgba(156,186,255,.08) 42%,transparent 70%);filter:blur(12px);transform:translateX(-50%);animation:moonGlowRise 10.2s cubic-bezier(.18,.74,.1,1) forwards}
.horizon{position:absolute;left:-4%;right:-4%;bottom:0;z-index:6;height:30vh;background:linear-gradient(180deg,rgba(0,0,0,0),#010101 66%);clip-path:polygon(0 52%,12% 46%,25% 57%,38% 40%,51% 59%,64% 43%,78% 60%,91% 49%,100% 58%,100% 100%,0 100%)}
.copy{z-index:8;opacity:0;transform:translateY(18px);animation:exitCopy 10.2s ease forwards}
@keyframes night{0%{filter:brightness(1.16) saturate(.9)}100%{filter:brightness(.62) saturate(1.12)}}
@keyframes nightOverlay{0%,24%{opacity:0}82%,100%{opacity:1}}
@keyframes starsIn{0%,45%{opacity:0;transform:scale(1)}76%,100%{opacity:.8;transform:scale(1.04)}}
@keyframes moonRise{0%,20%{bottom:-18vh;opacity:0}48%{opacity:1}82%,100%{bottom:58vh;opacity:.98}}
@keyframes moonGlowRise{0%,20%{bottom:-24vh;opacity:0}52%{opacity:1}82%,100%{bottom:48vh;opacity:.75}}
@keyframes exitCopy{0%,76%{opacity:0;transform:translateY(18px);filter:blur(6px)}93%,100%{opacity:1;transform:translateY(0);filter:blur(0)}}
@media (prefers-reduced-motion:reduce){.sky,.night-overlay,.stars,.moon,.moon-glow,.copy{animation-duration:1.6s}}
`
  return `<!doctype html><html><head>${buildBaseHead(css, buildRitualAudioScript('exit', appSettings, durationSeconds, 'moon'))}</head><body data-ritual-kind="exit" data-ritual-mode="moon"><main class="stage moon-stage"><span class="sky"></span><span class="night-overlay"></span><span class="stars"></span><span class="moon-glow"></span><span class="moon"></span><span class="horizon"></span><section class="copy"><div class="line1">${line1}</div><div class="line2">${line2}</div></section><span class="grain"></span></main></body></html>`
}

export function buildEntryRitualHtml(appSettings: AppSettings, todayKey: string): string {
  const mode = normalizeEntryMode(appSettings.ritualEntryMode)
  if (mode === 'curtain') {
    return buildCurtainEntry(appSettings, todayKey)
  }
  if (mode === 'meteor') {
    return buildMeteorEntry(appSettings, todayKey)
  }
  if (mode === 'sunrise') {
    return buildSunriseEntry(appSettings, todayKey)
  }
  return buildDoorEntry(appSettings, todayKey)
}

export function buildWorkRitualHtml(appSettings: AppSettings, todayKey: string): string {
  const mode = normalizeWorkMode(appSettings.workRitualMode)
  if (mode === 'workbench') {
    return buildWorkbenchEntry(appSettings, todayKey)
  }
  if (mode === 'stamp') {
    return buildStampEntry(appSettings, todayKey)
  }
  if (mode === 'focus') {
    return buildFocusEntry(appSettings, todayKey)
  }
  return buildWorkbenchEntry(appSettings, todayKey)
}

export function buildExitRitualHtml(appSettings: AppSettings): string {
  const mode = normalizeExitMode(appSettings.ritualExitMode)
  if (mode === 'curtain') {
    return buildCurtainExit(appSettings)
  }
  if (mode === 'moon') {
    return buildMoonExit(appSettings)
  }
  return buildDoorExit(appSettings)
}
