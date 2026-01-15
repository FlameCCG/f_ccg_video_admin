<script setup lang="ts">
/**
 * 轮播图组件
 * 基于 Swiper 封装，支持自动播放、导航、分页
 * Requirements: 5.1 - 轮播图管理
 */
import { ref, onMounted, onUnmounted, watch, computed } from 'vue'
import { useI18n } from 'vue-i18n'
import Swiper from 'swiper'
import { Navigation, Pagination, Autoplay, EffectFade, EffectCube } from 'swiper/modules'
import type { SwiperOptions } from 'swiper/types'

export interface SwiperItem {
  id: string | number
  image: string
  title?: string
  description?: string
  link?: string
}

interface Props {
  /** 轮播数据 */
  items: SwiperItem[]
  /** 自动播放间隔（毫秒），0 表示不自动播放 */
  autoplayDelay?: number
  /** 是否显示导航箭头 */
  showNavigation?: boolean
  /** 是否显示分页指示器 */
  showPagination?: boolean
  /** 切换效果 */
  effect?: 'slide' | 'fade' | 'cube'
  /** 是否循环播放 */
  loop?: boolean
  /** 轮播高度 */
  height?: string | number
  /** 是否显示标题遮罩 */
  showOverlay?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  autoplayDelay: 4000,
  showNavigation: true,
  showPagination: true,
  effect: 'fade',
  loop: true,
  height: 280,
  showOverlay: true,
})

const emit = defineEmits<{
  click: [item: SwiperItem]
  slideChange: [index: number]
}>()

const { t } = useI18n()

const swiperContainer = ref<HTMLElement | null>(null)
const swiperInstance = ref<Swiper | null>(null)
const currentIndex = ref(0)
const isHovering = ref(false)

/** 计算高度样式 */
const heightStyle = computed(() => {
  if (typeof props.height === 'number') {
    return `${props.height}px`
  }
  return props.height
})

/** 初始化 Swiper */
function initSwiper(): void {
  if (!swiperContainer.value || props.items.length === 0) return

  const modules = [Navigation, Pagination, Autoplay]
  if (props.effect === 'fade') modules.push(EffectFade)
  if (props.effect === 'cube') modules.push(EffectCube)

  const options: SwiperOptions = {
    modules,
    loop: props.loop && props.items.length > 1,
    effect: props.effect,
    fadeEffect: props.effect === 'fade' ? { crossFade: true } : undefined,
    cubeEffect:
      props.effect === 'cube'
        ? {
            shadow: true,
            slideShadows: true,
            shadowOffset: 20,
            shadowScale: 0.94,
          }
        : undefined,
    speed: 600,
    grabCursor: true,
    navigation: props.showNavigation
      ? {
          nextEl: '.swiper-button-next',
          prevEl: '.swiper-button-prev',
        }
      : false,
    pagination: props.showPagination
      ? {
          el: '.swiper-pagination',
          clickable: true,
          dynamicBullets: props.items.length > 5,
        }
      : false,
    autoplay:
      props.autoplayDelay > 0
        ? {
            delay: props.autoplayDelay,
            disableOnInteraction: false,
            pauseOnMouseEnter: true,
          }
        : false,
    on: {
      slideChange: (swiper) => {
        currentIndex.value = swiper.realIndex
        emit('slideChange', swiper.realIndex)
      },
    },
  }

  swiperInstance.value = new Swiper(swiperContainer.value, options)
}

/** 销毁 Swiper */
function destroySwiper(): void {
  if (swiperInstance.value) {
    swiperInstance.value.destroy(true, true)
    swiperInstance.value = null
  }
}

/** 处理点击 */
function handleClick(item: SwiperItem): void {
  emit('click', item)
  if (item.link) {
    window.open(item.link, '_blank')
  }
}

/** 处理鼠标进入 */
function handleMouseEnter(): void {
  isHovering.value = true
}

/** 处理鼠标离开 */
function handleMouseLeave(): void {
  isHovering.value = false
}

// 监听数据变化重新初始化
watch(
  () => props.items,
  () => {
    destroySwiper()
    // 等待 DOM 更新
    setTimeout(initSwiper, 50)
  },
  { deep: true }
)

onMounted(() => {
  initSwiper()
})

onUnmounted(() => {
  destroySwiper()
})
</script>

<template>
  <div
    class="app-swiper"
    :style="{ height: heightStyle }"
    @mouseenter="handleMouseEnter"
    @mouseleave="handleMouseLeave"
  >
    <!-- 空状态 -->
    <div v-if="items.length === 0" class="app-swiper__empty">
      <div class="app-swiper__empty-icon">
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="40"
          height="40"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="1.5"
          stroke-linecap="round"
          stroke-linejoin="round"
        >
          <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
          <circle cx="8.5" cy="8.5" r="1.5" />
          <polyline points="21 15 16 10 5 21" />
        </svg>
      </div>
      <span class="app-swiper__empty-text">{{ t('common.tips.noData') }}</span>
    </div>

    <!-- Swiper 容器 -->
    <div v-else ref="swiperContainer" class="swiper">
      <div class="swiper-wrapper">
        <div v-for="item in items" :key="item.id" class="swiper-slide" @click="handleClick(item)">
          <img :src="item.image" :alt="item.title || ''" class="app-swiper__image" />
          <!-- 标题遮罩 -->
          <div v-if="showOverlay && item.title" class="app-swiper__overlay">
            <h3 class="app-swiper__title">{{ item.title }}</h3>
            <p v-if="item.description" class="app-swiper__desc">{{ item.description }}</p>
          </div>
        </div>
      </div>

      <!-- 分页指示器 -->
      <div v-if="showPagination" class="swiper-pagination" />

      <!-- 导航按钮 -->
      <template v-if="showNavigation && items.length > 1">
        <button
          class="swiper-button-prev"
          :class="{ 'is-visible': isHovering }"
          :aria-label="t('common.prev')"
        />
        <button
          class="swiper-button-next"
          :class="{ 'is-visible': isHovering }"
          :aria-label="t('common.next')"
        />
      </template>

      <!-- 当前索引指示 -->
      <div v-if="items.length > 1" class="app-swiper__counter">
        <span class="app-swiper__counter-current">{{ currentIndex + 1 }}</span>
        <span class="app-swiper__counter-sep">/</span>
        <span class="app-swiper__counter-total">{{ items.length }}</span>
      </div>
    </div>
  </div>
