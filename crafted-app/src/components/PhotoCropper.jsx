import { useEffect, useRef, useState } from 'react'
import '../styles/photopicker.css'

import { clampView, cropRect, FRAME_RATIO, imgStyle, MAX_ZOOM, shown, START_VIEW } from '../lib/cropMath'

// Crop / zoom / reposition a photo. Used for service photos (16:9, the default) and profile pictures (square, round preview).
// Nothing is saved here: Apply hands back a new cropped File, Cancel hands back nothing.
//   aspect       crop frame width / height (default 16:9 for service photos, which customers see in a 16:9 frame)
//   round        show a circular guide and a round preview (profile pictures are shown in a circle)
//   outWidth     width in pixels of the cropped file; the height follows from aspect
//   fileName     name given to the cropped file
//   previewLabel caption above the live preview
export default function PhotoCropper({ src, initialView, onApply, onCancel, aspect = FRAME_RATIO, round = false, outWidth = 1280, fileName = 'service-photo.jpg', previewLabel = 'Live preview (as customers see it)' }) {
  const [natural, setNatural] = useState(null)     // { w, h } once the photo has loaded
  const [loadErr, setLoadErr] = useState(false)
  const [view, setView] = useState(initialView || START_VIEW)
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState('')
  const stage = useRef(null); const img = useRef(null); const pointers = useRef(new Map()); const pinch = useRef(0)
  const ratio = natural ? natural.w / natural.h : aspect
  const outHeight = Math.round(outWidth / aspect)
  const viewRef = useRef(view); const ratioRef = useRef(ratio)
  useEffect(() => { viewRef.current = view; ratioRef.current = ratio })   // latest values for the pointer / wheel handlers

  const update = (fn) => setView((v) => clampView(fn(v), ratioRef.current, aspect))
  const onLoad = (e) => {
    const n = { w: e.currentTarget.naturalWidth, h: e.currentTarget.naturalHeight }
    if (!n.w || !n.h) return setLoadErr(true)
    ratioRef.current = n.w / n.h; setNatural(n); setView((v) => clampView(v, n.w / n.h, aspect))
  }

  // Mouse wheel zooms (added by hand because React's onWheel cannot stop the page from scrolling)
  useEffect(() => {
    const el = stage.current
    const wheel = (e) => { e.preventDefault(); setView((v) => clampView({ ...v, zoom: v.zoom * (e.deltaY < 0 ? 1.08 : 1 / 1.08) }, ratioRef.current, aspect)) }
    el.addEventListener('wheel', wheel, { passive: false })
    return () => el.removeEventListener('wheel', wheel)
  }, [aspect])

  const down = (e) => { e.currentTarget.setPointerCapture?.(e.pointerId); pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY }); pinch.current = 0 }
  const move = (e) => {
    const p = pointers.current.get(e.pointerId); if (!p || !natural) return
    const box = stage.current.getBoundingClientRect()
    const prev = { ...p }; p.x = e.clientX; p.y = e.clientY
    if (pointers.current.size === 2) {   // two fingers: pinch to zoom
      const [a, b] = [...pointers.current.values()]; const d = Math.hypot(a.x - b.x, a.y - b.y)
      if (pinch.current) update((v) => ({ ...v, zoom: v.zoom * (d / pinch.current) }))
      pinch.current = d; return
    }
    const s = shown(ratio, viewRef.current.zoom, aspect)
    update((v) => ({ ...v, cx: v.cx - (e.clientX - prev.x) / box.width / s.w, cy: v.cy - (e.clientY - prev.y) / box.height / s.h }))
  }
  const up = (e) => { pointers.current.delete(e.pointerId); pinch.current = 0 }
  const key = (e) => {
    const step = 0.03 / viewRef.current.zoom
    const d = { ArrowLeft: [-step, 0], ArrowRight: [step, 0], ArrowUp: [0, -step], ArrowDown: [0, step] }[e.key]
    if (d) { e.preventDefault(); update((v) => ({ ...v, cx: v.cx + d[0], cy: v.cy + d[1] })) }
    else if (e.key === '+' || e.key === '=') { e.preventDefault(); update((v) => ({ ...v, zoom: v.zoom * 1.1 })) }
    else if (e.key === '-') { e.preventDefault(); update((v) => ({ ...v, zoom: v.zoom / 1.1 })) }
  }

  const apply = () => {
    if (!natural || !img.current) return
    setBusy(true); setErr('')
    try {
      const { sx, sy, sw, sh } = cropRect(natural.w, natural.h, view, aspect)
      const c = document.createElement('canvas'); c.width = outWidth; c.height = outHeight
      const g = c.getContext('2d'); g.fillStyle = '#1c1c1c'; g.fillRect(0, 0, outWidth, outHeight)
      g.imageSmoothingQuality = 'high'; g.drawImage(img.current, sx, sy, sw, sh, 0, 0, outWidth, outHeight)
      c.toBlob((blob) => {
        setBusy(false)
        if (!blob) return setErr('The photo could not be prepared. Try a different image.')
        onApply(new File([blob], fileName, { type: 'image/jpeg' }), view)
      }, 'image/jpeg', 0.9)
    } catch { setBusy(false); setErr('The photo could not be prepared. Try a different image.') }
  }

  if (loadErr) return <div className="full crop-box"><p role="alert" className="crop-err">That image could not be opened.</p><div className="crop-actions"><button type="button" className="mini ghost" onClick={onCancel}>Cancel</button></div></div>
  return (
    <div className={`full crop-box${round ? ' crop-round' : ''}`}>
      <div className="crop-stage" ref={stage} style={{ aspectRatio: aspect }} tabIndex={0} role="group" aria-label="Photo editor. Drag to move, scroll or use plus and minus to zoom."
        onPointerDown={down} onPointerMove={move} onPointerUp={up} onPointerCancel={up} onKeyDown={key}>
        <img ref={img} src={src} alt="Photo being edited" draggable={false} onLoad={onLoad} onError={() => setLoadErr(true)} style={natural ? imgStyle(ratio, view, aspect) : { visibility: 'hidden' }} />
        {round && <span className="crop-mask" aria-hidden="true" />}
      </div>
      <p className="muted crop-hint">Drag to reposition. Scroll, pinch or use the slider to zoom.</p>
      <label className="crop-zoom">Zoom
        <input type="range" min="1" max={MAX_ZOOM} step="0.01" value={view.zoom} disabled={!natural} aria-label="Zoom" onChange={(e) => update((v) => ({ ...v, zoom: +e.target.value }))} /></label>
      <div className="crop-live"><span className="pp-label">{previewLabel}</span>
        <div className="crop-thumb" style={{ aspectRatio: aspect }}>{natural && <img src={src} alt="" draggable={false} style={imgStyle(ratio, view, aspect)} />}</div></div>
      {err && <p role="alert" className="crop-err">{err}</p>}
      <div className="crop-actions">
        <button type="button" className="btn btn-gold sm" disabled={!natural || busy} onClick={apply}>{busy ? 'Applying…' : 'Apply'}</button>
        <button type="button" className="mini ghost" disabled={busy} onClick={onCancel}>Cancel</button>
        <button type="button" className="mini ghost" disabled={!natural || busy} onClick={() => setView(clampView(START_VIEW, ratio, aspect))}>Reset</button>
      </div>
    </div>
  )
}
