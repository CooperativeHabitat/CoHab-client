let audioContext: AudioContext | null = null

const getAudioContext = (): AudioContext | null => {
  try {
    if (!audioContext) {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext
      if (!AudioCtx) return null
      audioContext = new AudioCtx()
    }
    if (audioContext.state === 'suspended') {
      audioContext.resume().catch(() => {})
    }
    return audioContext
  } catch {
    return null
  }
}

const playTone = (ctx: AudioContext, frequency: number, start: number, duration: number, volume: number) => {
  const oscillator = ctx.createOscillator()
  const gain = ctx.createGain()
  const startTime = ctx.currentTime + start

  oscillator.type = 'sine'
  oscillator.frequency.value = frequency
  gain.gain.setValueAtTime(0, startTime)
  gain.gain.linearRampToValueAtTime(volume, startTime + 0.01)
  gain.gain.exponentialRampToValueAtTime(0.0001, startTime + duration)

  oscillator.connect(gain)
  gain.connect(ctx.destination)
  oscillator.start(startTime)
  oscillator.stop(startTime + duration + 0.05)
}

export const playNotificationSound = () => {
  const ctx = getAudioContext()
  if (!ctx) return
  playTone(ctx, 880, 0, 0.15, 0.12)
  playTone(ctx, 1174.66, 0.12, 0.3, 0.12)
}
