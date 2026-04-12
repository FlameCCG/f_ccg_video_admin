import { mount } from '@vue/test-utils'
import { createI18n } from 'vue-i18n'
import { describe, expect, it } from 'vitest'
import type { TranscodeConfig } from '@/api/types'
import zh from '@/locales/zh-CN/siteConfig'
import { normalizeTranscodeConfig } from '../normalize'
import TranscodeConfigForm from './TranscodeConfigForm.vue'

const i18n = createI18n({
  legacy: false,
  locale: 'zh-CN',
  messages: { 'zh-CN': { siteConfig: zh } },
})

function config(): TranscodeConfig {
  return normalizeTranscodeConfig({
    checkpointDir: '/data/checkpoints',
    checkpointDisable: false,
    chunkDurationSec: 90,
  } as TranscodeConfig)
}

describe('TranscodeConfigForm checkpoint fields', () => {
  it('renders saved checkpoint values and emits updates without dropping them', async () => {
    const wrapper = mount(TranscodeConfigForm, {
      props: { modelValue: config() },
      global: { plugins: [i18n] },
    })

    expect(wrapper.text()).toContain('断点续传')
    expect(wrapper.text()).toContain('关闭后，转码重试会整段重新编码')
    expect(wrapper.get('input[placeholder="留空则使用系统临时目录"]').element).toHaveProperty(
      'value',
      '/data/checkpoints'
    )

    const duration = wrapper
      .findAll('input.n-input__input-el')
      .map((node) => (node.element as HTMLInputElement).value)
    expect(duration).toContain('90')

    await wrapper.get('input[placeholder="留空则使用系统临时目录"]').setValue('/tmp/ck')
    const events = wrapper.emitted('update:modelValue') ?? []
    const updated = events[events.length - 1]?.[0] as TranscodeConfig
    expect(updated.checkpointDir).toBe('/tmp/ck')
    expect(updated.chunkDurationSec).toBe(90)
    expect(updated.checkpointDisable).toBe(false)
    expect(updated.dashSegDuration).toBe(4)

    wrapper.unmount()
  })
})
