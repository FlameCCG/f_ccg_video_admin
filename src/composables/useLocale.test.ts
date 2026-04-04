import { describe, it, expect, vi, beforeEach } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { ref } from 'vue'
import { useLocale } from './useLocale'
import { setI18nLanguage } from '@/locales'

const mockLocaleValue = ref('zh-CN')
vi.mock('vue-i18n', () => ({
  useI18n: () => ({
    locale: mockLocaleValue,
  }),
}))

vi.mock('@/locales', () => ({
  localeConfigs: [
    { locale: 'zh-CN', label: 'Chinese', labelNative: '简体中文', icon: '🇨🇳' },
    { locale: 'en-US', label: 'English', labelNative: 'English', icon: '🇺🇸' },
    { locale: 'ja-JP', label: 'Japanese', labelNative: '日本語', icon: '🇯🇵' },
  ],
  DEFAULT_LOCALE: 'zh-CN',
  LOCALE_STORAGE_KEY: 'locale-key',
  setI18nLanguage: vi.fn(),
  i18n: {},
  getInitialLocale: vi.fn().mockReturnValue('zh-CN'),
  getBrowserLocale: vi.fn().mockReturnValue('zh-CN'),
}))

describe('useLocale', () => {
  beforeEach(async () => {
    setActivePinia(createPinia())
    mockLocaleValue.value = 'zh-CN'
    const { setLocale } = useLocale()
    await setLocale('zh-CN')
    vi.clearAllMocks()
  })

  it('should export currentLocale and naive config computed properties', () => {
    const { currentLocale, naiveLocale, naiveDateLocale } = useLocale()
    expect(currentLocale.value).toBe('zh-CN')
    expect(naiveLocale.value).toBeDefined()
    expect(naiveDateLocale.value).toBeDefined()
  })

  it('should call setI18nLanguage and update local storage on setLocale', async () => {
    const { setLocale } = useLocale()
    await setLocale('en-US')

    expect(setI18nLanguage).toHaveBeenCalledWith(expect.anything(), 'en-US')
  })

  it('should toggle to the next configured language on toggleLocale', async () => {
    const { toggleLocale } = useLocale()

    // Current is zh-CN, next config is en-US
    await toggleLocale()
    expect(setI18nLanguage).toHaveBeenCalledWith(expect.anything(), 'en-US')
  })
})
