import test from 'node:test'
import assert from 'node:assert/strict'
import { MAX_LEVEL, UPLOAD_BUDGET_BPS, nextLevel, planCapture, planVideoQuality, qualityLabel, tuneOpusSdp } from './rtcQuality.js'

test('total video upload stays inside the budget as the room grows', () => {
  for (let peers = 1; peers <= 12; peers += 1) {
    const { maxBitrate } = planVideoQuality(peers)
    // The floor (100 kbps/peer) is the only allowed overshoot
    assert.ok(maxBitrate * peers <= Math.max(UPLOAD_BUDGET_BPS, 100_000 * peers), `peers=${peers}`)
  }
})

test('per-peer bitrate never increases when more peers join', () => {
  let prev = Infinity
  for (let peers = 1; peers <= 12; peers += 1) {
    const { maxBitrate } = planVideoQuality(peers)
    assert.ok(maxBitrate <= prev)
    prev = maxBitrate
  }
})

test('resolution and frame rate step down with the bitrate', () => {
  assert.deepEqual(planVideoQuality(1), { maxBitrate: 1_000_000, maxFramerate: 30, scaleResolutionDownBy: 1 })
  const crowded = planVideoQuality(10)
  assert.ok(crowded.scaleResolutionDownBy >= 2 && crowded.maxFramerate <= 15)
})

test('degradation level and low-data mode lower the plan', () => {
  assert.ok(planVideoQuality(2, 2).maxBitrate < planVideoQuality(2, 0).maxBitrate)
  assert.ok(planVideoQuality(1, 0, true).maxBitrate <= 150_000)
})

test('capture shrinks with participants', () => {
  assert.ok(planCapture(1).width > planCapture(5).width)
  assert.ok(planCapture(5).width > planCapture(9).width)
  assert.equal(planCapture(1, true).width, 320)
})

test('quality monitor degrades fast and recovers slowly', () => {
  let state = { level: 0, goodStreak: 0 }
  state = nextLevel(state, { lossPct: 12, rttMs: 100, limitation: 'none' })
  assert.equal(state.level, 1)
  state = nextLevel(state, { lossPct: 0, rttMs: 80, limitation: 'bandwidth', bweLow: true })
  assert.equal(state.level, 2)
  for (let i = 0; i < 2; i += 1) state = nextLevel(state, { lossPct: 0, rttMs: 80, limitation: 'none' })
  assert.equal(state.level, 2) // two clean samples are not enough
  state = nextLevel(state, { lossPct: 0, rttMs: 80, limitation: 'none' })
  assert.equal(state.level, 1)
  for (let i = 0; i < 10; i += 1) state = nextLevel(state, { lossPct: 50, rttMs: 900, limitation: 'cpu' })
  assert.equal(state.level, MAX_LEVEL)
})

test('a "bandwidth" limitation caused by our own cap is not congestion', () => {
  let state = { level: 0, goodStreak: 0 }
  for (let i = 0; i < 6; i += 1) state = nextLevel(state, { lossPct: 0, rttMs: 5, limitation: 'bandwidth', bweLow: false })
  assert.equal(state.level, 0)
  state = nextLevel(state, { lossPct: 0, rttMs: 5, limitation: 'bandwidth', bweLow: true })
  assert.equal(state.level, 1)
})

test('qualityLabel', () => {
  assert.equal(qualityLabel(0, 50), 'bonne')
  assert.equal(qualityLabel(1, 50), 'moyenne')
  assert.equal(qualityLabel(3, 50), 'faible')
})

test('tuneOpusSdp only touches the opus fmtp line', () => {
  const sdp = [
    'm=audio 9 UDP/TLS/RTP/SAVPF 111 63',
    'a=rtpmap:111 opus/48000/2',
    'a=fmtp:111 minptime=10;useinbandfec=0',
    'a=rtpmap:96 VP8/90000',
    'a=fmtp:96 max-fs=12288',
  ].join('\r\n')
  const out = tuneOpusSdp(sdp)
  assert.match(out, /a=fmtp:111 [^\r\n]*usedtx=1/)
  assert.match(out, /useinbandfec=1/)
  assert.match(out, /minptime=10/)
  assert.match(out, /maxaveragebitrate=32000/)
  assert.match(out, /a=fmtp:96 max-fs=12288/)
  assert.equal(tuneOpusSdp(undefined), undefined)
})
