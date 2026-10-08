import { motion } from 'framer-motion'
import Avatar from './Avatar'
import { peso, fullName } from '../lib/time'
import { bookedPrice } from '../lib/revenue'
import '../styles/topbarbers.css'

// Top 3 barbers by Completed appointments (ties: higher revenue first), from the appointments the Admin page already has.
// Revenue uses price_at_booking where available.
export default function TopBarbers({ appts, bar, svc }) {
  const stats = {}
  appts.filter((a) => a.status === 'Completed').forEach((a) => {
    const s = (stats[a.barber_id] ||= { id: a.barber_id, done: 0, revenue: 0 })
    s.done += 1
    s.revenue += bookedPrice(a, svc(a.service_id))
  })
  const top = Object.values(stats).filter((s) => bar(s.id)).sort((x, y) => y.done - x.done || y.revenue - x.revenue).slice(0, 3)

  return (
    <div className="top-barbers">
      {top.length === 0 && <p className="muted">No completed appointments yet.</p>}
      {top.map((s, i) => {
        const b = bar(s.id)
        return (
          <motion.div key={s.id} className={`tb-row r${i + 1}`} initial={{ opacity: 0, x: -12 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.08 }}>
            <span className="tb-rank" aria-label={`Rank ${i + 1}`}>#{i + 1}</span>
            <Avatar barber={b} size={52} />
            <div className="tb-info">
              <h4>{fullName(b)}</h4>
              <small>{s.done} completed · {peso(s.revenue)}</small>
            </div>
          </motion.div>
        )
      })}
    </div>
  )
}
