import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { useCatalog } from '../context/CatalogContext'
import { serviceAvailability } from '../lib/availability'
import HairstyleImage from './HairstyleImage'
import '../styles/hairstyles.css'

const peso = (n) => `₱${Number(n).toLocaleString()}`

// Hairstyle gallery. Services AND their hairstyles come from the API/database (matched by service_id) - there is no built-in sample
// data or fallback list, so only real, active services are shown. Prices and durations are never duplicated here. Each card opens the existing booking page with its service preselected.
export default function HairstyleGallery() {
  const { services, hairstyles, barbers, schedules, barberServices } = useCatalog()
  const [active, setActive] = useState('all')

  // Only active services (the valid categories) that have something to show
  const groups = useMemo(() => (services || [])
    .filter((s) => s.is_active)
    .map((s) => {
      const own = hairstyles.filter((h) => h.is_active && h.service_id === s.service_id).map((h) => ({ ...h, id: `hs-${h.hairstyle_id}` }))
      // A service with no hairstyles of its own: its photo is shown as a single card.
      // A built-in service whose photo an admin replaced shows that photo first, ahead of its sample hairstyles.
      const photo = { id: `svc-${s.service_id}`, service: s.service_name, name: s.service_name, storedFirst: true }
      const styles = !s.image_url ? own : own.length ? [photo, ...own] : [photo]
      return { service: s, styles, bookable: serviceAvailability(s, { barbers, schedules, barberServices }).bookable }
    })
    .filter((g) => g.styles.length), [services, hairstyles, barbers, schedules, barberServices])

  if (!groups.length) return null
  // If the selected service disappears (e.g. an admin deactivates it), fall back to All Services
  const current = groups.some((g) => g.service.service_id === active) ? active : 'all'
  const shown = current === 'all' ? groups : groups.filter((g) => g.service.service_id === current)

  return (
    <div className="hs wrap">
      <h3 className="hs-title">Hairstyles</h3>
      <p className="hs-sub">Get inspired. Every style belongs to one of our services. Tap one to book it.</p>

      <nav className="tabs hs-tabs" aria-label="Filter hairstyles by service">
        {[{ id: 'all', label: 'All Services' }, ...groups.map(({ service: s }) => ({ id: s.service_id, label: s.service_name }))].map((t) => (
          <button type="button" key={t.id} className={current === t.id ? 'on' : ''} aria-pressed={current === t.id} onClick={() => setActive(t.id)}>
            {t.label}{current === t.id && <motion.i layoutId="hs-tab-line" />}
          </button>
        ))}
      </nav>

      {shown.map(({ service: s, styles, bookable }) => (
        <section className="hs-group" key={s.service_id} aria-label={`${s.service_name} hairstyles`}>
          <header className="hs-head">
            <h4>{s.service_name}</h4>
            <span>{peso(s.price)} · {s.duration_minutes} mins</span>
            {!bookable && <small className="hs-note">Not available to book right now.</small>}
          </header>
          <div className="hs-grid">
            {styles.map((h, i) => (
              <motion.div key={h.id} initial={{ opacity: 0, y: 18 }} whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: '-40px' }} transition={{ duration: 0.45, delay: i * 0.06, ease: 'easeOut' }}>
                <Link className="hs-card" to={h.hairstyle_id ? `/book?service=${s.service_id}&style=${h.hairstyle_id}` : `/book?service=${s.service_id}`} aria-label={`Book ${s.service_name}: ${h.name}`}>
                  <div className="hs-img"><HairstyleImage style={h} fallbackSrc={s.image_url} storedFirst={h.storedFirst} /></div>
                  <div className="hs-info">
                    <span className="hs-tag">{s.service_name}</span>
                    <h5>{h.name}</h5>
                  </div>
                </Link>
              </motion.div>
            ))}
          </div>
        </section>
      ))}
    </div>
  )
}