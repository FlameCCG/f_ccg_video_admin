/* eslint-disable vue/one-component-per-file */
import { flushPromises, mount } from '@vue/test-utils'
import { defineComponent, h, nextTick } from 'vue'
import { createI18n } from 'vue-i18n'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import authMessages from '@/locales/zh-CN/auth'
import LoginView from './LoginView.vue'
import { getPublicSiteConfig } from '@/api/site'
import { getGraphicsCaptcha } from '@/api/captcha'
import type { PublicConfigResponse } from '@/api/types'

vi.mock('@/api/site', () => ({ getPublicSiteConfig: vi.fn() }))
vi.mock('@/api/captcha', () => ({ getGraphicsCaptcha: vi.fn() }))

const {
  captchaFailMock,
  captchaSuccessMock,
  captchaTypeMock,
  focusMock,
  loginMock,
  messageErrorMock,
  messageSuccessMock,
  pushMock,
} = vi.hoisted(() => ({
  captchaFailMock: vi.fn(),
  captchaSuccessMock: vi.fn(),
  captchaTypeMock: vi.fn(),
  focusMock: vi.fn(),
  loginMock: vi.fn(),
  messageErrorMock: vi.fn(),
  messageSuccessMock: vi.fn(),
  pushMock: vi.fn(),
}))

