import { mount } from '@vue/test-utils'
import { defineComponent, h, nextTick } from 'vue'
import type { PropType } from 'vue'
import { createI18n } from 'vue-i18n'
import { createPinia } from 'pinia'
import { NDataTable } from 'naive-ui'
import { describe, expect, it } from 'vitest'
import zh from '@/locales/zh-CN/video'
import en from '@/locales/en-US/video'
import ja from '@/locales/ja-JP/video'
import { formatDateTime } from '@/utils'
import { useVideoPublicationColumns } from './useVideoPublicationColumns'

const PublicationTable = defineComponent({
  props: { rows: { type: Array as PropType<Record<string, unknown>[]>, required: true } },
  setup(props) {
    const columns = useVideoPublicationColumns()
    return () => h(NDataTable, { columns: columns.value, data: props.rows, pagination: false })
  },
})

describe('video publication information', () => {
  it('shows a released scheduled work separately from its approval and planned dates', async () => {
    const planned = '2026-10-22T16:00:00Z'
    const approved = '2026-10-22T14:00:00Z'
    const i18n = createI18n({
      legacy: false,
      locale: 'zh-CN',
      messages: { 'zh-CN': { video: zh }, 'en-US': { video: en }, 'ja-JP': { video: ja } },
    })
    const wrapper = mount(PublicationTable, {
      props: {
        rows: [{ id: 1, status: 1, isScheduled: true, publishAt: planned, approvedAt: approved }],
      },
      global: { plugins: [createPinia(), i18n] },
    })
    await nextTick()
    expect(wrapper.text()).toContain('定时发布')
    expect(wrapper.text()).toContain('计划发布时间')
    expect(wrapper.text()).toContain('审核通过时间')
    expect(wrapper.text()).toContain(formatDateTime(planned))
    expect(wrapper.text()).toContain(formatDateTime(approved))
    i18n.global.locale.value = 'en-US'
    await nextTick()
    expect(wrapper.text()).toContain('Scheduled')
    expect(wrapper.text()).toContain('Approved At')
    wrapper.unmount()
  })

  it('shows an immediate unreviewed work with empty timestamp placeholders', async () => {
    const i18n = createI18n({
      legacy: false,
      locale: 'zh-CN',
      messages: { 'zh-CN': { video: zh } },
    })
    const wrapper = mount(PublicationTable, {
      props: {
        rows: [{ id: 2, status: 1, isScheduled: false, publishAt: null, approvedAt: null }],
      },
      global: { plugins: [createPinia(), i18n] },
    })
    await nextTick()
    expect(wrapper.text()).toContain('即时发布')
    expect(wrapper.text().match(/—/g)).toHaveLength(2)
    wrapper.unmount()
  })
})
