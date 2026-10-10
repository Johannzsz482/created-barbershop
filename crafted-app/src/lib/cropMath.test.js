// Run with: npm test   (Node's built-in test runner, no extra packages)
import test from 'node:test'
import assert from 'node:assert/strict'
import { clampView, cropRect, FRAME_RATIO, imgStyle, MAX_ZOOM, shown, START_VIEW } from './cropMath.js'

const near = (a, b, eps = 1e-9) => assert.ok(Math.abs(a - b) < eps, `${a} is not close to ${b}`)
const PHOTOS = [[4000, 3000], [3000, 4000], [1000, 1000], [1920, 1080], [600, 2400], [2400, 600]]   // landscape, portrait, square, 16:9, tall, wide
const FRAMES = [FRAME_RATIO, 1]                                                                          // service photos, profile pictures

test('the default frame is 16:9 (service photos keep working as before)', () => {
  near(FRAME_RATIO, 16 / 9)
  assert.deepEqual(clampView({ zoom: 1, cx: 0.5, cy: 0.5 }, 4 / 3), clampView({ zoom: 1, cx: 0.5, cy: 0.5 }, 4 / 3, 16 / 9))
})

test('at zoom 1 the photo just covers the frame', () => {
  for (const frame of FRAMES) for (const [w, h] of PHOTOS) {
    const s = shown(w / h, 1, frame)
    assert.ok(s.w >= 1 - 1e-9 && s.h >= 1 - 1e-9, 'no empty edges')
    assert.ok(Math.abs(s.w - 1) < 1e-9 || Math.abs(s.h - 1) < 1e-9, 'one side fits exactly')
  }
})

test('the crop rectangle always has the frame shape and stays inside the photo', () => {
  for (const frame of FRAMES) for (const [w, h] of PHOTOS) for (const zoom of [1, 1.7, MAX_ZOOM]) for (const c of [0, 0.5, 1]) {
    const v = clampView({ zoom, cx: c, cy: 1 - c }, w / h, frame)
    const r = cropRect(w, h, v, frame)
    near(r.sw / r.sh, frame, 1e-6)
    assert.ok(r.sx >= -1e-6 && r.sy >= -1e-6, 'starts inside the photo')
    assert.ok(r.sx + r.sw <= w + 1e-6 && r.sy + r.sh <= h + 1e-6, 'ends inside the photo')
  }
})

test('profile pictures: a square frame crops a square, and zoom shrinks it', () => {
  const full = cropRect(4000, 3000, START_VIEW, 1)
  near(full.sw, 3000); near(full.sh, 3000)
  const zoomed = cropRect(4000, 3000, clampView({ ...START_VIEW, zoom: 2 }, 4 / 3, 1), 1)
  near(zoomed.sw, 1500); near(zoomed.sh, 1500)
})

test('repositioning is limited to the photo (no empty edges) and zoom is limited', () => {
  const far = clampView({ zoom: 99, cx: -5, cy: 5 }, 4 / 3, 1)
  assert.equal(far.zoom, MAX_ZOOM)
  const r = cropRect(4000, 3000, far, 1)
  assert.ok(r.sx >= -1e-6 && r.sy + r.sh <= 3000 + 1e-6)
  assert.equal(clampView({ zoom: 0.2, cx: 0.5, cy: 0.5 }, 1, 1).zoom, 1)
})

test('Reset (START_VIEW) shows the centred, fully covering crop', () => {
  for (const frame of FRAMES) for (const [w, h] of PHOTOS) {
    assert.deepEqual(clampView(START_VIEW, w / h, frame), START_VIEW)
  }
})

test('the preview style places the photo the same way the crop is cut', () => {
  const v = clampView({ zoom: 2, cx: 0.4, cy: 0.6 }, 4 / 3, 1)
  const st = imgStyle(4 / 3, v, 1)
  const s = shown(4 / 3, v.zoom, 1)
  assert.equal(st.width, `${s.w * 100}%`)
  assert.equal(st.left, `${(0.5 - v.cx * s.w) * 100}%`)
})
