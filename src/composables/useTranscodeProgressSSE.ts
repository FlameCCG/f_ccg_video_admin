/**
 * 管理端转码进度 SSE 订阅
 * - 对 videoIds 建立 EventSource
 * - 维护 Record<videoId, TranscodeProgress[]>，支持多分 P
 * - 页面存续期间保持 SSE，任务状态完全由服务端主动推送
 *
 * 四条硬约束（改动前请先读，每一条都对应一个真实修好的故障）：
 * 1. progressMap 必须「按 key 原地写入」，不能整体替换。整体替换会让所有读过
 *    progressMap 的 effect 一起失效；按 key 写入时 Vue 只通知读过该 key 的
 *    effect，于是一次 progress 事件只重渲染对应那一行的进度单元格。
 *    （旧实现每个事件都 `{ ...map, [id]: [...] }` 克隆整张表，成本随当页视频数线性增长。）
 * 2. 每一次异步续跑（快照 await 之后、SSE 回调里）都必须校验 generation。
 *    旧实现里 sync() 在 await 之后无条件 openStream：中途离开页面 → close() 已经
 *    跑完 → 再建出的 EventSource 从此无人关闭，服务端连接被永久占用。
 * 3. close() 必须一起清空 lastIdsKey。否则快速翻两页时晚到的那次建连会把
 *    lastIdsKey 停在 B、连接停在 A，之后 `key === lastIdsKey` 永远短路，
 *    页面永久订阅着上一页的 id。
 * 4. EventSource 自带无限重连，必须自己设上限。token 过期时它会一直重试，
 *    等于对服务端发起无界重连风暴 —— 连续失败到上限就主动断开并暴露 error。
 */
import {
  ref,
  watch,
  getCurrentInstance,
  onActivated,
  onDeactivated,
  onScopeDispose,
  type InjectionKey,
  type Ref,
  type ComputedRef,
} from 'vue'
import { buildTranscodeProgressStreamUrl, getTranscodeProgress } from '@/api/video'
import type { TranscodeProgress } from '@/api/types'
import { getAccessToken } from '@/utils/storage'

/** 转码进度表：videoId → 各分 P 进度 */
export type TranscodeProgressMap = Record<number, TranscodeProgress[]>

/**
 * 进度表注入 key。
 * 列表页把整张表 provide 下去，由每行的 TranscodeProgressCell 自行 inject 并只读
 * 自己那一个 videoId —— 表格列的 render 函数因此不再触碰 progressMap。
 * 表格列的 render 是在 Naive 的 DataTableCell 里执行的，写在那里的 `progressMap.value`
 * 会把当页所有转码单元格挂到同一个 ref 依赖上，配合旧的整体替换写法，
 * 一次推送就重渲染当页所有进度单元格。
 */
export const transcodeProgressKey: InjectionKey<Readonly<Ref<TranscodeProgressMap>>> =
  Symbol('transcodeProgress')

/** SSE 失败原因。故意不是文案：i18n 映射由调用方（视图层）负责 */
export type TranscodeStreamError = 'missing-token' | 'disconnected' | 'aborted'

/** 连续失败上限：给 EventSource 自带的无限重连加一道闸门 */
const MAX_CONSECUTIVE_ERRORS = 5

/** EventSource 自定义事件的 data 可能是 any，这里收窄为 string */
function messageEventData(ev: Event): string | null {
  if (!(ev instanceof MessageEvent)) return null
  return typeof ev.data === 'string' ? ev.data : null
}

