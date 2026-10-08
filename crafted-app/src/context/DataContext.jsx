import { createContext, useContext } from 'react'
import { act, api, refresh, toDb, useStore } from '../api'

const DataContext = createContext(null)

// Appointments and status history now come from the database.
// The function names are the same as before, so the pages did not need to change.
export function DataProvider({ children }) {
  const { appointments, logs } = useStore()

  // The backend works out the end time from the service length and checks the barber's schedule.
  const addAppointment = async (a) => {
    const r = await api('/appointments', 'POST', {
      barberId: a.barber_id, serviceId: a.service_id, appointmentDate: a.appointment_date,
      startTime: a.start_time, notes: a.notes,
    })
    if (!r.ok) return { ok: false, error: r.error || 'Could not book that slot.' }
    await refresh()
    return { ok: true, appointment: { ...a, end_time: r.data.endTime || a.end_time, status: 'Pending' } }
  }

  const setStatus = (id, status) =>
    act(`/appointments/${id}/status`, 'PATCH', { status: toDb(status) }, (s) => ({
      ...s, appointments: s.appointments.map((x) => (x.appointment_id === id ? { ...x, status } : x)),
    }))

  // Goes back to Pending so the barber confirms the new time
  const reschedule = (id, date, start) =>
    act(`/appointments/${id}/reschedule`, 'PATCH', { appointmentDate: date, startTime: start })

  // Admin only: create, edit and delete any appointment (POST/PUT/DELETE /api/admin/appointments)
  const toBody = (a) => ({
    userId: a.user_id, barberId: a.barber_id, serviceId: a.service_id,
    appointmentDate: a.appointment_date, startTime: a.start_time, notes: a.notes,
  })
  const adminSave = async (a) => {
    const r = a.appointment_id
      ? await api(`/admin/appointments/${a.appointment_id}`, 'PUT', toBody(a))
      : await api('/admin/appointments', 'POST', toBody(a))
    await refresh()
    return r.ok ? { ok: true } : { ok: false, error: r.error || 'Could not save the appointment.' }
  }
  const adminDelete = (id) => act(`/admin/appointments/${id}`, 'DELETE')

  // The backend now cancels a deleted customer's bookings itself
  const cancelActiveFor = () => refresh()

  return <DataContext.Provider value={{ appointments, logs, addAppointment, setStatus, reschedule, cancelActiveFor, adminSave, adminDelete }}>{children}</DataContext.Provider>
}

export const useData = () => useContext(DataContext)
