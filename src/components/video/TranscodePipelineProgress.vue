<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { NProgress, NTag, NTooltip } from 'naive-ui'
import type {
  TranscodePipelineProgress,
  TranscodePipelineStatus,
  TranscodeProgress,
} from '@/api/types'

const props = defineProps<{
  items?: TranscodeProgress[]
}>()

const { t } = useI18n()

const entries = computed(() => props.items ?? [])

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

function qualityLabel(quality?: string): string {
  if (!quality) return ''
  const key = `video.transcode.quality.${quality.toLowerCase()}`
  const translated = t(key)
  return translated === key ? quality : translated
}

function roleLabel(role?: string): string {
  if (!role) return ''
  const key = `video.transcode.role.${role.toLowerCase()}`
  const translated = t(key)
  return translated === key ? role : translated
}

function statusType(status: string): 'default' | 'info' | 'success' | 'warning' | 'error' {
  switch (status) {
    case 'encoding':
    case 'uploading':
    case 'running':
      return 'info'
    case 'succeeded':
      return 'success'
    case 'failed':
      return 'error'
    case 'queued':
      return 'warning'
    default:
      return 'default'
  }
}

function isProcessing(status: string): boolean {
  return status === 'encoding' || status === 'uploading' || status === 'running'
}

function pipelineError(pipeline: TranscodePipelineProgress): string {
  return pipeline.error || pipeline.message || statusLabel(pipeline.status)
}

function legacyStatus(entry: TranscodeProgress): TranscodePipelineStatus | 'running' {
  return entry.status
}
</script>

<template>
  <div v-if="entries.length" class="transcode-stack">
    <section v-for="entry in entries" :key="entry.partId ?? 0" class="transcode-entry">
      <div v-if="entries.length > 1" class="part-heading">
        {{ t('video.transcode.part', { id: entry.partId ?? 0 }) }}
      </div>

      <div
        v-if="entry.pipelines?.length"
        class="pipeline-grid"
        :class="{ 'pipeline-grid--dual': entry.pipelines.length > 1 }"
      >
        <article
          v-for="pipeline in entry.pipelines"
          :key="pipeline.name"
          class="pipeline-card"
          :class="`pipeline-card--${pipeline.name.toLowerCase()}`"
        >
          <header class="pipeline-header">
            <div class="pipeline-identity">
              <span class="pipeline-mark" aria-hidden="true" />
              <span class="pipeline-name">{{ pipelineLabel(pipeline.name) }}</span>
              <span class="pipeline-percent">{{ clampPercent(pipeline.percent) }}%</span>
            </div>
            <n-tooltip v-if="pipeline.status === 'failed'">
              <template #trigger>
                <n-tag :type="statusType(pipeline.status)" size="tiny" round>
                  {{ statusLabel(pipeline.status) }}
                </n-tag>
              </template>
              {{ pipelineError(pipeline) }}
            </n-tooltip>
            <n-tag v-else :type="statusType(pipeline.status)" size="tiny" round>
              {{ statusLabel(pipeline.status) }}
            </n-tag>
          </header>

          <div class="output-list">
            <div v-for="output in pipeline.outputs" :key="output.id" class="output-row">
              <div class="output-meta">
                <div class="output-name">
                  <span>{{ output.resolution }}</span>
                  <span v-if="output.quality" class="quality-chip">
                    {{ qualityLabel(output.quality) }}
                  </span>
                  <span v-else-if="output.role" class="quality-chip">
                    {{ roleLabel(output.role) }}
                  </span>
                </div>
                <span class="output-status">{{ statusLabel(output.status) }}</span>
              </div>
              <n-progress
                type="line"
                :percentage="clampPercent(output.percent)"
                :show-indicator="false"
                :processing="isProcessing(output.status)"
                :status="statusType(output.status)"
                :height="6"
                :border-radius="3"
              />
            </div>
          </div>
        </article>
      </div>

      <div v-else class="legacy-progress">
        <div class="legacy-heading">
          <n-tag :type="statusType(legacyStatus(entry))" size="small" round>
            {{ statusLabel(legacyStatus(entry)) }}
          </n-tag>
          <span v-if="entry.status === 'running'">{{ clampPercent(entry.percent) }}%</span>
        </div>
        <n-progress
          v-if="entry.status === 'running'"
          type="line"
          :percentage="clampPercent(entry.percent)"
          :show-indicator="false"
          processing
          :height="6"
          :border-radius="3"
        />
      </div>
    </section>
  </div>
  <span v-else class="empty-progress">{{ t('video.transcode.idle') }}</span>
