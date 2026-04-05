/* eslint-disable vue/one-component-per-file */
import { flushPromises, mount } from '@vue/test-utils'
import { defineComponent, h, nextTick } from 'vue'
import { createI18n } from 'vue-i18n'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import authMessages from '@/locales/zh-CN/auth'
import LoginView from './LoginView.vue'

const { focusMock, loginMock, messageErrorMock, messageSuccessMock, pushMock } = vi.hoisted(() => ({
  focusMock: vi.fn(),
  loginMock: vi.fn(),
  messageErrorMock: vi.fn(),
  messageSuccessMock: vi.fn(),
  pushMock: vi.fn(),
}))

vi.mock('@/api/site', () => ({
  getPublicSiteConfig: vi.fn().mockResolvedValue({
    site: { register: { slideCaptcha: true } },
  }),
}))

vi.mock('@/stores/auth', () => ({
  useAuthStore: () => ({
    isLoggingIn: false,
    login: loginMock,
  }),
}))

vi.mock('vue-router', () => ({
  useRouter: () => ({ push: pushMock }),
}))

vi.mock('naive-ui', async (importOriginal) => {
  const actual = await importOriginal<typeof import('naive-ui')>()
  const { defineComponent: defineVueComponent, h: renderElement } = await import('vue')
  const inputComponent = defineVueComponent({
    name: 'NInput',
    setup(_, { expose, slots }) {
      expose({ focus: focusMock })
      return () =>
        renderElement('div', { class: 'input-stub' }, [slots.prefix?.(), renderElement('input')])
    },
  })
  return {
    ...actual,
    NInput: inputComponent,
    useMessage: () => ({
      error: messageErrorMock,
      success: messageSuccessMock,
    }),
  }
})

const i18n = createI18n({
  legacy: false,
  locale: 'zh-CN',
  messages: {
    'zh-CN': { auth: authMessages },
  },
})

const formStub = defineComponent({
  name: 'NForm',
  setup(_, { expose, slots }) {
    expose({ validate: vi.fn().mockResolvedValue(undefined) })
    return () => h('form', slots.default?.())
  },
})

const slotStub = defineComponent({
  setup(_, { slots }) {
    return () => h('div', slots.default?.())
  },
})

describe('LoginView', () => {
  beforeEach(() => {
    focusMock.mockClear()
    loginMock.mockClear()
    messageErrorMock.mockClear()
    messageSuccessMock.mockClear()
    pushMock.mockClear()
  })

  it('页面挂载后自动聚焦用户名输入框', async () => {
    const wrapper = mount(LoginView, {
      global: {
        plugins: [i18n],
        stubs: {
          LanguageDropdown: true,
          NButton: slotStub,
          NForm: formStub,
          NFormItem: slotStub,
          NModal: slotStub,
          SlideCaptcha: true,
          ThemeDropdown: true,
        },
      },
    })

    await flushPromises()
    await nextTick()
    await nextTick()

    expect(focusMock).toHaveBeenCalledOnce()
    wrapper.unmount()
  })
})
