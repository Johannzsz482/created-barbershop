import { createContext, useContext } from 'react'
import { act, api, refresh, toDb, useStore } from '../api'

const Ctx = createContext(null)

// The multipart body both "add service with photo" and "edit service with photo" send
const serviceForm = (s, file) => {
  const fd = new FormData()
  fd.append('service_name', s.service_name)
  if (s.description != null) fd.append('description', s.description)   // left out when empty (null) so saving a photo never turns a missing description into a blank one
  fd.append('price', String(s.price))
  fd.append('duration_minutes', String(s.duration_minutes))
  fd.append('file', file)
  return fd
}

// A backend built before photo upload existed has no multipart route for services and answers 405 or 415
// ("Unsupported Media Type"). Say what is really wrong instead of that bare message; the form stays open with its data.
const uploadAnswer = (r) => ((r.status === 405 || r.status === 415)
  ? { ...r, error: 'The server could not accept the photo. It may be running an older version without photo upload: rebuild and restart the backend, then try again.' }
  : r)

// Barbers, services, schedules and barber-service links now come from the database.
// Only admins can change them (the backend returns 403 to anyone else).
export function CatalogProvider({ children }) {
  const { barbers, services, schedules, barberServices } = useStore()

  const value = {
    barbers, services, schedules, barberServices,

    saveService: (s) => (s.service_id
      ? act(`/admin/services/${s.service_id}`, 'PUT', s)
      : act('/admin/services', 'POST', s)),
    // Add a service together with a photo. Returns the server's answer (no alert) so the form can show the error and stay open.
    addServiceWithPhoto: async (s, file) => {
      const r = uploadAnswer(await api('/admin/services', 'POST', serviceForm(s, file)))
      if (r.ok) await refresh()
      return r
    },
    // Save an existing service together with a replacement photo (same upload route rules as adding).
    // Returns the server's answer (no alert) so the form can show the error and stay open; on failure nothing changed.
    editServiceWithPhoto: async (s, file) => {
      const r = uploadAnswer(await api(`/admin/services/${s.service_id}`, 'PUT', serviceForm(s, file)))
      if (r.ok) await refresh()
      return r
    },
    toggleService: (id) => act(`/admin/services/${id}/toggle`, 'PATCH'),
    deleteService: (id) => act(`/admin/services/${id}`, 'DELETE'),

    saveBarber: (b) => (b.barber_id
      ? act(`/admin/barbers/${b.barber_id}`, 'PUT', b)
      : act('/admin/barbers', 'POST', b)),
    toggleBarber: (id) => act(`/admin/barbers/${id}/toggle`, 'PATCH'),
    setBarberServices: (barberId, serviceIds) => act(`/admin/barbers/${barberId}/services`, 'PUT', { serviceIds }),

    toggleUser: (id) => act(`/admin/users/${id}/toggle`, 'PATCH'),

    addSchedule: (s) => act('/admin/schedules', 'POST', { ...s, day_of_week: toDb(s.day_of_week) }),
    editSchedule: (s) => act(`/admin/schedules/${s.schedule_id}`, 'PUT', { barber_id: s.barber_id, day_of_week: toDb(s.day_of_week), start_time: s.start_time, end_time: s.end_time }),
    toggleSchedule: (id) => act(`/admin/schedules/${id}/toggle`, 'PATCH'),
    deleteSchedule: (id) => act(`/admin/schedules/${id}`, 'DELETE'),
  }

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>
}

export const useCatalog = () => useContext(Ctx)
