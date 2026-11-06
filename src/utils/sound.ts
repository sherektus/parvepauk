// Sailor Sea Shanty melody in D minor (frequencies in Hz, 0 = rest)
const SHANTY_MELODY: [number, number][] = [
  // Bar 1: D4, A4, A4, A4, G4, A4, Bb4, A4
  [293.66, 1], [440.0, 1], [440.0, 1], [440.0, 1],
  [392.0, 1], [440.0, 1], [466.16, 1], [440.0, 1],
  // Bar 2: G4, F4, E4, D4, F4, G4, A4, 0
  [392.0, 1], [349.23, 1], [329.63, 1], [293.66, 1],
  [349.23, 1], [392.0, 1], [440.0, 1], [0, 1],
  // Bar 3: D5, C5, Bb4, A4, G4, A4, F4, D4
  [587.33, 1], [523.25, 1], [466.16, 1], [440.0, 1],
  [392.0, 1], [440.0, 1], [349.23, 1], [293.66, 1],
  // Bar 4: E4, F4, G4, E4, D4, 293.66, 0
  [329.63, 1], [349.23, 1], [392.0, 1], [329.63, 1],
  [293.66, 1], [293.66, 2], [0, 1],
  // Bar 5 (Heroic High Part): F4, F4, G4, A4, Bb4, A4, G4, F4
  [349.23, 1], [349.23, 1], [392.0, 1], [440.0, 1],
  [466.16, 1], [440.0, 1], [392.0, 1], [349.23, 1],
  // Bar 6: E4, E4, F4, G4, A4, G4, F4, E4
  [329.63, 1], [329.63, 1], [349.23, 1], [392.0, 1],
  [440.0, 1], [392.0, 1], [349.23, 1], [329.63, 1],
  // Bar 7: D4, F4, A4, D5, C5, Bb4, A4, G4
  [293.66, 1], [349.23, 1], [440.0, 1], [587.33, 1],
  [523.25, 1], [466.16, 1], [440.0, 1], [392.0, 1],
  // Bar 8: F4, E4, D4, A3, D4, D4, 0
  [349.23, 1], [329.63, 1], [293.66, 1], [220.0, 1],
  [293.66, 1], [293.66, 2], [0, 1],
]

const SHANTY_BASS: number[] = [
  146.83, 110.0, 146.83, 110.0, // Dm
  196.0, 174.61, 164.81, 220.0, // Gm -> F -> A
  146.83, 130.81, 116.54, 110.0, // Dm -> C -> Bb -> A
  164.81, 110.0, 146.83, 146.83, // A -> Dm
  174.61, 130.81, 116.54, 174.61, // F -> C -> Bb -> F
  164.81, 130.81, 164.81, 110.0, // A -> C -> A
  146.83, 174.61, 196.0, 110.0, // Dm -> F -> Gm -> A
  174.61, 164.81, 146.83, 146.83, // F -> A -> Dm
]

class SoundEngine {
  private ctx: AudioContext | null = null
  private masterGain: GainNode | null = null
  private muted: boolean = false
  private volume: number = 0.7
  private bgmStarted: boolean = false
  private stepIdx: number = 0
  private bassIdx: number = 0

  constructor() {
    const saved = localStorage.getItem('parvepauk_muted')
    if (saved === 'true') {
      this.muted = true
    }
    const savedVol = localStorage.getItem('parvepauk_volume')
    if (savedVol !== null) {
      const parsed = parseFloat(savedVol)
      if (!Number.isNaN(parsed)) {
        this.volume = Math.max(0, Math.min(1, parsed))
      }
    }

    if (typeof window !== 'undefined') {
      const unlock = () => {
        this.startBackgroundMusic()
      }
      window.addEventListener('pointerdown', unlock, { once: true })
      window.addEventListener('keydown', unlock, { once: true })
    }
  }

