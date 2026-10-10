import test from 'node:test'
import assert from 'node:assert/strict'
import { pendingCount, badgeText } from './pending.js'

const appts = [
  { appointment_id: 1, barber_id: 1, status: 'Pending', appointment_date: '2026-10-12' },
  { appointment_id: 2, barber_id: 1, status: 'Pending', appointment_date: '2026-11-30' },
  { appointment_id: 3, barber_id: 1, status: 'Confirmed', appointment_date: '2026-10-12' },
  { appointment_id: 4, barber_id: 2, status: 'Pending', appointment_date: '2026-10-12' },
  { appointment_id: 5, barber_id: 2, status: 'Declined', appointment_date: '2026-10-13' },
]

test('admin count includes every pending appointment on any date', () => {
  assert.equal(pendingCount(appts), 3)
})

test('barber count only includes that barber, across all dates', () => {
  assert.equal(pendingCount(appts, 1), 2)
  assert.equal(pendingCount(appts, 2), 1)
  assert.equal(pendingCount(appts, 99), 0)
})

test('other statuses are never counted', () => {
  assert.equal(pendingCount([{ barber_id: 1, status: 'Cancelled' }, { barber_id: 1, status: 'In Progress' }], 1), 0)
  assert.equal(pendingCount([]), 0)
})

test('badge text caps large numbers', () => {
  assert.equal(badgeText(7), '7')
  assert.equal(badgeText(99), '99')
  assert.equal(badgeText(100), '99+')
})
