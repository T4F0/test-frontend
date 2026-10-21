import { test } from 'node:test'
import assert from 'node:assert/strict'
import { applyFlipState, withoutFlip } from './dicomFlip.js'

const fakeViewport = (h = false, v = false) => ({
  flipHorizontal: h,
  flipVertical: v,
  calls: [],
  flip(args) {
    this.calls.push(args)
    if (args.flipHorizontal) this.flipHorizontal = !this.flipHorizontal
    if (args.flipVertical) this.flipVertical = !this.flipVertical
  },
})

test('a mirror can be applied and then reverted', () => {
  const vp = fakeViewport()
  applyFlipState(vp, { flipHorizontal: true })
  assert.equal(vp.flipHorizontal, true)
  applyFlipState(vp, { flipHorizontal: false })
  assert.equal(vp.flipHorizontal, false)
})

test('nothing is toggled when the state already matches', () => {
  const vp = fakeViewport(true, false)
  applyFlipState(vp, { flipHorizontal: true, flipVertical: false })
  assert.equal(vp.calls.length, 0)
})

test('withoutFlip strips only the flip keys', () => {
  assert.deepEqual(withoutFlip({ zoom: 2, flipHorizontal: true, flipVertical: false }), { zoom: 2 })
})
