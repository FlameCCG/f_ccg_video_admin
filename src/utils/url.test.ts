import { afterEach, describe, expect, it, vi } from 'vitest'
import { normalizeExternalHref, normalizeResourceUrl } from './url'

describe('normalizeResourceUrl', () => {
  afterEach(() => vi.unstubAllEnvs())

  it('anchors storage keys to the root instead of the current route', () => {
    vi.stubEnv('VITE_MEDIA_BASE', '')
    expect(normalizeResourceUrl('user_files/images/a.png')).toBe('/user_files/images/a.png')
    expect(normalizeResourceUrl('images/banners/首页.png')).toBe('/images/banners/首页.png')
    expect(normalizeResourceUrl('uploads/images/a.png')).toBe('/uploads/images/a.png')
  })

  it('joins root paths and storage keys to the configured media base', () => {
    vi.stubEnv('VITE_MEDIA_BASE', 'https://media.example.com/videos/')
    expect(normalizeResourceUrl('/images/banners/a.png')).toBe(
      'https://media.example.com/videos/images/banners/a.png'
    )
    expect(normalizeResourceUrl('user_files/images/a.png')).toBe(
      'https://media.example.com/videos/user_files/images/a.png'
    )
    expect(normalizeResourceUrl('https://external.example.com/a.png')).toBe(
      'https://external.example.com/a.png'
    )
  })
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

  it('keeps root-relative paths unchanged when no media base configured', () => {
    expect(normalizeResourceUrl('/user_files/images/a.png')).toBe('/user_files/images/a.png')
    expect(normalizeResourceUrl('/uploads/images/b.png')).toBe('/uploads/images/b.png')
  })

  it('keeps data/blob/protocol-relative urls unchanged', () => {
    expect(normalizeResourceUrl('data:image/png;base64,AAAA')).toBe('data:image/png;base64,AAAA')
    expect(normalizeResourceUrl('//cdn.example.com/a.png')).toBe('//cdn.example.com/a.png')
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
