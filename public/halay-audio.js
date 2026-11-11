// Two answering phrases and a turnaround in D. Steps are eighth notes;
// a gap in the score is a breath between phrases.
const melody = new Map([
  [0, [69, 1.6]], [2, [67, .84]], [3, [66, .84]], [4, [67, 1.62]], [6, [69, .9]],
  [8, [70, 1.6, true]], [10, [69, .85]], [11, [67, .84]], [12, [66, 2.7]],
  [16, [67, 1.6]], [18, [66, .88]], [19, [63, .9]], [20, [62, 1.65]], [22, [63, .85]],
  [24, [66, 1.7, true]], [26, [67, .83]], [27, [66, .83]], [28, [62, 2.8]],
  [32, [69, 1.55]], [34, [70, .85]], [35, [72, .86]], [36, [74, 1.65, true]], [38, [72, .9]],
  [40, [70, 1.6]], [42, [69, .85]], [43, [67, .85]], [44, [69, 2.6, true]],
  [48, [67, 1.6]], [50, [66, .86]], [51, [63, .82]], [52, [66, 1.55]], [54, [67, .86]],
  [56, [66, 1.6, true]], [58, [63, .86]], [59, [62, .83]], [60, [62, 2.75]]
]);

function noiseBuffer(ctx, duration) {
  const buffer = ctx.createBuffer(1, Math.ceil(ctx.sampleRate * duration), ctx.sampleRate);
  const samples = buffer.getChannelData(0);
  for (let i = 0; i < samples.length; i++) samples[i] = Math.random() * 2 - 1;
  return buffer;
}

function createBand(ctx) {
  const output = ctx.createGain();
  output.gain.value = 0;
  output.connect(ctx.destination);

  // One early reflection puts the reed and the drum in the same small square.
  const echo = ctx.createDelay(.2);
  const reflection = ctx.createGain();
  echo.delayTime.value = .105;
  reflection.gain.value = .13;
  echo.connect(reflection).connect(output);

  const wave = ctx.createPeriodicWave(new Float32Array(11),
    Float32Array.from([0, 1, .64, .57, .21, .29, .11, .12, .06, .04, .02]));
  const noise = noiseBuffer(ctx, .32);

  function reed(at, note, duration, turn) {
    const hz = 440 * 2 ** ((note - 69) / 12);
    const tone = ctx.createOscillator();
    tone.setPeriodicWave(wave);
    tone.frequency.value = hz;
    // A short upper grace note and a slight scoop at the reed attack.
    tone.detune.setValueAtTime(turn ? 130 : -13, at);
    tone.detune.linearRampToValueAtTime(0, at + (turn ? .047 : .026));

    const vibrato = ctx.createOscillator();
    vibrato.frequency.value = 5.7;
    const depth = ctx.createGain();
    depth.gain.setValueAtTime(0, at);
    depth.gain.linearRampToValueAtTime(12, at + Math.min(.17, duration * .42));
    vibrato.connect(depth).connect(tone.detune);

    const warmth = ctx.createBiquadFilter();
    warmth.type = 'lowpass';
    warmth.frequency.value = 2500;
    warmth.Q.value = .45;
    const breath = ctx.createGain();
    breath.gain.setValueAtTime(.0001, at);
    breath.gain.exponentialRampToValueAtTime(.28, at + .034);
    breath.gain.linearRampToValueAtTime(.235, at + duration * .68);
    breath.gain.exponentialRampToValueAtTime(.0001, at + duration);
    tone.connect(warmth).connect(breath);
    breath.connect(output);
    breath.connect(echo);
    tone.start(at);
    vibrato.start(at);
    tone.stop(at + duration + .01);
    vibrato.stop(at + duration + .01);
    tone.onended = () => {
      tone.disconnect(); warmth.disconnect(); breath.disconnect();
      vibrato.disconnect(); depth.disconnect();
    };
  }

  function skin(at, strength) {
    const membrane = ctx.createOscillator();
    const volume = ctx.createGain();
    membrane.frequency.setValueAtTime(126, at);
    membrane.frequency.exponentialRampToValueAtTime(72, at + .043);
    membrane.frequency.exponentialRampToValueAtTime(56, at + .24);
    volume.gain.setValueAtTime(.001, at);
    volume.gain.linearRampToValueAtTime(strength * .72, at + .005);
    volume.gain.exponentialRampToValueAtTime(.001, at + .28);
    membrane.connect(volume).connect(output);
    membrane.start(at);
    membrane.stop(at + .29);
    membrane.onended = () => { membrane.disconnect(); volume.disconnect(); };
  }

  function stick(at, strength, low = false) {
    const hit = ctx.createBufferSource();
    hit.buffer = noise;
    const head = ctx.createBiquadFilter();
    head.type = 'bandpass';
    head.frequency.value = low ? 840 : 1750;
    head.Q.value = low ? .85 : 1.25;
    const volume = ctx.createGain();
    const tail = low ? .085 : .062;
    volume.gain.setValueAtTime(.001, at);
    volume.gain.linearRampToValueAtTime(strength, at + .003);
    volume.gain.exponentialRampToValueAtTime(.001, at + tail);
    hit.connect(head).connect(volume);
    volume.connect(output);
    hit.start(at, Math.random() * .12, tail);
    hit.onended = () => { hit.disconnect(); head.disconnect(); volume.disconnect(); };
  }

  function beat(at, step, eighth) {
    const pulse = step % 8;
    if (pulse === 0 || pulse === 4 || step % 16 === 11) {
      const strength = pulse === 0 ? 1 : pulse === 4 ? .82 : .48;
      skin(at, strength);
      stick(at, strength * .5, true);
    }
    if (pulse === 2 || pulse === 6) stick(at + .008, pulse === 2 ? .48 : .55);
    if (pulse === 3 || pulse === 7) stick(at + .013, .18);
    if (step % 16 === 15) stick(at + eighth * .53, .26);
    const note = melody.get(step);
    if (note) reed(at + .009, note[0], note[1] * eighth, note[2]);
  }

  return {output, beat, release() { output.disconnect(); echo.disconnect(); reflection.disconnect(); }};
}

