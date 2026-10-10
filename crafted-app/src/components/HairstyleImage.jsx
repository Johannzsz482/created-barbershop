import { useState } from 'react'
import { serviceSlug } from './ServiceImage'
import { fileUrl } from '../api'

// A sample hairstyle's picture is found by the HAIRSTYLE's own name (never its parent service):
//   "Classic Buzz" -> /assets/classic-buzz.jpg   (also tries .png, .jpeg, .webp, .jfif)
// Drop (or replace) a correctly named file in public/assets/ - no per-style path to maintain.
// Extensions are tried in order until one loads; if none does, a labelled placeholder is shown.
// It never falls back to another style's picture. Only when the style has no file of its own AND the service has a
// stored image_url (passed as fallbackSrc) is that service picture shown instead of the placeholder.
const EXTENSIONS = ['jpg', 'png', 'jpeg', 'webp', 'jfif']

export default function HairstyleImage({ style, fallbackSrc, storedFirst }) {
  const slug = serviceSlug(style?.name)
  const sources = slug ? EXTENSIONS.map((e) => `/assets/${slug}.${e}`) : []
  const stored = typeof fallbackSrc === 'string' ? fallbackSrc.trim() : ''
  if (stored) { if (storedFirst) sources.unshift(fileUrl(stored)); else sources.push(fileUrl(stored)) }   // storedFirst: a service with no styles of its own
  const k = sources.join('|')
  // How many candidate files have failed for THIS hairstyle. The count is tied to the candidate list (k),
  // so a different hairstyle / name starts again from the first candidate instead of staying on a stale failure.
  const [fail, setFail] = useState({ k: '', n: 0 })
  const tried = fail.k === k ? fail.n : 0

  if (tried >= sources.length) {
    return (
      <div role="img" aria-label={`${style?.name ?? 'Hairstyle'} sample (image missing: ${slug || 'no name'})`}
        style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center',
          justifyContent: 'center', gap: 4, color: '#bbb', fontSize: 12, textAlign: 'center', padding: 8 }}>
        <span>Image missing</span>
        <code>{slug ? `${slug}.(png|jpg|jpeg|webp)` : '(no name)'}</code>
      </div>
    )
  }
  // key={k + tried} remounts the <img> for every new candidate or hairstyle, so the browser always loads the new src
  return (
    <img key={`${k}#${tried}`} src={sources[tried]} alt={`${style.name} sample`} loading="lazy"
      onError={() => setFail({ k, n: tried + 1 })} />
  )
}