export function useTranscodeProgressSSE(videoIds: Ref<number[]> | ComputedRef<number[]>) {
  const progressMap = ref<TranscodeProgressMap>({})
  const connected = ref(false)
  const error = ref<TranscodeStreamError | null>(null)

  let es: EventSource | null = null
  let lastIdsKey = ''
  /** 每次 close/sync 自增：异步续跑凭它判断「自己是否仍是最新那一次」 */
  let generation = 0
  let disposed = false
  let errorCount = 0

  function normalize(ids: number[]): number[] {
    return ids.filter((id) => id > 0)
  }

  function idsKey(ids: number[]): string {
    return ids
      .slice()
      .sort((a, b) => a - b)
      .join(',')
  }

  /** 单条写入：只换目标 videoId 的数组，一次事件 O(1) */
  function applyOne(item: TranscodeProgress) {
    if (!item?.videoId) return
    const partId = item.partId ?? 0
    const current = progressMap.value[item.videoId]
    if (!current) {
      progressMap.value[item.videoId] = [item]
      return
    }
    const index = current.findIndex((entry) => (entry.partId ?? 0) === partId)
    const next = current.slice()
    if (index >= 0) {
      next[index] = item
    } else {
      // 只有新增分 P 时才需要重排：已有数组始终是有序的
      next.push(item)
      next.sort((a, b) => (a.partId ?? 0) - (b.partId ?? 0))
    }
    progressMap.value[item.videoId] = next
  }

  function applyItems(items: TranscodeProgress[]) {
    for (const item of items) {
      applyOne(item)
    }
  }

  /**
   * 只保留当前批次仍需要的 id。
   * 不清理的话，一个会话里翻过的每一页都会永久留在表里。这里是整体替换（会惊动
   * 所有单元格），但只发生在 id 集合变化时 —— 那一刻表格本来就要重渲染。
   */
  function retain(ids: number[]) {
    const keep = new Set(ids)
    const next: TranscodeProgressMap = {}
    for (const key of Object.keys(progressMap.value)) {
      const id = Number(key)
      const items = progressMap.value[id]
      if (items && keep.has(id)) next[id] = items
    }
    progressMap.value = next
  }

  function close() {
    // 先作废在途的异步续跑：快照 await 之后、SSE 回调里都会校验它
    generation += 1
    if (es) {
      es.close()
      es = null
    }
    connected.value = false
    errorCount = 0
    // 必须一起清空：留着上一批 key 会让下一次 sync 命中短路分支而永不建连
    lastIdsKey = ''
  }

  async function bootstrapSnapshot(ids: number[], gen: number) {
    try {
      const data = await getTranscodeProgress(ids)
      if (disposed || gen !== generation) return
      applyItems(data.items ?? [])
    } catch {
      // 快照失败不阻塞 SSE
    }
  }

  function openStream(ids: number[], gen: number) {
    const token = getAccessToken()
    if (!token) {
      // 走 close() 是为了顺带清空 lastIdsKey：否则这一批 id 会被永久标记为
      // 「已在建连中」，登录态恢复后也再也不会重试
      close()
      error.value = 'missing-token'
      return
    }

    const stream = new EventSource(buildTranscodeProgressStreamUrl(ids, token))
    es = stream
    connected.value = true
    error.value = null

    /** 回调可能晚于一次翻页/卸载到达，进入前一律校验代际与当前连接 */
    const isStale = (): boolean => disposed || gen !== generation || es !== stream

    const applyEvent = (ev: Event) => {
      if (isStale()) return
      const raw = messageEventData(ev)
      if (raw === null) return
      try {
        applyOne(JSON.parse(raw) as TranscodeProgress)
      } catch {
        /* 忽略非法载荷 */
      }
    }

    stream.addEventListener('snapshot', (ev: Event) => {
      if (isStale()) return
      const raw = messageEventData(ev)
      if (raw === null) return
      try {
        const data = JSON.parse(raw) as { items?: TranscodeProgress[] }
        applyItems(data.items ?? [])
      } catch {
        /* 忽略非法载荷 */
      }
    })

    stream.addEventListener('progress', applyEvent)
    stream.addEventListener('done', applyEvent)

    // complete 只表示当前快照全部结束；连接继续承接后续新任务。
    stream.addEventListener('complete', () => undefined)

    stream.onopen = () => {
      if (isStale()) return
      connected.value = true
      error.value = null
      errorCount = 0
    }

    stream.onerror = () => {
      if (isStale()) return
      connected.value = false
      errorCount += 1
      if (errorCount < MAX_CONSECUTIVE_ERRORS) {
        error.value = 'disconnected'
        return
      }
      // 到上限：主动断开，避免 token 过期变成无界重连；由 UI 提供手动重连入口
      close()
      error.value = 'aborted'
    }
  }

  async function sync(ids: number[]) {
    const key = idsKey(ids)
    // 同一批 id 不重复处理。lastIdsKey 在 await 之前就写入，因此它同时表示
    // 「已连接」与「正在建连中」两种状态 —— keep-alive 首次挂载时 watch 与
    // onActivated 会先后各调一次 sync，靠这一句去重，不会重复拉快照。
    if (key === lastIdsKey) return

    close()
    const gen = generation
    retain(ids)
    if (disposed || ids.length === 0) return

    lastIdsKey = key
    await bootstrapSnapshot(ids, gen)
    // 关键守卫：await 期间可能已卸载 / 又翻了一页 / 被 close()。
    // 少了这一句就会建出无人持有的 EventSource。
    if (disposed || gen !== generation) return

    openStream(ids, gen)
  }

  /** 达到重连上限被动断开后，供 UI 触发的手动重连 */
  function reconnect() {
    close()
    error.value = null
    if (disposed) return
    void sync(normalize(videoIds.value))
  }

  // videoIds 是 computed number[]，身份变化即内容可能变化，无需 deep 比较
  watch(
    videoIds,
    (ids) => {
      void sync(normalize(ids))
    },
    { immediate: true }
  )

  // keep-alive 下组件不卸载、只 deactivate：不在这里断流，每个被缓存的标签
  // 都会一直占着一条服务端 SSE 连接（DefaultLayout 已按 meta.keepAlive 缓存列表页）。
  // close() 会清空 lastIdsKey，因此 activate 时能干净地重新建连。
  // 需要 getCurrentInstance 守卫：这两个钩子必须挂在组件实例上，
  // 而本 composable 也允许在裸 effectScope 里使用（那里只有下面的 onScopeDispose）。
  if (getCurrentInstance()) {
    onDeactivated(() => {
      close()
    })

    onActivated(() => {
      void sync(normalize(videoIds.value))
    })
  }

  // onScopeDispose 而非 onBeforeUnmount：composable 也可能被用在手动 effectScope
  // 里（此时没有组件生命周期），scope 停止就必须断流。
  onScopeDispose(() => {
    disposed = true
    close()
  })

  return {
    progressMap,
    connected,
    error,
    reconnect,
    close,
  }
}

export type { TranscodeProgress }
