import { iso } from './time'

export const PERIODS = ['Daily', 'Weekly', 'Monthly', 'Yearly']
const MON = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
const parse = (s) => { const [y, m, d] = s.split('-').map(Number); return new Date(y, m - 1, d) }
const mondayOf = (d) => new Date(d.getFullYear(), d.getMonth(), d.getDate() - ((d.getDay() + 6) % 7))

// What the customer was actually charged: the price saved with the booking (price_at_booking).
// Falls back to the service's current price only when no booked price was recorded.
export function bookedPrice(a, svc) {
  const p = Number(a.price_at_booking)
  return a.price_at_booking != null && a.price_at_booking !== '' && Number.isFinite(p) ? p : Number(svc?.price) || 0
}

// Revenue of Completed appointments, grouped by appointment date.
// Daily = last 14 days, Weekly = last 12 weeks (Mon-Sun), Monthly = last 12 months, Yearly = up to last 5 years.
export function revenueBuckets(appts, svcOf, period, now = new Date()) {
  const done = appts.filter((a) => a.status === 'Completed')
  let list = [] // [{ key, label }]
  let keyOf = (s) => s

  if (period === 'Daily') {
    for (let i = 13; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() - i)
      list.push({ key: iso(d), label: `${MON[d.getMonth()]} ${d.getDate()}` })
    }
  } else if (period === 'Weekly') {
    const mon = mondayOf(now)
    for (let i = 11; i >= 0; i--) {
      const m = new Date(mon.getFullYear(), mon.getMonth(), mon.getDate() - 7 * i)
      const e = new Date(m.getFullYear(), m.getMonth(), m.getDate() + 6)
      list.push({ key: iso(m), label: `${MON[m.getMonth()]} ${m.getDate()}–${e.getMonth() === m.getMonth() ? '' : MON[e.getMonth()] + ' '}${e.getDate()}` })
    }
    keyOf = (s) => iso(mondayOf(parse(s)))
  } else if (period === 'Monthly') {
    for (let i = 11; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
      list.push({ key: iso(d).slice(0, 7), label: `${MON[d.getMonth()]} ${d.getFullYear()}` })
    }
    keyOf = (s) => s.slice(0, 7)
  } else {
    const first = Math.min(now.getFullYear(), ...done.map((a) => +a.appointment_date.slice(0, 4)))
    for (let y = Math.max(first, now.getFullYear() - 4); y <= now.getFullYear(); y++) list.push({ key: String(y), label: String(y) })
    keyOf = (s) => s.slice(0, 4)
  }

  const rows = list.map((b) => ({ ...b, total: 0, count: 0 }))
  const at = Object.fromEntries(rows.map((r) => [r.key, r]))
  const items = [] // every completed appointment inside the window, with the amount counted for it
  done.forEach((a) => {
    const r = at[keyOf(a.appointment_date)]
    if (!r) return
    const amount = bookedPrice(a, svcOf(a.service_id))
    r.total += amount; r.count += 1
    items.push({ appt: a, amount })
  })
  items.sort((x, y) => `${y.appt.appointment_date} ${y.appt.start_time}`.localeCompare(`${x.appt.appointment_date} ${x.appt.start_time}`))
  return { rows, items, total: rows.reduce((n, r) => n + r.total, 0), count: rows.reduce((n, r) => n + r.count, 0) }
}
