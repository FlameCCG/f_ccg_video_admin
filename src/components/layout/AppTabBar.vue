<script setup lang="ts">
/**
 * 标签栏组件
 * 横向可滚动的标签页，类似浏览器标签
 *
 * 这里曾经用 swiper（core + vue + free-mode + mousewheel 共约 178 KB，外加两份
 * 样式表）在每个已登录页面上加载，全部只为了一次 slideTo。原生 overflow-x: auto
 * 已经免费提供触控板横向手势、滚动条拖拽、焦点元素自动滚入视口，代价仅是失去
 * free-mode 的惯性滑动（已确认可接受）。
 */
import { computed, onMounted, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { NDropdown, type DropdownOption } from 'naive-ui'
import { useTabsStore, type TabItem } from '@/stores/tabs'
import type { LocaleType } from '@/locales'

const router = useRouter()
const { t, locale } = useI18n()
const tabsStore = useTabsStore()

/** 横向滚动容器：既是 tablist 宿主，也是滑动指示条（--ind-x / --ind-w）的写入目标 */
const scrollerRef = ref<HTMLElement | null>(null)

/**
 * 漫游焦点索引（roving tabindex）：整条 strip 只有一个标签进入 Tab 序列，
 * 内部移动交给方向键。默认跟随激活标签。
 */
const focusIndex = ref(0)

const showContextMenu = ref(false)
const contextMenuX = ref(0)
const contextMenuY = ref(0)
const contextMenuTab = ref<TabItem | null>(null)

/** tablist 的无障碍名称 */
const tabListLabel = computed(() => t('layout.tabs.label'))

/**
 * 右键菜单选项。
 * 必须是 computed：模块级常量在切换语言后不会重新求值，菜单会一直停留在
 * 首次渲染时的语言（原实现更直接——四个标签是硬编码中文）。
 */
const contextMenuOptions = computed<DropdownOption[]>(() => [
  { key: 'close', label: t('layout.tabs.close') },
  { key: 'closeOther', label: t('layout.tabs.closeOther') },
  { key: 'closeRight', label: t('layout.tabs.closeRight') },
  { key: 'closeAll', label: t('layout.tabs.closeAll') },
])

/** 获取标签标题（根据当前语言） */
function getTabTitle(tab: TabItem): string {
  const currentLocale = locale.value as LocaleType
  switch (currentLocale) {
    case 'en-US':
      return tab.titleEn || tab.title
    case 'ja-JP':
      return tab.titleJa || tab.title
    default:
      return tab.title
  }
}

/** 关闭按钮的无障碍名称：带上标题，屏幕阅读器才能区分同屏 N 个「关闭」 */
function closeTabLabel(tab: TabItem): string {
  return t('layout.tabs.closeTab', { title: getTabTitle(tab) })
}

/** 是否为当前进入 Tab 序列的标签（漫游焦点） */
function isRovingTab(index: number): boolean {
  const total = tabsStore.tabs.length
  if (total === 0) return false
  return index === Math.min(Math.max(focusIndex.value, 0), total - 1)
}

/** 标签同时承担导航语义，因此除 aria-selected 外再标出「当前页面」 */
function ariaCurrentFor(tab: TabItem): 'page' | undefined {
  return tab.path === tabsStore.activeTab ? 'page' : undefined
}

/**
 * 取第 index 个标签元素。
 * 按 DOM 顺序数而不是查属性：<TransitionGroup> 的离场节点在动画结束前仍留在
 * DOM 中，必须跳过，否则量到的是即将消失的那一个。
 */
function getTabElAt(index: number): HTMLElement | null {
  const host = scrollerRef.value
  if (!host || index < 0) return null

  let seen = 0
  for (const child of Array.from(host.children)) {
    if (!(child instanceof HTMLElement)) continue
    if (!child.classList.contains('tab-item')) continue
    if (child.classList.contains('tab-leave-active')) continue
    if (seen === index) return child
    seen += 1
  }
  return null
}

/** 系统是否要求减少动效（决定滚动是平滑还是瞬时） */
function scrollBehavior(): ScrollBehavior {
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth'
}

/**
 * 同步指示条位置，并保证激活标签可见。
 * 一次选中只写一次 style，位移由 CSS 过渡完成，不做逐帧 JS 动画。
 * inline: 'nearest' —— 只在标签超出视口时才滚动，避免每次点击都把整条 strip
 * 重新居中（那会让相邻标签在手指底下跑掉）。
 */
function syncActiveTab(): void {
  const host = scrollerRef.value
  if (!host) return

  const el = getTabElAt(tabsStore.activeIndex)
  // 无激活标签时收起指示条，避免它下次从 0 位置「飞出来」
  host.dataset.indicatorHidden = el ? 'false' : 'true'
  if (!el) return

  host.style.setProperty('--ind-x', `${el.offsetLeft}px`)
  host.style.setProperty('--ind-w', `${el.offsetWidth}px`)
  el.scrollIntoView({ behavior: scrollBehavior(), block: 'nearest', inline: 'nearest' })
}

/** 点击标签 */
function handleTabClick(tab: TabItem): void {
  if (tab.path !== tabsStore.activeTab) {
    tabsStore.setActiveTab(tab.path)
    void router.push(tab.path)
  }
}

/** 关闭指定路径的标签，必要时跳转到接替它的标签 */
function closeTabByPath(path: string): void {
  const nextPath = tabsStore.closeTab(path)
  if (nextPath) {
    void router.push(nextPath)
  }
}

/** 关闭标签 */
function handleCloseTab(tab: TabItem, event: MouseEvent): void {
  event.stopPropagation()
  closeTabByPath(tab.path)
}

/** 关闭按钮的键盘事件不能冒泡到标签，否则空格会被标签的激活逻辑抢走 */
function handleCloseKeydown(event: KeyboardEvent): void {
  event.stopPropagation()
}

/** 把焦点移到第 index 个标签（越界夹到两端，不做循环） */
function focusTabAt(index: number): void {
  const total = tabsStore.tabs.length
  if (total === 0) return

  const clamped = Math.min(Math.max(index, 0), total - 1)
  focusIndex.value = clamped
  // tabindex 尚未重算不影响 focus()：程序化聚焦对 tabindex="-1" 同样生效
  getTabElAt(clamped)?.focus()
}

/**
 * 标签键盘操作。
 * 方向键只移动焦点、不切换页面（手动激活）：标签切换会触发路由跳转，
 * 「focus 即激活」等于按一次方向键就多跳一个页面。
 */
function handleTabKeydown(tab: TabItem, index: number, event: KeyboardEvent): void {
  switch (event.key) {
    case 'ArrowLeft':
      event.preventDefault()
      focusTabAt(index - 1)
      break
    case 'ArrowRight':
      event.preventDefault()
      focusTabAt(index + 1)
      break
    case 'Home':
      event.preventDefault()
      focusTabAt(0)
      break
    case 'End':
      event.preventDefault()
      focusTabAt(tabsStore.tabs.length - 1)
      break
    case 'Enter':
    case ' ':
      event.preventDefault()
      handleTabClick(tab)
      break
    case 'Delete':
    case 'Backspace':
      if (!tab.affix) {
        event.preventDefault()
        closeTabByPath(tab.path)
      }
      break
    default:
      break
  }
}

/**
 * 普通滚轮的纵向滚动映射为横向滚动（原先由 swiper 的 Mousewheel 模块提供）。
 * 触控板横向手势与倾斜滚轮本身就是横向 delta，交给原生 overflow 处理。
 */
function handleWheel(event: WheelEvent): void {
  const host = scrollerRef.value
  if (!host) return
  if (Math.abs(event.deltaX) > Math.abs(event.deltaY)) return
  if (host.scrollWidth <= host.clientWidth) return

  event.preventDefault()
  host.scrollLeft += event.deltaY
}

/** 右键菜单 */
function handleContextMenu(tab: TabItem, event: MouseEvent): void {
  event.preventDefault()
  contextMenuTab.value = tab
  contextMenuX.value = event.clientX
  contextMenuY.value = event.clientY
  showContextMenu.value = true
}

/** 处理右键菜单选择 */
function handleContextMenuSelect(key: string): void {
  if (!contextMenuTab.value) return

  const path = contextMenuTab.value.path
  switch (key) {
    case 'close':
      closeTabByPath(path)
      break
    case 'closeOther':
      tabsStore.closeOtherTabs(path)
      void router.push(path)
      break
    case 'closeRight':
      tabsStore.closeRightTabs(path)
      break
    case 'closeAll':
      tabsStore.closeAllTabs()
      if (tabsStore.tabs.length > 0 && tabsStore.tabs[0]) {
        void router.push(tabsStore.tabs[0].path)
      }
      break
  }
  showContextMenu.value = false
}

/** 关闭右键菜单 */
function handleClickOutside(): void {
  showContextMenu.value = false
}

/** 离场动画结束后标签才真正让出流空间，此时才量得到最终位置 */
function handleAfterLeave(): void {
  syncActiveTab()
}

/**
 * 激活标签 / 标签数量 / 语言三者都会改变指示条的目标位置：
 * 语言切换会改写标题宽度，不重新测量指示条就会错位。
 * flush: 'post' 保证 DOM 已更新，因此不需要再套一层 nextTick。
 */
watch(
  () => [tabsStore.activeTab, tabsStore.tabs.length, locale.value],
  () => {
    focusIndex.value = Math.max(tabsStore.activeIndex, 0)
    syncActiveTab()
  },
  { flush: 'post' }
)

onMounted(() => {
  focusIndex.value = Math.max(tabsStore.activeIndex, 0)
  syncActiveTab()
})
</script>

<template>
  <div class="app-tab-bar">
    <div
      ref="scrollerRef"
      class="tab-scroller"
      role="tablist"
      :aria-label="tabListLabel"
      @wheel="handleWheel"
    >
      <TransitionGroup name="tab" @after-leave="handleAfterLeave">
        <div
          v-for="(tab, index) in tabsStore.tabs"
          :key="tab.path"
          class="tab-item"
          :class="{ 'is-active': tab.path === tabsStore.activeTab }"
          role="tab"
          :aria-selected="tab.path === tabsStore.activeTab"
          :aria-current="ariaCurrentFor(tab)"
          :tabindex="isRovingTab(index) ? 0 : -1"
          :title="getTabTitle(tab)"
          @click="handleTabClick(tab)"
          @contextmenu="handleContextMenu(tab, $event)"
          @keydown="handleTabKeydown(tab, index, $event)"
        >
          <span class="tab-item__title">{{ getTabTitle(tab) }}</span>
          <button
            v-if="!tab.affix"
            type="button"
            class="tab-item__close"
            :aria-label="closeTabLabel(tab)"
            @click="handleCloseTab(tab, $event)"
            @keydown="handleCloseKeydown"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
              stroke-linecap="round"
              stroke-linejoin="round"
              aria-hidden="true"
            >
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>
      </TransitionGroup>
    </div>

    <!-- 右键菜单 -->
    <NDropdown
      placement="bottom-start"
      trigger="manual"
      :x="contextMenuX"
      :y="contextMenuY"
      :options="contextMenuOptions"
      :show="showContextMenu"
      @select="handleContextMenuSelect"
      @clickoutside="handleClickOutside"
    />
  </div>
</template>

<style scoped lang="scss">
@use '@/styles/transitions/interaction' as ix;

.app-tab-bar {
  display: flex;
  align-items: center;
  height: var(--layout-tabbar-height);
  padding: 0 var(--spacing-2);
  background: var(--color-surface);
  border-bottom: 1px solid var(--color-border-subtle);
}

// 原生横向滚动容器（替代 swiper）：
// - overflow-x: auto 自带触控板横向手势、滚动条拖拽，以及「聚焦元素自动滚入视口」
// - overscroll-behavior-x: contain 阻断滚动链，滚到两端不会把整页带着一起动
// - 滚动条隐去但滚动能力保留：条高只有 36px，一条常驻滚动条会吃掉近一半高度
.tab-scroller {
  display: flex;
  align-items: center;
  gap: var(--spacing-1);
  width: 100%;
  height: 100%;
  overflow: auto hidden;
  overscroll-behavior-x: contain;
  scrollbar-width: none;

  // 滑动指示条，位置与宽度由 syncActiveTab() 写入 --ind-x / --ind-w
  @include ix.sliding-indicator;

  &::-webkit-scrollbar {
    display: none;
  }

  // 标签不参与伸缩，超出即滚动（原来靠 swiper-slide 的 width: auto !important）
  > * {
    flex: 0 0 auto;
  }
}

.tab-item {
  display: flex;
  align-items: center;
  gap: var(--spacing-1);

  // 36px 的条内留 8px 呼吸，等于原来的 28px，但不再是魔法数
  height: calc(var(--layout-tabbar-height) - var(--spacing-2));
  padding: 0 var(--spacing-3);
  font-size: var(--text-sm);
  color: var(--color-text-secondary);
  white-space: nowrap;
  cursor: pointer;
  background: transparent;
  border-radius: var(--radius-md);

  @include ix.feedback-transition;

  // 用内描边焦点环而不是 interactive-surface 自带的外扩版：本 strip 是横向滚动
  // 容器（overflow-y 被强制为 hidden），外扩阴影会被裁掉，只能画在元素内部。
  @include ix.focus-ring-inset;

  // 只调小按压幅度，抬升用默认的 1px：条内上下各有 4px 余量，不会被裁掉。
  @include ix.pressable(0.97);

  &:hover {
    color: var(--color-text);
    background: var(--color-surface-hover);
  }

  &:active {
    background: var(--color-surface-active);
  }

  &.is-active {
    font-weight: var(--font-medium);
    color: var(--color-primary);
    background: var(--color-primary-subtle);
  }

  // 激活态的底色特异性与 :hover 相同且位置更后，会吃掉上面的 hover 反馈，
  // 所以激活标签需要自己的 hover 色，否则悬停在当前标签上毫无反馈。
  &.is-active:hover {
    background: var(--color-primary-subtle-hover);
  }

  &__title {
    // 以字符宽度限制（近似原来的 120px），避免再写一个像素魔法数
    max-width: 18ch;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  &__close {
    display: flex;
    align-items: center;
    justify-content: center;
    width: var(--spacing-4);
    height: var(--spacing-4);
    padding: 0;
    color: var(--color-text-muted);
    cursor: pointer;
    background: transparent;
    border: none;
    border-radius: var(--radius-sm);

    // 默认隐形，由下面的 hover / focus-within 规则显形
    opacity: 0;

    // 不用 interaction.row-reveal：那个 mixin 会在 `.tab-item .is-row-action`
    // 上声明「只过渡 opacity」的简写，特异性高于本块，颜色反馈会被整条吃掉。
    @include ix.feedback-transition;
    @include ix.focus-ring-inset(1px);

    &:hover {
      color: var(--color-danger);
      background: var(--color-danger-subtle);
    }
  }

  // 关闭按钮的显形条件。:focus-within 是键盘可达性的关键 ——
  // 只有 :hover 的实现对键盘用户等于「这个标签关不掉」。
  &:hover &__close,
  &:focus-within &__close,
  &.is-active &__close {
    opacity: 1;
  }
}

// 无 hover 能力的设备（触屏）常驻显示，否则同样不可达
@media (hover: none) {
  .tab-item__close {
    opacity: 1;
  }
}

// 标签入场/离场。离场刻意不做 position: absolute（<TransitionGroup> 文档里的
// 常见写法）：flex 容器中绝对定位子元素的静态位置会被摆到容器起点，离场标签会
// 直接「跳」到最左侧。留在流里淡出，离场结束后由 handleAfterLeave 重量指示条。
@include ix.enter-leave('tab', scale(0.92), scale(0.92));

.tab-move {
  transition: transform ix.$enter-motion;
}

@media (prefers-reduced-motion: reduce) {
  // 时长已由 tokens/themes.scss 统一压到 0，这里只把缩放的起止态归零：
  // 0ms 的过渡仍会让标签在 0.92 缩放上闪现一帧。
  .tab-enter-from,
  .tab-leave-to {
    transform: none;
  }
}
</style>
