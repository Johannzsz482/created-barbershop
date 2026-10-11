import test from 'node:test'
import assert from 'node:assert/strict'
import { serviceAvailability, unavailableMessage } from './availability.js'

const svc = (id, is_active = true) => ({ service_id: id, service_name: 'S' + id, is_active })
const cat = {
  barbers: [{ barber_id: 1, is_active: true }, { barber_id: 2, is_active: false }, { barber_id: 3, is_active: true }],
  schedules: [{ barber_id: 1, is_active: true }, { barber_id: 2, is_active: true }, { barber_id: 3, is_active: false }],
  barberServices: [{ barber_id: 1, service_id: 1 }, { barber_id: 2, service_id: 2 }, { barber_id: 3, service_id: 3 }, { barber_id: 1, service_id: 4 }],
}
const why = (s) => serviceAvailability(s, cat)

test('active service with an active, scheduled barber is bookable', () => {
  assert.deepEqual(why(svc(1)), { bookable: true, reason: null })
})
test('inactive service is not bookable, even when a barber offers it', () => {
  assert.equal(why(svc(4, false)).reason, 'inactive')
  assert.equal(why(svc(4, false)).bookable, false)
})
test('service nobody offers: no-barber', () => assert.equal(why(svc(9)).reason, 'no-barber'))
test('only inactive barbers offer it: barber-inactive', () => assert.equal(why(svc(2)).reason, 'barber-inactive'))
test('its barber has no active schedule: no-schedule', () => assert.equal(why(svc(3)).reason, 'no-schedule'))
test('one working barber is enough even when others are not', () => {
  const c = { ...cat, barberServices: [...cat.barberServices, { barber_id: 2, service_id: 1 }, { barber_id: 3, service_id: 1 }] }
  assert.equal(serviceAvailability(svc(1), c).bookable, true)
})
test('matches the rule the Booking page used before (active + active barber + active schedule)', () => {
  const old = (s) => s.is_active && cat.barbers.some((b) => b.is_active && cat.barberServices.some((x) => x.barber_id === b.barber_id && x.service_id === s.service_id) && cat.schedules.some((x) => x.barber_id === b.barber_id && x.is_active))
  for (const s of [svc(1), svc(2), svc(3), svc(4), svc(4, false), svc(9)]) assert.equal(serviceAvailability(s, cat).bookable, !!old(s))
})
test('customer message names the service and gives a plain reason', () => {
  assert.match(unavailableMessage('Wolf Cut', 'no-barber'), /Wolf Cut can't be booked right now\. None of our barbers/)
  assert.match(unavailableMessage('Wolf Cut', 'inactive'), /not being offered/)
})
