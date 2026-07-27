<script setup lang="ts">
/**
 * 顶部页面标签栏
 *
 * Swiper 负责横向鼠标拖拽、触控惯性与滚轮映射；页面导航仍由 tabs store 和
 * Vue Router 管理。两者职责分离，拖拽不会误触发标签跳转。
 */
import { computed, nextTick, onMounted, ref, shallowRef, watch } from 'vue'
import { useRouter, type RouteLocationRaw } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { NDropdown, type DropdownOption } from 'naive-ui'
import { A11y, FreeMode, Mousewheel } from 'swiper/modules'
import { Swiper as SwiperComponent, SwiperSlide } from 'swiper/vue'
import type { Swiper as SwiperInstance } from 'swiper'
import { useTabsStore, type TabItem } from '@/stores/tabs'
import type { LocaleType } from '@/locales'
import 'swiper/css'
import 'swiper/css/a11y'
import 'swiper/css/free-mode'

const router = useRouter()
const { t, locale } = useI18n()
const tabsStore = useTabsStore()

const swiperModules = [A11y, FreeMode, Mousewheel]
// 第三方类实例必须用 shallowRef；深层响应式解包会破坏 Swiper 方法的 this 类型。
const swiperRef = shallowRef<SwiperInstance | null>(null)
const isDragging = ref(false)

/**
 * 漫游焦点索引：整条 tablist 只有一个标签进入 Tab 序列，
 * 左右方向键负责在标签之间移动，Enter / Space 才激活页面。
 */
const focusIndex = ref(0)

const showContextMenu = ref(false)
const contextMenuX = ref(0)
const contextMenuY = ref(0)
const contextMenuTab = ref<TabItem | null>(null)

const tabListLabel = computed(() => t('layout.tabs.label'))

const swiperA11y = computed(() => ({
  enabled: true,
  containerRole: 'tablist',
  containerMessage: tabListLabel.value,
  slideRole: 'presentation',
  slideLabelMessage: '',
}))

/**
 * 自由模式保留鼠标拖拽后的轻量惯性；数值只描述交互物理，不参与视觉主题。
 * sticky 关闭后不会强制把某个标签吸附到左侧，短距离拖动更自然。
 */
const freeModeOptions = {
  enabled: true,
  sticky: false,
  momentum: true,
  momentumRatio: 0.72,
  momentumVelocityRatio: 0.82,
  minimumVelocity: 0.03,
}

/**
 * forceToAxis=false 会把普通鼠标的纵向滚轮映射到横向标签栏；
 * releaseOnEdges=true 则在两端把滚动权交还给页面，避免“滚轮被锁死”。
 */
const mousewheelOptions = {
  enabled: true,
  forceToAxis: false,
  releaseOnEdges: true,
  sensitivity: 0.72,
  thresholdDelta: 2,
}

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

function closeTabLabel(tab: TabItem): string {
  return t('layout.tabs.closeTab', { title: getTabTitle(tab) })
}

function isRovingTab(index: number): boolean {
  const total = tabsStore.tabs.length
  if (total === 0) return false
  return index === Math.min(Math.max(focusIndex.value, 0), total - 1)
}

function ariaCurrentFor(tab: TabItem): 'page' | undefined {
  return tab.path === tabsStore.activeTab ? 'page' : undefined
}

/**
 * 新版标签会记录 fullPath；旧版持久化数据则回退到 path + query，
 * 保证升级后既不丢历史标签，也不会丢配置页的 ?tab= 上下文。
 */
function getTabTarget(tab: TabItem): RouteLocationRaw {
  if (tab.fullPath) return tab.fullPath
  if (tab.query && Object.keys(tab.query).length > 0) {
    return { path: tab.path, query: tab.query }
  }
  return tab.path
}

function getTabElAt(index: number): HTMLElement | null {
  const swiper = swiperRef.value
  if (!swiper || swiper.destroyed || index < 0) return null
  return swiper.slides[index]?.querySelector<HTMLElement>('.tab-item') ?? null
}

