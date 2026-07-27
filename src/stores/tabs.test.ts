import { beforeEach, describe, expect, it } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import type { LocationQuery, RouteLocationNormalized } from 'vue-router'
import { useTabsStore } from './tabs'

function createRoute(
  path: string,
  fullPath: string,
  query: LocationQuery = {}
): RouteLocationNormalized {
  return {
    path,
    fullPath,
    query,
    hash: '',
    name: 'SiteConfigSite',
    params: {},
    matched: [],
    meta: {
      title: '基础配置',
      titleZh: '基础配置',
      titleEn: 'Basic Settings',
      titleJa: '基本設定',
    },
    redirectedFrom: undefined,
  } as RouteLocationNormalized
}

describe('tabs store', () => {
  beforeEach(() => {
    localStorage.clear()
    setActivePinia(createPinia())
  })

  it('keeps one tab per path and refreshes its full navigation location', () => {
    const store = useTabsStore()

    store.addTab(createRoute('/system-config/site', '/system-config/site?tab=ai', { tab: 'ai' }))
    store.addTab(
      createRoute('/system-config/site', '/system-config/site?tab=server', { tab: 'server' })
    )

    const configTabs = store.tabs.filter((tab) => tab.path === '/system-config/site')
    expect(configTabs).toHaveLength(1)
    expect(configTabs[0]?.fullPath).toBe('/system-config/site?tab=server')
    expect(configTabs[0]?.query).toEqual({ tab: 'server' })
    expect(store.activeTab).toBe('/system-config/site')
  })

  it('copies query arrays before storing them', () => {
    const store = useTabsStore()
    const tags = ['security', 'storage']

    store.addTab(
      createRoute('/system-config/site', '/system-config/site?tag=security&tag=storage', {
        tag: tags,
      })
    )
    tags.push('changed-after-navigation')

    expect(store.tabs.find((tab) => tab.path === '/system-config/site')?.query).toEqual({
      tag: ['security', 'storage'],
    })
  })
})
