import { useState } from 'react'
import { motion } from 'framer-motion'
import { peso, longDate, fmt12, fullName } from '../lib/time'
import { PERIODS, revenueBuckets } from '../lib/revenue'
import '../styles/revenue.css'

// Revenue from Completed appointments, using the price saved at booking time.
// Uses the appointment data the Admin page already loaded; no extra API calls.
export default function RevenuePanel({ appointments, svc, uName, bar }) {
  const [period, setPeriod] = useState('Monthly')
  const [open, setOpen] = useState(false)
  const { rows, items, total, count } = revenueBuckets(appointments, svc, period)
  const max = Math.max(1, ...rows.map((r) => r.total))
  const span = { Daily: 'last 14 days', Weekly: 'last 12 weeks', Monthly: 'last 12 months', Yearly: 'by year' }[period]

  return (
    <div className="panel rev">
      <header>
        <div><h2>Revenue</h2><p>Completed bookings, at the price paid when booked.</p></div>
        <div className="rev-tabs" role="group" aria-label="Revenue period">
          {PERIODS.map((p) => <button key={p} type="button" className={`mini${period === p ? '' : ' ghost'}`} aria-pressed={period === p} onClick={() => setPeriod(p)}>{p}</button>)}
        </div>
      </header>
      <div className="rev-sum"><div><small>Total ({span})</small><b>{peso(total)}</b></div><div><small>Completed bookings</small><b>{count}</b></div></div>
      {count === 0 && <p className="muted center">No completed appointments in this period.</p>}
      {rows.map((r) => (
        <div className="rev-row" key={r.key}>
          <span>{r.label}</span>
          <div><motion.i key={`${period}-${r.key}`} initial={{ width: 0 }} animate={{ width: `${(r.total / max) * 100}%` }} transition={{ duration: 0.6 }} /></div>
          <b>{peso(r.total)}</b>
        </div>
      ))}

      <div className="rev-more">
        <button type="button" className="btn btn-gold sm" aria-expanded={open} onClick={() => setOpen((o) => !o)}>{open ? 'Hide details' : 'View details'}</button>
      </div>
      {open && (
        <motion.div className="rev-details" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
          <h3>{period} details · {span}</h3>
          {items.length === 0 ? <p className="muted center">No completed appointments in this period.</p> : (
            <div className="table-wrap"><table className="tbl left">
              <thead><tr><th>Date</th><th>Customer</th><th>Service</th><th>Barber</th><th className="amt">Amount</th></tr></thead>
              <tbody>
                {items.map(({ appt: a, amount }) => (
                  <tr key={a.appointment_id}>
                    <td>{longDate(a.appointment_date)}<br /><small>{fmt12(a.start_time)}</small></td>
                    <td>{uName(a.user_id)}</td>
                    <td>{svc(a.service_id)?.service_name || '—'}</td>
                    <td>{bar(a.barber_id) ? fullName(bar(a.barber_id)) : '—'}</td>
                    <td className="amt">{peso(amount)}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot><tr><td colSpan={4}>Total · {count} completed</td><td className="amt">{peso(total)}</td></tr></tfoot>
            </table></div>
          )}
        </motion.div>
      )}
    </div>
  )
}
