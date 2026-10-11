import test from 'node:test'
import assert from 'node:assert/strict'
import { composeNotes } from './hairstyleNote.js'

test('adds a selected hairstyle before customer notes', () => {
  assert.equal(
    composeNotes('Low Drop Fade', 'Please keep the top longer.'),
    'Hairstyle: Low Drop Fade. Please keep the top longer.'
  )
})

test('replaces an existing hairstyle prefix instead of duplicating it', () => {
  assert.equal(
    composeNotes('Modern Mullet', 'Hairstyle: Low Taper. No gel please.'),
    'Hairstyle: Modern Mullet. No gel please.'
  )
})

test('keeps customer notes when no hairstyle is selected', () => {
  assert.equal(composeNotes(null, 'No gel please.'), 'No gel please.')
})

test('allows an empty note', () => {
  assert.equal(composeNotes('Crew Cut', ''), 'Hairstyle: Crew Cut.')
})

test('keeps existing notes unchanged when no hairstyle is selected', () => {
  assert.equal(
    composeNotes(null, 'Hairstyle: Low Taper. My existing note.'),
    'Hairstyle: Low Taper. My existing note.'
  )
})
