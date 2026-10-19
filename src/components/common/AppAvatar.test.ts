import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'
import AppAvatar from './AppAvatar.vue'

describe('AppAvatar', () => {
  it('falls back to the user initial when an image fails and retries a changed source', async () => {
    const wrapper = mount(AppAvatar, { props: { src: '/missing.png', text: 'ccg' } })
    await wrapper.get('img').trigger('error')
    expect(wrapper.text()).toBe('C')
    expect(wrapper.find('img').exists()).toBe(false)
    await wrapper.setProps({ src: '/uploads/new.png' })
    expect(wrapper.get('img').attributes('src')).toBe('/uploads/new.png')
    wrapper.unmount()
  })

  it('shows a person icon for a failed image without a username', async () => {
    const wrapper = mount(AppAvatar, { props: { src: '/missing.png' } })
    await wrapper.get('img').trigger('error')
    expect(wrapper.find('svg circle').exists()).toBe(true)
    wrapper.unmount()
  })
})
