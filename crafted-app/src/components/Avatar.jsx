import { useState } from 'react'
import { fileUrl } from '../api'

// Photo order: the barber's saved photo_url first (Admin can pick it when adding/editing a barber), then
//   public/assets/barbers/barber-<barber_id>.png   (also tries .jpg, .jpeg, .webp)
// If no photo loads, the initials show instead.
const EXTENSIONS = ['png', 'jpg', 'jpeg', 'webp']

// Every address the barber's picture can come from, in the order Avatar tries them (also used to open the current photo in the editor)
export const barberPhotoSources = (barber) => [fileUrl(barber.photo_url), ...EXTENSIONS.map((e) => `/assets/barbers/barber-${barber.barber_id}.${e}`)].filter(Boolean)

export default function Avatar({ barber, size = 104 }) {
  const sources = barberPhotoSources(barber)
  const k = sources.join('|')
  const [fail, setFail] = useState({ k: '', n: 0 }) // how many sources have failed for this list of sources
  const tried = fail.k === k ? fail.n : 0
  const initials = (barber.first_name[0] + (barber.last_name[0] || '')).toUpperCase()
  return (
    <div className="avatar" style={{ width: size, height: size }}>
      {tried >= sources.length
        ? <span>{initials}</span>
        : <img key={tried} src={sources[tried]} alt={barber.first_name} onError={() => setFail({ k, n: tried + 1 })} />}
    </div>
  )
}