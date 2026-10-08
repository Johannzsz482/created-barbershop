import { useState } from 'react'
import Modal from './Modal'
import { useCatalog } from '../context/CatalogContext'
import { openDates } from '../lib/slots'
import { useSlots } from '../lib/useSlots'
import { fmt12, toHHMM, longDate, DAYS } from '../lib/time'

export default function RescheduleModal({ appt, service, onClose, onSave }) {
  const { schedules } = useCatalog()
  const [date, setDate] = useState(null)
  const [time, setTime] = useState(null)
  // Slots come from the backend; excludeId makes this booking's own old slot count as free
  const { slots, loading, error, closedReason } = useSlots({ barberId: appt?.barber_id, serviceId: service?.service_id, date, excludeId: appt?.appointment_id })
  if (!appt) return <Modal open={false} onClose={onClose} />
  const dates = openDates(appt.barber_id, schedules)

  return (
    <Modal open onClose={onClose} title="Reschedule">
      <p className="muted">{service.service_name} · pick a new day and time. It returns to Pending until your barber confirms.</p>
      <div className="date-chips">
        {dates.map((d) => {
          const x = new Date(d + 'T00:00:00')
          return <button key={d} className={date === d ? 'on' : ''} onClick={() => { setDate(d); setTime(null) }}><small>{DAYS[x.getDay()].slice(0, 3)}</small>{x.getDate()}<small>{x.toLocaleString('en-US', { month: 'short' })}</small></button>
        })}
      </div>
      <p className="slot-title">{date ? longDate(date) : 'Choose a date.'}</p>
      <div className="slots">
        {slots.map((s) => <button key={s.t} disabled={s.booked || s.past} className={`slot${time === s.t ? ' on' : ''}${s.booked ? ' booked' : ''}`} onClick={() => setTime(s.t)}>{fmt12(toHHMM(s.t))}{s.booked && <small>BOOKED</small>}</button>)}
        {date && loading && <p className="muted">Loading time slots…</p>}
        {date && error && <p className="muted">{error}</p>}
        {date && !loading && !error && slots.length === 0 && <p className="muted">{closedReason === 'ON_LEAVE' ? 'Your barber is on leave this day.' : 'No time slots on this day.'}</p>}
      </div>
      <div className="row-btns">
        <button className="btn btn-gold" disabled={!date || time === null} onClick={() => onSave(date, toHHMM(time), toHHMM(time + service.duration_minutes))}>Save new time</button>
        <button className="btn btn-outline" onClick={onClose}>Keep current</button>
      </div>
    </Modal>
  )
}
