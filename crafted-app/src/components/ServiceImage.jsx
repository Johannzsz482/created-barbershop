import { useState } from 'react'
import { hairstyles } from '../data/hairstyles'

// Service pictures are found by name, no mapping needed:
//   "Modern Mullet" -> /assets/modern-mullet.png   (also tries .jpg, .jpeg, .webp)
// Just drop (or replace) a correctly named file in public/assets/.
// If no matching file loads, the previous picture is used (first sample hairstyle of that service,
// else the neutral shop photo).
const EXTENSIONS = ['png', 'jpg', 'jpeg', 'webp']
const NEUTRAL = '/assets/tools_b&w.png'

// lowercase, spaces -> hyphens; other characters that don't belong in a file name are dropped
export const serviceSlug = (name) => String(name ?? '')
  .trim().toLowerCase()
  .replace(/\s+/g, '-')
  .replace(/[^a-z0-9_-]/g, '')
  .replace(/-+/g, '-')
  .replace(/^-|-$/g, '')

function fallbackFor(name) {
  const key = String(name ?? '').trim().toLowerCase()
  const h = hairstyles.find((x) => x.service.toLowerCase() === key)
  return h ? { src: h.img, pos: h.pos } : { src: NEUTRAL, pos: '50% 50%' }
}

export default function ServiceImage({ name, loading, className }) {
  const slug = serviceSlug(name)
  const sources = slug ? EXTENSIONS.map((e) => `/assets/${slug}.${e}`) : []
  const k = sources.join('|')
  const [fail, setFail] = useState({ k: '', n: 0 }) // how many sources have failed for this service name
  const tried = fail.k === k ? fail.n : 0

  if (tried >= sources.length) {
    const fb = fallbackFor(name)
    return <img className={className} src={fb.src} alt="" loading={loading} style={{ objectPosition: fb.pos }} />
  }
  return (
    <img key={tried} className={className} src={sources[tried]} alt="" loading={loading}
      style={{ objectPosition: '50% 50%' }} onError={() => setFail({ k, n: tried + 1 })} />
  )
}
