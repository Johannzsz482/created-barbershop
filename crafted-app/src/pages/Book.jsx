import { useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import Page from '../components/Page'
import Avatar from '../components/Avatar'
import { useAuth } from '../context/AuthContext'
import { useData } from '../context/DataContext'
import { useCatalog } from '../context/CatalogContext'
import { useSlots } from '../lib/useSlots'
import { DAYS, toHHMM, fmt12, iso, peso, fullName, prettyDate } from '../lib/time'
import { hairstyles } from '../data/hairstyles'
import '../styles/booking.css'

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']
const STEPS = ['Service', 'Barber', 'Schedule', 'Review']

// Picture for a service: reuse the first sample-hairstyle photo of that service (Batch 6), else a neutral shop photo
function svcImg(name) {
  const h = hairstyles.find((x) => x.service.toLowerCase() === String(name).trim().toLowerCase())
  return h ? { src: h.img, pos: h.pos } : { src: '/assets/tools_b&w.png', pos: '50% 50%' }
}

// Compact "selected service" summary: picture, name, price, duration
function ServiceBar({ service }) {
  if (!service) return null
  const img = svcImg(service.service_name)
  return (
    <div className="sel-bar">
      <img src={img.src} alt="" style={{ objectPosition: img.pos }} />
      <div className="sel-name"><small>Selected service</small><h4>{service.service_name}</h4></div>
      <div className="sel-meta"><b>{peso(service.price)}</b><span>{service.duration_minutes} mins</span></div>
    </div>
  )
}

export default function Book() {
  const { user } = useAuth()
  const { addAppointment } = useData()
  const { barbers, services, schedules, barberServices } = useCatalog()
  const today = new Date()
  const [selRaw, setSel] = useState({ service: null, barber: null, date: null, time: null })
  const [params] = useSearchParams()
  const [skipPreset, setSkipPreset] = useState(false) // after "Book another", start empty again
  const [notes, setNotes] = useState('')
  const [month, setMonth] = useState({ y: today.getFullYear(), m: today.getMonth() })
  const [done, setDone] = useState(null)

  const barberOffers = (b, s) => barberServices.some((x) => x.barber_id === b.barber_id && x.service_id === s)
  const activeSchedules = (b) => schedules.filter((s) => s.barber_id === b && s.is_active)

  // Only show services that an active, scheduled barber can actually perform
  const bookable = services.filter((s) => s.is_active && barbers.some((b) => b.is_active && barberOffers(b, s.service_id) && activeSchedules(b.barber_id).length))
  // Optional preselected service from /book?service=<id> (e.g. from the hairstyle gallery); ignored unless it is bookable
  const presetService = skipPreset ? null : (bookable.find((s) => String(s.service_id) === params.get('service'))?.service_id ?? null)
  const sel = { ...selRaw, service: selRaw.service ?? presetService }
  const service = services.find((s) => s.service_id === sel.service)
  const barber = barbers.find((b) => b.barber_id === sel.barber)
  const barberChoices = service ? barbers.filter((b) => b.is_active && barberOffers(b, service.service_id) && activeSchedules(b.barber_id).length) : []

  const workDays = barber ? new Set(activeSchedules(barber.barber_id).map((s) => DAYS.indexOf(s.day_of_week))) : new Set()
  const startOfToday = new Date(today.getFullYear(), today.getMonth(), today.getDate())

  // Slots come from the backend, so booked/past/leave rules live in one place
  const { slots, loading: slotsLoading, error: slotsError, closedReason, reload: reloadSlots } = useSlots({
    barberId: barber?.barber_id, serviceId: service?.service_id, date: sel.date,
  })

  const step = !sel.service ? 1 : !sel.barber ? 2 : !(sel.date && sel.time !== null) ? 3 : 4
  const pick = (patch) => setSel((s) => ({ ...s, ...patch }))

  const first = new Date(month.y, month.m, 1)
  const cells = [...Array(first.getDay()).fill(null), ...Array(new Date(month.y, month.m + 1, 0).getDate()).fill(0).map((_, i) => i + 1)]
  const shift = (n) => setMonth(({ y, m }) => { const d = new Date(y, m + n, 1); return { y: d.getFullYear(), m: d.getMonth() } })
  const canPrev = month.y * 12 + month.m > today.getFullYear() * 12 + today.getMonth()
  const canNext = month.y * 12 + month.m < today.getFullYear() * 12 + today.getMonth() + 2

  const confirm = async () => {
    const res = await addAppointment({
      barber_id: barber.barber_id, service_id: service.service_id, appointment_date: sel.date,
      start_time: toHHMM(sel.time), end_time: toHHMM(sel.time + service.duration_minutes), notes: notes.trim(),
    }, user.users_id)
    if (!res.ok) { window.alert(res.error); pick({ time: null }); reloadSlots(); return }
    setDone(res.appointment)
  }
  const reset = () => { setSel({ service: null, barber: null, date: null, time: null }); setSkipPreset(true); setNotes(''); setDone(null) }

  if (done) {
    return (
      <Page>
        <div className="page-title"><h1>BOOKING SENT</h1></div>
        <section className="page-body narrow">
          <motion.div className="panel success" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}>
            <svg width="64" height="64" viewBox="0 0 64 64" fill="none" stroke="var(--gold)" strokeWidth="3"><circle cx="32" cy="32" r="28" /><motion.path d="m20 33 8 8 16-18" initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ duration: 0.6, delay: 0.2 }} /></svg>
            <h2>You're booked, {user.first_name}.</h2>
            <p>{service.service_name} with {fullName(barber)}<br />{prettyDate(done.appointment_date)}, {fmt12(done.start_time)}</p>
            <p className="muted">Status: Pending — the barber will confirm your slot.</p>
            <div className="row-btns"><Link className="btn btn-gold" to="/appointments">View appointments</Link><button className="btn btn-outline" onClick={reset}>Book another</button></div>
          </motion.div>
        </section>
      </Page>
    )
  }

  const Panel = ({ n, title, sub, children }) => (
    <motion.section id={`step-${n}`} className={`panel${step < n ? ' locked' : ''}`} animate={{ opacity: step < n ? 0.4 : 1 }}>
      <header><div><h2>{n}. {title}</h2><p>{sub}</p></div><span>0{n}/04</span></header>
      {children}
    </motion.section>
  )

  return (
    <Page>
      <div className="page-title"><h1>BOOK AN APPOINTMENT</h1></div>
      <section className="page-body narrow">
        <ol className="stepper">
          {STEPS.map((s, i) => (
            <li key={s} className={step > i + 1 ? 'done' : step === i + 1 ? 'now' : ''}>
              <button onClick={() => step >= i + 1 && document.getElementById(`step-${i + 1}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' })}>{i + 1}</button>
              <span>{s}</span>
            </li>
          ))}
        </ol>

        <Panel n={1} title="Select Service" sub="Choose from our signature tailored haircuts and grooming treatments.">
          <div className="svc-grid">
            {bookable.map((s) => (
              <motion.button key={s.service_id} whileHover={{ y: -3 }} whileTap={{ scale: 0.98 }} className={`svc-card${sel.service === s.service_id ? ' on' : ''}`} aria-pressed={sel.service === s.service_id} onClick={() => setSel({ service: s.service_id, barber: null, date: null, time: null })}>
                <div className="svc-img"><img src={svcImg(s.service_name).src} alt="" loading="lazy" style={{ objectPosition: svcImg(s.service_name).pos }} /></div>
                <div className="top"><h3>{s.service_name}</h3><b>{peso(s.price)}</b></div>
                <p>{s.description}</p>
                <small>{s.duration_minutes} mins</small>
              </motion.button>
            ))}
          </div>
          <ServiceBar service={service} />
        </Panel>

        <Panel n={2} title="Choose Barber" sub="Select your master artisan barber for this session.">
          <ServiceBar service={service} />
          <div className="barber-grid">
            {barberChoices.map((b) => (
              <motion.button key={b.barber_id} whileHover={{ y: -3 }} className={`barber-card${sel.barber === b.barber_id ? ' on' : ''}`} aria-pressed={sel.barber === b.barber_id} onClick={() => pick({ barber: b.barber_id, date: null, time: null })}>
                <Avatar barber={b} size={84} />
                <h3>{b.first_name}</h3>
                <h4>{b.specialty}</h4>
                <p>{b.bio}</p>
                <small>{[...new Set(activeSchedules(b.barber_id).map((s) => s.day_of_week.slice(0, 3)))].join(' · ')}</small>
              </motion.button>
            ))}
          </div>
        </Panel>

        <Panel n={3} title="Select Schedule" sub={barber ? `Open days for ${barber.first_name} are highlighted.` : 'Pick a barber first.'}>
          <div className="cal-head">
            <button onClick={() => shift(-1)} disabled={!canPrev} aria-label="Previous month">&lsaquo;</button>
            <strong>{MONTHS[month.m]} {month.y}</strong>
            <button onClick={() => shift(1)} disabled={!canNext} aria-label="Next month">&rsaquo;</button>
          </div>
          <AnimatePresence mode="wait">
            <motion.div key={`${month.y}-${month.m}`} className="cal" initial={{ opacity: 0, x: 16 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -16 }} transition={{ duration: 0.2 }}>
              {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((d) => <span key={d} className="dow">{d}</span>)}
              {cells.map((d, i) => {
                if (!d) return <span key={i} />
                const date = new Date(month.y, month.m, d)
                const key = iso(date)
                const ok = barber && date >= startOfToday && workDays.has(date.getDay())
                return (
                  <button key={i} disabled={!ok} className={`day${ok ? ' open' : ''}${sel.date === key ? ' on' : ''}${key === iso(today) ? ' today' : ''}`} onClick={() => pick({ date: key, time: null })}>{d}</button>
                )
              })}
            </motion.div>
          </AnimatePresence>
          <ul className="legend" aria-label="Calendar key">
            <li><i className="lg open" />Available</li><li><i className="lg on" />Selected</li>
            <li><i className="lg today" />Today</li><li><i className="lg off" />Unavailable</li><li><i className="lg booked" />Booked</li>
          </ul>
          <p className="slot-title">{sel.date ? `Time slots — ${prettyDate(sel.date)}` : 'Choose a date to see time slots.'}</p>
          <div className="slots">
            {slots.map((s, i) => (
              <motion.button key={s.t} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.02 }} disabled={s.booked || s.past} className={`slot${sel.time === s.t ? ' on' : ''}${s.booked ? ' booked' : ''}`} onClick={() => pick({ time: s.t })}>
                {fmt12(toHHMM(s.t))}{s.booked && <small>BOOKED</small>}
              </motion.button>
            ))}
            {sel.date && slotsLoading && <p className="muted">Loading time slots…</p>}
            {sel.date && slotsError && <p className="muted">{slotsError}</p>}
            {sel.date && !slotsLoading && !slotsError && slots.length === 0 && (
              <p className="muted">{closedReason === 'ON_LEAVE' ? `${barber.first_name} is on leave this day.` : 'No time slots on this day.'}</p>
            )}
          </div>
          {sel.date && sel.time !== null && service && (
            <p className="pick-sum">Your slot: <b>{prettyDate(sel.date)}</b> · {fmt12(toHHMM(sel.time))} – {fmt12(toHHMM(sel.time + service.duration_minutes))}</p>
          )}
        </Panel>

        <Panel n={4} title="Review Summary" sub="Check the details, then confirm.">
          <dl className="review">
            <div><dt>Service</dt><dd>{service ? `${service.service_name} · ${service.duration_minutes} mins` : 'Not selected'}</dd><b>{service ? peso(service.price) : ''}</b></div>
            <div><dt>Barber</dt><dd>{barber ? fullName(barber) : 'Not selected'}</dd></div>
            <div><dt>Date</dt><dd>{sel.date ? prettyDate(sel.date) : 'Not selected'}</dd></div>
            <div><dt>Time</dt><dd>{sel.time !== null && service ? `${fmt12(toHHMM(sel.time))} – ${fmt12(toHHMM(sel.time + service.duration_minutes))}` : 'Not selected'}</dd></div>
          </dl>
          <textarea className="notes" placeholder="Notes for your barber (optional)" value={notes} onChange={(e) => setNotes(e.target.value)} maxLength={200} />
          <div className="total"><span>Total Payables</span><b>{service ? peso(service.price) : '₱0'}</b></div>
          <button className="btn btn-gold wide" disabled={step < 4} onClick={confirm}>Confirm booking</button>
          <p className="muted center">Pay at the shop after your service. Free cancellation.</p>
        </Panel>
      </section>
    </Page>
  )
}
