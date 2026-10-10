import test from 'node:test'
import assert from 'node:assert/strict'
import { validateContact, contactPhoneOk } from './validate.js'

const base = { firstName: 'Juan', lastName: 'Dela Cruz', email: '', phone: '', msg: 'Hello' }

test('guest needs an email or a phone number', () => {
  const e = validateContact(base)
  assert.ok(e.email && e.phone && e.contact)
})

test('guest with only a valid email or only a valid phone passes', () => {
  assert.deepEqual(validateContact({ ...base, email: 'juan@gmail.com' }), {})
  assert.deepEqual(validateContact({ ...base, phone: '0917 123 4567' }), {})
})

test('a provided contact method must itself be valid', () => {
  assert.ok(validateContact({ ...base, email: 'nope' }).email)
  assert.ok(validateContact({ ...base, phone: 'abc' }).phone)
  assert.ok(validateContact({ ...base, email: 'juan@gmail.com', phone: '12' }).phone)
  assert.equal(contactPhoneOk('-------'), false)
})

test('guest names reject markup and digits', () => {
  assert.ok(validateContact({ ...base, email: 'a@b.co', firstName: '<script>' }).firstName)
  assert.ok(validateContact({ ...base, email: 'a@b.co', lastName: 'X1' }).lastName)
  assert.deepEqual(validateContact({ ...base, email: 'a@b.co', firstName: "Ma. Cristina", lastName: "O'Brien-Reyes" }), {})
})

test('signed-in people only need a message', () => {
  assert.deepEqual(validateContact({ firstName: '', lastName: '', email: '', phone: '', msg: 'Hi' }, true), {})
  assert.ok(validateContact({ firstName: 'A', lastName: 'B', email: '', phone: '', msg: '  ' }, true).msg)
})
