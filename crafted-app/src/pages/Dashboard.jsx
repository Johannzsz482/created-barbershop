import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import Page from '../components/Page'
import Modal from '../components/Modal'
import StatusBadge from '../components/StatusBadge'
import { api, refresh } from '../api'
import { useAuth } from '../context/AuthContext'
import { useData } from '../context/DataContext'
import { useCatalog } from '../context/CatalogContext'
import { fmt12, iso, peso, longDate, fullName } from '../lib/time'
import { clickable, scrollToId } from '../lib/clickable'

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']
// What a barber can do next, by current status
const NEXT = { Pending: [['Confirm', 'Confirmed'], ['Decline', 'Declined']], Confirmed: [['Start', 'In Progress'], ['Cancel', 'Cancelled']], 'In Progress': [['Complete', 'Completed']] }

export default function Dashboard() {
  const { user, users } = useAuth()
  const { appointments, logs, setStatus } = useData()
  const { barbers, services, schedules } = useCatalog()
  const today = iso(new Date())
  const [day, setDay] = useState(today)
  const [month, setMonth] = useState(() => { const d = new Date(); return { y: d.getFullYear(), m: d.getMonth() } })
  const [detail, setDetail] = useState(null)
  const [load, setLoad] = useState('loading') // loading | ok | error

  // Reload from the server each time the dashboard opens, so bookings made since sign-in show up.
  // For a barber, /api/bootstrap only returns that barber's own appointments, customers and logs.
  useEffect(() => {
    let off = false
    refresh().then((ok) => { if (!off) setLoad(ok ? 'ok' : 'error') })
    return () => { off = true }
  }, [])

  // Time off: my upcoming leave, loaded from /api/leave
  const [leave, setLeave] = useState([])
  const [leaveLoad, setLeaveLoad] = useState('loading') // loading | ok | error
  const [leaveForm, setLeaveForm] = useState({ start: '', end: '', reason: '' })
  const [leaveMsg, setLeaveMsg] = useState('')
  const [leaveBusy, setLeaveBusy] = useState(false)

  const loadLeave = async () => {
    const r = await api('/leave')
    if (r.ok && Array.isArray(r.data)) { setLeave(r.data); setLeaveLoad('ok') } else setLeaveLoad('error')
  }
  useEffect(() => { loadLeave() }, [])

  const addLeave = async (e) => {
    e.preventDefault()
    if (!leaveForm.start || !leaveForm.end) { setLeaveMsg('Choose a start date and an end date.'); return }
    if (leaveForm.end < leaveForm.start) { setLeaveMsg('The end date can\'t be before the start date.'); return }
    setLeaveBusy(true); setLeaveMsg('')
    const r = await api('/leave', 'POST', { start_date: leaveForm.start, end_date: leaveForm.end, reason: leaveForm.reason.trim() })
    setLeaveBusy(false)
    if (!r.ok) { setLeaveMsg(r.error || 'Could not add time off.'); return }
    setLeaveForm({ start: '', end: '', reason: '' })
    await loadLeave()
  }

  const removeLeave = async (id) => {
    if (!window.confirm('Remove this time off?')) return
    setLeaveBusy(true); setLeaveMsg('')
    const r = await api(`/leave/${id}`, 'DELETE')
    setLeaveBusy(false)
    if (!r.ok) { setLeaveMsg(r.error || 'Could not remove time off.'); return }
    await loadLeave()
  }

  const me = barbers.find((b) => b.user_id === user.users_id)
  if (!me) return <Page><div className="page-title"><h1>DASHBOARD</h1></div><p className="page-body muted">No barber profile is linked to this account.</p></Page>

  const mine = appointments.filter((a) => a.barber_id === me.barber_id)
  const cust = (a) => { const u = users.find((x) => x.users_id === a.user_id); return u ? `${u.first_name} ${u.last_name}` : 'Unknown' }
  const svc = (a) => services.find((s) => s.service_id === a.service_id)
  const live = mine.filter((a) => a.status !== 'Cancelled' && a.status !== 'Declined')
  const stats = [
    ["Today's Appointments", live.filter((a) => a.appointment_date === today).length, 'var(--text)', () => { setDay(today); scrollToId('dash-appointments') }],
    ['Upcoming', live.filter((a) => a.appointment_date > today && a.status !== 'Completed').length, 'var(--gold)', () => scrollToId('dash-calendar')],
    ['In Chair', mine.filter((a) => a.status === 'In Progress').length, '#9db4ff', () => { setDay(today); scrollToId('dash-appointments') }],
    ['Completed', mine.filter((a) => a.status === 'Completed').length, '#4ade80'],
  ]
  const dayList = mine.filter((a) => a.appointment_date === day).sort((a, b) => a.start_time.localeCompare(b.start_time))
  const earned = mine.filter((a) => a.status === 'Completed').reduce((n, a) => n + svc(a).price, 0)

  const first = new Date(month.y, month.m, 1)
  const cells = [...Array(first.getDay()).fill(null), ...Array(new Date(month.y, month.m + 1, 0).getDate()).fill(0).map((_, i) => i + 1)]
  const shift = (n) => setMonth(({ y, m }) => { const d = new Date(y, m + n, 1); return { y: d.getFullYear(), m: d.getMonth() } })
  const count = (key) => live.filter((a) => a.appointment_date === key).length
  const myHours = schedules.filter((s) => s.barber_id === me.barber_id && s.is_active)
  const history = detail ? logs.filter((l) => l.appointment_id === detail.appointment_id) : []

  return (
    <Page>
      <div className="page-title"><h1>DASHBOARD</h1><p className="sub">{fullName(me)} · {me.specialty}</p></div>
      <section className="page-body narrow">
        <div className="stat-box four">
          {stats.map(([label, n, color, go], i) => (
            <motion.div key={label} className="stat" {...clickable(go)} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.08 }}>
              <h3>{label}</h3><b style={{ color }}>{n}</b>
            </motion.div>
          ))}
        </div>
        <p className="muted center" style={{ marginTop: -8, marginBottom: 24 }}>Earned from completed cuts: <b style={{ color: 'var(--gold)' }}>{peso(earned)}</b></p>
        {load === 'error' && <p className="muted center" style={{ marginTop: -12, marginBottom: 24 }}>Could not refresh from the server. Showing the last loaded data.</p>}

        <div className="panel" id="dash-appointments">
          <header><div><h2>{day === today ? "Today's Appointments" : 'Appointments'}</h2><p>{longDate(day)}</p></div><span>{dayList.filter((a) => a.status !== 'Cancelled' && a.status !== 'Declined').length} booked</span></header>
          {dayList.length === 0 ? <p className="muted" style={{ textAlign: 'center', padding: '24px 0' }}>{load === 'loading' ? 'Loading your appointments…' : 'Nothing booked for this day.'}</p> : (
            <div className="table-wrap"><table className="tbl">
              <thead><tr><th>Time</th><th>Customer</th><th>Service</th><th>Status</th><th>Action</th></tr></thead>
              <tbody>
                {dayList.map((a, i) => (
                  <motion.tr key={a.appointment_id} layout initial={{ opacity: 0, x: -14 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.05 }}>
                    <td>{fmt12(a.start_time)}</td><td>{cust(a)}</td><td>{svc(a).service_name}</td>
                    <td><StatusBadge status={a.status} /></td>
                    <td className="acts">
                      {(NEXT[a.status] || []).map(([label, to], k) => <button key={label} className={`mini${k ? ' ghost' : ''}`} onClick={() => setStatus(a.appointment_id, to, user.users_id)}>{label}</button>)}
                      <button className="mini ghost" onClick={() => setDetail(a)}>Details &rarr;</button>
                    </td>
                  </motion.tr>
                ))}
              </tbody>
            </table></div>
          )}
        </div>

        <div className="panel" id="dash-calendar">
          <header><div><h2>Calendar</h2><p>Select a day to see its appointments.</p></div></header>
          <div className="cal-head">
            <button onClick={() => shift(-1)} aria-label="Previous month">&lsaquo;</button><strong>{MONTHS[month.m]} {month.y}</strong><button onClick={() => shift(1)} aria-label="Next month">&rsaquo;</button>
          </div>
          <div className="cal">
            {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((d) => <span key={d} className="dow">{d}</span>)}
            {cells.map((d, i) => {
              if (!d) return <span key={i} />
              const key = iso(new Date(month.y, month.m, d)); const n = count(key)
              return <button key={i} className={`day open${day === key ? ' on' : ''}${key === today ? ' today' : ''}`} onClick={() => setDay(key)}>{d}{n > 0 && <i className="dot">{n}</i>}</button>
            })}
          </div>
          <p className="slot-title">My working hours</p>
          <div className="chips">{myHours.map((s) => <span key={s.schedule_id}>{s.day_of_week} · {fmt12(s.start_time)}–{fmt12(s.end_time)}</span>)}</div>
        </div>
        <div className="panel" id="dash-timeoff">
          <header><div><h2>Time off</h2><p>Customers can't book you on these dates.</p></div><span>{leave.length} upcoming</span></header>
          <form className="form-grid" onSubmit={addLeave}>
            <label>Start date<input type="date" min={today} value={leaveForm.start} onChange={(e) => setLeaveForm((f) => ({ ...f, start: e.target.value, end: f.end && f.end < e.target.value ? e.target.value : f.end }))} /></label>
            <label>End date<input type="date" min={leaveForm.start || today} value={leaveForm.end} onChange={(e) => setLeaveForm((f) => ({ ...f, end: e.target.value }))} /></label>
            <label className="full">Reason (optional)<input type="text" maxLength={255} placeholder="Day off" value={leaveForm.reason} onChange={(e) => setLeaveForm((f) => ({ ...f, reason: e.target.value }))} /></label>
            <div className="full"><button type="submit" className="mini" disabled={leaveBusy}>{leaveBusy ? 'Saving…' : 'Add time off'}</button></div>
          </form>
          {leaveMsg && <p className="muted" role="alert" style={{ marginTop: 12, color: '#e5736b' }}>{leaveMsg}</p>}
          <p className="slot-title">Upcoming time off</p>
          {leaveLoad === 'loading' && <p className="muted">Loading your time off…</p>}
          {leaveLoad === 'error' && <p className="muted">Could not load your time off. <button className="mini ghost" onClick={loadLeave}>Try again</button></p>}
          {leaveLoad === 'ok' && leave.length === 0 && <p className="muted">No upcoming time off.</p>}
          {leaveLoad === 'ok' && leave.length > 0 && (
            <ul className="history">
              {leave.map((l) => (
                <li key={l.exception_id}>
                  <span>{l.start_date === l.end_date ? longDate(l.start_date) : `${longDate(l.start_date)} – ${longDate(l.end_date)}`} · <b>{l.reason}</b>{l.status !== 'APPROVED' && <small> ({l.status.toLowerCase()})</small>}</span>
                  <button className="mini ghost" disabled={leaveBusy} onClick={() => removeLeave(l.exception_id)}>Remove</button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>

      <Modal open={!!detail} onClose={() => setDetail(null)} title="Appointment details">
        {detail && <>
          <dl className="review">
            {[['Customer', cust(detail)], ['Service', `${svc(detail).service_name} · ${peso(svc(detail).price)}`], ['Date', longDate(detail.appointment_date)], ['Time', `${fmt12(detail.start_time)} – ${fmt12(detail.end_time)}`], ['Notes', detail.notes || '—']].map(([k, v]) => <div key={k}><dt>{k}</dt><dd>{v}</dd></div>)}
          </dl>
          <p className="slot-title">Status history</p>
          <ul className="history">
            {history.length === 0 && <li className="muted">No changes yet.</li>}
            {history.map((l) => <li key={l.log_id}><span>{l.old_status || 'New'} &rarr; <b>{l.new_status}</b></span><small>{l.changed_at} · {(() => { const u = users.find((x) => x.users_id === l.changed_by); return u ? u.first_name : '—' })()}</small></li>)}
          </ul>
        </>}
      </Modal>
    </Page>
  )
}
