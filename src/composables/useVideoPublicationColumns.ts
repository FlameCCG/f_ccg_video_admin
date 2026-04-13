import { computed, h } from 'vue'
import { useI18n } from 'vue-i18n'
import { NTag } from 'naive-ui'
import type { DataTableColumns } from 'naive-ui'
import { formatDateTime } from '@/utils'

export function formatPublicationTime(value: unknown): string {
  return typeof value === 'string' && value ? formatDateTime(value) : '—'
}

/** 视频列表、审核和回收站共用的发布方式与时间列。 */
export function useVideoPublicationColumns() {
  const { t } = useI18n()
  return computed<DataTableColumns<Record<string, unknown>>>(() => [
    {
      title: t('video.list.publicationType'),
      key: 'isScheduled',
      width: 112,
      align: 'center',
      render: (row) =>
        h(NTag, { type: row.isScheduled ? 'info' : 'default', size: 'small' }, () =>
          t(row.isScheduled ? 'video.publication.scheduled' : 'video.publication.immediate')
        ),
    },
    {
      title: t('video.list.publishAt'),
      key: 'publishAt',
      width: 168,
      ellipsis: { tooltip: true },
      render: (row) => formatPublicationTime(row.publishAt),
    },
    {
      title: t('video.list.approvedAt'),
      key: 'approvedAt',
      width: 168,
      ellipsis: { tooltip: true },
      render: (row) => formatPublicationTime(row.approvedAt),
    },
  ])
}