/** 从 CSS motion token 读取 Swiper 命令式位移时长 */
function readMotionDuration(token: string, fallback: number): number {
  if (typeof window === 'undefined') return fallback

  const raw = getComputedStyle(document.documentElement).getPropertyValue(token).trim()
  const value = Number.parseFloat(raw)
  if (!Number.isFinite(value)) return fallback
  return raw.endsWith('ms') ? value : value * 1000
}

/**
 * 只在激活标签越出视口时做“最近距离”位移，不把每次点击都强制居中。
 * 这样相邻标签不会从鼠标下逃走，长标签仍能完整进入可视区域。
 */
function revealActiveTab(): void {
  const swiper = swiperRef.value
  if (!swiper || swiper.destroyed) return

  swiper.update()

  const slide = swiper.slides[tabsStore.activeIndex]
  if (!slide) return

  const viewportRect = swiper.el.getBoundingClientRect()
  const slideRect = slide.getBoundingClientRect()
  let targetTranslate = swiper.translate

  if (slideRect.left < viewportRect.left) {
    targetTranslate += viewportRect.left - slideRect.left
  } else if (slideRect.right > viewportRect.right) {
    targetTranslate -= slideRect.right - viewportRect.right
  } else {
    return
  }

  const boundedTranslate = Math.min(
    swiper.minTranslate(),
    Math.max(swiper.maxTranslate(), targetTranslate)
  )
  const duration = readMotionDuration('--motion-indicator-duration', 240)
  swiper.translateTo(boundedTranslate, duration)
}

function handleSwiper(swiper: SwiperInstance): void {
  swiperRef.value = swiper
  void nextTick(revealActiveTab)
}

function handleSliderMove(): void {
  isDragging.value = true
}

function handleTouchEnd(): void {
  // click 紧跟在 pointerup 后触发，下一帧再解除才能可靠屏蔽拖拽后的误点击。
  window.requestAnimationFrame(() => {
    isDragging.value = false
  })
}

function navigateToTab(tab: TabItem): void {
  tabsStore.setActiveTab(tab.path)
  void router.push(getTabTarget(tab))
}

function navigateToPath(path: string): void {
  const tab = tabsStore.tabs.find((item) => item.path === path)
  if (tab) {
    navigateToTab(tab)
  }
}

function handleTabClick(tab: TabItem): void {
  const swiper = swiperRef.value
  if (isDragging.value || swiper?.allowClick === false) return

  const targetChanged =
    tab.path !== tabsStore.activeTab ||
    (tab.fullPath !== undefined && tab.fullPath !== router.currentRoute.value.fullPath)

  if (targetChanged) {
    navigateToTab(tab)
  }
}

function closeTabByPath(path: string): void {
  const nextPath = tabsStore.closeTab(path)
  if (nextPath) {
    navigateToPath(nextPath)
  }
}

function handleCloseTab(tab: TabItem, event: MouseEvent): void {
  event.stopPropagation()
  closeTabByPath(tab.path)
}

function handleCloseKeydown(event: KeyboardEvent): void {
  event.stopPropagation()
}

function focusTabAt(index: number): void {
  const total = tabsStore.tabs.length
  if (total === 0) return

  const clamped = Math.min(Math.max(index, 0), total - 1)
  focusIndex.value = clamped
  getTabElAt(clamped)?.focus()
}

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

function handleContextMenu(tab: TabItem, event: MouseEvent): void {
  event.preventDefault()
  contextMenuTab.value = tab
  contextMenuX.value = event.clientX
  contextMenuY.value = event.clientY
  showContextMenu.value = true
}

function handleContextMenuSelect(key: string): void {
  const tab = contextMenuTab.value
  if (!tab) return

  const { path } = tab
  switch (key) {
    case 'close':
      closeTabByPath(path)
      break
    case 'closeOther':
      tabsStore.closeOtherTabs(path)
      navigateToPath(path)
      break
    case 'closeRight': {
      const previousActivePath = tabsStore.activeTab
      tabsStore.closeRightTabs(path)
      if (previousActivePath !== tabsStore.activeTab) {
        navigateToPath(tabsStore.activeTab)
      }
      break
    }
    case 'closeAll':
      tabsStore.closeAllTabs()
      if (tabsStore.tabs[0]) {
        navigateToTab(tabsStore.tabs[0])
      }
      break
  }
  showContextMenu.value = false
}

