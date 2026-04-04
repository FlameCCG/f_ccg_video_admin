<script setup lang="ts">
/**
 * 标签栏组件
 * 横向可滑动的标签页，类似浏览器标签
 */
import { ref, watch, nextTick } from 'vue'
import { useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { NDropdown } from 'naive-ui'
import { Swiper, SwiperSlide } from 'swiper/vue'
import { FreeMode, Mousewheel } from 'swiper/modules'
import type { Swiper as SwiperType } from 'swiper'
// @ts-expect-error - Swiper CSS modules don't have type declarations
import 'swiper/css'
// @ts-expect-error - Swiper CSS modules don't have type declarations
import 'swiper/css/free-mode'
import { useTabsStore, type TabItem } from '@/stores/tabs'
import type { LocaleType } from '@/locales'

const router = useRouter()
const { locale } = useI18n()
const tabsStore = useTabsStore()

const swiperRef = ref<SwiperType | null>(null)
const showContextMenu = ref(false)
const contextMenuX = ref(0)
const contextMenuY = ref(0)
const contextMenuTab = ref<TabItem | null>(null)

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

/** 点击标签 */
function handleTabClick(tab: TabItem): void {
  if (tab.path !== tabsStore.activeTab) {
    tabsStore.setActiveTab(tab.path)
    void router.push(tab.path)
  }
}

/** 关闭标签 */
function handleCloseTab(tab: TabItem, event: MouseEvent): void {
  event.stopPropagation()
  const nextPath = tabsStore.closeTab(tab.path)
  if (nextPath) {
    void router.push(nextPath)
  }
}

/** 右键菜单选项 */
const contextMenuOptions = [
  { label: '关闭', key: 'close' },
  { label: '关闭其他', key: 'closeOther' },
  { label: '关闭右侧', key: 'closeRight' },
  { label: '关闭所有', key: 'closeAll' },
]

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
    case 'close': {
      const nextPath = tabsStore.closeTab(path)
      if (nextPath) void router.push(nextPath)
      break
    }
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

/** Swiper 初始化 */
function onSwiperInit(swiper: SwiperType): void {
  swiperRef.value = swiper
}

/** 滑动到激活的标签 */
function slideToActive(): void {
  if (swiperRef.value && tabsStore.activeIndex >= 0) {
    swiperRef.value.slideTo(tabsStore.activeIndex)
  }
}

/** 监听激活标签变化，自动滑动到可见位置 */
watch(
  () => tabsStore.activeTab,
  () => {
    void nextTick(() => {
      slideToActive()
    })
  }
)
</script>

<template>
  <div class="app-tab-bar">
    <Swiper
      :modules="[FreeMode, Mousewheel]"
      :slides-per-view="'auto'"
      :space-between="0"
      :free-mode="true"
      :mousewheel="{ forceToAxis: true }"
      class="tab-swiper"
      @swiper="onSwiperInit"
    >
      <SwiperSlide v-for="tab in tabsStore.tabs" :key="tab.path" class="tab-slide">
        <div
          class="tab-item"
          :class="{ 'is-active': tab.path === tabsStore.activeTab }"
          @click="handleTabClick(tab)"
          @contextmenu="handleContextMenu(tab, $event)"
        >
          <span class="tab-item__title">{{ getTabTitle(tab) }}</span>
          <button v-if="!tab.affix" class="tab-item__close" @click="handleCloseTab(tab, $event)">
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
            >
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>
      </SwiperSlide>
    </Swiper>

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
.app-tab-bar {
  height: 36px;
  background: var(--color-surface);
  border-bottom: 1px solid var(--color-border-light);
  display: flex;
  align-items: center;
  padding: 0 8px;
}

.tab-swiper {
  width: 100%;
  height: 100%;

  :deep(.swiper-wrapper) {
    align-items: center;
  }
}

.tab-slide {
  width: auto !important;
  flex-shrink: 0;
}

.tab-item {
  display: flex;
  align-items: center;
  gap: 6px;
  height: 28px;
  padding: 0 12px;
  margin: 0 2px;
  border-radius: var(--radius-md);
  cursor: pointer;
  font-size: 13px;
  color: var(--color-text-secondary);
  background: transparent;
  transition:
    background 150ms ease,
    color 150ms ease;
  white-space: nowrap;

  &:hover {
    background: color-mix(in srgb, var(--color-text) 6%, transparent);
    color: var(--color-text);
  }

  &.is-active {
    background: color-mix(in srgb, var(--color-primary) 12%, transparent);
    color: var(--color-primary);
    font-weight: 500;
  }

  &__title {
    max-width: 120px;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  &__close {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 16px;
    height: 16px;
    padding: 0;
    border: none;
    background: transparent;
    border-radius: var(--radius-sm);
    color: var(--color-text-muted);
    cursor: pointer;
    opacity: 0;
    transition:
      opacity 150ms ease,
      background 150ms ease,
      color 150ms ease;

    .tab-item:hover &,
    .tab-item.is-active & {
      opacity: 1;
    }

    &:hover {
      background: color-mix(in srgb, var(--color-danger) 15%, transparent);
      color: var(--color-danger);
    }
  }
}

@media (prefers-reduced-motion: reduce) {
  .tab-item,
  .tab-item__close {
    transition: none;
  }
}
</style>