  private getContext(): AudioContext | null {
    if (this.muted || this.volume <= 0) return null
    if (!this.ctx && typeof window !== 'undefined') {
      const AudioCtx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext
      if (AudioCtx) {
        this.ctx = new AudioCtx()
        this.masterGain = this.ctx.createGain()
        this.masterGain.gain.setValueAtTime(this.volume, this.ctx.currentTime)
        this.masterGain.connect(this.ctx.destination)
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {})
    }
    if (this.masterGain && this.ctx) {
      this.masterGain.gain.setValueAtTime(this.muted ? 0 : this.volume, this.ctx.currentTime)
    }
    return this.ctx
  }

  private getOutputNode(ctx: AudioContext): AudioNode {
    return this.masterGain || ctx.destination
  }

  public getVolume(): number {
    return this.volume
  }

  public setVolume(val: number) {
    this.volume = Math.max(0, Math.min(1, val))
    localStorage.setItem('parvepauk_volume', String(this.volume))
    if (this.volume > 0 && this.muted) {
      this.muted = false
      localStorage.setItem('parvepauk_muted', 'false')
    }
    if (this.ctx && this.masterGain) {
      this.masterGain.gain.setValueAtTime(
        this.muted ? 0 : this.volume,
        this.ctx.currentTime
      )
    }
    this.startBackgroundMusic()
  }

  public startBackgroundMusic() {
    if (this.bgmStarted) return
    this.bgmStarted = true

    const stepMs = 195 // Bouncy sea shanty tempo (~154 BPM eighth notes)
    let holdTicks = 0

    window.setInterval(() => {
      if (this.muted) return
      const ctx = this.getContext()
      if (!ctx) return

      const now = ctx.currentTime

      // Play bass and deck stomp every 2 eighth-note steps
      if (this.stepIdx % 2 === 0) {
        const bassFreq = SHANTY_BASS[this.bassIdx % SHANTY_BASS.length]
        this.bassIdx++

        // Pirate Tuba / Bassline
        const bOsc = ctx.createOscillator()
        const bGain = ctx.createGain()
        bOsc.type = 'triangle'
        bOsc.frequency.setValueAtTime(bassFreq, now)
        bGain.gain.setValueAtTime(0.065, now)
        bGain.gain.exponentialRampToValueAtTime(0.002, now + 0.28)
        bOsc.connect(bGain)
        bGain.connect(this.getOutputNode(ctx))
        bOsc.start(now)
        bOsc.stop(now + 0.3)

        // Sailor Boot Stomp on beats 0 & 4
        if (this.bassIdx % 2 === 1) {
          const kick = ctx.createOscillator()
          const kGain = ctx.createGain()
          kick.type = 'sine'
          kick.frequency.setValueAtTime(110, now)
          kick.frequency.exponentialRampToValueAtTime(38, now + 0.1)
          kGain.gain.setValueAtTime(0.08, now)
          kGain.gain.exponentialRampToValueAtTime(0.001, now + 0.11)
          kick.connect(kGain)
          kGain.connect(this.getOutputNode(ctx))
          kick.start(now)
          kick.stop(now + 0.12)
        }
      }

      if (holdTicks > 0) {
        holdTicks--
        this.stepIdx++
        return
      }

      const [freq, durSteps] = SHANTY_MELODY[this.stepIdx % SHANTY_MELODY.length]
      holdTicks = durSteps - 1
      this.stepIdx++

      if (freq > 0) {
        const durSec = ( stepMs * durSteps ) / 1000 * 0.88
        // Dual detuned oscillators for a rich sea-accordion chiptune feel
        const osc1 = ctx.createOscillator()
        const osc2 = ctx.createOscillator()
        const gain = ctx.createGain()

        osc1.type = 'square'
        osc2.type = 'sawtooth'
        osc1.frequency.setValueAtTime(freq, now)
        osc2.frequency.setValueAtTime(freq * 1.004, now)

        gain.gain.setValueAtTime(0.042, now)
        gain.gain.exponentialRampToValueAtTime(0.002, now + durSec)

        osc1.connect(gain)
        osc2.connect(gain)
        gain.connect(this.getOutputNode(ctx))

        osc1.start(now)
        osc2.start(now)
        osc1.stop(now + durSec + 0.01)
        osc2.stop(now + durSec + 0.01)
      }
    }, stepMs)
  }

