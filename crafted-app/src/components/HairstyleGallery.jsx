import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { useCatalog } from '../context/CatalogContext'
import { hairstyles } from '../data/hairstyles'
import HairstyleImage from './HairstyleImage'
import '../styles/hairstyles.css'

const peso = (n) => `₱${Number(n).toLocaleString()}`
const key = (s) => String(s).trim().toLowerCase()

// Sample hairstyle gallery. Services come from the existing catalog, so prices and durations
// are never duplicated here. Each card opens the existing booking page with its service preselected.
export default function HairstyleGallery() {
  const { services } = useCatalog()
  const [active, setActive] = useState('all')

  // Only active services that have sample hairstyles
  const groups = useMemo(() => (services || [])
    .filter((s) => s.is_active)
    .map((s) => {
      const own = hairstyles.filter((h) => key(h.service) === key(s.service_name))
      // A service added by an admin has no sample hairstyles of its own: its photo is shown as a single card.
      // A built-in service whose photo an admin replaced shows that photo first, ahead of its sample hairstyles.
      const photo = { id: `svc-${s.service_id}`, service: s.service_name, name: s.service_name, storedFirst: true }
      const styles = !s.image_url ? own : own.length ? [photo, ...own] : [photo]
      return { service: s, styles }
    })
    .filter((g) => g.styles.length), [services])

  if (!groups.length) return null
  const shown = active === 'all' ? groups : groups.filter((g) => g.service.service_id === active)

  return (
    <div className="hs wrap">
      <h3 className="hs-title">Sample Hairstyles</h3>
      <p className="hs-sub">Get inspired. Every style belongs to one of our services.</p>

      <div className="hs-chips" role="group" aria-label="Filter hairstyles by service">
        <button type="button" className={`hs-chip${active === 'all' ? ' on' : ''}`} aria-pressed={active === 'all'} onClick={() => setActive('all')}>All</button>
        {groups.map(({ service: s }) => (
          <button type="button" key={s.service_id} className={`hs-chip${active === s.service_id ? ' on' : ''}`} aria-pressed={active === s.service_id} onClick={() => setActive(s.service_id)}>{s.service_name}</button>
        ))}
      </div>

      {shown.map(({ service: s, styles }) => (
        <section className="hs-group" key={s.service_id} aria-label={`${s.service_name} hairstyles`}>
          <header className="hs-head">
            <h4>{s.service_name}</h4>
            <span>{peso(s.price)} · {s.duration_minutes} mins</span>
          </header>
          <div className="hs-grid">
            {styles.map((h, i) => (
              <motion.div key={h.id} initial={{ opacity: 0, y: 18 }} whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: '-40px' }} transition={{ duration: 0.45, delay: i * 0.06, ease: 'easeOut' }}>
                <Link className="hs-card" to={`/book?service=${s.service_id}`} aria-label={`Book ${s.service_name}: ${h.name}`}>
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