<script setup lang="ts">
/**
 * 默认布局
 * 包含侧边栏、标签栏和顶栏的主布局
 * Requirements: 6.1
 */
import { computed, defineComponent, watch, type SlotsType, type VNode } from 'vue'
import { useRoute } from 'vue-router'
import { NLayout, NLayoutSider } from 'naive-ui'
import { useAppStore } from '@/stores/app'
import { useTabsStore } from '@/stores/tabs'
import AppSidebar from '@/components/layout/AppSidebar.vue'
import AppHeader from '@/components/layout/AppHeader.vue'
import AppTabBar from '@/components/layout/AppTabBar.vue'

const route = useRoute()
const appStore = useAppStore()
const tabsStore = useTabsStore()

const sidebarCollapsed = computed(() => appStore.sidebarCollapsed)

/**
 * 侧边栏宽度
 * NLayoutSider / NMenu 的宽度只能传数字（组件内部写成 inline style），读不了 CSS 变量，
 * 而布局几何的唯一来源必须是 token：此前展开宽度 260 / 折叠宽度 72 写死在这里，
 * AppMenu 又另外写了一个 64，折叠后菜单图标与侧边栏中线对不齐。
 * 这里把 token 读成数字后逐层下发，改 token 即同时改 CSS 与 JS 两侧。
 */
function readLayoutPx(token: string, fallback: number): number {
  const parsed = Number.parseFloat(
    getComputedStyle(document.documentElement).getPropertyValue(token)
  )
  return Number.isFinite(parsed) ? parsed : fallback
}

const SIDEBAR_WIDTH = readLayoutPx('--layout-sider-width', 260)
const SIDEBAR_COLLAPSED_WIDTH = readLayoutPx('--layout-sider-collapsed-width', 72)

/**
 * 页面缓存
 * 后端菜单一直在下发 keepAlive（permission.ts 会写进 route.meta），但全仓从来没有
 * <keep-alive>，于是每次切标签都要重新挂载 + 重新请求一遍列表。
 *
 * 难点在于 <keep-alive> 的 include/exclude 只按「组件名」匹配，而所有页面都是
 * views 下的 index.vue —— Vue 从文件名推断出的名字一律是 index，用它根本区分不出
 * 哪个路由该缓存（include/exclude 也不能做成动态的：它一变，KeepAlive 的
 * pruneCache 会把已有缓存整批清掉）。因此给需要缓存的页面套一层具名壳：
 *   - meta.keepAlive 为真：渲染 KeepAliveView 壳，名字命中 include，
 *     缓存条目按 vnode key（路由 path）区分；
 *   - 否则：直接渲染页面组件，名字不在 include 里，照常挂载/卸载。
 * :max 给缓存条数封顶，长时间使用也不会让内存无上限增长。
 */
const CACHED_VIEW_NAME = 'KeepAliveView'
const MAX_CACHED_VIEWS = 10

const KeepAliveView = defineComponent({
  name: CACHED_VIEW_NAME,
  slots: Object as SlotsType<{ default?: () => VNode[] }>,
  setup(_props, { slots }) {
    // 只透传单个根节点：<transition> 无法给 Fragment 根节点挂过渡类
    return () => slots.default?.()?.[0] ?? null
  },
})

/** 当前路由是否参与缓存 */
const keepCurrentView = computed(() => route.meta.keepAlive === true)

/** 监听路由变化，自动添加标签 */
watch(
  () => route.path,
  () => {
    if (route.path && route.meta) {
      tabsStore.addTab(route)
    }
  },
  { immediate: true }
)
</script>

<template>
  <NLayout class="default-layout" has-sider>
    <!-- 侧边栏 - 固定不滚动 -->
    <NLayoutSider
      collapse-mode="width"
      :collapsed="sidebarCollapsed"
      :collapsed-width="SIDEBAR_COLLAPSED_WIDTH"
      :width="SIDEBAR_WIDTH"
      :native-scrollbar="false"
      class="layout-sider"
      :class="{ 'is-collapsed': sidebarCollapsed }"
    >
      <AppSidebar :collapsed-width="SIDEBAR_COLLAPSED_WIDTH" />
    </NLayoutSider>

    <!-- 主内容区 -->
    <div class="layout-main">
      <!-- 顶栏 - 固定在顶部，不滚动 -->
      <header class="layout-header">
        <AppHeader />
      </header>

      <!-- 标签栏 - 横向可滑动，在 header 下方 -->
      <AppTabBar class="layout-tabs" />

      <!-- 内容区 - 只有这里滚动 -->
      <main class="layout-content">
        <div class="content-wrapper">
          <router-view v-slot="{ Component }">
            <!-- 过渡类由 styles/transitions/_page-transitions.scss 统一定义（token 化）；
                 不再用 mode="out-in"：那会把 200ms 离场 + 200ms 入场串成 400ms 的空档 -->
            <transition name="fade-slide">
              <keep-alive :include="CACHED_VIEW_NAME" :max="MAX_CACHED_VIEWS">
                <KeepAliveView v-if="keepCurrentView" :key="route.path">
                  <component :is="Component" />
                </KeepAliveView>
                <component :is="Component" v-else :key="route.path" />
              </keep-alive>
            </transition>
          </router-view>
        </div>
      </main>
    </div>
  </NLayout>
