import { useCallback, useEffect, useState } from 'react'
import { api } from '../api'
import { toMin } from './time'

// Time slots come from the backend (GET /api/barbers/{id}/slots) so the screen always
// agrees with the booking rules. Pass excludeId when rescheduling: that booking's own
// old slot then counts as free.
// Each slot keeps the shape the pages already use: { t: minutes, booked, past }.
export function useSlots({ barberId, serviceId, date, excludeId }) {
  const key = barberId && serviceId && date ? `${barberId}|${serviceId}|${date}|${excludeId || ''}` : ''
  const [result, setResult] = useState({ key: '', slots: [], closedReason: null, error: null })
  const [tick, setTick] = useState(0)
  const reload = useCallback(() => setTick((n) => n + 1), [])

  useEffect(() => {
    if (!key) return undefined
    let stale = false
    const qs = `date=${date}&serviceId=${serviceId}${excludeId ? `&excludeAppointmentId=${excludeId}` : ''}`
    api(`/barbers/${barberId}/slots?${qs}`).then((r) => {
      if (stale) return
      if (!r.ok) {
        setResult({ key, slots: [], closedReason: null, error: r.error || 'Could not load time slots.' })
        return
      }
      setResult({
        key, error: null, closedReason: r.data.closedReason,
        slots: r.data.slots.map((s) => ({
          t: toMin(s.start),
          booked: s.reason === 'BOOKED',
          past: !s.available && s.reason !== 'BOOKED', // PAST, or any other reason: not selectable
        })),
      })
    })
    return () => { stale = true }
  }, [key, tick]) // eslint-disable-line react-hooks/exhaustive-deps

  const loading = key !== '' && result.key !== key
  if (!key || loading) return { slots: [], closedReason: null, error: null, loading, reload }
  return { slots: result.slots, closedReason: result.closedReason, error: result.error, loading: false, reload }
}
