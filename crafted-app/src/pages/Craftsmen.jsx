import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import Page from '../components/Page'
import Avatar from '../components/Avatar'
import { useCatalog } from '../context/CatalogContext'
import { fullName } from '../lib/time'

export default function Craftsmen() {
  const { barbers, services, schedules, barberServices } = useCatalog()
  const list = barbers.filter((b) => b.is_active)
  return (
    <Page>
      <div className="page-title"><h1>OUR CRAFTSMEN</h1><p className="sub">Meet the barbers behind every cut.</p></div>
      <section className="page-body narrow">
        {list.map((b, i) => {
          const offered = barberServices.filter((x) => x.barber_id === b.barber_id).map((x) => services.find((s) => s.service_id === x.service_id)?.service_name).filter(Boolean)
          const days = [...new Set(schedules.filter((s) => s.barber_id === b.barber_id && s.is_active).map((s) => s.day_of_week.slice(0, 3)))]
          return (
            <motion.article key={b.barber_id} className="craft-card" initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, margin: '-60px' }} transition={{ duration: 0.5, delay: i * 0.05 }} whileHover={{ y: -4 }}>
              <Avatar barber={b} size={140} />
              <div>
                <h2>{fullName(b)}</h2>
                <h3>{b.specialty}</h3>
                <p>{b.bio}</p>
                <div className="chips">{offered.map((n) => <span key={n}>{n}</span>)}</div>
                {days.length > 0 && <p className="days">Works: {days.join(' · ')}</p>}
              </div>
            </motion.article>
          )
        })}
        <div style={{ textAlign: 'center', marginTop: 48 }}><Link className="btn btn-gold" to="/book">Book Now &rarr;</Link></div>
      </section>
    </Page>
  )
}
