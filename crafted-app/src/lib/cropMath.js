// Geometry for the photo editor (PhotoCropper). Pure functions, no React, so they can be tested on their own.
// "frame" is the crop frame's width / height: 16 / 9 for service photos (the default), 1 for profile pictures.
export const FRAME_RATIO = 16 / 9
export const MAX_ZOOM = 4
export const START_VIEW = { zoom: 1, cx: 0.5, cy: 0.5 }   // zoom 1 = the photo just covers the frame; (cx, cy) = the point of the photo at the frame centre (0..1)

// Size of the displayed photo as a fraction of the frame's width (w) and of the frame's height (h)
export const shown = (imgRatio, zoom, frame = FRAME_RATIO) => {
  const w = imgRatio >= frame ? (imgRatio / frame) * zoom : zoom
  return { w, h: (w * frame) / imgRatio }
}

// Keep the frame inside the photo (no empty edges)
export const clampView = (v, imgRatio, frame = FRAME_RATIO) => {
  const zoom = Math.min(MAX_ZOOM, Math.max(1, v.zoom))
  const s = shown(imgRatio, zoom, frame)
  const cl = (c, size) => Math.min(1 - 0.5 / size, Math.max(0.5 / size, c))
  return { zoom, cx: cl(v.cx, s.w), cy: cl(v.cy, s.h) }
}

// The part of the original photo (in its own pixels) that the frame shows
export const cropRect = (nw, nh, view, frame = FRAME_RATIO) => {
  const s = shown(nw / nh, view.zoom, frame)
  const sw = nw / s.w, sh = nh / s.h
  return { sx: view.cx * nw - sw / 2, sy: view.cy * nh - sh / 2, sw, sh }
}

// CSS that places the photo inside a frame; all percentages, so it looks the same at any frame size
export const imgStyle = (imgRatio, view, frame = FRAME_RATIO) => {
  const s = shown(imgRatio, view.zoom, frame)
  return { position: 'absolute', maxWidth: 'none', width: `${s.w * 100}%`, height: `${s.h * 100}%`, left: `${(0.5 - view.cx * s.w) * 100}%`, top: `${(0.5 - view.cy * s.h) * 100}%` }
}
