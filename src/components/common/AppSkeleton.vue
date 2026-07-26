<script setup lang="ts">
/**
 * 骨架屏组件
 * 用于内容加载时的占位展示：形状对齐真实内容，并与内容交叉淡出而非硬切
 * Requirements: 20.4, 20.5
 */
import { computed } from 'vue'
import type { CSSProperties } from 'vue'
import { useI18n } from 'vue-i18n'

type SkeletonType = 'text' | 'avatar' | 'image' | 'card' | 'list' | 'table'

interface Props {
  /** 骨架屏类型 */
  type?: SkeletonType
  /** 是否激活动画 */
  animated?: boolean
  /** 文本行数（type=text 时有效） */
  rows?: number
  /** 列表项数（type=list/table 时有效） */
  count?: number
  /** 宽度 */
  width?: string | number
  /** 高度 */
  height?: string | number
  /** 是否圆形（type=avatar 时有效） */
  round?: boolean
  /** 是否显示 */
  loading?: boolean
  /** 表格骨架的列数（type=table 时有效） */
  columns?: number
}

const props = withDefaults(defineProps<Props>(), {
  type: 'text',
  animated: true,
  rows: 3,
  count: 3,
  width: undefined,
  height: undefined,
  round: true,
  loading: true,
  columns: 5,
})

const { t } = useI18n()

/** 数值转 CSS 长度 */
function toLength(value: string | number | undefined): string | undefined {
  if (value === undefined || value === '') return undefined
  return typeof value === 'number' ? `${value}px` : value
}

/** 宽度样式 */
const widthStyle = computed(() => toLength(props.width))

/** 高度样式 */
const heightStyle = computed(() => toLength(props.height))

/** 列表项数组 */
const listItems = computed(() => Array.from({ length: props.count }, (_, i) => i))

/** 表格列数组 */
const columnItems = computed(() => Array.from({ length: props.columns }, (_, i) => i))

/** 头像骨架尺寸（width/height 未传时由 CSS token 决定） */
const avatarStyle = computed<CSSProperties>(() => ({
  width: widthStyle.value,
  height: heightStyle.value ?? widthStyle.value,
}))

/** 图片骨架尺寸 */
const imageStyle = computed<CSSProperties>(() => ({
  width: widthStyle.value,
  height: heightStyle.value,
}))

/** 文本行尺寸：最后一行收窄到 60%，模拟真实段落的断行 */
function textRowStyle(index: number): CSSProperties {
  return {
    width: index === props.rows ? '60%' : widthStyle.value,
    height: heightStyle.value,
  }
}

/** 表格网格列数 */
const tableGridStyle = computed<CSSProperties>(() => ({
  gridTemplateColumns: `repeat(${props.columns}, 1fr)`,
}))
</script>

<template>
  <div class="app-skeleton-swap">
    <!--
      交叉淡出而不是硬切：position: relative 是全局 .swap-leave-active（离场态
      绝对定位并与进入态重叠）生效的前提，否则骨架与内容会同时占位、
      切换瞬间高度翻倍。
    -->
    <Transition name="swap">
      <div
        v-if="loading"
        key="skeleton"
        class="app-skeleton"
        :class="[`app-skeleton--${type}`, { 'app-skeleton--animated': animated }]"
        role="status"
        aria-busy="true"
        :aria-label="t('common.loading')"
      >
        <!-- 文本骨架 -->
        <template v-if="type === 'text'">
          <span
            v-for="i in rows"
            :key="i"
            class="app-skeleton__block app-skeleton__block--line"
            :style="textRowStyle(i)"
          />
        </template>

        <!-- 头像骨架 -->
        <span
          v-else-if="type === 'avatar'"
          class="app-skeleton__block app-skeleton__block--avatar"
          :class="{ 'app-skeleton__block--circle': round }"
          :style="avatarStyle"
        />

        <!-- 图片骨架 -->
        <span
          v-else-if="type === 'image'"
          class="app-skeleton__block app-skeleton__block--image"
          :style="imageStyle"
        />

        <!-- 卡片骨架：封面 + 标题 + 两行正文 -->
        <template v-else-if="type === 'card'">
          <span class="app-skeleton__block app-skeleton__block--cover" />
          <div class="app-skeleton__card-content">
            <span class="app-skeleton__block app-skeleton__block--title" />
            <span class="app-skeleton__block app-skeleton__block--line" />
            <span class="app-skeleton__block app-skeleton__block--line" />
          </div>
        </template>

        <!-- 列表骨架：头像 + 两行文本 -->
        <template v-else-if="type === 'list'">
          <div v-for="i in listItems" :key="i" class="app-skeleton__list-item">
            <span
              class="app-skeleton__block app-skeleton__block--avatar app-skeleton__block--circle"
            />
            <div class="app-skeleton__list-content">
              <span class="app-skeleton__block app-skeleton__block--line" />
              <span class="app-skeleton__block app-skeleton__block--caption" />
            </div>
          </div>
        </template>

        <!-- 表格骨架：表头 + 数据行 -->
        <template v-else-if="type === 'table'">
          <div class="app-skeleton__table-header" :style="tableGridStyle">
            <span
              v-for="col in columnItems"
              :key="col"
              class="app-skeleton__block app-skeleton__block--title"
            />
          </div>
          <div
            v-for="row in listItems"
            :key="row"
            class="app-skeleton__table-row"
            :style="tableGridStyle"
          >
            <span
              v-for="col in columnItems"
              :key="col"
              class="app-skeleton__block app-skeleton__block--line"
            />
          </div>
        </template>
      </div>

      <div v-else key="content" class="app-skeleton-swap__content">
        <slot />
      </div>
    </Transition>
  </div>
