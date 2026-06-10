let ctx: AudioContext | null = null
let muted = false
let master: GainNode | null = null
let delay: DelayNode | null = null
let delayGain: GainNode | null = null
let noiseBuffer: AudioBuffer | null = null

export const initAudio = () => {
  if (!ctx) {
    ctx = new AudioContext()
    const compressor = ctx.createDynamicsCompressor()
    compressor.threshold.value = -20
    compressor.knee.value = 18
    compressor.ratio.value = 4
    compressor.attack.value = 0.008
    compressor.release.value = 0.22

    master = ctx.createGain()
    master.gain.value = 0.68
    delay = ctx.createDelay(0.5)
    delay.delayTime.value = 0.11
    delayGain = ctx.createGain()
    delayGain.gain.value = 0.11

    master.connect(compressor)
    master.connect(delay)
    delay.connect(delayGain)
    delayGain.connect(compressor)
    compressor.connect(ctx.destination)
  }
  if (ctx.state === 'suspended') ctx.resume()
}

export const toggleMute = () => { muted = !muted; return muted }
export const isMuted = () => muted

const ac = () => {
  initAudio()
  return ctx!
}

function tone(
  c: AudioContext,
  type: OscillatorType,
  freq: number,
  startTime: number,
  duration: number,
  peak: number,
  freqEnd?: number,
) {
  const o = c.createOscillator()
  const g = c.createGain()
  o.type = type
  o.frequency.setValueAtTime(freq, startTime)
  if (freqEnd) o.frequency.exponentialRampToValueAtTime(freqEnd, startTime + duration)
  o.connect(g)
  g.connect(master!)
  g.gain.setValueAtTime(0.0001, startTime)
  g.gain.linearRampToValueAtTime(peak, startTime + 0.015)
  g.gain.exponentialRampToValueAtTime(0.0001, startTime + duration)
  o.start(startTime)
  o.stop(startTime + duration + 0.01)
}

function bell(
  c: AudioContext,
  frequency: number,
  startTime: number,
  duration: number,
  level: number,
) {
  const output = c.createGain()
  output.gain.setValueAtTime(0.0001, startTime)
  output.gain.exponentialRampToValueAtTime(level, startTime + 0.008)
  output.gain.exponentialRampToValueAtTime(0.0001, startTime + duration)
  output.connect(master!)

  ;[1, 2.01, 3.97].forEach((ratio, index) => {
    const oscillator = c.createOscillator()
    const partial = c.createGain()
    oscillator.type = 'sine'
    oscillator.frequency.setValueAtTime(frequency * ratio, startTime)
    oscillator.frequency.exponentialRampToValueAtTime(
      frequency * ratio * (index === 0 ? 0.985 : 0.96),
      startTime + duration,
    )
    partial.gain.value = [1, 0.22, 0.07][index]
    oscillator.connect(partial)
    partial.connect(output)
    oscillator.start(startTime)
    oscillator.stop(startTime + duration + 0.02)
  })
}

function noise(c: AudioContext) {
  if (noiseBuffer?.sampleRate === c.sampleRate) return noiseBuffer
  noiseBuffer = c.createBuffer(1, Math.ceil(c.sampleRate * 0.5), c.sampleRate)
  const data = noiseBuffer.getChannelData(0)
  let previous = 0
  for (let i = 0; i < data.length; i++) {
    const white = Math.random() * 2 - 1
    previous = previous * 0.72 + white * 0.28
    data[i] = previous
  }
  return noiseBuffer
}

export function playSelect() {
  if (muted) return
  const c = ac()
  tone(c, 'sine', 880, c.currentTime, 0.16, 0.055)
  tone(c, 'sine', 1320, c.currentTime + 0.035, 0.13, 0.035)
}

export function playJump(progress = 0) {
  if (muted) return
  const c = ac()
  const intensity = Math.min(1, Math.max(0, progress))
  const start = c.currentTime
  const src = c.createBufferSource()
  src.buffer = noise(c)
  const bpf = c.createBiquadFilter()
  bpf.type = 'bandpass'
  bpf.frequency.setValueAtTime(340, start)
  bpf.frequency.exponentialRampToValueAtTime(1850 + intensity * 420, start + 0.16)
  bpf.frequency.exponentialRampToValueAtTime(620, start + 0.31)
  bpf.Q.value = 0.72
  const g = c.createGain()
  g.gain.setValueAtTime(0.0001, start)
  g.gain.linearRampToValueAtTime(0.042, start + 0.07)
  g.gain.exponentialRampToValueAtTime(0.0001, start + 0.32)
  src.connect(bpf)
  bpf.connect(g)
  g.connect(master!)
  src.start(start)
  src.stop(start + 0.33)

  const pitch = 1 + intensity * 0.055
  tone(c, 'sine', 210 * pitch, start, 0.22, 0.032, 390 * pitch)
  tone(c, 'sine', 128, start + 0.205, 0.24, 0.075, 72)
  bell(c, 735 * pitch, start + 0.225, 0.38, 0.038)
  bell(c, 1100 * pitch, start + 0.242, 0.26, 0.017)
}

export function playCombo(streak: number) {
  if (muted) return
  const c = ac()
  const base = 440 * Math.pow(1.09, Math.min(streak - 2, 8))
  tone(c, 'sine', base, c.currentTime, 0.28, 0.15)
  tone(c, 'sine', base * 1.5, c.currentTime + 0.07, 0.22, 0.10)
  tone(c, 'sine', base * 2, c.currentTime + 0.14, 0.18, 0.07)
}

export function playWin() {
  if (muted) return
  const c = ac()
  const notes = [523.25, 659.25, 783.99, 1046.5, 1318.5]
  notes.forEach((freq, i) => {
    const t = c.currentTime + i * 0.10
    tone(c, 'sine', freq, t, 0.55, 0.16)
    tone(c, 'triangle', freq * 2, t + 0.01, 0.30, 0.06)
  })
}

export function playGameOver() {
  if (muted) return
  const c = ac()
  const notes = [392, 370, 349, 294]
  notes.forEach((freq, i) => {
    tone(c, 'sine', freq, c.currentTime + i * 0.22, 0.65, 0.11)
  })
}
