import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { useCatalog } from '../context/CatalogContext'
import { serviceAvailability } from '../lib/availability'
import HairstyleImage from './HairstyleImage'
import '../styles/hairstyles.css'

const peso = (n) => `₱${Number(n).toLocaleString()}`

// Services gallery. Only real services from the database are shown (no sample hairstyles), so prices and durations
// are never duplicated here. A drop-down lists every available service; each card opens the booking page with its service preselected.
export default function HairstyleGallery() {
  const { services, barbers, schedules, barberServices } = useCatalog()
  const [active, setActive] = useState('all')

  const items = useMemo(() => (services || [])
    .filter((s) => s.is_active)
    .map((s) => ({ service: s, bookable: serviceAvailability(s, { barbers, schedules, barberServices }).bookable })),
  [services, barbers, schedules, barberServices])

  if (!items.length) return null
  const shown = active === 'all' ? items : items.filter((g) => String(g.service.service_id) === active)

  return (
    <div className="hs wrap">
      <h3 className="hs-title">Our Services</h3>
      <p className="hs-sub">Pick a service to see its price and book it.</p>

      <div className="hs-filter">
        <label htmlFor="hs-service-select">Service</label>
        <select id="hs-service-select" className="hs-select" value={active} onChange={(e) => setActive(e.target.value)}>
          <option value="all">All services</option>
          {items.map(({ service: s }) => (
            <option key={s.service_id} value={String(s.service_id)}>{s.service_name}</option>
          ))}
        </select>
      </div>

      <div className="hs-grid">
        {shown.map(({ service: s, bookable }, i) => {
          const photo = { name: s.service_name }
          return (
            <motion.div key={s.service_id} initial={{ opacity: 0, y: 18 }} whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-40px' }} transition={{ duration: 0.45, delay: (i % 4) * 0.06, ease: 'easeOut' }}>
              <Link className="hs-card" to={`/book?service=${s.service_id}`} aria-label={`Book ${s.service_name}`}>
                <div className="hs-img"><HairstyleImage style={photo} fallbackSrc={s.image_url} storedFirst={!!s.image_url} /></div>
                <div className="hs-info">
                  <span className="hs-tag">{peso(s.price)} · {s.duration_minutes} mins</span>
                  <h5>{s.service_name}</h5>
                  {!bookable && <small className="hs-note">Not available to book right now.</small>}
                </div>
              </Link>
            </motion.div>
          )
        })}
      </div>
    </div>
  )
}
