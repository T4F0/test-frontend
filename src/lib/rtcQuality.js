/**
 * Adaptive media quality for the peer-to-peer mesh.
 *
 * The server only relays signalling, so the scarce resources are each participant's uplink and CPU
 * (every participant uploads one copy of their video per other participant) and, when a relay is needed,
 * the TURN server's bandwidth. Everything here keeps the total upload roughly constant as the room grows
 * instead of letting it multiply with the number of peers.
 */

// What one participant may upload for video, shared between all peers (bits per second)
export const UPLOAD_BUDGET_BPS = 1_500_000
const MIN_VIDEO_BPS = 100_000
const MAX_VIDEO_BPS = 1_000_000
export const AUDIO_BPS = 32_000
export const SCREEN_BPS = 1_200_000

// Multiplier applied on top of the plan when a peer's link is struggling (0 = healthy)
const LEVEL_FACTOR = [1, 0.6, 0.35, 0.2]
export const MAX_LEVEL = LEVEL_FACTOR.length - 1

/**
 * Video plan for one outgoing connection.
 * @param {number} remoteCount number of peers we upload to
 * @param {number} level 0..MAX_LEVEL degradation chosen by the quality monitor for this peer
 * @param {boolean} lowData user-selected "save data" mode
 */
export function planVideoQuality(remoteCount, level = 0, lowData = false) {
  const peers = Math.max(1, remoteCount)
  let bitrate = Math.min(MAX_VIDEO_BPS, UPLOAD_BUDGET_BPS / peers)
  bitrate *= LEVEL_FACTOR[Math.min(Math.max(level, 0), MAX_LEVEL)]
  if (lowData) bitrate = Math.min(bitrate, 150_000)
  bitrate = Math.floor(Math.max(MIN_VIDEO_BPS, bitrate))

  let scaleResolutionDownBy = 1
  if (bitrate < 600_000) scaleResolutionDownBy = 1.5
  if (bitrate < 300_000) scaleResolutionDownBy = 2
  if (bitrate < 160_000) scaleResolutionDownBy = 3

  const maxFramerate = bitrate >= 500_000 ? 30 : bitrate >= 250_000 ? 24 : 15
  return { maxBitrate: bitrate, maxFramerate, scaleResolutionDownBy }
}

/** Capture size: no point capturing more pixels than the busiest outgoing stream will keep. */
export function planCapture(remoteCount, lowData = false) {
  if (lowData || remoteCount > 6) return { width: 320, height: 180, frameRate: 15 }
  if (remoteCount > 3) return { width: 480, height: 270, frameRate: 24 }
  if (remoteCount > 1) return { width: 640, height: 360, frameRate: 24 }
  return { width: 960, height: 540, frameRate: 30 }
}

export function audioConstraints() {
  return {
    echoCancellation: true,
    noiseSuppression: true,
    autoGainControl: true,
    channelCount: 1,
  }
}

export function videoConstraints(remoteCount, lowData = false) {
  const { width, height, frameRate } = planCapture(remoteCount, lowData)
  return {
    width: { ideal: width },
    height: { ideal: height },
    frameRate: { ideal: frameRate, max: 30 },
    facingMode: 'user',
  }
}

/** Opus tuned for speech: in-band FEC, discontinuous transmission (silence costs nothing), mono, capped rate. */
export function tuneOpusSdp(sdp) {
  if (typeof sdp !== 'string') return sdp
  return sdp.replace(/a=fmtp:(\d+) ([^\r\n]*)/g, (line, payloadType, params) => {
    const opus = new RegExp(`a=rtpmap:${payloadType} opus/48000`, 'i').test(sdp)
    if (!opus) return line
    const wanted = {
      useinbandfec: '1',
      usedtx: '1',
      stereo: '0',
      'sprop-stereo': '0',
      maxaveragebitrate: String(AUDIO_BPS),
    }
    const map = new Map(params.split(';').map((p) => p.trim()).filter(Boolean).map((p) => p.split('=')))
    Object.entries(wanted).forEach(([k, v]) => map.set(k, v))
    return `a=fmtp:${payloadType} ${[...map].map(([k, v]) => (v === undefined ? k : `${k}=${v}`)).join(';')}`
  })
}

/**
 * Decide the next degradation level from one stats sample.
 * Degrade quickly, recover slowly (three clean samples in a row) so quality does not oscillate.
 */
