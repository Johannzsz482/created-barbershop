import { useState } from 'react'

// Service pictures are found by name, no mapping needed:
//   "Modern Mullet" -> /assets/modern-mullet.png   (also tries .jpg, .jpeg, .webp)
// Just drop (or replace) a correctly named file in public/assets/.
// If no matching file loads, a neutral shop photo is shown.
// Used by both the Book page and the Home page sample hairstyles, so they always agree.
const EXTENSIONS = ['png', 'jpg', 'jpeg', 'webp']
const NEUTRAL = '/assets/tools_b&w.png'

// lowercase, spaces -> hyphens; other characters that don't belong in a file name are dropped
export const serviceSlug = (name) => String(name ?? '')
  .trim().toLowerCase()
  .replace(/\s+/g, '-')
  .replace(/[^a-z0-9_-]/g, '')
  .replace(/-+/g, '-')
  .replace(/^-|-$/g, '')

export default function ServiceImage({ name, alt = '', loading, className }) {
  const slug = serviceSlug(name)
  const sources = slug ? EXTENSIONS.map((e) => `/assets/${slug}.${e}`) : []
  const k = sources.join('|')
  const [fail, setFail] = useState({ k: '', n: 0 }) // how many sources have failed for this service name
  const tried = fail.k === k ? fail.n : 0

  if (tried >= sources.length) {
    return <img className={className} src={NEUTRAL} alt={alt} loading={loading} style={{ objectPosition: '50% 50%' }} />
  }
  return (
    <img key={tried} className={className} src={sources[tried]} alt={alt} loading={loading}
      style={{ objectPosition: '50% 50%' }} onError={() => setFail({ k, n: tried + 1 })} />
  )
}