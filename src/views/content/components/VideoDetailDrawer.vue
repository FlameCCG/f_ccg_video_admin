<script setup lang="ts">
/**
 * 视频详情抽屉组件
 * Video Detail Drawer Component
 */
import { computed, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { useQuery } from '@tanstack/vue-query'
import {
  NDrawer,
  NDrawerContent,
  NDescriptions,
  NDescriptionsItem,
  NSpace,
  NTag,
  NSpin,
  NDivider,
  NStatistic,
  NGrid,
  NGi,
  NCollapse,
  NCollapseItem,
  NTooltip,
} from 'naive-ui'
import { getVideoDetail } from '@/api/video'
import type { VideoStatus, VideoResource } from '@/api/types'
import { AppAvatar, AppStatusTag } from '@/components/common'
import { VideoPlayer } from '@/components/video'
import TranscodePipelineProgress from '@/components/video/TranscodePipelineProgress.vue'
import { formatDateTime } from '@/utils'
import { useTranscodeProgressSSE } from '@/composables'

interface Props {
  visible: boolean
  videoId: number | null
}

const props = defineProps<Props>()

const emit = defineEmits<{
  'update:visible': [value: boolean]
}>()

const { t } = useI18n()

interface VideoPlayerInstance {
  switchPart: (index: number) => void
}

/** 当前播放的分P索引 */
const currentPartIndex = ref(0)
/** VideoPlayer 组件引用 */
const videoPlayerRef = ref<VideoPlayerInstance | null>(null)
/** 播放器容器引用，用于滚动定位 */
const playerContainerRef = ref<HTMLDivElement | null>(null)

const {
  data: videoDetail,
  isLoading,
  refetch,
} = useQuery({
  queryKey: ['videoDetail', () => props.videoId],
  queryFn: () => getVideoDetail({ videoId: props.videoId! }),
  enabled: computed(() => props.visible && props.videoId !== null),
  staleTime: 60 * 1000,
})

const detailVideoIds = computed(() =>
  props.visible && props.videoId != null && props.videoId > 0 ? [props.videoId] : []
)
const { progressMap } = useTranscodeProgressSSE(detailVideoIds)
const detailProgress = computed(() =>
  props.videoId != null ? progressMap.value[props.videoId] : undefined
)

watch(
  () => props.videoId,
  (newId) => {
    if (newId && props.visible) {
      currentPartIndex.value = 0
      void refetch()
    }
  }
)

function handleClose(): void {
  emit('update:visible', false)
}

function handlePartChange(index: number): void {
  currentPartIndex.value = index
}

function handlePartClick(index: number): void {
  currentPartIndex.value = index
  videoPlayerRef.value?.switchPart(index)
  // 滚动到播放器位置
  playerContainerRef.value?.scrollIntoView({ behavior: 'smooth', block: 'start' })
}

function getStatusType(status: VideoStatus): 'success' | 'warning' | 'error' | 'processing' {
  const typeMap: Record<VideoStatus, 'success' | 'warning' | 'error' | 'processing'> = {
    1: 'success',
    2: 'warning',
    3: 'error',
    4: 'processing',
  }
  return typeMap[status]
}

function getStatusText(status: VideoStatus): string {
  const textMap: Record<VideoStatus, string> = {
    1: t('video.status.published'),
    2: t('video.status.private'),
    3: t('video.status.deleted'),
    4: t('video.status.reviewing'),
  }
  return textMap[status]
}

function formatDuration(seconds: number): string {
  const hours = Math.floor(seconds / 3600)
  const mins = Math.floor((seconds % 3600) / 60)
  const secs = seconds % 60
  if (hours > 0) {
    return `${hours}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
  }
  return `${mins}:${secs.toString().padStart(2, '0')}`
}

function formatNumber(num: number): string {
  if (num >= 10000) {
    return (num / 10000).toFixed(1) + 'w'
  }
  return num.toString()
}

function formatFileSize(bytes: number): string {
  if (bytes >= 1073741824) {
    return (bytes / 1073741824).toFixed(2) + ' GB'
  }
  if (bytes >= 1048576) {
    return (bytes / 1048576).toFixed(2) + ' MB'
  }
  if (bytes >= 1024) {
    return (bytes / 1024).toFixed(2) + ' KB'
  }
  return bytes + ' B'
}

function isDashResource(resource: VideoResource): boolean {
  const fmt = (resource.format || '').toLowerCase()
  if (fmt === 'dash') return true
  const url = (resource.fileUrl || '').toLowerCase()
  return url.includes('.mpd')
}

const isMultiPart = computed(() => {
  return videoDetail.value?.parts && videoDetail.value.parts.length > 1
})
</script>

<template>
  <n-drawer :show="visible" :width="720" placement="right" @update:show="handleClose">
    <n-drawer-content :title="t('video.detail.title')" closable>
      <n-spin :show="isLoading">
        <template v-if="videoDetail">
          <div ref="playerContainerRef" class="video-detail__player">
            <n-divider>{{ t('video.detail.videoPreview') }}</n-divider>
            <VideoPlayer
              ref="videoPlayerRef"
              :resources="videoDetail.resources"
              :parts="videoDetail.parts"
              :poster="videoDetail.cover"
              @part-change="handlePartChange"
            />
          </div>

          <template v-if="detailProgress?.length">
            <n-divider>{{ t('video.detail.transcodeProgress') }}</n-divider>
            <transcode-pipeline-progress :items="detailProgress" />
          </template>

          <n-divider>{{ t('video.detail.basicInfo') }}</n-divider>
          <n-descriptions :column="2" label-placement="left">
            <n-descriptions-item :label="t('video.list.videoTitle')" :span="2">
              {{ videoDetail.title }}
            </n-descriptions-item>
            <n-descriptions-item :label="t('video.list.author')">
              <n-space align="center" :size="8">
                <app-avatar
                  :src="videoDetail.author.avatar"
                  :text="videoDetail.author.username"
                  :size="24"
                />
                <span>{{ videoDetail.author.username }}</span>
                <n-tag size="small" type="info">Lv.{{ videoDetail.author.level }}</n-tag>
              </n-space>
            </n-descriptions-item>
            <n-descriptions-item :label="t('video.list.status')">
              <app-status-tag
                :type="getStatusType(videoDetail.status)"
                :text="getStatusText(videoDetail.status)"
                dot
              />
            </n-descriptions-item>
            <n-descriptions-item :label="t('video.list.partition')">
              <n-tag size="small">{{ videoDetail.partition.name }}</n-tag>
            </n-descriptions-item>
            <n-descriptions-item :label="t('video.list.duration')">
              {{ formatDuration(videoDetail.duration) }}
            </n-descriptions-item>
            <n-descriptions-item :label="t('video.list.isOriginal')">
              <n-tag :type="videoDetail.isOriginal ? 'success' : 'default'" size="small">
                {{ videoDetail.isOriginal ? t('common.yes') : t('common.no') }}
              </n-tag>
            </n-descriptions-item>
            <n-descriptions-item :label="t('video.detail.storageType')">
              {{ videoDetail.storageType }}
            </n-descriptions-item>
            <n-descriptions-item :label="t('video.list.createdAt')">
              {{ formatDateTime(videoDetail.createdAt) }}
            </n-descriptions-item>
          </n-descriptions>

          <template v-if="videoDetail.tags && videoDetail.tags.length > 0">
            <n-divider>{{ t('video.detail.tags') }}</n-divider>
            <div class="video-detail__tags">
              <n-tag
                v-for="tag in videoDetail.tags"
                :key="tag.id"
                size="medium"
                round
                :bordered="false"
                class="video-detail__tag"
              >
                # {{ tag.name }}
              </n-tag>
            </div>
          </template>

          <n-divider>{{ t('video.detail.description') }}</n-divider>
          <div class="video-detail__description">
            {{ videoDetail.description || t('common.tips.noData') }}
          </div>

          <n-divider>{{ t('video.detail.statistics') }}</n-divider>
          <n-grid :cols="3" :x-gap="16" :y-gap="16">
            <n-gi>
              <n-statistic
                :label="t('video.list.views')"
                :value="formatNumber(videoDetail.views)"
              />
            </n-gi>
            <n-gi>
              <n-statistic
                :label="t('video.list.likes')"
                :value="formatNumber(videoDetail.likes)"
              />
            </n-gi>
            <n-gi>
              <n-statistic
                :label="t('video.list.comments')"
                :value="formatNumber(videoDetail.commentCount)"
              />
            </n-gi>
            <n-gi>
              <n-statistic
                :label="t('video.list.coins')"
                :value="formatNumber(videoDetail.coinCount)"
              />
            </n-gi>
            <n-gi>
              <n-statistic
                :label="t('video.list.favorites')"
                :value="formatNumber(videoDetail.favoriteCount)"
              />
            </n-gi>
            <n-gi>
              <n-statistic
                :label="t('video.list.danmu')"
                :value="formatNumber(videoDetail.danmuCount)"
              />
            </n-gi>
          </n-grid>

          <template v-if="isMultiPart">
            <n-divider>{{ t('video.detail.parts') }} ({{ videoDetail.parts.length }})</n-divider>
            <div class="video-detail__parts">
              <div
                v-for="(part, index) in videoDetail.parts"
                :key="part.id"
                class="video-detail__part-item"
                :class="{ 'video-detail__part-item--active': index === currentPartIndex }"
                @click="handlePartClick(index)"
              >
                <span class="video-detail__part-index">P{{ index + 1 }}</span>
                <n-tooltip :disabled="part.title.length < 20">
                  <template #trigger>
                    <span class="video-detail__part-title">{{ part.title }}</span>
                  </template>
                  {{ part.title }}
                </n-tooltip>
                <n-space :size="8" align="center">
                  <n-tag size="tiny" type="info"
                    >{{ part.danmuCount }} {{ t('video.detail.danmu') }}</n-tag
                  >
                  <span class="video-detail__part-duration">
                    {{ formatDuration(part.duration) }}
                  </span>
                </n-space>
              </div>
            </div>
          </template>

          <template v-if="videoDetail.resources && videoDetail.resources.length > 0">
            <n-divider>{{ t('video.detail.resources') }}</n-divider>
            <n-collapse>
              <n-collapse-item
                v-for="(resource, index) in videoDetail.resources"
                :key="resource.id"
                :title="resource.resolution"
                :name="index"
              >
                <template #header-extra>
                  <n-space :size="8">
                    <n-tag v-if="resource.isVip" size="tiny" type="warning">VIP</n-tag>
                    <n-tag size="tiny">{{ resource.format.toUpperCase() }}</n-tag>
                    <n-tag
                      v-if="isDashResource(resource) && resource.variants?.length"
                      size="tiny"
                      type="info"
                    >
                      {{ t('video.detail.dashStreamCount', { n: resource.variants.length }) }}
                    </n-tag>
                  </n-space>
                </template>
                <n-descriptions :column="2" label-placement="left" size="small">
                  <n-descriptions-item :label="t('video.detail.fileName')">
                    {{ resource.sourceFileName }}
                  </n-descriptions-item>
                  <n-descriptions-item :label="t('video.detail.fileSize')">
                    {{ formatFileSize(resource.fileSize) }}
                  </n-descriptions-item>
                  <n-descriptions-item :label="t('video.detail.bitrate')">
                    <template v-if="isDashResource(resource)">
                      {{ t('video.detail.adaptiveBitrate') }}
                      <span v-if="resource.bitrate > 0"> （max {{ resource.bitrate }} kbps） </span>
                    </template>
                    <template v-else>{{ resource.bitrate }} kbps</template>
                  </n-descriptions-item>
                  <n-descriptions-item :label="t('video.detail.codec')">
                    {{ (resource.codec || '—').toUpperCase() }}
                  </n-descriptions-item>
                </n-descriptions>

                <!-- DASH: 展开 MPD 内各 Representation -->
                <template v-if="isDashResource(resource) && resource.variants?.length">
                  <div class="video-detail__dash-streams">
                    <div class="video-detail__dash-streams-title">
                      {{ t('video.detail.dashStreams') }}
                    </div>
                    <div
                      v-for="(variant, vIdx) in resource.variants"
                      :key="`${resource.id}-${variant.id || vIdx}`"
                      class="video-detail__dash-stream"
                    >
                      <div class="video-detail__dash-stream-head">
                        <n-space :size="6" align="center">
                          <n-tag
                            size="tiny"
                            :type="variant.contentType === 'audio' ? 'success' : 'info'"
                          >
                            {{
                              variant.contentType === 'audio'
                                ? t('video.detail.audioStream')
                                : t('video.detail.videoStream')
                            }}
                          </n-tag>
                          <span class="video-detail__dash-stream-label">
                            {{ variant.resolution || '—' }}
                          </span>
                          <n-tag v-if="variant.height" size="tiny" :bordered="false">
                            {{ variant.width }}×{{ variant.height }}
                          </n-tag>
                        </n-space>
                      </div>
                      <n-descriptions :column="2" label-placement="left" size="small">
                        <n-descriptions-item :label="t('video.detail.fileName')">
                          {{ variant.fileName || variant.baseUrl || '—' }}
                        </n-descriptions-item>
                        <n-descriptions-item :label="t('video.detail.fileSize')">
                          {{ variant.fileSize ? formatFileSize(variant.fileSize) : '—' }}
                        </n-descriptions-item>
                        <n-descriptions-item :label="t('video.detail.bitrate')">
                          <template v-if="variant.bitrate"> {{ variant.bitrate }} kbps </template>
                          <template v-else-if="variant.bandwidth">
                            {{ Math.round(variant.bandwidth / 1000) }} kbps
                          </template>
                          <template v-else>—</template>
                        </n-descriptions-item>
                        <n-descriptions-item :label="t('video.detail.codec')">
                          {{ (variant.codecs || '—').toUpperCase() }}
                        </n-descriptions-item>
                      </n-descriptions>
                    </div>
                  </div>
                </template>
              </n-collapse-item>
            </n-collapse>
          </template>
        </template>

        <template v-else-if="!isLoading">
          <div class="video-detail__empty">
            {{ t('common.tips.noData') }}
          </div>
        </template>
      </n-spin>
    </n-drawer-content>
  </n-drawer>
</template>

<style scoped lang="scss">
.video-detail {
  &__player {
    margin-bottom: var(--spacing-4);
  }

  &__tags {
    display: flex;
    flex-wrap: wrap;
    gap: var(--spacing-2);
  }

  &__tag {
    background-color: var(--color-primary-light);
    color: var(--color-primary);
  }

  &__description {
    padding: var(--spacing-3);
    overflow-wrap: break-word;
    font-size: var(--text-sm);
    line-height: 1.6;
    white-space: pre-wrap;
    background-color: var(--color-bg);
    border-radius: var(--radius-sm);
    color: var(--color-text-secondary);
  }

  &__transcode-msg {
    font-size: var(--text-sm);
    color: var(--color-text-secondary);
  }

  &__dash-streams {
    margin-top: var(--spacing-3);
    padding: var(--spacing-3);
    background: var(--color-bg);
    border: 1px solid var(--color-border);
    border-radius: var(--radius-sm);
  }

  &__dash-streams-title {
    margin-bottom: var(--spacing-2);
    font-size: var(--text-sm);
    font-weight: 600;
    color: var(--color-text-secondary);
  }

  &__dash-stream {
    padding: var(--spacing-2) 0;
    border-top: 1px dashed var(--color-border);

    &:first-of-type {
      border-top: none;
      padding-top: 0;
    }
  }

  &__dash-stream-head {
    margin-bottom: var(--spacing-2);
  }

  &__dash-stream-label {
    font-size: var(--text-sm);
    font-weight: 600;
  }

  &__parts {
    display: flex;
    flex-direction: column;
    gap: var(--spacing-2);
  }

  &__part-item {
    display: flex;
    gap: var(--spacing-3);
    align-items: center;
    padding: var(--spacing-2) var(--spacing-3);
    font-size: var(--text-sm);
    background-color: var(--color-bg);
    border-left: 3px solid transparent;
    border-radius: var(--radius-sm);
    cursor: pointer;
    transition: border-color 0.2s;

    &:hover {
      border-left-color: var(--color-border);
    }

    &--active {
      border-left-color: var(--color-primary);

      .video-detail__part-index,
      .video-detail__part-title {
        color: var(--color-primary);
        font-weight: 600;
      }
    }
  }

  &__part-index {
    min-width: 32px;
    font-weight: 500;
    color: var(--color-primary);
  }

  &__part-title {
    flex: 1;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    color: var(--color-text);
  }

  &__part-duration {
    font-size: var(--text-xs);
    color: var(--color-text-muted);
  }

  &__empty {
    padding: var(--spacing-8);
    text-align: center;
    color: var(--color-text-muted);
  }
}
</style>
