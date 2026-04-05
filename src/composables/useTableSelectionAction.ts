import { computed, h } from 'vue'
import type { Ref, VNodeChild } from 'vue'
import type { DataTableRowKey } from 'naive-ui'
import { useI18n } from 'vue-i18n'

export function useTableSelectionAction(checkedRowKeys: Ref<DataTableRowKey[]>) {
  const { t } = useI18n()

  const checkedIds = computed(() =>
    checkedRowKeys.value.map((key) => Number(key)).filter((id): id is number => Number.isFinite(id))
  )

  const hasMultipleSelection = computed(() => checkedIds.value.length > 1)

  function resolveTargetIds(rowId: number): number[] {
    return hasMultipleSelection.value ? [...checkedIds.value] : [rowId]
  }

  function createDialogContent(
    actionLabel: string,
    targetCount: number,
    detail: string
  ): string | (() => VNodeChild) {
    if (targetCount <= 1) {
      return detail
    }

    return () =>
      h(
        'div',
        {
          style: 'display:flex;flex-direction:column;gap:8px;line-height:1.5;',
        },
        [
          h(
            'div',
            t('common.tips.selectedActionSummary', {
              count: targetCount,
              action: actionLabel,
            })
          ),
          h('div', detail),
        ]
      )
  }

  return {
    checkedIds,
    hasMultipleSelection,
    resolveTargetIds,
    createDialogContent,
  }
}