</template>

<style scoped lang="scss">
.app-swiper {
  position: relative;
  width: 100%;
  border-radius: var(--radius-xl);
  overflow: hidden;
  background: var(--color-surface);
  box-shadow: var(--shadow-elev-1);

  .swiper {
    width: 100%;
    height: 100%;
  }

  .swiper-slide {
    position: relative;
    cursor: pointer;
    overflow: hidden;

    &::after {
      content: '';
      position: absolute;
      inset: 0;
      background: linear-gradient(
        180deg,
        transparent 40%,
        color-mix(in srgb, var(--color-bg) 80%, transparent) 100%
      );
      opacity: 0;
      transition: opacity 400ms;
    }

    &:hover::after {
      opacity: 1;
    }
  }

  &__image {
    width: 100%;
    height: 100%;
    object-fit: cover;
    transition: transform 600ms cubic-bezier(0.4, 0, 0.2, 1);

    .swiper-slide:hover & {
      transform: scale(1.05);
    }
  }

  &__overlay {
    position: absolute;
    bottom: 0;
    left: 0;
    right: 0;
    padding: var(--spacing-6) var(--spacing-8);
    background: linear-gradient(
      180deg,
      transparent 0%,
      color-mix(in srgb, black 60%, transparent) 100%
    );
    z-index: 2;
  }

  &__title {
    margin: 0;
    font-size: var(--text-lg);
    font-weight: 600;
    color: white;
    text-shadow: 0 1px 3px rgb(0 0 0 / 30%);
    line-height: 1.4;
  }

  &__desc {
    margin: var(--spacing-1) 0 0;
    font-size: var(--text-sm);
    color: rgb(255 255 255 / 80%);
    line-height: 1.5;
  }

  &__counter {
    position: absolute;
    bottom: var(--spacing-4);
    right: var(--spacing-4);
    display: flex;
    align-items: center;
    gap: 2px;
    padding: var(--spacing-1) var(--spacing-3);
    background: color-mix(in srgb, black 50%, transparent);
    backdrop-filter: blur(8px);
    border-radius: var(--radius-full);
    font-size: 12px;
    font-weight: 500;
    color: white;
    z-index: 10;
  }

  &__counter-current {
    color: var(--color-primary-light, #60a5fa);
  }

  &__counter-sep {
    opacity: 0.5;
  }

  &__empty {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    height: 100%;
    gap: var(--spacing-3);
  }

  &__empty-icon {
    color: var(--color-text-muted);
    opacity: 0.4;
  }

  &__empty-text {
    color: var(--color-text-muted);
    font-size: var(--text-sm);
  }

  // 导航按钮样式
  .swiper-button-prev,
  .swiper-button-next {
    width: 40px;
    height: 40px;
    background: color-mix(in srgb, var(--color-surface) 90%, transparent);
    backdrop-filter: blur(8px);
    border-radius: var(--radius-full);
    border: 1px solid var(--color-border-light);
    opacity: 0;
    transform: scale(0.9);
    transition:
      opacity 300ms,
      transform 300ms,
      background 200ms;

    &.is-visible {
      opacity: 1;
      transform: scale(1);
    }

    &:hover {
      background: var(--color-surface);
      border-color: var(--color-primary);
    }

    &::after {
      font-size: 14px;
      font-weight: 700;
      color: var(--color-text);
    }
  }

  .swiper-button-prev {
    left: var(--spacing-4);
  }

  .swiper-button-next {
    right: var(--spacing-4);
  }

  // 分页指示器样式
  :deep(.swiper-pagination) {
    bottom: var(--spacing-4);
    left: var(--spacing-4);
    width: auto;
    text-align: left;
  }

  :deep(.swiper-pagination-bullet) {
    width: 8px;
    height: 8px;
    background: white;
    opacity: 0.4;
    transition:
      opacity 200ms,
      width 200ms,
      background 200ms;
  }

  :deep(.swiper-pagination-bullet-active) {
    width: 24px;
    border-radius: 4px;
    background: var(--color-primary);
    opacity: 1;
  }
}

// Reduced motion
@media (prefers-reduced-motion: reduce) {
  .app-swiper {
    &__image {
      transition: none;
    }

    .swiper-slide::after {
      transition: none;
    }

    .swiper-button-prev,
    .swiper-button-next {
      transition: none;
    }

    :deep(.swiper-pagination-bullet) {
      transition: none;
    }
  }
}
</style>