</template>

<style scoped lang="scss">
@use '@/styles/transitions/interaction' as ix;

.app-skeleton-swap {
  position: relative;
}

.app-skeleton {
  // 占位块尺寸全部由 typography / spacing token 推导，
  // 骨架的形状必须跟着真实内容的字号走，写死 px 就会和内容错位。
  --sk-line: var(--text-lg);
  --sk-title: var(--text-2xl);
  --sk-caption: var(--text-base);
  --sk-avatar: var(--spacing-10);
  --sk-cover: calc(var(--spacing-20) * 2);
  --sk-image: calc(var(--spacing-24) * 2);

  &__block {
    display: block;
    flex: none;
    width: 100%;
    background-color: var(--color-skeleton);
    border-radius: var(--radius-md);
  }

  // 微光只在 animated 时下发；交给 interaction 层的 mixin，
  // 其 @keyframes 定义在 mixin 内部，scoped 改写后仍然对得上。
  &--animated &__block {
    @include ix.skeleton-shimmer;
  }

  &__block--line {
    height: var(--sk-line);
  }

  &__block--title {
    height: var(--sk-title);
  }

  &__block--caption {
    width: 80%;
    height: var(--sk-caption);
  }

  &__block--avatar {
    width: var(--sk-avatar);
    height: var(--sk-avatar);
  }

  &__block--circle {
    border-radius: var(--radius-full);
  }

  &__block--image {
    height: var(--sk-image);
  }

  &__block--cover {
    height: var(--sk-cover);
    border-radius: 0;
  }

  &--text {
    display: flex;
    flex-direction: column;
    gap: var(--spacing-2);
  }

  &--avatar {
    display: inline-flex;
  }

  &--image {
    overflow: hidden;
    border-radius: var(--radius-md);
  }

  &--card {
    overflow: hidden;
    background-color: var(--color-surface);
    border: 1px solid var(--color-border);
    border-radius: var(--radius-card);
  }

  &__card-content {
    display: flex;
    flex-direction: column;
    gap: var(--spacing-2);
    padding: var(--spacing-4);
  }

  &--list {
    display: flex;
    flex-direction: column;
    gap: var(--spacing-4);
  }

  &__list-item {
    display: flex;
    gap: var(--spacing-3);
    align-items: center;
  }

  &__list-content {
    display: flex;
    flex: 1;
    flex-direction: column;
    gap: var(--spacing-2);
  }

  &--table {
    display: flex;
    flex-direction: column;
    gap: var(--spacing-3);
  }

  &__table-header {
    display: grid;
    gap: var(--spacing-4);
    padding: var(--spacing-3) var(--spacing-4);
    background-color: var(--color-surface-2);
    border-radius: var(--radius-md);
  }

  &__table-row {
    display: grid;
    gap: var(--spacing-4);
    padding: var(--spacing-3) var(--spacing-4);
    border-bottom: 1px solid var(--color-border-subtle);
  }
}
</style>