function handleClickOutside(): void {
  showContextMenu.value = false
}

watch(
  () => [tabsStore.activeTab, tabsStore.tabs.length, locale.value],
  () => {
    focusIndex.value = Math.max(tabsStore.activeIndex, 0)
    void nextTick(revealActiveTab)
  },
  { flush: 'post' }
)

onMounted(() => {
  focusIndex.value = Math.max(tabsStore.activeIndex, 0)
  void nextTick(revealActiveTab)
})
</script>

<template>
  <div class="app-tab-bar">
    <SwiperComponent
      class="tab-swiper"
      :modules="swiperModules"
      :slides-per-view="'auto'"
      :free-mode="freeModeOptions"
      :mousewheel="mousewheelOptions"
      :a11y="swiperA11y"
      :grab-cursor="true"
      :simulate-touch="true"
      :threshold="4"
      :watch-overflow="true"
      :observer="true"
      :observe-parents="true"
      :prevent-clicks="true"
      :prevent-clicks-propagation="true"
      :touch-start-prevent-default="false"
      @swiper="handleSwiper"
      @slider-move="handleSliderMove"
      @touch-end="handleTouchEnd"
    >
      <SwiperSlide v-for="(tab, index) in tabsStore.tabs" :key="tab.path">
        <div
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
      </SwiperSlide>
    </SwiperComponent>

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
  overflow: hidden;
  background: var(--color-surface);
  border-bottom: 1px solid var(--color-border-subtle);
}

.tab-swiper {
  width: 100%;
  min-width: 0;
  height: 100%;
  margin: 0;
  user-select: none;

  // Swiper 的位移时长由 JS 写 inline style，这里只收敛缓动曲线到设计 token。
  :deep(.swiper-wrapper) {
    align-items: center;
    transition-timing-function: var(--motion-indicator-easing);
  }

  :deep(.swiper-slide) {
    display: flex;
    align-items: center;
    width: auto;
    height: 100%;
    margin-right: var(--spacing-1);
  }

  :deep(.swiper-slide:last-child) {
    margin-right: 0;
  }

  &.swiper-grab-cursor {
    cursor: grab;
  }

  &.swiper-grab-cursor:active {
    cursor: grabbing;
  }
}

.tab-item {
  position: relative;
  display: flex;
  align-items: center;
  gap: var(--spacing-1);
  height: calc(var(--layout-tabbar-height) - var(--spacing-2));
  padding: 0 var(--spacing-3);
  font-size: var(--text-sm);
  color: var(--color-text-secondary);
  white-space: nowrap;
  cursor: pointer;
  background: transparent;
  border-radius: var(--radius-md);

  @include ix.feedback-transition;
  @include ix.focus-ring-inset;
  @include ix.pressable(0.98, 0);

  &::after {
    position: absolute;
    right: var(--spacing-2);
    bottom: 0;
    left: var(--spacing-2);
    height: calc(var(--spacing-1) / 2);
    content: '';
    background: var(--color-primary);
    border-radius: var(--radius-full);
    box-shadow: 0 0 var(--spacing-2) color-mix(in srgb, var(--color-primary) 46%, transparent);
    opacity: 0;
    transform: scaleX(0.35);
    transform-origin: center;
    transition:
      opacity ix.$hover-motion,
      transform ix.$indicator-motion;
    pointer-events: none;
  }

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

  &.is-active:hover {
    background: var(--color-primary-subtle-hover);
  }

  &.is-active::after {
    opacity: 1;
    transform: scaleX(1);
  }

  &__title {
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
    opacity: 0;

    @include ix.feedback-transition;
    @include ix.focus-ring-inset(1px);

    &:hover {
      color: var(--color-danger);
      background: var(--color-danger-subtle);
    }
  }

  &:hover &__close,
  &:focus-within &__close,
  &.is-active &__close {
    opacity: 1;
  }
}

@media (hover: none) {
  .tab-item__close {
    opacity: 1;
  }
}

@media (prefers-reduced-motion: reduce) {
  .tab-item::after {
    transform: none;
  }
}
</style>
