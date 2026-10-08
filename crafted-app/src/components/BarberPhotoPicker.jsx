import '../styles/photopicker.css'

// Local barber pictures that already ship with the project (public/assets/barbers/).
// To offer a new picture: put the file in that folder and add its path here.
export const BARBER_PHOTOS = [1, 2, 3, 4, 5].map((n) => `/assets/barbers/barber-${n}.png`)

// Pick a picture for the barber. Saved as the barber's existing photo_url; "Auto" leaves it empty.
export default function BarberPhotoPicker({ value, onChange }) {
  const options = [...new Set([...BARBER_PHOTOS, value].filter(Boolean))]
  return (
    <div className="photo-pick" role="group" aria-label="Barber picture">
      <span className="pp-label">Picture</span>
      <div className="pp-grid">
        <button type="button" className={`pp-opt auto${!value ? ' on' : ''}`} aria-pressed={!value} onClick={() => onChange('')}>Auto</button>
        {options.map((src) => (
          <button type="button" key={src} className={`pp-opt${value === src ? ' on' : ''}`} aria-pressed={value === src} onClick={() => onChange(src)}>
            <img src={src} alt="" loading="lazy" />
          </button>
        ))}
      </div>
    </div>
  )
}
