import { mount } from '@vue/test-utils'
import { createI18n } from 'vue-i18n'
import { describe, expect, it } from 'vitest'
import AppImage from './AppImage.vue'

const i18n = createI18n({
  legacy: false,
  locale: 'en-US',
  messages: {
    'en-US': {
      common: {
        loading: 'Loading',
        image: { loadFailed: 'Image failed to load', empty: 'No image' },
      },
    },
  },
})

describe('AppImage', () => {
  it('keeps the thumbnail dimensions on failure and loads a new source', async () => {
    const wrapper = mount(AppImage, {
      props: { src: '/missing.png', width: 72, height: 40, lazy: false },
      global: { plugins: [i18n] },
    })
    await wrapper.get('img').trigger('error')
    expect(wrapper.get('[role="img"]').attributes('aria-label')).toBe('Image failed to load')
    expect(wrapper.find('[role="status"]').exists()).toBe(false)
    expect(wrapper.attributes('style')).toContain('height: 40px')
    await wrapper.setProps({ src: '/images/banners/new.png' })
    expect(wrapper.find('[role="img"]').exists()).toBe(false)
    expect(wrapper.get('img').attributes('src')).toBe('/images/banners/new.png')
    wrapper.unmount()
  })

  it('does not request a missing image source', () => {
    const wrapper = mount(AppImage, { global: { plugins: [i18n] } })
    expect(wrapper.find('img').exists()).toBe(false)
    expect(wrapper.get('[role="img"]').attributes('aria-label')).toBe('No image')
    wrapper.unmount()
  })
})
