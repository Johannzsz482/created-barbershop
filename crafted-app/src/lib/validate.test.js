import test from 'node:test'
import assert from 'node:assert/strict'
import { validateContact, contactPhoneOk, validateSignUp, usernameError, rules, cleanUsername } from './validate.js'

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

const signUp = { firstName: 'Juan', lastName: 'Dela Cruz', username: 'juandc', email: 'juan@gmail.com', phone: '', password: 'abc123', confirm: 'abc123' }

test('sign-up accepts letters and spaces in names, including accents', () => {
  assert.deepEqual(validateSignUp(signUp), {})
  assert.deepEqual(validateSignUp({ ...signUp, firstName: 'Jhanina Avrile', lastName: 'Peña' }), {})
})

test('sign-up rejects numbers and special characters in names', () => {
  for (const bad of ['Juan2', '12', 'Ju@n', "O'Brien", 'Abo-Abo', 'Ma.', '<b>x</b>', 'Juan_', '😀']) {
    assert.equal(validateSignUp({ ...signUp, firstName: bad }).firstName, 'First name can only contain letters and spaces.', bad)
    assert.equal(validateSignUp({ ...signUp, lastName: bad }).lastName, 'Last name can only contain letters and spaces.', bad)
  }
})

test('sign-up names: empty, spaces only and too long keep their own messages', () => {
  assert.equal(validateSignUp({ ...signUp, firstName: '   ' }).firstName, 'Enter your first name.')
  assert.equal(validateSignUp({ ...signUp, lastName: 'a'.repeat(51) }).lastName, 'Last name can be up to 50 characters.')
})

test('edit profile still uses the original name rule, so saved names with a hyphen keep working', () => {
  assert.equal(rules.lastName('Abo-Abo'), '')
})

test('usernames: one clear message per problem', () => {
  assert.equal(usernameError('juan_d.1'), '')
  assert.equal(usernameError('@juan_d.1'), '')            // one leading @ is ignored, as before
  assert.equal(usernameError('  juandc  '), '')
  assert.equal(usernameError(''), 'Enter a username.')
  assert.equal(usernameError('@'), 'Enter a username.')
  assert.equal(usernameError('ab'), 'Username must be at least 3 characters.')
  assert.equal(usernameError('a'.repeat(31)), 'Username can be up to 30 characters.')
  const chars = 'Username can only contain letters, numbers, dots and underscores (no spaces or other symbols).'
  for (const bad of ['ju an', 'juan!', '<script>', "a'; DROP--", 'juan@x', '@@juan', 'juán', 'jua-n']) assert.equal(usernameError(bad), chars, bad)
})

test('only one leading @ is stripped from a username', () => {
  assert.equal(cleanUsername(' @juan '), 'juan')
  assert.equal(cleanUsername('@@juan'), '@juan')
})
