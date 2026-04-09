import { describe, expect, it } from 'vitest'
import { normalizeResourceUrl } from './url'

describe('normalizeResourceUrl', () => {
  it('returns empty string for empty input', () => {
    expect(normalizeResourceUrl()).toBe('')
    expect(normalizeResourceUrl('')).toBe('')
    expect(normalizeResourceUrl('   ')).toBe('')
  })

  it('keeps valid absolute urls unchanged', () => {
    expect(normalizeResourceUrl('http://localhost:9000/a.png')).toBe('http://localhost:9000/a.png')
    expect(normalizeResourceUrl('https://cdn.example.com/avatar.png')).toBe(
      'https://cdn.example.com/avatar.png'
    )
  })

  it('fixes malformed protocol slash urls', () => {
    expect(normalizeResourceUrl('http:/localhost:9000/videos/images/a.png')).toBe(
      'http://localhost:9000/videos/images/a.png'
    )
    expect(normalizeResourceUrl('https:/cdn.example.com/avatar.png')).toBe(
      'https://cdn.example.com/avatar.png'
    )
  })
})
