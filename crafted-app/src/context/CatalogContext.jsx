import { createContext, useContext } from 'react'
import { act, toDb, useStore } from '../api'

const Ctx = createContext(null)

// Barbers, services, schedules and barber-service links now come from the database.
// Only admins can change them (the backend returns 403 to anyone else).
export function CatalogProvider({ children }) {
  const { barbers, services, schedules, barberServices } = useStore()

  const value = {
    barbers, services, schedules, barberServices,

    saveService: (s) => (s.service_id
      ? act(`/admin/services/${s.service_id}`, 'PUT', s)
      : act('/admin/services', 'POST', s)),
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
