import { describe, it, expect, vi } from 'vitest'
import { ref } from 'vue'
import { useTableSelectionAction } from './useTableSelectionAction'

vi.mock('vue-i18n', () => ({
  useI18n: () => ({
    t: (key: string, args?: unknown) => `${key}${args ? JSON.stringify(args) : ''}`,
  }),
}))

describe('useTableSelectionAction', () => {
  it('should compute checkedIds and hasMultipleSelection correctly', () => {
    const checkedRowKeys = ref<string[]>([])
    const { checkedIds, hasMultipleSelection } = useTableSelectionAction(checkedRowKeys)

    expect(checkedIds.value).toEqual([])
    expect(hasMultipleSelection.value).toBe(false)

    checkedRowKeys.value = ['1']
    expect(checkedIds.value).toEqual([1])
    expect(hasMultipleSelection.value).toBe(false)

    checkedRowKeys.value = ['1', '2', '3']
    expect(checkedIds.value).toEqual([1, 2, 3])
    expect(hasMultipleSelection.value).toBe(true)
  })

  it('should resolve target ids based on multiple selection', () => {
    const checkedRowKeys = ref<string[]>([])
    const { resolveTargetIds } = useTableSelectionAction(checkedRowKeys)

    // Single item checked / no multiple selection
    checkedRowKeys.value = ['1']
    // If hasMultipleSelection is false (checkedIds.length is 1), it returns [rowId] -> [5]
    expect(resolveTargetIds(5)).toEqual([5])

    // Multiple selection active
    checkedRowKeys.value = ['1', '2']
    expect(resolveTargetIds(5)).toEqual([1, 2])
  })

  it('should format dialog content correctly', () => {
    const checkedRowKeys = ref<string[]>([])
    const { createDialogContent } = useTableSelectionAction(checkedRowKeys)

    // Single target - returns detail string directly
    const singleResult = createDialogContent('Delete', 1, 'Are you sure?')
    expect(singleResult).toBe('Are you sure?')

    // Multiple targets - returns a render function
    const multiResult = createDialogContent('Delete', 3, 'Are you sure?')
    expect(typeof multiResult).toBe('function')
  })
})