  public isMuted(): boolean {
    return this.muted
  }

  public toggleMute(): boolean {
    this.muted = !this.muted
    localStorage.setItem('parvepauk_muted', String(this.muted))
    if (!this.muted) {
      this.startBackgroundMusic()
      this.playClick()
    }
    return this.muted
  }

  public playClick() {
    this.startBackgroundMusic()
    const ctx = this.getContext()
    if (!ctx) return
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()
    osc.type = 'square'
    osc.frequency.setValueAtTime(520, ctx.currentTime)
    osc.frequency.exponentialRampToValueAtTime(760, ctx.currentTime + 0.06)
    gain.gain.setValueAtTime(0.08, ctx.currentTime)
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.06)
    osc.connect(gain)
    gain.connect(this.getOutputNode(ctx))
    osc.start()
    osc.stop(ctx.currentTime + 0.065)
  }

  public playCannonFire() {
    const ctx = this.getContext()
    if (!ctx) return

    const osc = ctx.createOscillator()
    const oscGain = ctx.createGain()
    osc.type = 'sawtooth'
    osc.frequency.setValueAtTime(160, ctx.currentTime)
    osc.frequency.exponentialRampToValueAtTime(32, ctx.currentTime + 0.35)
    oscGain.gain.setValueAtTime(0.32, ctx.currentTime)
    oscGain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.38)
    osc.connect(oscGain)
    oscGain.connect(this.getOutputNode(ctx))
    osc.start()
    osc.stop(ctx.currentTime + 0.4)

    const bufferSize = ctx.sampleRate * 0.25
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate)
    const data = buffer.getChannelData(0)
    for (let i = 0; i < bufferSize; i++) {
      data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (bufferSize * 0.35))
    }
    const noise = ctx.createBufferSource()
    const noiseGain = ctx.createGain()
    noise.buffer = buffer
    noiseGain.gain.setValueAtTime(0.22, ctx.currentTime)
    noiseGain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.25)
    noise.connect(noiseGain)
    noiseGain.connect(this.getOutputNode(ctx))
    noise.start()
  }

  public playHit() {
    const ctx = this.getContext()
    if (!ctx) return
    const now = ctx.currentTime

    // Deep explosion sub-boom
    const boomOsc = ctx.createOscillator()
    const boomGain = ctx.createGain()
    boomOsc.type = 'sawtooth'
    boomOsc.frequency.setValueAtTime(190, now)
    boomOsc.frequency.exponentialRampToValueAtTime(24, now + 0.48)
    boomGain.gain.setValueAtTime(0.42, now)
    boomGain.gain.exponentialRampToValueAtTime(0.001, now + 0.5)
    boomOsc.connect(boomGain)
    boomGain.connect(this.getOutputNode(ctx))
    boomOsc.start(now)
    boomOsc.stop(now + 0.52)

    // Crunchy explosion noise burst
    const bufferSize = Math.floor(ctx.sampleRate * 0.42)
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate)
    const data = buffer.getChannelData(0)
    for (let i = 0; i < bufferSize; i++) {
      data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / bufferSize, 1.4)
    }
    const noise = ctx.createBufferSource()
    const filter = ctx.createBiquadFilter()
    filter.type = 'lowpass'
    filter.frequency.setValueAtTime(1400, now)
    filter.frequency.exponentialRampToValueAtTime(180, now + 0.42)

    const noiseGain = ctx.createGain()
    noiseGain.gain.setValueAtTime(0.38, now)
    noiseGain.gain.exponentialRampToValueAtTime(0.005, now + 0.42)

    noise.buffer = buffer
    noise.connect(filter)
    filter.connect(noiseGain)
    noiseGain.connect(this.getOutputNode(ctx))
    noise.start(now)

    // Retro impact crunch notes
    const notes = [320, 210, 110]
    notes.forEach((freq, i) => {
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()
      osc.type = 'square'
      osc.frequency.setValueAtTime(freq, now + i * 0.045)
      gain.gain.setValueAtTime(0.22, now + i * 0.045)
      gain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.045 + 0.12)
      osc.connect(gain)
      gain.connect(this.getOutputNode(ctx))
      osc.start(now + i * 0.045)
      osc.stop(now + i * 0.045 + 0.13)
    })
  }

  public playShieldBlock() {
    const ctx = this.getContext()
    if (!ctx) return
    const notes = [440, 660, 880]
    notes.forEach((freq, i) => {
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()
      osc.type = 'triangle'
      osc.frequency.setValueAtTime(freq, ctx.currentTime + i * 0.04)
      gain.gain.setValueAtTime(0.16, ctx.currentTime + i * 0.04)
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + i * 0.04 + 0.12)
      osc.connect(gain)
      gain.connect(this.getOutputNode(ctx))
      osc.start(ctx.currentTime + i * 0.04)
      osc.stop(ctx.currentTime + i * 0.04 + 0.13)
    })
  }

  public playSplash() {
    const ctx = this.getContext()
    if (!ctx) return
    const bufferSize = ctx.sampleRate * 0.35
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate)
    const data = buffer.getChannelData(0)
    for (let i = 0; i < bufferSize; i++) {
      data[i] = (Math.random() * 2 - 1) * Math.sin((i / bufferSize) * Math.PI)
    }
    const noise = ctx.createBufferSource()
    const filter = ctx.createBiquadFilter()
    filter.type = 'bandpass'
    filter.frequency.setValueAtTime(900, ctx.currentTime)
    filter.frequency.exponentialRampToValueAtTime(320, ctx.currentTime + 0.35)
    const gain = ctx.createGain()
    gain.gain.setValueAtTime(0.24, ctx.currentTime)
    gain.gain.exponentialRampToValueAtTime(0.005, ctx.currentTime + 0.35)

    noise.buffer = buffer
    noise.connect(filter)
    filter.connect(gain)
    gain.connect(this.getOutputNode(ctx))
    noise.start()
  }

  public playWheelTick() {
    const ctx = this.getContext()
    if (!ctx) return
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()
    osc.type = 'square'
    osc.frequency.setValueAtTime(720, ctx.currentTime)
    gain.gain.setValueAtTime(0.06, ctx.currentTime)
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.03)
    osc.connect(gain)
    gain.connect(this.getOutputNode(ctx))
    osc.start()
    osc.stop(ctx.currentTime + 0.035)
  }

  public playBrainrotSound() {
    const ctx = this.getContext()
    if (!ctx) return
    const notes = [330, 493.88, 392, 659.25, 587.33]
    notes.forEach((freq, idx) => {
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()
      osc.type = 'sawtooth'
      const start = ctx.currentTime + idx * 0.075
      osc.frequency.setValueAtTime(freq, start)
      gain.gain.setValueAtTime(0.16, start)
      gain.gain.exponentialRampToValueAtTime(0.001, start + 0.09)
      osc.connect(gain)
      gain.connect(this.getOutputNode(ctx))
      osc.start(start)
      osc.stop(start + 0.1)
    })
  }

  public playWinFanfare() {
    const ctx = this.getContext()
    if (!ctx) return
    const melody = [523.25, 659.25, 783.99, 1046.5]
    melody.forEach((freq, idx) => {
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()
      osc.type = 'square'
      const start = ctx.currentTime + idx * 0.12
      const dur = idx === melody.length - 1 ? 0.38 : 0.11
      osc.frequency.setValueAtTime(freq, start)
      gain.gain.setValueAtTime(0.14, start)
      gain.gain.exponentialRampToValueAtTime(0.001, start + dur)
      osc.connect(gain)
      gain.connect(this.getOutputNode(ctx))
      osc.start(start)
      osc.stop(start + dur + 0.02)
    })
  }
}

export const sound = new SoundEngine()
