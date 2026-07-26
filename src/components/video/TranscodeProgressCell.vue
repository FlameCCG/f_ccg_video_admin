<script lang="ts">
import type { TranscodeProgress } from '@/api/types'

/**
 * 模块级空数组：所有「暂无转码任务」的行共享同一个引用。
 * 若在渲染里写 `?? []`，每次渲染都会给每个空闲行分配一个新数组，
 * props 身份随之变化，明明什么都没变也要 patch 一遍子组件。
 * 约定：只读，任何地方都不得往里 push。
 */
const EMPTY: TranscodeProgress[] = []
</script>

<script setup lang="ts">
/**
 * 视频列表「转码」列单元格
 *
 * 存在的唯一理由是把进度订阅从表格的渲染 effect 里摘出来。
 * 改造前列的 render 里直接写 `progressMap.value[id] ?? []`：这句读的是 ref 本身，
 * 于是当页每一个转码单元格都挂到了同一个 ref 依赖上；而 useTranscodeProgressSSE
 * 当时每收到一个事件就整体替换 progressMap.value，一次推送（每秒数次）便让当页
 * 所有转码单元格连带各自的 NProgress + 3 个 NTooltip 全部重渲染。
 *
 * 现在列的 render 只碰 row.id，进度由每行自己 inject 并只读自己那一个 key。
 * 配合 composable 侧改成按 key 原地写入，一次事件只惊动受影响的那一个单元格。
 */
import { computed, inject } from 'vue'
import { transcodeProgressKey } from '@/composables/useTranscodeProgressSSE'
// 直接引模块而不走 @/composables 桶：单元格是被表格渲染函数按行实例化的，
// 没必要为一个 InjectionKey 把整个 composables 桶拖进这条依赖链
import TranscodePipelineProgress from './TranscodePipelineProgress.vue'

const props = defineProps<{
  videoId: number
}>()

/**
 * 未提供进度表时按「无任务」渲染，组件不应因缺少 provide 而崩。
 * 不传第二个参数是有意的：inject 的重载会同时从 key 和 defaultValue 推断同一个
 * T，传 null 会让推断在 `Readonly<Ref<...>>` 与 `null` 之间冲突。
 */
const progressMap = inject(transcodeProgressKey)

const items = computed(() => progressMap?.value[props.videoId] ?? EMPTY)
</script>

<template>
  <transcode-pipeline-progress :items="items" density="compact" />
</template>
