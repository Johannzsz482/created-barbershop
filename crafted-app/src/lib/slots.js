import { DAYS, iso } from './time'

// Only picks which dates to offer. The actual time slots come from the backend (see useSlots.js).
// Next `count` days on which this barber has an active schedule
export function openDates(barberId, schedules, count = 28) {
  const days = new Set(schedules.filter((s) => s.barber_id === barberId && s.is_active).map((s) => DAYS.indexOf(s.day_of_week)))
  const start = new Date(); start.setHours(0, 0, 0, 0)
  const out = []
  for (let i = 0; i < count; i++) {
    const d = new Date(start); d.setDate(start.getDate() + i)
    if (days.has(d.getDay())) out.push(iso(d))
  }
  return out
}