vi.mock('@/composables/useCaptchaTypeQueue', () => ({
  useCaptchaTypeQueue: () => ({ take: captchaTypeMock, warmup: vi.fn() }),
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
    props: { value: String },
    emits: ['update:value'],
    setup(props, { emit, expose, slots }) {
      expose({ focus: focusMock })
      return () =>
        renderElement('div', { class: 'input-stub' }, [
          slots.prefix?.(),
          renderElement('input', {
            value: props.value,
            onInput: (event: Event) =>
              emit('update:value', (event.target as HTMLInputElement).value),
          }),
        ])
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

const buttonStub = defineComponent({
  props: { disabled: Boolean },
  setup(props, { slots }) {
    return () => h('button', { disabled: props.disabled }, slots.default?.())
  },
})

const modalStub = defineComponent({
  props: { show: Boolean },
  emits: ['after-leave'],
  setup(props, { slots }) {
    return () => (props.show ? h('div', { class: 'captcha-modal-stub' }, slots.default?.()) : null)
  },
})

const captchaStub = defineComponent({
  emits: ['confirm', 'retry', 'settled'],
  setup(_, { expose }) {
    expose({ fail: captchaFailMock, success: captchaSuccessMock })
    return () => h('div', { class: 'captcha-stub' })
  },
})

function mountLogin() {
  return mount(LoginView, {
    global: {
      plugins: [i18n],
      stubs: {
        LanguageDropdown: true,
        Button: buttonStub,
        Form: formStub,
        FormItem: slotStub,
        Modal: modalStub,
        SlideCaptcha: captchaStub,
        ClickCaptcha: captchaStub,
        ThemeDropdown: true,
      },
    },
  })
}

const captchaCases = [
  { type: 'click', result: { token: 'click-token', dots: [{ index: 0, x: 10, y: 20 }] } },
  { type: 'slide', result: { token: 'slide-token', x: 10, y: 20 } },
] as const

describe('LoginView', () => {
  beforeEach(() => {
    vi.mocked(getPublicSiteConfig)
      .mockReset()
      .mockResolvedValue({
        site: { login: { textGraphicCaptcha: false } },
      } as PublicConfigResponse)
    vi.mocked(getGraphicsCaptcha).mockReset().mockResolvedValue({
      captchaID: 'graphic-id',
      captchaB64: 'data:image/png;base64,abc',
    })
    captchaFailMock.mockClear()
    captchaSuccessMock.mockClear()
    captchaTypeMock.mockReset().mockResolvedValue('click')
    focusMock.mockClear()
    loginMock.mockReset()
    messageErrorMock.mockClear()
    messageSuccessMock.mockClear()
    pushMock.mockClear()
  })

  it('页面挂载后自动聚焦用户名输入框', async () => {
    const wrapper = mountLogin()
    await flushPromises()

    await flushPromises()
    await nextTick()
    await nextTick()

    expect(focusMock).toHaveBeenCalledOnce()
    wrapper.unmount()
  })

  it.each(captchaCases)(
    '$type：账号密码错误后关闭验证码、保留表单且下次登录重新验证',
    async ({ type, result }) => {
      captchaTypeMock.mockResolvedValue(type)
      loginMock.mockRejectedValue(new Error('用户名或密码错误'))
      const wrapper = mountLogin()
      await flushPromises()
      const inputs = wrapper.findAll<HTMLInputElement>('input')
      await inputs[0]!.setValue('test-user')
      await inputs[1]!.setValue('wrong-password')
      await wrapper.get('.login-page__submit-btn').trigger('click')
      await flushPromises()
      expect(wrapper.find('.captcha-modal-stub').exists()).toBe(true)

      wrapper.findComponent(captchaStub).vm.$emit('confirm', result)
      await flushPromises()

      expect(loginMock).toHaveBeenCalledWith(
        expect.objectContaining({ username: 'test-user', password: 'wrong-password' }),
        { silent: true }
      )
      expect(wrapper.find('.captcha-modal-stub').exists()).toBe(false)
      expect(captchaFailMock).not.toHaveBeenCalled()
      expect(captchaSuccessMock).not.toHaveBeenCalled()
      expect(messageErrorMock).toHaveBeenCalledExactlyOnceWith('用户名或密码错误')
      expect(inputs[0]!.element.value).toBe('test-user')
      expect(inputs[1]!.element.value).toBe('wrong-password')
      expect(pushMock).not.toHaveBeenCalled()

      await inputs[1]!.setValue('corrected-password')
      await wrapper.get('.login-page__submit-btn').trigger('click')
      await flushPromises()
      expect(wrapper.find('.captcha-modal-stub').exists()).toBe(true)
      expect(captchaTypeMock).toHaveBeenCalledTimes(2)
      expect(loginMock).toHaveBeenCalledTimes(1)
      wrapper.unmount()
    }
  )

  it.each(['验证码验证失败', 'captcha expired'])('验证码错误 %s 时保留弹窗重试', async (reason) => {
    loginMock.mockRejectedValue(new Error(reason))
    const wrapper = mountLogin()
    await flushPromises()
    await wrapper.get('.login-page__submit-btn').trigger('click')
    await flushPromises()
    wrapper.findComponent(captchaStub).vm.$emit('confirm', captchaCases[0].result)
    await flushPromises()

    expect(wrapper.find('.captcha-modal-stub').exists()).toBe(true)
    expect(captchaFailMock).toHaveBeenCalledExactlyOnceWith(reason)
    expect(messageErrorMock).not.toHaveBeenCalled()
    expect(pushMock).not.toHaveBeenCalled()
    wrapper.unmount()
  })

  it('登录成功时等待验证码反馈和弹窗离场后再跳转', async () => {
    loginMock.mockResolvedValue({ accessToken: 'access', refreshToken: 'refresh' })
    const wrapper = mountLogin()
    await flushPromises()
    await wrapper.get('.login-page__submit-btn').trigger('click')
    await flushPromises()
    wrapper.findComponent(captchaStub).vm.$emit('confirm', captchaCases[0].result)
    await flushPromises()

    expect(captchaSuccessMock).toHaveBeenCalledOnce()
    expect(pushMock).not.toHaveBeenCalled()
    wrapper.findComponent(captchaStub).vm.$emit('settled')
    await nextTick()
    expect(wrapper.find('.captcha-modal-stub').exists()).toBe(false)
    wrapper.findComponent(modalStub).vm.$emit('after-leave')
    expect(pushMock).toHaveBeenCalledExactlyOnceWith({ path: '/' })
    wrapper.unmount()
  })

  it('只启用图形验证码时提交答案，失败后刷新挑战', async () => {
    vi.mocked(getPublicSiteConfig).mockResolvedValue({
      site: { login: { textGraphicCaptcha: true } },
    } as PublicConfigResponse)
    captchaTypeMock.mockResolvedValue('none')
    loginMock.mockRejectedValue(new Error('图形验证码错误'))
    const wrapper = mountLogin()
    await flushPromises()
    const inputs = wrapper.findAll<HTMLInputElement>('input')
    await inputs[0]!.setValue('admin')
    await inputs[1]!.setValue('secret')
    await inputs[2]!.setValue('42')
    await wrapper.get('.login-page__submit-btn').trigger('click')
    await flushPromises()
    expect(loginMock).toHaveBeenCalledWith(
      {
        username: 'admin',
        password: 'secret',
        captchaID: 'graphic-id',
        captchaCode: '42',
      },
      { silent: false }
    )
    expect(getGraphicsCaptcha).toHaveBeenCalledTimes(2)
    expect(inputs[2]!.element.value).toBe('')
    wrapper.unmount()
  })

  it('配置首次失败后可重试并重新启用登录', async () => {
    vi.mocked(getPublicSiteConfig).mockRejectedValueOnce(new Error('offline'))
    const wrapper = mountLogin()
    await flushPromises()
    expect(wrapper.get('[role="alert"]').text()).toContain('登录配置加载失败')
    expect(wrapper.get('.login-page__submit-btn').attributes('disabled')).toBeDefined()
    await wrapper.get('[role="alert"] button').trigger('click')
    await flushPromises()
    expect(wrapper.find('[role="alert"]').exists()).toBe(false)
    expect(wrapper.get('.login-page__submit-btn').attributes('disabled')).toBeUndefined()
    wrapper.unmount()
  })

  it('图形验证码错误时关闭交互弹窗并保留账号密码', async () => {
    vi.mocked(getPublicSiteConfig).mockResolvedValue({
      site: { login: { textGraphicCaptcha: true } },
    } as PublicConfigResponse)
    loginMock.mockRejectedValue(
      Object.assign(new Error('图形验证码错误，请重新填写'), { data: { captchaType: 'graphic' } })
    )
    const wrapper = mountLogin()
    await flushPromises()
    const inputs = wrapper.findAll<HTMLInputElement>('input')
    await inputs[0]!.setValue('admin')
    await inputs[1]!.setValue('secret')
    await inputs[2]!.setValue('42')
    await wrapper.get('.login-page__submit-btn').trigger('click')
    await flushPromises()
    wrapper.findComponent(captchaStub).vm.$emit('confirm', captchaCases[0].result)
    await flushPromises()
    expect(wrapper.find('.captcha-modal-stub').exists()).toBe(false)
    expect(getGraphicsCaptcha).toHaveBeenCalledTimes(2)
    expect(inputs[2]!.element.value).toBe('')
    expect(captchaFailMock).not.toHaveBeenCalled()
    expect(messageErrorMock).toHaveBeenCalledExactlyOnceWith('图形验证码错误，请重新填写')
    expect(inputs[0]!.element.value).toBe('admin')
    expect(inputs[1]!.element.value).toBe('secret')
    wrapper.unmount()
  })

  it.each(captchaCases)(
    '$type 错误时保留弹窗和图形码，原地切换下一次挑战',
    async ({ type, result }) => {
      vi.mocked(getPublicSiteConfig).mockResolvedValue({
        site: { login: { textGraphicCaptcha: true } },
      } as PublicConfigResponse)
      captchaTypeMock.mockResolvedValue(type)
      const reason =
        type === 'slide' ? '滑块验证码错误，请重新验证' : '文字点选验证码已过期，请重新验证'
      loginMock.mockRejectedValue(Object.assign(new Error(reason), { data: { captchaType: type } }))
      const wrapper = mountLogin()
      await flushPromises()
      const inputs = wrapper.findAll<HTMLInputElement>('input')
      await inputs[2]!.setValue('42')
      await wrapper.get('.login-page__submit-btn').trigger('click')
      await flushPromises()
      wrapper.findComponent(captchaStub).vm.$emit('confirm', result)
      await flushPromises()
      expect(wrapper.find('.captcha-modal-stub').exists()).toBe(true)
      expect(captchaFailMock).toHaveBeenCalledExactlyOnceWith(reason)
      expect(getGraphicsCaptcha).toHaveBeenCalledTimes(1)
      expect(inputs[2]!.element.value).toBe('42')
      captchaTypeMock.mockResolvedValue(type === 'slide' ? 'click' : 'slide')
      wrapper.findComponent(captchaStub).vm.$emit('retry')
      await flushPromises()
      expect(wrapper.find('.captcha-modal-stub').exists()).toBe(true)
      expect(captchaTypeMock).toHaveBeenCalledTimes(2)
      expect(messageErrorMock).not.toHaveBeenCalled()
      wrapper.unmount()
    }
  )
})
