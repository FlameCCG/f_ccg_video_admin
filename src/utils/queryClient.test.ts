import { describe, it, expect } from 'vitest'
import { BusinessError } from './request'
import { shouldRetryQuery } from './queryClient'

describe('shouldRetryQuery', () => {
  it('does not retry BusinessError (e.g. 无权限访问)', () => {
    const err = new BusinessError(1, '无权限访问')
    expect(shouldRetryQuery(0, err)).toBe(false)
    expect(shouldRetryQuery(1, err)).toBe(false)
  })

  it('does not retry errors named BusinessError without instanceof', () => {
    const err = new Error('无权限访问')
    err.name = 'BusinessError'
    expect(shouldRetryQuery(0, err)).toBe(false)
  })

  it('retries network-like errors up to 2 failures', () => {
    const err = new Error('Network Error')
    expect(shouldRetryQuery(0, err)).toBe(true)
    expect(shouldRetryQuery(1, err)).toBe(true)
    expect(shouldRetryQuery(2, err)).toBe(false)
  })
})
