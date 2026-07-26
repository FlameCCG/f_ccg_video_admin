import { describe, it, expect } from 'vitest'
import { keepPreviousData } from '@tanstack/vue-query'
import { BusinessError } from './request'
import {
  shouldRetryQuery,
  createAppQueryClient,
  DEFAULT_STALE_TIME,
  DEFAULT_GC_TIME,
} from './queryClient'

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

describe('createAppQueryClient', () => {
  it('shares staleTime / gcTime so remounting a list does not refetch immediately', () => {
    const queries = createAppQueryClient().getDefaultOptions().queries
    expect(queries?.staleTime).toBe(DEFAULT_STALE_TIME)
    expect(queries?.gcTime).toBe(DEFAULT_GC_TIME)
  })

  it('keeps previous page data as placeholder so rows and pagination stay mounted', () => {
    const queries = createAppQueryClient().getDefaultOptions().queries
    expect(queries?.placeholderData).toBe(keepPreviousData)
  })

  it('keeps the BusinessError-aware retry and disables window-focus refetch', () => {
    const queries = createAppQueryClient().getDefaultOptions().queries
    expect(queries?.retry).toBe(shouldRetryQuery)
    expect(queries?.refetchOnWindowFocus).toBe(false)
  })

  it('never retries mutations', () => {
    expect(createAppQueryClient().getDefaultOptions().mutations?.retry).toBe(false)
  })
})
