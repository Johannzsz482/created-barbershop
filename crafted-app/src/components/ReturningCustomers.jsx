import { motion } from 'framer-motion'
import { fullName } from '../lib/time'
import '../styles/returning.css'

// Returning customer = a customer with 2 or more Completed appointments (all time).
// Built only from the appointments and users the Admin page already has.
// Customers have no photos in the project, so the existing .avatar circle shows their initials.
export default function ReturningCustomers({ appointments, users }) {
  const done = {}
  appointments.filter((a) => a.status === 'Completed' && a.user_id != null).forEach((a) => { done[a.user_id] = (done[a.user_id] || 0) + 1 })
  const ids = Object.keys(done)
  const returning = ids.filter((id) => done[id] >= 2)
    .map((id) => ({ id: +id, n: done[id], user: users.find((u) => u.users_id === +id) }))
    .sort((a, b) => b.n - a.n || String(a.user ? fullName(a.user) : '').localeCompare(b.user ? fullName(b.user) : ''))
  const pct = ids.length ? Math.round((returning.length / ids.length) * 100) : 0

  return (
    <div className="panel returning">
      <header><div><h2>Returning customers</h2><p>Customers with 2 or more completed appointments.</p></div></header>
      <div className="ret-sum">
        <div><small>Returning customers</small><b>{returning.length}</b></div>
        <div><small>Of customers with a completed visit</small><b>{pct}%</b></div>
      </div>
      {returning.length === 0 && <p className="muted center">No returning customers yet.</p>}
      {returning.slice(0, 5).map((r, i) => {
        const name = r.user ? fullName(r.user) : `Customer #${r.id}`
        const initials = r.user ? (r.user.first_name[0] + (r.user.last_name?.[0] || '')).toUpperCase() : '#'
        return (
          <motion.div key={r.id} className="ret-row" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}>
            <div className="avatar" style={{ width: 44, height: 44 }}><span>{initials}</span></div>
            <span className="ret-name">{name}</span>
            <b>{r.n} completed</b>
          </motion.div>
        )
      })}
      {returning.length > 5 && <p className="muted center ret-more">Top 5 of {returning.length} shown.</p>}
    </div>
  )
}
