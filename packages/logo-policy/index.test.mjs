import assert from 'node:assert/strict'
import test from 'node:test'

import { logoFileError, logoSourceError } from './index.js'

test('logo policy accepts supported files and sources while rejecting GIFs', () => {
  assert.equal(logoFileError({ type: 'image/png', size: 1 }), undefined)
  assert.equal(logoFileError({ type: 'image/gif', size: 1 }), 'Use a PNG, JPG, WebP or SVG image.')
  assert.equal(logoSourceError('https://example.com/logo.png'), undefined)
  assert.notEqual(logoSourceError(`https://example.com/${'a'.repeat(501)}`), undefined)
  assert.equal(logoSourceError('data:image/png;base64,QQ=='), undefined)
  assert.notEqual(logoSourceError('data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///ywAAAAAAQABAAACAUwAOw=='), undefined)
})
