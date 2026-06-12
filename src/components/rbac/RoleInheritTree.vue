<script setup lang="ts">
/**
 * 角色继承树可视化组件（可拖拽、可缩放）
 * Role Inheritance Tree Visualization with Vue Flow
 * Requirements: 16.2 - 角色继承管理
 */
import { computed, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { VueFlow, useVueFlow } from '@vue-flow/core'
import { Background } from '@vue-flow/background'
import { Controls } from '@vue-flow/controls'
import { NEmpty, NSpin, NTag } from 'naive-ui'
import type { Node, Edge } from '@vue-flow/core'
import type { RoleInheritTreeNode } from '@/api/types'

interface Props {
  /** 树数据 */
  data: RoleInheritTreeNode[]
  /** 是否加载中 */
  loading?: boolean
  /** 高亮的角色 ID */
  highlightRoleId?: number | null
}

const props = withDefaults(defineProps<Props>(), {
  loading: false,
  highlightRoleId: null,
})

const { t } = useI18n()
const { fitView } = useVueFlow()

/** 是否有数据 */
const hasData = computed(() => props.data && props.data.length > 0)

/** 将树结构转换为 Vue Flow 节点和边 */
function convertTreeToFlow(
  treeData: RoleInheritTreeNode[],
  highlightId: number | null
): { nodes: Node[]; edges: Edge[] } {
  const nodes: Node[] = []
  const edges: Edge[] = []

  // 递归处理节点
  function processNode(
    node: RoleInheritTreeNode,
    level: number,
    index: number,
    parentId?: string
  ): void {
    const nodeId = `node-${node.id}`
    const isHighlighted = node.id === highlightId

    // 计算节点位置（水平布局）
    const x = level * 250
    const y = index * 120

    nodes.push({
      id: nodeId,
      type: 'default',
      position: { x, y },
      data: {
        label: node.name,
        desc: node.desc,
        roleId: node.id,
        isHighlighted,
      },
      class: isHighlighted ? 'role-node role-node--highlighted' : 'role-node',
    })

    // 添加边（从父节点到子节点）
    if (parentId) {
      edges.push({
        id: `edge-${parentId}-${nodeId}`,
        source: parentId,
        target: nodeId,
        type: 'smoothstep',
        animated: isHighlighted,
        style: { stroke: isHighlighted ? 'var(--color-primary)' : 'var(--color-border)' },
      })
    }

    // 处理子节点
    if (node.children && node.children.length > 0) {
      node.children.forEach((child, childIndex) => {
        processNode(child, level + 1, index + childIndex, nodeId)
      })
    }
  }

  // 处理所有根节点
  let currentIndex = 0
  treeData.forEach((rootNode) => {
    processNode(rootNode, 0, currentIndex)
    currentIndex += countDescendants(rootNode)
  })

  return { nodes, edges }
}

/** 计算节点及其后代的数量 */
function countDescendants(node: RoleInheritTreeNode): number {
  let count = 1
  if (node.children) {
    node.children.forEach((child) => {
      count += countDescendants(child)
    })
  }
  return count
}

/** 计算节点总数 */
const totalNodes = computed(() => {
  let count = 0
  props.data.forEach((node) => {
    count += countDescendants(node)
  })
  return count
})

/** 转换后的流程图数据 */
const flowData = computed(() => convertTreeToFlow(props.data, props.highlightRoleId ?? null))

/** 监听数据变化，自动适应视图 */
watch(
  () => props.data,
  () => {
    setTimeout(() => {
      void fitView({ padding: 0.2 })
    }, 100)
  },
  { deep: true }
)
</script>

<template>
  <div class="role-inherit-tree">
    <n-spin :show="loading">
      <template v-if="hasData">
        <!-- 统计信息 -->
        <div class="role-inherit-tree__stats">
          <n-tag size="small" :bordered="false">
            {{ t('rbac.role.inheritTree.totalRoles', { count: totalNodes }) }}
          </n-tag>
          <span class="role-inherit-tree__hint">
            {{ t('rbac.role.inheritTree.dragHint') }}
          </span>
        </div>

        <!-- Vue Flow 画布 -->
        <div class="role-inherit-tree__canvas">
          <VueFlow
            :nodes="flowData.nodes"
            :edges="flowData.edges"
            :default-viewport="{ x: 50, y: 50, zoom: 1 }"
            :min-zoom="0.2"
            :max-zoom="2"
            fit-view-on-init
          >
            <Background />
            <Controls />

            <!-- 自定义节点模板 -->
            <template #node-default="{ data: nodeData }">
              <div
                class="role-flow-node"
                :class="{ 'role-flow-node--highlighted': nodeData.isHighlighted }"
              >
                <div class="role-flow-node__name">{{ nodeData.label }}</div>
                <div v-if="nodeData.desc" class="role-flow-node__desc">{{ nodeData.desc }}</div>
              </div>
            </template>
          </VueFlow>
        </div>
      </template>

      <n-empty
        v-else
        :description="t('rbac.role.inheritTree.empty')"
        class="role-inherit-tree__empty"
      />
    </n-spin>
  </div>
</template>

<style lang="scss">
@import '@vue-flow/core/dist/style.css';
@import '@vue-flow/core/dist/theme-default.css';
@import '@vue-flow/controls/dist/style.css';

.role-inherit-tree {
  min-height: 400px;

  &__stats {
    display: flex;
    align-items: center;
    gap: var(--spacing-4);
    margin-bottom: var(--spacing-3);
  }

  &__hint {
    font-size: var(--text-xs);
    color: var(--color-text-muted);
  }

  &__canvas {
    height: 500px;
    border: 1px solid var(--color-border);
    border-radius: var(--radius-md);
    background: var(--color-bg);
  }

  &__empty {
    padding: var(--spacing-8) 0;
  }
}

// Vue Flow 节点样式
.role-flow-node {
  display: flex;
  flex-direction: column;
  gap: 4px;
  min-width: 120px;
  max-width: 180px;
  padding: 12px 16px;
  background: var(--color-surface);
  border: 2px solid var(--color-border);
  border-radius: var(--radius-md);
  cursor: grab;
  transition: all var(--motion-fast) ease;

  &:hover {
    border-color: var(--color-primary);
    box-shadow: var(--shadow-elev-2);
  }

  &--highlighted {
    border-color: var(--color-primary);
    background: var(--color-primary-light);
    box-shadow: 0 0 0 3px var(--color-primary-light);
  }

  &__name {
    font-size: var(--text-sm);
    font-weight: 600;
    color: var(--color-text);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  &__desc {
    font-size: var(--text-xs);
    color: var(--color-text-secondary);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
}

// Vue Flow 节点包装器重写，消除默认的主题白边与白底，使其适配自定义主题
.vue-flow__node-default,
.vue-flow__node-input,
.vue-flow__node-output,
.vue-flow__node {
  background: transparent !important;
  border: none !important;
  padding: 0 !important;
  box-shadow: none !important;
  color: inherit !important;
}

// 隐藏默认的连接锚点（因为是只读继承树，无需手动拉线）
.vue-flow__handle {
  display: none !important;
}

// Vue Flow 控件样式覆盖
.vue-flow__controls {
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  box-shadow: var(--shadow-elev-1);
}

.vue-flow__controls-button {
  background: var(--color-surface);
  border-bottom: 1px solid var(--color-border);
  color: var(--color-text);

  &:hover {
    background: var(--color-surface-hover);
  }

  svg {
    fill: currentcolor;
  }
}

// Vue Flow 边样式
.vue-flow__edge-path {
  stroke: var(--color-border);
  stroke-width: 2;
  transition: stroke var(--motion-fast) ease;
}

// Vue Flow 边的动画与高亮样式
.vue-flow__edge.selected .vue-flow__edge-path,
.vue-flow__edge.animated .vue-flow__edge-path {
  stroke: var(--color-primary) !important;
}

// Vue Flow 背景样式
.vue-flow__background {
  background-color: var(--color-bg);
  --vf-pattern-color: var(--color-border);

  opacity: 0.4;
}
</style>