</template>

<style scoped lang="scss">
.default-layout {
  height: 100vh;
  background-color: var(--color-bg);
}

.layout-sider {
  position: sticky;
  top: 0;
  z-index: 100;
  flex-shrink: 0;
  height: 100vh;
  background: linear-gradient(
    180deg,
    var(--color-surface) 0%,
    color-mix(in srgb, var(--color-surface) 97%, var(--color-primary) 3%) 100%
  );
  border-right: 1px solid var(--color-border-subtle);
  box-shadow: var(--shadow-elev-1);

  // 不设 will-change: width —— width 不是可合成属性，提前提升图层换不来任何收益，
  // 却让「260px × 100vh 的渐变 + 阴影 + ::after」这一层常驻显存直到卸载。
  transition:
    width var(--duration-slow) var(--easing-ease-in-out),
    box-shadow var(--duration-slow) var(--easing-ease-in-out);

  &.is-collapsed {
    box-shadow: none;
  }

  // 侧边栏右侧装饰线
  &::after {
    position: absolute;
    top: 0;
    right: 0;
    width: 1px;
    height: 100%;
    content: '';
    background: linear-gradient(180deg, transparent 0%, var(--color-primary) 50%, transparent 100%);
    opacity: 0.15;
    transition: opacity var(--duration-slow) var(--easing-ease-in-out);
  }

  &.is-collapsed::after {
    opacity: 0;
  }
}

.layout-main {
  display: flex;
  flex: 1;
  flex-direction: column;
  min-width: 0;
  height: 100vh;
  overflow: hidden;
}

.layout-header {
  z-index: 10;
  flex-shrink: 0;
  height: var(--layout-header-height);
  background-color: var(--color-surface);
  border-bottom: 1px solid var(--color-border-subtle);
}

.layout-content {
  flex: 1;
  min-height: 0;
  overflow: hidden auto;
  background-color: var(--color-bg);

  // 把侧边栏宽度动画挡在内容区之外：没有 contain 时，sider 每一帧的宽度变化都会
  // 让整份文档重新布局一遍（列表页动辄上千个表格单元格全在其中）。
  contain: layout paint;

  // Firefox
  scrollbar-width: thin;
  scrollbar-color: var(--color-scrollbar-thumb) transparent;

  // 滚动条样式
  &::-webkit-scrollbar {
    width: 6px;
  }

  &::-webkit-scrollbar-track {
    background: transparent;
  }

  &::-webkit-scrollbar-thumb {
    background: var(--color-scrollbar-thumb);
    border-radius: var(--radius-full);

    &:hover {
      background: var(--color-scrollbar-thumb-hover);
    }
  }
}

.content-wrapper {
  display: grid;

  // 单元格网格：所有页面根节点都落在同一个格子里（见下方 grid-area），
  // 路由过渡期间新旧两页完全重叠 —— 既不需要 out-in 串行等待，
  // 也不会出现「两页并排把内容区撑高一倍」的跳动。
  // 两个方向都用 minmax(0, 1fr)：格子不被超宽表格的 min-content 撑破，
  // 表格自己横向滚动。
  grid-template-rows: minmax(0, 1fr);
  grid-template-columns: minmax(0, 1fr);
  max-width: var(--layout-content-max);
  height: 100%;
  padding: var(--spacing-page-y) var(--spacing-page-x);
  margin-inline: auto;
}

// 页面根节点是 <router-view> 渲染出的子组件根元素，用 :deep 命中，
// 不依赖 scopeId 向子组件根节点透传这一实现细节。
.content-wrapper > :deep(*) {
  grid-area: 1 / 1;
  min-width: 0;
}

// 重叠期间离场页不再拦截点击
.content-wrapper > :deep(.fade-slide-leave-active) {
  pointer-events: none;
}
</style>
