import test from 'node:test'
import assert from 'node:assert/strict'
import { replySig, unseenReplies, markAllSeen } from './replySeen.js'

const rows = [
  { message_id: 1, message: 'a', reply: null, replied_at: null },
  { message_id: 2, message: 'b', reply: 'Hello', replied_at: '2026-10-11 10:00' },
  { message_id: 3, message: 'c', reply: 'Hi again', replied_at: '2026-10-11 11:30' },
]

test('only messages with an admin reply can be new', () => {
  assert.deepEqual(unseenReplies(rows, {}).map((m) => m.message_id), [2, 3])
  assert.deepEqual(unseenReplies([rows[0]], {}), [])
})

test('a reply that was already shown is not counted again', () => {
  const seen = { 2: replySig(rows[1]) }
  assert.deepEqual(unseenReplies(rows, seen).map((m) => m.message_id), [3])
  assert.equal(unseenReplies(rows, markAllSeen(rows)).length, 0)
})

test('counting is repeatable: refreshing the same data never changes the result', () => {
  const a = unseenReplies(rows, {}).length
  assert.equal(unseenReplies(rows, {}).length, a)
  assert.equal(unseenReplies(rows, {}).length, a)
})

test('an edited or newer reply on a seen message is new again', () => {
  const seen = markAllSeen(rows)
  const later = rows.map((m) => (m.message_id === 2 ? { ...m, reply: 'Updated', replied_at: '2026-10-11 12:00' } : m))
  assert.deepEqual(unseenReplies(later, seen).map((m) => m.message_id), [2])
  const sameMinuteEdit = rows.map((m) => (m.message_id === 3 ? { ...m, reply: 'Hi again, edited' } : m))
  assert.deepEqual(unseenReplies(sameMinuteEdit, seen).map((m) => m.message_id), [3])
})

test('a reply to a message sent after the last visit is new', () => {
  const seen = markAllSeen(rows)
  const more = [...rows, { message_id: 9, message: 'd', reply: 'New one', replied_at: '2026-10-11 13:00' }]
  assert.deepEqual(unseenReplies(more, seen).map((m) => m.message_id), [9])
})

test('deleted messages are dropped from the remembered map', () => {
  assert.deepEqual(Object.keys(markAllSeen([rows[1]])), ['2'])
})
