<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { NProgress, NTooltip } from 'naive-ui'
import type { TranscodePipelineProgress, TranscodeProgress } from '@/api/types'

const props = withDefaults(
  defineProps<{
    items?: TranscodeProgress[]
    /** compact：列表单元格；detail：详情抽屉 */
    density?: 'compact' | 'detail'
  }>(),
  { items: () => [], density: 'compact' }
)

const { t } = useI18n()

const entries = computed(() => props.items ?? [])
const isDetail = computed(() => props.density === 'detail')

function clampPercent(percent?: number): number {
  return Math.max(0, Math.min(100, Math.round(percent ?? 0)))
}

function pipelineLabel(name: string): string {
  const normalized = name.toLowerCase()
  if (normalized === 'mp4') return t('video.transcode.pipeline.mp4')
  if (normalized === 'dash') return t('video.transcode.pipeline.dash')
  return name.toUpperCase()
}

function statusLabel(status: string): string {
  const key = `video.transcode.status.${status}`
  const translated = t(key)
  return translated === key ? status : translated
}

function stageLabel(stage?: string): string {
  if (!stage) return ''
  const key = `video.transcode.stage.${stage}`
  const translated = t(key)
  return translated === key ? stage : translated
}

function statusTone(status: string): 'idle' | 'active' | 'ok' | 'warn' | 'err' {
  switch (status) {
    case 'encoding':
    case 'uploading':
    case 'running':
      return 'active'
    case 'succeeded':
      return 'ok'
    case 'failed':
      return 'err'
    case 'queued':
      return 'warn'
    default:
      return 'idle'
  }
}

function progressStatus(status: string): 'default' | 'success' | 'error' | 'warning' {
  switch (statusTone(status)) {
    case 'ok':
      return 'success'
    case 'err':
      return 'error'
    case 'warn':
      return 'warning'
    default:
      return 'default'
  }
}

function isProcessing(status: string): boolean {
  return status === 'encoding' || status === 'uploading' || status === 'running'
}

function pipelineHint(pipeline: TranscodePipelineProgress): string {
  return pipeline.error || pipeline.message || statusLabel(pipeline.status)
}

function overallHint(entry: TranscodeProgress): string {
  return entry.error || entry.message || stageLabel(entry.stage) || statusLabel(entry.status)
}

function resChips(resolutions?: number[]): string {
  if (!resolutions?.length) return ''
  return resolutions.map((r) => `${r}p`).join(' · ')
}

/** 提示行：label + text 两段式，避免把冒号一类的连接符写死在模板里 */
interface HintLine {
  label: string
  text: string
}

/**
 * 整个单元格只用一个 tooltip。
 * 此前是「总进度一个 + 每条 pipeline 各一个」，一行就要挂 3 个 NTooltip
 * （每个都是完整的 Popover + Binder/Follower），十行即 30 个弹层实例。
 * 这里把所有需要解释的信息汇总成若干行，由外层单个 tooltip 承载。
 * 只在真的有额外信息（error / message / stage）时才生成行，
 * 没有行就整体禁用 tooltip —— 与旧的逐个 `:disabled` 判断等价。
 */
const hintLines = computed<HintLine[]>(() => {
  const lines: HintLine[] = []
  const multiPart = entries.value.length > 1

  for (const entry of entries.value) {
    const partPrefix = multiPart ? t('video.transcode.part', { id: entry.partId ?? 0 }) : ''

    if (entry.error || entry.message || entry.stage) {
      const overall = t('video.transcode.overall')
      lines.push({
        label: partPrefix ? `${partPrefix} / ${overall}` : overall,
        text: overallHint(entry),
      })
    }

    for (const pipeline of entry.pipelines ?? []) {
      if (!pipeline.error && !pipeline.message) continue
      const name = pipelineLabel(pipeline.name)
      lines.push({
        label: partPrefix ? `${partPrefix} / ${name}` : name,
        text: pipelineHint(pipeline),
      })
    }
  }

  return lines
})
</script>

