// How many appointments are waiting for a barber to confirm or decline them, across all dates.
// Pass a barberId to count only that barber's bookings (the Barber dashboard and header badge);
// leave it out to count everything (Admin). Statuses are Title Case after api.js normalises them.
export const pendingCount = (appointments, barberId) =>
  appointments.filter((a) => a.status === 'Pending' && (barberId == null || a.barber_id === barberId)).length

// "99+" instead of a long number inside a small badge
export const badgeText = (n) => (n > 99 ? '99+' : String(n))
