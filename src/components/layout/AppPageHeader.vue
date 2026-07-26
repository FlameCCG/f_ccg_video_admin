<script setup lang="ts">
/**
 * 页面头部（页面标题模式的唯一实现）
 *
 * 为什么需要它：登录后的 18 个页面里 17 个没有任何标题元素，页面标题被写成
 * Naive 卡片头里的一个 <span>，同一份声明在 9 个视图里各抄了一遍。结果是
 * 整个应用没有文档大纲、读屏软件没有可跳转的标题、视觉上也没有排版重心
 * （全仓 98 个字号声明里 83 个挤在 12–16px 之间）。
 *
 * 契约（15 个视图会依次接入，因此 API 必须小且稳定）：
 * - 纯展示组件：不访问 store、不发请求、不调用 t()。只接收「已翻译好的字符串」，
 *   所以既不会出现硬编码文案，也不会把 i18n 依赖渗进布局层。
 * - 每页只渲染一个 <h1>：它同时是这一页的排版锚点和无障碍锚点。
 *   根节点用 <header>，它位于 DefaultLayout 的 <main> 之内，因此不会被映射成
 *   banner role（banner 只属于顶层页眉）。模板保持「单根元素、无根级注释」，
 *   调用方传入的 class 才能正常透传到根节点上。
 * - 不带任何外边距：页面内边距由 DefaultLayout 的 .content-wrapper 统一给出
 *   （--spacing-page-x / --spacing-page-y），块间节奏由 .page-list 的
 *   --spacing-section 统一给出。组件自己不参与页面级留白，才不会出现第二套内缩。
 *
 * 用法：
 *   <app-page-header :title="t('user.list.title')">
 *     <template #actions><n-button>...</n-button></template>
 *   </app-page-header>
 */
import type { VNode } from 'vue'

interface Props {
  /** 页面标题（调用方传入已翻译文本） */
  title: string
  /** 页面描述（已翻译）。需要富文本时用 #description 插槽 */
  description?: string
}

withDefaults(defineProps<Props>(), {
  description: undefined,
})

defineSlots<{
  /** 标题上方：面包屑、返回入口等 */
  extra?: () => VNode[]
  /** 描述区，优先于 description prop */
  description?: () => VNode[]
  /** 右侧操作区，窄屏时整块换行到标题下方 */
  actions?: () => VNode[]
}>()
</script>

<template>
  <header class="app-page-header">
    <div v-if="$slots.extra" class="app-page-header__extra">
      <slot name="extra" />
    </div>

    <div class="app-page-header__bar">
      <h1 class="app-page-header__title">{{ title }}</h1>

      <div v-if="$slots.actions" class="app-page-header__actions">
        <slot name="actions" />
      </div>
    </div>

    <p v-if="$slots.description || description" class="app-page-header__description">
      <slot name="description">{{ description }}</slot>
    </p>
  </header>
</template>

<style scoped lang="scss">
// 描述文字的可读行宽上限（约 60–75 个字符）。这是排版度量，不是间距，
// 因此不走 spacing token；用 ch 才能跟随字号与字体族变化。
$description-measure: 72ch;

.app-page-header {
  display: flex;
  flex-direction: column;
  flex-shrink: 0;
  gap: var(--spacing-2);
}

.app-page-header__extra {
  font-size: var(--text-sm);
  line-height: var(--leading-normal);
  color: var(--color-text-secondary);
}

// 标题与操作区同排。窄屏时靠 flex-wrap 让操作区整块落到标题下方：
// 标题不设 min-width: 0，它的弹性基准就是自身内容宽度，所以「按钮换行」
// 一定发生在「标题被挤成一列字」之前，任何宽度下都不会横向溢出。
.app-page-header__bar {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: var(--spacing-3) var(--spacing-4);
}

.app-page-header__title {
  // 语义排版：明显大于正文一档，页面才有重心。
  // 这里覆盖 base/_typography.scss 里 h1 的 --text-4xl（30px）：
  // 后台页面标题用 24px 更克制，同时仍与 14px 正文形成清晰层级。
  margin: 0;
  font-size: var(--text-3xl);
  font-weight: var(--font-semibold);
  line-height: var(--leading-tight);
  letter-spacing: var(--tracking-tight);
  color: var(--color-text);
}

.app-page-header__actions {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: var(--spacing-inline-gap);
}

.app-page-header__description {
  max-width: $description-measure;
  margin: 0;
  font-size: var(--text-sm);
  line-height: var(--leading-normal);
  color: var(--color-text-secondary);
}
</style>
