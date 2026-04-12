import { onScopeDispose, shallowRef, watch, type Ref } from 'vue'

interface Pagination {
  page: number
  pageSize: number
}

/** 输入合并为一次查询；分页/下拉筛选立即提交。请求始终读取同一份参数快照。 */
export function useDebouncedQueryParams<T extends Pagination>(
  source: Ref<T>,
  inputKeys: readonly (keyof T)[],
  delay = 300
) {
  const queryParams = shallowRef<T>({ ...source.value })
  let timer: ReturnType<typeof setTimeout> | undefined

  function cancelPending(): void {
    clearTimeout(timer)
    timer = undefined
  }

  function flushQueryParams(): void {
    cancelPending()
    const next = { ...source.value }
    const current = queryParams.value as T
    const keys = Object.keys(next) as (keyof T)[]
    if (keys.some((key) => !Object.is(next[key], current[key]))) {
      queryParams.value = next
    }
  }

  watch(
    () => ({ ...source.value }),
    (next, previous) => {
      const keys = Object.keys(next) as (keyof T)[]
      const changed = keys.filter((key) => !Object.is(next[key], previous[key]))
      if (changed.length === 0) return
      if (changed.some((key) => !inputKeys.includes(key))) {
        flushQueryParams()
        return
      }
      cancelPending()
      timer = setTimeout(() => {
        source.value.page = 1
        flushQueryParams()
      }, delay)
    },
    // 显式搜索后不能再排入上一轮输入的定时器；同步监听也让重置立即取消旧搜索。
    { flush: 'sync' }
  )

  onScopeDispose(cancelPending)
  return { queryParams, flushQueryParams }
}
