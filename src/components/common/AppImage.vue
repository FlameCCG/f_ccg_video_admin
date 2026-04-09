<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { NImage } from 'naive-ui'
import { useI18n } from 'vue-i18n'
import { normalizeResourceUrl } from '@/utils/url'

const props = withDefaults(
  defineProps<{
    src?: string | null
    alt?: string
    width?: number
    height?: number
    lazy?: boolean
    previewDisabled?: boolean
  }>(),
  { src: '', alt: '', width: 72, height: 40, lazy: true, previewDisabled: false }
)
const { t } = useI18n()
const normalizedSrc = computed(() => normalizeResourceUrl(props.src))
const failed = ref(false)
watch(normalizedSrc, () => {
  failed.value = false
})
function handleError(): void {
  failed.value = true
}
const imageStyle = computed(() => ({ width: `${props.width}px`, height: `${props.height}px` }))
// 观察有固定尺寸的容器；原生 lazy 在 placeholder 隐藏 img 时可能一直不发起请求。
const imageObserverOptions = {}
</script>

<template>
  <span class="app-image" :style="imageStyle">
    <n-image
      v-if="normalizedSrc"
      :key="normalizedSrc"
      :src="normalizedSrc"
      :alt="alt"
      :width="width"
      :height="height"
      :img-props="{ style: imageStyle }"
      :lazy="lazy"
      :intersection-observer-options="lazy ? imageObserverOptions : undefined"
      :preview-disabled="previewDisabled"
      object-fit="cover"
      @error="handleError"
    >
      <template #placeholder>
        <span
          v-if="!failed"
          class="app-image__loading"
          role="status"
          :aria-label="t('common.loading')"
        />
      </template>
      <template #error>
        <span
          class="app-image__fallback"
          role="img"
          :aria-label="t('common.image.loadFailed')"
          :title="t('common.image.loadFailed')"
        >
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="1.5"
            aria-hidden="true"
          >
            <rect x="3" y="3" width="18" height="18" rx="3" />
            <circle cx="8.5" cy="8.5" r="1.5" />
            <path d="m3 17 5-5 4 4 4-6 5 7" />
          </svg>
        </span>
      </template>
    </n-image>
    <span
      v-else
      class="app-image__fallback"
      role="img"
      :aria-label="t('common.image.empty')"
      :title="t('common.image.empty')"
    >
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        stroke-width="1.5"
        aria-hidden="true"
      >
        <rect x="3" y="3" width="18" height="18" rx="3" />
        <path d="m3 17 5-5 4 4 4-6 5 7" />
      </svg>
    </span>
  </span>
</template>

<style scoped lang="scss">
@use '@/styles/transitions/interaction' as ix;

.app-image {
  display: inline-flex;
  flex-shrink: 0;
  overflow: hidden;
  vertical-align: middle;
  background: var(--color-surface-3);
  border-radius: var(--radius-sm);
  box-shadow: inset 0 0 0 1px var(--color-border-subtle);

  :deep(.n-image) {
    width: 100%;
    height: 100%;
  }

  &__loading,
  &__fallback {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 100%;
    height: 100%;
  }

  &__loading {
    @include ix.skeleton-shimmer;
  }

  &__fallback {
    color: var(--color-text-muted);
    background: var(--color-surface-3);

    svg {
      width: var(--spacing-5);
      height: var(--spacing-5);
    }
  }
}
</style>
