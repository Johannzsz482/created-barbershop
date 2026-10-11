// Can a service be booked right now, and if not, why? One rule for the whole site: the Booking page, the
// Sample Hairstyle gallery and Admin → Services all ask this, so they cannot disagree about a service.
// A service is bookable when it is active and at least one ACTIVE barber who offers it has an ACTIVE schedule.
// `catalog` is { barbers, schedules, barberServices } (from useCatalog()).
// reason: null | 'inactive' | 'no-barber' | 'barber-inactive' | 'no-schedule'
export function serviceAvailability(service, { barbers, schedules, barberServices }) {
  if (!service.is_active) return { bookable: false, reason: 'inactive' }
  const offering = barberServices.filter((x) => x.service_id === service.service_id).map((x) => x.barber_id)
  if (!offering.length) return { bookable: false, reason: 'no-barber' }
  const working = barbers.filter((b) => b.is_active && offering.includes(b.barber_id))
  if (!working.length) return { bookable: false, reason: 'barber-inactive' }
  if (!working.some((b) => schedules.some((s) => s.barber_id === b.barber_id && s.is_active))) return { bookable: false, reason: 'no-schedule' }
  return { bookable: true, reason: null }
}

// Customer-facing sentence (no internal details)
export const unavailableMessage = (name, reason) =>
  `${name} can't be booked right now. ${reason === 'inactive' ? 'It is not being offered at the moment.' : 'None of our barbers is currently available for it.'}`
