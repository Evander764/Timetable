import type { AppSettings, RitualEntryMode, RitualExitMode } from '@shared/types/app'

const ENTRY_RITUAL_DURATIONS_MS: Record<RitualEntryMode, number> = {
  door: 10_800,
  curtain: 9_800,
  meteor: 11_600,
  sunrise: 10_800,
}

const EXIT_RITUAL_DURATIONS_MS: Record<RitualExitMode, number> = {
  door: 9_800,
  curtain: 9_200,
  moon: 10_400,
}

const ENTRY_FINAL_TEXT = '开启灿烂的一天'

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

export function getEntryRitualDurationMs(appSettings: AppSettings): number {
  return ENTRY_RITUAL_DURATIONS_MS[normalizeEntryMode(appSettings.ritualEntryMode)]
}

export function getExitRitualDurationMs(appSettings: AppSettings): number {
  return EXIT_RITUAL_DURATIONS_MS[normalizeExitMode(appSettings.ritualExitMode)]
}

function buildRitualAudioScript(
  kind: 'entry' | 'exit',
  appSettings: AppSettings,
  durationSeconds: number,
  mode: RitualEntryMode | RitualExitMode,
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

  const playEntry = (ctx, master) => {
    ramp(master.gain, targetVolume, ctx.currentTime + 1.1);
    ramp(master.gain, targetVolume * 0.82, ctx.currentTime + durationSeconds - 1.35);
    ramp(master.gain, 0.0001, ctx.currentTime + durationSeconds - 0.16);

    if (ritualMode === 'meteor') {
      addTone(ctx, master, 38, 'sine', 0.42, 0, durationSeconds - 0.3, 54);
      addTone(ctx, master, 76, 'triangle', 0.16, 0.3, durationSeconds - 0.9, 112);
      addTone(ctx, master, 420, 'sine', 0.036, 2.3, 4.35, 2100);
      addTone(ctx, master, 860, 'triangle', 0.027, 2.36, 4.1, 3200);
      addNoise(ctx, master, 2.05, 4.75, 0.11, 'highpass', 3600);
      addImpact(ctx, master, 4.28, 54, 0.3);
      addBell(ctx, master, 5.4, 392, 0.07);
      addTone(ctx, master, 196, 'sine', 0.07, 5.5, durationSeconds - 0.9, 330);
      addTone(ctx, master, 294, 'triangle', 0.048, 6.0, durationSeconds - 1.0, 441);
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

      if (ritualKind === 'entry') playEntry(ctx, master);
      else playExit(ctx, master);

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
.meteor-stage{background:#02040a}
.stars{position:absolute;inset:-10%;z-index:1;background-image:radial-gradient(circle at 12% 20%,rgba(255,255,255,.62) 0 1px,transparent 1.4px),radial-gradient(circle at 76% 16%,rgba(255,255,255,.45) 0 1px,transparent 1.5px),radial-gradient(circle at 58% 40%,rgba(255,255,255,.38) 0 1px,transparent 1.6px),radial-gradient(circle at 34% 64%,rgba(255,255,255,.34) 0 1px,transparent 1.5px);background-size:360px 260px,420px 300px,280px 240px,500px 360px;animation:stars 11.4s ease forwards}
.dawn-field{position:absolute;inset:0;z-index:2;background:radial-gradient(ellipse at 28% 82%,rgba(255,209,132,.9),transparent 24%),radial-gradient(ellipse at 42% 102%,rgba(255,248,220,.96),transparent 28%),linear-gradient(180deg,#02040a 0%,#071020 48%,#f0b56b 100%);opacity:0;animation:dawnField 11.4s cubic-bezier(.18,.74,.16,1) forwards}
.aurora{position:absolute;inset:-20%;z-index:3;background:conic-gradient(from 228deg at 44% 40%,transparent 0 32deg,rgba(116,168,255,.24) 42deg,rgba(255,181,98,.32) 58deg,transparent 72deg 360deg);filter:blur(42px);opacity:0;animation:aurora 11.4s ease forwards}
.wake{position:absolute;z-index:7;right:-52vw;top:5vh;width:168vw;height:22vh;background:linear-gradient(90deg,rgba(255,255,255,.82) 0%,rgba(255,161,83,.5) 12%,rgba(255,247,220,.28) 24%,transparent 62%);filter:blur(18px);transform:rotate(-19deg);opacity:0;animation:wake 11.4s cubic-bezier(.2,.76,.12,1) forwards}
.meteor-tail{position:absolute;z-index:9;right:-40vw;top:15vh;width:46vw;height:4px;background:linear-gradient(90deg,#fffefa,rgba(255,158,78,.58),transparent);box-shadow:0 0 24px rgba(255,255,255,.9),0 0 100px rgba(255,114,38,.78),0 0 180px rgba(255,215,142,.45);transform:rotate(-19deg);opacity:0;animation:meteorTail 11.4s cubic-bezier(.12,.82,.16,1) forwards}
.meteor-core{position:absolute;z-index:10;right:5vw;top:15vh;width:18px;height:18px;border-radius:50%;background:#fffefa;box-shadow:0 0 22px #fff,0 0 74px rgba(255,132,54,.95),0 0 160px rgba(255,228,168,.6);opacity:0;animation:meteorCore 11.4s cubic-bezier(.12,.82,.16,1) forwards}
.shock{position:absolute;z-index:8;left:12vw;bottom:17vh;width:16vw;aspect-ratio:1;border:1px solid rgba(255,247,222,.86);border-radius:50%;box-shadow:0 0 48px rgba(255,255,255,.45),inset 0 0 60px rgba(255,180,92,.36);opacity:0;transform:scale(.2);animation:shock 11.4s ease forwards}
.horizon{position:absolute;left:-5%;right:-5%;bottom:-2%;z-index:5;height:30vh;background:linear-gradient(180deg,transparent,rgba(0,0,0,.52) 72%,#020202);clip-path:polygon(0 50%,12% 42%,25% 58%,38% 36%,49% 55%,63% 39%,76% 61%,88% 48%,100% 57%,100% 100%,0 100%);opacity:.72}
.copy{animation:copyOut 11.4s ease forwards}
.enter{top:54%;animation:entryFinal 11.4s cubic-bezier(.18,.82,.18,1) forwards}
@keyframes stars{0%,32%{opacity:1;transform:scale(1)}68%{opacity:.42;transform:scale(1.04)}100%{opacity:.08;transform:scale(1.08)}}
@keyframes dawnField{0%,36%{opacity:0;filter:brightness(.8)}56%{opacity:.42;filter:brightness(1.5)}84%,100%{opacity:1;filter:brightness(2.08)}}
@keyframes aurora{0%,32%{opacity:0;transform:rotate(0)}49%{opacity:.85}74%,100%{opacity:.26;transform:rotate(4deg)}}
@keyframes wake{0%,25%{opacity:0;transform:translate(0,0) rotate(-19deg) scaleX(.82)}34%{opacity:.98}48%{opacity:.82;transform:translate(-116vw,43vh) rotate(-19deg) scaleX(1.08)}58%,100%{opacity:0;transform:translate(-140vw,49vh) rotate(-19deg) scaleX(1.2)}}
@keyframes meteorTail{0%,24%{opacity:0;transform:translate(0,0) rotate(-19deg) scaleX(.82)}31%{opacity:1}47%{opacity:1;transform:translate(-128vw,45vh) rotate(-19deg) scaleX(1.22)}55%,100%{opacity:0;transform:translate(-144vw,50vh) rotate(-19deg) scaleX(1.35)}}
@keyframes meteorCore{0%,24%{opacity:0;transform:translate(0,0) scale(.7)}31%{opacity:1}47%{opacity:1;transform:translate(-128vw,45vh) scale(1.1)}55%,100%{opacity:0;transform:translate(-144vw,50vh) scale(.7)}}
@keyframes shock{0%,43%{opacity:0;transform:scale(.2)}49%{opacity:.95;transform:scale(1)}68%,100%{opacity:0;transform:scale(3.2)}}
@keyframes copyOut{0%{opacity:0;transform:translateY(18px)}9%,23%{opacity:1;transform:translateY(0)}32%,100%{opacity:0;transform:translateY(-18px)}}
@keyframes entryFinal{0%,75%{opacity:0;transform:translate(-50%,38px) scale(.98);filter:blur(8px)}84%,96%{opacity:1;transform:translate(-50%,0) scale(1);filter:blur(0)}100%{opacity:0;transform:translate(-50%,-14px) scale(1.01);filter:blur(5px)}}
@media (prefers-reduced-motion:reduce){.stars,.dawn-field,.aurora,.wake,.meteor-tail,.meteor-core,.shock,.copy,.enter{animation-duration:1.6s}}
`
  return `<!doctype html><html><head>${buildBaseHead(css, buildRitualAudioScript('entry', appSettings, durationSeconds, 'meteor'))}</head><body data-ritual-kind="entry" data-ritual-mode="meteor"><main class="stage meteor-stage"><span class="stars"></span><span class="dawn-field"></span><span class="aurora"></span><span class="wake"></span><span class="meteor-tail"></span><span class="meteor-core"></span><span class="shock"></span><span class="horizon"></span>${buildEntryCopy(appSettings, todayKey, 'METEOR_DAWN')}<div class="enter">${ENTRY_FINAL_TEXT}</div><span class="grain"></span></main></body></html>`
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
