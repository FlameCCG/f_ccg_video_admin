import { describe, expect, it } from 'vitest'
import { normalizeExternalHref, normalizeResourceUrl } from './url'

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

describe('normalizeExternalHref', () => {
  it('returns empty string for empty input', () => {
    expect(normalizeExternalHref()).toBe('')
    expect(normalizeExternalHref('')).toBe('')
    expect(normalizeExternalHref('   ')).toBe('')
  })

  it('keeps absolute and internal paths unchanged', () => {
    expect(normalizeExternalHref('https://chatgpt.com')).toBe('https://chatgpt.com')
    expect(normalizeExternalHref('http://example.com/a')).toBe('http://example.com/a')
    expect(normalizeExternalHref('/video/123')).toBe('/video/123')
  })

  it('normalizes bare domains and protocol-relative urls with http default', () => {
    expect(normalizeExternalHref('chatgpt.com')).toBe('http://chatgpt.com')
    expect(normalizeExternalHref('//chatgpt.com/path')).toBe('http://chatgpt.com/path')
    expect(normalizeExternalHref('www.example.com/foo?x=1')).toBe('http://www.example.com/foo?x=1')
  })
})
