/**
 * 管理端转码进度 SSE 订阅
 * - 对 videoIds 建立 EventSource
 * - 维护 Map<videoId, TranscodeProgress[]>，支持多分 P
 * - 页面存续期间保持 SSE，任务状态完全由服务端主动推送
 */
import { ref, watch, onBeforeUnmount, type Ref, type ComputedRef } from 'vue'
import { buildTranscodeProgressStreamUrl, getTranscodeProgress } from '@/api/video'
import type { TranscodeProgress } from '@/api/types'
import { getAccessToken } from '@/utils/storage'

/** EventSource 自定义事件的 data 可能是 any，这里收窄为 string */
function messageEventData(ev: Event): string | null {
  if (!(ev instanceof MessageEvent)) return null
  return typeof ev.data === 'string' ? ev.data : null
}

export function useTranscodeProgressSSE(videoIds: Ref<number[]> | ComputedRef<number[]>) {
  const progressMap = ref<Record<number, TranscodeProgress[]>>({})
  const connected = ref(false)
  const error = ref<string | null>(null)

  let es: EventSource | null = null
  let lastIdsKey = ''

  function upsertItem(
    target: Record<number, TranscodeProgress[]>,
    item: TranscodeProgress
  ): Record<number, TranscodeProgress[]> {
    if (!item?.videoId) return target
    const partId = item.partId ?? 0
    const current = target[item.videoId] ?? []
    const index = current.findIndex((entry) => (entry.partId ?? 0) === partId)
    const nextItems = [...current]
    if (index >= 0) nextItems[index] = item
    else nextItems.push(item)
    nextItems.sort((a, b) => (a.partId ?? 0) - (b.partId ?? 0))
    return { ...target, [item.videoId]: nextItems }
  }

  function applyItems(items: TranscodeProgress[]) {
    let next = { ...progressMap.value }
    for (const item of items) {
      next = upsertItem(next, item)
    }
    progressMap.value = next
  }

  function applyOne(item: TranscodeProgress) {
    progressMap.value = upsertItem(progressMap.value, item)
  }

  function close() {
    if (es) {
      es.close()
      es = null
    }
    connected.value = false
  }

  async function bootstrapSnapshot(ids: number[]) {
    if (ids.length === 0) return
    try {
      const data = await getTranscodeProgress(ids)
      applyItems(data.items ?? [])
    } catch {
      // 快照失败不阻塞 SSE
    }
  }

  function openStream(ids: number[]) {
    close()
    if (ids.length === 0) return

    const token = getAccessToken()
    if (!token) {
      error.value = 'missing token'
      return
    }

    const url = buildTranscodeProgressStreamUrl(ids, token)
    es = new EventSource(url)
    connected.value = true
    error.value = null

    es.addEventListener('snapshot', (ev: Event) => {
      try {
        const raw = messageEventData(ev)
        if (raw === null) return
        const data = JSON.parse(raw) as { items?: TranscodeProgress[] }
        applyItems(data.items ?? [])
      } catch {
        /* ignore */
      }
    })

    es.addEventListener('progress', (ev: Event) => {
      try {
        const raw = messageEventData(ev)
        if (raw === null) return
        applyOne(JSON.parse(raw) as TranscodeProgress)
      } catch {
        /* ignore */
      }
    })

    es.addEventListener('done', (ev: Event) => {
      try {
        const raw = messageEventData(ev)
        if (raw === null) return
        applyOne(JSON.parse(raw) as TranscodeProgress)
      } catch {
        /* ignore */
      }
    })

    // complete 只表示当前快照全部结束；连接继续承接后续新任务。
    es.addEventListener('complete', () => undefined)

    es.onerror = () => {
      // EventSource 会自动重连；记录状态即可
      connected.value = false
      error.value = 'sse disconnected'
    }

    es.onopen = () => {
      connected.value = true
      error.value = null
    }
  }

  async function sync(ids: number[]) {
    const key = ids
      .slice()
      .sort((a, b) => a - b)
      .join(',')
    // 同一批 ID 且已有活跃连接时不重复建连
    if (key === lastIdsKey && es) return
    lastIdsKey = key

    if (ids.length === 0) {
      close()
      return
    }

    await bootstrapSnapshot(ids)

    openStream(ids)
  }

  watch(
    videoIds,
    (ids) => {
      void sync(ids.filter((id) => id > 0))
    },
    { immediate: true, deep: true }
  )

  onBeforeUnmount(() => {
    close()
  })

  return {
    progressMap,
    connected,
    error,
    close,
  }
}

export type { TranscodeProgress }