export function makeHalayAudio() {
  let ctx;
  let band;
  let enabled = false;
  let active = true;
  let destroyed = false;
  let tempo = 108;
  let timer, next, step;

  function schedule() {
    if (!band || ctx.state !== 'running') return;
    const now = ctx.currentTime;
    const eighth = 30 / tempo;
    // Skip elapsed steps if this page was throttled while in the background.
    if (next < now) {
      const skipped = Math.ceil((now - next) / eighth);
      step = (step + skipped) % 64;
      next += skipped * eighth;
    }
    while (next < now + .22) {
      band.beat(next, step, eighth);
      next += eighth;
      step = (step + 1) % 64;
    }
  }

  function stop() {
    clearInterval(timer);
    if (!band) return;
    const previous = band;
    band = null;
    const gain = previous.output.gain;
    const now = ctx.currentTime;
    gain.cancelScheduledValues(now);
    gain.setTargetAtTime(0, now, .009);
    setTimeout(() => previous.release(), 65);
  }

  async function sync() {
    if (destroyed || !enabled || !active) { stop(); return false; }
    const Audio = globalThis.AudioContext || globalThis.webkitAudioContext;
    if (!Audio) throw new Error('Bu tarayıcı Web Audio desteklemiyor.');
    ctx ??= new Audio();
    if (ctx.state !== 'running') await ctx.resume();
    if (destroyed || !enabled || !active) return false;
    if (band) return true;
    band = createBand(ctx);
    const now = ctx.currentTime;
    band.output.gain.setTargetAtTime(.32, now, .018);
    next = now + .035;
    step = 0;
    schedule();
    timer = setInterval(schedule, 42);
    return true;
  }

  return {
    async setEnabled(value) { enabled = Boolean(value); return sync(); },
    async setActive(value) { active = Boolean(value); return sync(); },
    setTempo(bpm) {
      if (Number.isFinite(bpm)) tempo = Math.min(196, Math.max(60, bpm));
    },
    destroy() {
      if (destroyed) return;
      destroyed = true;
      stop();
      if (ctx) setTimeout(() => ctx.close().catch(() => {}), 75);
    }
  };
}
