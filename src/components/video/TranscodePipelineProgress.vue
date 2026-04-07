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
</script>

<template>
  <div v-if="entries.length" class="tc" :class="isDetail ? 'tc--detail' : 'tc--compact'">
    <section v-for="entry in entries" :key="entry.partId ?? 0" class="tc-entry">
      <div v-if="entries.length > 1" class="tc-part">
        {{ t('video.transcode.part', { id: entry.partId ?? 0 }) }}
      </div>

      <!-- 总进度 -->
      <div class="tc-overall" :class="`tc-overall--${statusTone(entry.status)}`">
        <div class="tc-overall__head">
          <span class="tc-overall__label">{{ t('video.transcode.overall') }}</span>
          <n-tooltip :disabled="!entry.error && !entry.message && !entry.stage">
            <template #trigger>
              <span class="tc-overall__meta">
                <span class="tc-overall__status">{{ statusLabel(entry.status) }}</span>
                <span v-if="entry.message || entry.stage" class="tc-overall__msg">
                  {{ entry.message || stageLabel(entry.stage) }}
                </span>
                <span class="tc-overall__pct">{{ clampPercent(entry.percent) }}%</span>
              </span>
            </template>
            {{ overallHint(entry) }}
          </n-tooltip>
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
          <n-tooltip :disabled="!pipeline.error && !pipeline.message">
            <template #trigger>
              <div class="tc-pipe__row">
                <span class="tc-pipe__name">{{ pipelineLabel(pipeline.name) }}</span>
                <span class="tc-pipe__status">{{ statusLabel(pipeline.status) }}</span>
                <span class="tc-pipe__pct">{{ clampPercent(pipeline.percent) }}%</span>
              </div>
            </template>
            {{ pipelineHint(pipeline) }}
          </n-tooltip>
          <div v-if="pipeline.resolutions?.length" class="tc-pipe__res">
            {{ resChips(pipeline.resolutions) }}
          </div>
        </li>
      </ul>
    </section>
  </div>
  <span v-else class="tc-empty">{{ t('video.transcode.idle') }}</span>
</template>

<style scoped lang="scss">
.tc {
  min-width: 0;
  width: 100%;
}

.tc--compact {
  max-width: 260px;
}

.tc--detail {
  max-width: 100%;
}

.tc-entry + .tc-entry {
  margin-top: var(--spacing-2);
}

.tc-part {
  margin-bottom: 4px;
  color: var(--color-text-muted);
  font-size: var(--text-xs);
  font-weight: var(--font-medium);
}

.tc-overall {
  min-width: 0;
  margin-bottom: 6px;
  padding: 6px 8px;
  background: var(--color-surface-hover);
  border: 1px solid var(--color-border-light);
  border-radius: var(--radius-md);
}

.tc--detail .tc-overall {
  padding: 10px 12px;
  margin-bottom: var(--spacing-2);
}

.tc-overall--ok {
  border-color: color-mix(in srgb, var(--color-success) 28%, var(--color-border-light));
}

.tc-overall--active {
  border-color: color-mix(in srgb, var(--color-info) 32%, var(--color-border-light));
}

.tc-overall--err {
  border-color: color-mix(in srgb, var(--color-error) 36%, var(--color-border-light));
  background: color-mix(in srgb, var(--color-error) 6%, var(--color-surface-hover));
}

.tc-overall--warn {
  border-color: color-mix(in srgb, var(--color-warning) 32%, var(--color-border-light));
}

.tc-overall__head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  margin-bottom: 4px;
}

.tc-overall__label {
  flex: 0 0 auto;
  color: var(--color-text);
  font-size: 12px;
  font-weight: var(--font-semibold);
}

.tc-overall__meta {
  display: inline-flex;
  flex: 1 1 auto;
  align-items: center;
  justify-content: flex-end;
  gap: 6px;
  min-width: 0;
  font-size: 11px;
  line-height: 1.2;
}

.tc-overall__status {
  flex: 0 0 auto;
  color: var(--color-text-muted);
}

.tc-overall--ok .tc-overall__status {
  color: var(--color-success);
}

.tc-overall--active .tc-overall__status {
  color: var(--color-info);
}

.tc-overall--err .tc-overall__status {
  color: var(--color-error);
}

.tc-overall--warn .tc-overall__status {
  color: var(--color-warning);
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
  gap: 4px;
  margin: 0;
  padding: 0;
  list-style: none;
}

.tc--detail .tc-pipes {
  gap: 6px;
  grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
}

.tc-pipe {
  min-width: 0;
  padding: 5px 8px;
  background: var(--color-surface);
  border: 1px solid var(--color-border-light);
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
  border-color: color-mix(in srgb, var(--color-success) 22%, var(--color-border-light));
}

.tc-pipe--active {
  border-color: color-mix(in srgb, var(--color-info) 26%, var(--color-border-light));
}

.tc-pipe--err {
  border-color: color-mix(in srgb, var(--color-error) 30%, var(--color-border-light));
}

.tc-pipe--warn {
  border-color: color-mix(in srgb, var(--color-warning) 26%, var(--color-border-light));
}

.tc-pipe__row {
  display: grid;
  grid-template-columns: auto 1fr auto;
  align-items: center;
  gap: 6px;
  min-width: 0;
  font-size: 11px;
  line-height: 1.3;
  cursor: default;
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
  color: var(--color-success);
}

.tc-pipe--active .tc-pipe__status {
  color: var(--color-info);
}

.tc-pipe--err .tc-pipe__status {
  color: var(--color-error);
}

.tc-pipe--warn .tc-pipe__status {
  color: var(--color-warning);
}

.tc-pipe__pct {
  color: var(--color-text-secondary);
  font-family: var(--font-mono);
  font-variant-numeric: tabular-nums;
}

.tc-pipe__res {
  margin-top: 2px;
  color: var(--color-text-muted);
  font-family: var(--font-mono);
  font-size: 10px;
  letter-spacing: 0.02em;
}

.tc-empty {
  color: var(--color-text-muted);
  font-size: var(--text-sm);
}
</style>
