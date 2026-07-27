import { describe, expect, it } from 'vitest'
import { DAILY_TREND_DEFINITIONS } from './model'

describe('dashboard daily trend definitions', () => {
  it('maps every daily API series to a visible chart exactly once', () => {
    const keys = DAILY_TREND_DEFINITIONS.map((item) => item.key)

    expect(keys).toEqual(['visitUsers', 'loginUsers', 'newUsers', 'publishVideos'])
    expect(new Set(keys).size).toBe(keys.length)
  })

  it('keeps login users visually tied to the login metric colour', () => {
    const loginTrend = DAILY_TREND_DEFINITIONS.find((item) => item.key === 'loginUsers')

    expect(loginTrend).toMatchObject({
      titleKey: 'dashboard.trends.loginUsers',
      series: 2,
    })
  })
})