</template>

<style scoped lang="scss">
.transcode-stack {
  display: grid;
  gap: var(--spacing-2);
  min-width: 0;
}

.transcode-entry {
  display: grid;
  gap: var(--spacing-1);
}

.part-heading {
  color: var(--color-text-muted);
  font-size: var(--text-xs);
  font-weight: var(--font-medium);
  letter-spacing: var(--tracking-wide);
}

.pipeline-grid {
  display: grid;
  gap: var(--spacing-2);
  grid-template-columns: minmax(0, 1fr);
}

.pipeline-grid--dual {
  grid-template-columns: repeat(2, minmax(0, 1fr));
}

.pipeline-card {
  min-width: 0;
  padding: var(--spacing-2);
  overflow: hidden;
  background: var(--color-surface-hover);
  border: 1px solid var(--color-border-light);
  border-radius: var(--radius-lg);
  box-shadow: var(--shadow-xs);
  transition:
    border-color var(--duration-fast) var(--easing-standard),
    box-shadow var(--duration-fast) var(--easing-standard);
}

.pipeline-card:hover {
  border-color: var(--color-border-strong);
  box-shadow: var(--shadow-sm);
}

.pipeline-header,
.pipeline-identity,
.output-meta,
.output-name,
.legacy-heading {
  display: flex;
  align-items: center;
}

.pipeline-header,
.output-meta,
.legacy-heading {
  justify-content: space-between;
}

.pipeline-header {
  gap: var(--spacing-2);
  margin-bottom: var(--spacing-2);
}

.pipeline-identity {
  min-width: 0;
  gap: var(--spacing-1);
}

.pipeline-mark {
  width: var(--spacing-2);
  height: var(--spacing-2);
  flex: 0 0 auto;
  background: var(--color-primary);
  border-radius: var(--radius-full);
  box-shadow: 0 0 0 var(--spacing-1) var(--color-primary-light);
}

.pipeline-card--dash .pipeline-mark {
  background: var(--color-info);
  box-shadow: 0 0 0 var(--spacing-1) var(--color-info-light);
}

.pipeline-name {
  overflow: hidden;
  color: var(--color-text);
  font-size: var(--text-sm);
  font-weight: var(--font-semibold);
  text-overflow: ellipsis;
  white-space: nowrap;
}

.pipeline-percent {
  color: var(--color-text-muted);
  font-family: var(--font-mono);
  font-size: var(--text-xs);
}

.output-list {
  display: grid;
  gap: var(--spacing-2);
}

.output-row {
  display: grid;
  gap: var(--spacing-1);
}

.output-meta {
  min-width: 0;
  gap: var(--spacing-2);
  color: var(--color-text-secondary);
  font-size: var(--text-xs);
}

.output-name {
  min-width: 0;
  gap: var(--spacing-1);
  font-weight: var(--font-medium);
}

.quality-chip {
  padding: 0 var(--spacing-1);
  color: var(--color-primary);
  font-size: var(--text-xs);
  background: var(--color-primary-light);
  border-radius: var(--radius-full);
}

.output-status {
  flex: 0 0 auto;
  color: var(--color-text-muted);
}

.legacy-progress {
  display: grid;
  gap: var(--spacing-1);
  min-width: 0;
}

.legacy-heading {
  color: var(--color-text-muted);
  font-family: var(--font-mono);
  font-size: var(--text-xs);
}

.empty-progress {
  color: var(--color-text-muted);
}

@media (width <= 1280px) {
  .pipeline-grid--dual {
    grid-template-columns: minmax(0, 1fr);
  }
}
</style>