<template>
  <n-tooltip v-if="entries.length" :disabled="hintLines.length === 0" placement="top-start">
    <template #trigger>
      <div class="tc" :class="isDetail ? 'tc--detail' : 'tc--compact'">
        <section v-for="entry in entries" :key="entry.partId ?? 0" class="tc-entry">
          <div v-if="entries.length > 1" class="tc-part">
            {{ t('video.transcode.part', { id: entry.partId ?? 0 }) }}
          </div>

          <!-- 总进度 -->
          <div class="tc-overall" :class="`tc-overall--${statusTone(entry.status)}`">
            <div class="tc-overall__head">
              <span class="tc-overall__label">{{ t('video.transcode.overall') }}</span>
              <span class="tc-overall__meta">
                <span class="tc-overall__status">{{ statusLabel(entry.status) }}</span>
                <span v-if="entry.message || entry.stage" class="tc-overall__msg">
                  {{ entry.message || stageLabel(entry.stage) }}
                </span>
                <span class="tc-overall__pct">{{ clampPercent(entry.percent) }}%</span>
              </span>
            </div>
            <n-progress
              type="line"
              :percentage="clampPercent(entry.percent)"
              :show-indicator="false"
              :processing="isProcessing(entry.status)"
              :status="progressStatus(entry.status)"
              :height="isDetail ? 6 : 4"
              :border-radius="99"
            />
          </div>

          <!-- Pipeline 明细：仅名称 / 状态 / 百分比 / 分辨率 chips，无重复进度条 -->
          <ul v-if="entry.pipelines?.length" class="tc-pipes">
            <li
              v-for="pipeline in entry.pipelines"
              :key="pipeline.name"
              class="tc-pipe"
              :class="[
                `tc-pipe--${pipeline.name.toLowerCase()}`,
                `tc-pipe--${statusTone(pipeline.status)}`,
              ]"
            >
              <div class="tc-pipe__row">
                <span class="tc-pipe__name">{{ pipelineLabel(pipeline.name) }}</span>
                <span class="tc-pipe__status">{{ statusLabel(pipeline.status) }}</span>
                <span class="tc-pipe__pct">{{ clampPercent(pipeline.percent) }}%</span>
              </div>
              <div v-if="pipeline.resolutions?.length" class="tc-pipe__res">
                {{ resChips(pipeline.resolutions) }}
              </div>
            </li>
          </ul>
        </section>
      </div>
    </template>
    <ul class="tc-tip">
      <li v-for="(line, index) in hintLines" :key="index" class="tc-tip__line">
        <span class="tc-tip__label">{{ line.label }}</span>
        <span class="tc-tip__text">{{ line.text }}</span>
      </li>
    </ul>
  </n-tooltip>
  <span v-else class="tc-empty">{{ t('video.transcode.idle') }}</span>
</template>

<style scoped lang="scss">
.tc {
  min-width: 0;
  width: 100%;

  // 整块由单个 tooltip 承载，鼠标停在任意位置都能出提示
  cursor: default;
}

.tc-entry + .tc-entry {
  margin-top: var(--spacing-2);
}

.tc-part {
  margin-bottom: var(--spacing-1);
  color: var(--color-text-muted);
  font-size: var(--text-xs);
  font-weight: var(--font-medium);
}

.tc-overall {
  min-width: 0;
  margin-bottom: var(--spacing-1);
  padding: var(--spacing-1) var(--spacing-2);

  // surface-2 而非 surface-hover：这是静置态背景，不是 hover 反馈色
  background: var(--color-surface-2);
  border: 1px solid var(--color-border-subtle);
  border-radius: var(--radius-md);
}

.tc--detail .tc-overall {
  padding: var(--spacing-2) var(--spacing-3);
  margin-bottom: var(--spacing-2);
}

// 语义边框/底色直接用 <sem>-border / <sem>-subtle token，
// 不再用 color-mix 现调 —— 四套主题各自调过对比度，混色会把它们抹平
.tc-overall--ok {
  border-color: var(--color-success-border);
}

.tc-overall--active {
  border-color: var(--color-info-border);
}

.tc-overall--err {
  border-color: var(--color-danger-border);
  background: var(--color-danger-subtle);
}

.tc-overall--warn {
  border-color: var(--color-warning-border);
}

.tc-overall__head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--spacing-2);
  margin-bottom: var(--spacing-1);
}

.tc-overall__label {
  flex: 0 0 auto;
  color: var(--color-text);
  font-size: var(--text-xs);
  font-weight: var(--font-semibold);
}

.tc-overall__meta {
  display: inline-flex;
  flex: 1 1 auto;
  align-items: center;
  justify-content: flex-end;
  gap: var(--spacing-1);
  min-width: 0;
  font-size: var(--text-xs);
  line-height: var(--leading-tight);
}

.tc-overall__status {
  flex: 0 0 auto;
  color: var(--color-text-muted);
}

// 语义色作为「表面上的文字」必须走 -text 变体（>= 4.5:1），
// 直接用 --color-success 之类的填充色在浅色主题下读不清
.tc-overall--ok .tc-overall__status {
  color: var(--color-success-text);
}

.tc-overall--active .tc-overall__status {
  color: var(--color-info-text);
}

