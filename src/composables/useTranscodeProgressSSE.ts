/**
 * 管理端转码进度 SSE 订阅
 * - 对 videoIds 建立 EventSource
 * - 维护 Map<videoId, TranscodeProgress>
 * - 无进行中任务时自动关闭连接
 */
import { ref, watch, onBeforeUnmount, type Ref, type ComputedRef } from 'vue'
import { buildTranscodeProgressStreamUrl, getTranscodeProgress } from '@/api/video'
import type { TranscodeProgress, TranscodeJobStatus } from '@/api/types'
import { getAccessToken } from '@/utils/storage'

const ACTIVE: TranscodeJobStatus[] = ['queued', 'running']

function isActive(status?: string): boolean {
  return status === 'queued' || status === 'running'
}

/** EventSource 自定义事件的 data 可能是 any，这里收窄为 string */
function messageEventData(ev: Event): string | null {
  if (!(ev instanceof MessageEvent)) return null
  return typeof ev.data === 'string' ? ev.data : null
}

export function useTranscodeProgressSSE(videoIds: Ref<number[]> | ComputedRef<number[]>) {
  const progressMap = ref<Record<number, TranscodeProgress>>({})
  const connected = ref(false)
  const error = ref<string | null>(null)

  let es: EventSource | null = null
  let lastIdsKey = ''
  let idlePollTimer: ReturnType<typeof setInterval> | null = null
  let watchedIds: number[] = []

  function applyItems(items: TranscodeProgress[]) {
    const next = { ...progressMap.value }
    for (const item of items) {
      if (!item?.videoId) continue
      next[item.videoId] = item
    }
    progressMap.value = next
  }

  function applyOne(item: TranscodeProgress) {
    if (!item?.videoId) return
    progressMap.value = { ...progressMap.value, [item.videoId]: item }
  }

  function stopIdlePoll() {
    if (idlePollTimer != null) {
      clearInterval(idlePollTimer)
      idlePollTimer = null
    }
  }

  function startIdlePoll(ids: number[]) {
    stopIdlePoll()
    if (ids.length === 0) return
    // 无 SSE 时轻量轮询快照，拾取新进入排队的任务
    idlePollTimer = setInterval(() => {
      if (es) return
      void (async () => {
        await bootstrapSnapshot(ids)
        if (hasActiveOnPage(ids)) {
          stopIdlePoll()
          openStream(ids)
        }
      })()
    }, 10_000)
  }

  function close() {
    if (es) {
      es.close()
      es = null
    }
    connected.value = false
  }

  function hasActiveOnPage(ids: number[]): boolean {
    return ids.some((id) => isActive(progressMap.value[id]?.status))
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
        // 若当前页已无进行中任务，关流（例如仅终态）
        if (!hasActiveOnPage(ids) && (data.items?.length ?? 0) > 0) {
          const anyActive = (data.items ?? []).some((i) => isActive(i.status))
          if (!anyActive) close()
        }
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
        if (!hasActiveOnPage(ids)) {
          close()
          startIdlePoll(watchedIds)
        }
      } catch {
        /* ignore */
      }
    })

    es.addEventListener('complete', () => {
      close()
      startIdlePoll(watchedIds)
    })

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

    watchedIds = ids
    // 仅当当前页存在排队/进行中任务时建立 SSE，避免列表空转长连接
    if (hasActiveOnPage(ids)) {
      stopIdlePoll()
      openStream(ids)
    } else {
      close()
      startIdlePoll(ids)
    }
  }

  watch(
    videoIds,
    (ids) => {
      void sync(ids.filter((id) => id > 0))
    },
    { immediate: true, deep: true }
  )

  onBeforeUnmount(() => {
    stopIdlePoll()
    close()
  })

  return {
    progressMap,
    connected,
    error,
    close,
    ACTIVE,
    isActive,
  }
}

export type { TranscodeProgress }
