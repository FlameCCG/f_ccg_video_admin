import { flushPromises, mount } from '@vue/test-utils'
import { nextTick } from 'vue'
import { createI18n } from 'vue-i18n'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { getSlideCaptcha } from '@/api/auth'
import SlideCaptcha from './SlideCaptcha.vue'

vi.mock('@/api/auth', () => ({
  getSlideCaptcha: vi.fn(),
}))

const captchaFixture = {
  masterImage: 'data:image/png;base64,master',
  tileImage: 'data:image/png;base64,tile',
  token: 'captcha-token',
  thumbY: 38,
}

const i18n = createI18n({
  legacy: false,
  locale: 'zh-CN',
  messages: {
    'zh-CN': {
      auth: {
        captcha: {
          title: '安全验证',
          tip: '请拖动滑块完成验证',
          verifying: '正在核验安全凭证',
          loading: '加载中...',
          success: '验证成功',
          failed: '验证失败，请重试',
          refresh: '刷新验证码',
        },
      },
    },
  },
})

interface CaptchaExposed {
  success: () => void
  fail: () => void
}

const componentStubs = {
  NSpin: {
    template: '<div><slot /></div>',
  },
  NButton: {
    template: '<button><slot name="icon" /></button>',
  },
  NIcon: {
    template: '<span><slot /></span>',
  },
  RefreshOutline: true,
}

describe('SlideCaptcha', () => {
  beforeEach(() => {
    vi.mocked(getSlideCaptcha).mockResolvedValue(captchaFixture)
    vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockImplementation(function (
      this: HTMLElement
    ) {
      const width = this.classList.contains('slide-captcha__slider') ? 44 : 320
      return new DOMRect(0, 0, width, 160)
    })
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('关闭时保留内容结构供弹层完整离场，并且不会提前请求验证码', async () => {
    const wrapper = mount(SlideCaptcha, {
      props: { visible: false },
      global: { plugins: [i18n], stubs: componentStubs },
    })

    await flushPromises()

    expect(wrapper.find('.slide-captcha').exists()).toBe(true)
    expect(getSlideCaptcha).not.toHaveBeenCalled()

    await wrapper.setProps({ visible: true })
    await flushPromises()

    expect(getSlideCaptcha).toHaveBeenCalledOnce()
    wrapper.unmount()
  })

  it('使用 transform 跟随拖拽，并在释放后进入核验状态', async () => {
    const wrapper = mount(SlideCaptcha, {
      props: { visible: true },
      global: { plugins: [i18n], stubs: componentStubs },
    })

    await flushPromises()

    const slider = wrapper.get('[role="slider"]')
    await slider.trigger('pointerdown', { clientX: 0, pointerId: 1 })
    await slider.trigger('pointermove', { clientX: 156, pointerId: 1 })

    expect(slider.attributes('style')).toContain('translate3d(156px, 0, 0)')

    await slider.trigger('pointerup', { clientX: 156, pointerId: 1 })

    expect(wrapper.emitted('confirm')?.[0]?.[0]).toEqual({
      token: captchaFixture.token,
      x: 156,
      y: captchaFixture.thumbY,
    })
    expect(wrapper.text()).toContain('正在核验安全凭证')

    wrapper.unmount()
  })

  it('验证成功后展示扫描完成状态并保留真实坐标', async () => {
    const wrapper = mount(SlideCaptcha, {
      props: { visible: true },
      global: { plugins: [i18n], stubs: componentStubs },
    })

    await flushPromises()

    const slider = wrapper.get('[role="slider"]')
    await slider.trigger('pointerdown', { clientX: 0, pointerId: 2 })
    await slider.trigger('pointermove', { clientX: 120, pointerId: 2 })
    await slider.trigger('pointerup', { clientX: 120, pointerId: 2 })

    const exposed = wrapper.vm as unknown as CaptchaExposed
    exposed.success()
    await nextTick()

    expect(wrapper.find('.slide-captcha__result--success').exists()).toBe(true)
    expect(wrapper.find('.slide-captcha__result-scan').exists()).toBe(true)
    expect(wrapper.emitted('success')?.[0]?.[0]).toEqual({
      token: captchaFixture.token,
      x: 120,
      y: captchaFixture.thumbY,
    })

    wrapper.unmount()
  })
})