.tc-overall--err .tc-overall__status {
  color: var(--color-danger-text);
}

.tc-overall--warn .tc-overall__status {
  color: var(--color-warning-text);
}

.tc-overall__msg {
  min-width: 0;
  overflow: hidden;
  color: var(--color-text-muted);
  text-overflow: ellipsis;
  white-space: nowrap;
}

.tc-overall__pct {
  flex: 0 0 auto;
  min-width: 2.5em;
  color: var(--color-text-secondary);
  font-family: var(--font-mono);
  font-variant-numeric: tabular-nums;
  text-align: right;
}

.tc-pipes {
  display: grid;
  gap: var(--spacing-1);
  margin: 0;
  padding: 0;
  list-style: none;
}

.tc--detail .tc-pipes {
  gap: var(--spacing-2);
  grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
}

.tc-pipe {
  min-width: 0;
  padding: var(--spacing-1) var(--spacing-2);
  background: var(--color-surface);
  border: 1px solid var(--color-border-subtle);
  border-left: 3px solid var(--color-border-strong);
  border-radius: var(--radius-md);
}

.tc-pipe--dash {
  border-left-color: var(--color-info);
}

.tc-pipe--mp4 {
  border-left-color: var(--color-primary);
}

.tc-pipe--ok {
  border-color: var(--color-success-border);
}

.tc-pipe--active {
  border-color: var(--color-info-border);
}

.tc-pipe--err {
  border-color: var(--color-danger-border);
}

.tc-pipe--warn {
  border-color: var(--color-warning-border);
}

.tc-pipe__row {
  display: grid;
  grid-template-columns: auto 1fr auto;
  align-items: center;
  gap: var(--spacing-1);
  min-width: 0;
  font-size: var(--text-xs);
  line-height: var(--leading-tight);
}

.tc-pipe__name {
  color: var(--color-text);
  font-weight: var(--font-semibold);
}

.tc-pipe__status {
  min-width: 0;
  overflow: hidden;
  color: var(--color-text-muted);
  text-align: right;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.tc-pipe--ok .tc-pipe__status {
  color: var(--color-success-text);
}

.tc-pipe--active .tc-pipe__status {
  color: var(--color-info-text);
}

.tc-pipe--err .tc-pipe__status {
  color: var(--color-danger-text);
}

.tc-pipe--warn .tc-pipe__status {
  color: var(--color-warning-text);
}

.tc-pipe__pct {
  color: var(--color-text-secondary);
  font-family: var(--font-mono);
  font-variant-numeric: tabular-nums;
}

.tc-pipe__res {
  margin-top: var(--spacing-1);
  color: var(--color-text-muted);
  font-family: var(--font-mono);
  font-size: var(--text-xs);
  letter-spacing: var(--tracking-wide);
}

.tc-empty {
  color: var(--color-text-muted);
  font-size: var(--text-sm);
}

// tooltip 内容被 teleport 到 body，但 scopeId 由本组件的渲染函数写入，
// 因此 scoped 选择器依然命中
.tc-tip {
  display: grid;
  gap: var(--spacing-1);
  margin: 0;
  padding: 0;

  // ch 而非固定 px：宽度跟随字号，长报错信息才会换行而不是撑破气泡
  max-width: 40ch;
  list-style: none;
  font-size: var(--text-xs);
  line-height: var(--leading-normal);
}

.tc-tip__label {
  margin-right: var(--spacing-1);
  font-weight: var(--font-semibold);
}

.tc-tip__text {
  // tooltip 是反色气泡，正文色由 Naive 主题给定，这里只做主次区分
  opacity: 0.85;
}

// 列表里每一行都挂着一条 processing 状态、永不静止的进度条，
// 减少动效偏好下必须真的停下来。
// base/_accessibility.scss 的全局兜底只把 animation-duration 压到 0.01ms
// 且迭代 1 次 —— 条纹仍会被画出一帧，动画名也还在。这里直接抹掉 animation-name。
// !important 无法避免：条纹动画由 Naive 的 cssr 运行时注入，选择器是
// `.n-progress .n-progress-graph .n-progress-graph-line
//  .n-progress-graph-line-rail .n-progress-graph-line-fill--processing::after`
// （5 个类），scoped 块想在特异度上压过它只能堆出同样长的选择器链，
// 那等于把 Naive 的内部结构层数写死在业务组件里，比 !important 更脆。
@media (prefers-reduced-motion: reduce) {
  .tc :deep(.n-progress-graph-line-fill--processing)::after {
    animation: none !important;
  }
}
</style>