export function nextLevel(state, sample) {
  const { level, goodStreak } = state
  const { lossPct, rttMs, limitation, bweLow } = sample
  // Chrome also reports "bandwidth" when the encoder is held back by *our own* maxBitrate cap, so it is not a
  // congestion signal by itself: congestion is loss, delay, a CPU-bound encoder, or an estimate below our plan.
  const bad = lossPct > 8 || rttMs > 500 || limitation === 'cpu' || Boolean(bweLow)
  const good = lossPct < 2 && rttMs < 250 && limitation !== 'cpu' && !bweLow

  if (bad) return { level: Math.min(MAX_LEVEL, level + 1), goodStreak: 0 }
  if (good) {
    const streak = goodStreak + 1
    return streak >= 3 ? { level: Math.max(0, level - 1), goodStreak: 0 } : { level, goodStreak: streak }
  }
  return { level, goodStreak: 0 }
}

/** A tiny black canvas track (1 fps): lets video be negotiated once at join and swapped with replaceTrack(). */
export function createPlaceholderVideo() {
  const canvas = document.createElement('canvas')
  canvas.width = 32
  canvas.height = 18
  const ctx = canvas.getContext('2d')
  let tick = 0
  const paint = () => {
    ctx.fillStyle = tick++ % 2 ? '#000' : '#010101' // a changing pixel keeps the encoder emitting frames
    ctx.fillRect(0, 0, canvas.width, canvas.height)
  }
  paint()
  const stream = canvas.captureStream(1)
  const track = stream.getVideoTracks()[0]
  const timer = setInterval(paint, 1000)
  const stop = () => {
    clearInterval(timer)
    track.stop()
  }
  return { track, stop }
}

/** Human label for the connection indicator. */
export function qualityLabel(level, rttMs) {
  if (level >= 3 || rttMs > 600) return 'faible'
  if (level >= 1 || rttMs > 300) return 'moyenne'
  return 'bonne'
}

/** Find the RTCRtpSender of a kind through the transceivers: still found after replaceTrack(null). */
export function getSender(peer, kind) {
  const pc = peer?._pc
  if (!pc || pc.signalingState === 'closed') return null
  const transceiver = pc.getTransceivers().find((t) => t.receiver?.track?.kind === kind)
  return transceiver?.sender ?? null
}

export async function applySenderPlan(peer, kind, plan) {
  const sender = getSender(peer, kind)
  if (!sender) return false
  try {
    const params = sender.getParameters()
    if (!params.encodings || params.encodings.length === 0) params.encodings = [{}]
    const encoding = params.encodings[0]
    Object.assign(encoding, plan)
    await sender.setParameters(params)
    return true
  } catch (e) {
    return false
  }
}

/** One poll of the connection: round-trip, loss and why the encoder is limited, plus outgoing video bitrate. */
export async function sampleStats(peer, previous) {
  const pc = peer?._pc
  if (!pc || pc.connectionState === 'closed') return null
  const report = await pc.getStats()
  let rttMs = 0
  let availableKbps = 0
  let lossPct = 0
  let limitation = 'none'
  let bytes = 0
  let framesPerSecond = 0
  let timestamp = 0
  report.forEach((stat) => {
    if (stat.type === 'candidate-pair' && stat.nominated && stat.currentRoundTripTime !== undefined) {
      rttMs = Math.round(stat.currentRoundTripTime * 1000)
      availableKbps = Math.round((stat.availableOutgoingBitrate || 0) / 1000)
    } else if (stat.type === 'remote-inbound-rtp' && stat.kind === 'video') {
      lossPct = Math.max(lossPct, (stat.fractionLost || 0) * 100)
    } else if (stat.type === 'outbound-rtp' && stat.kind === 'video') {
      limitation = stat.qualityLimitationReason || 'none'
      bytes = stat.bytesSent || 0
      framesPerSecond = stat.framesPerSecond || 0
      timestamp = stat.timestamp
    }
  })
  let kbps = 0
  if (previous && timestamp > previous.timestamp) {
    kbps = Math.round(((bytes - previous.bytes) * 8) / (timestamp - previous.timestamp))
  }
  return { rttMs, lossPct, limitation, kbps, availableKbps, framesPerSecond, bytes, timestamp }
}
