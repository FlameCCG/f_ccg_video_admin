<script setup lang="ts">
/**
 * 角色继承树可视化组件（可拖拽、可缩放）
 * Role Inheritance Tree Visualization with Vue Flow
 * Requirements: 16.2 - 角色继承管理
 */
import { computed, watch, nextTick } from 'vue'
import { useI18n } from 'vue-i18n'
import { VueFlow, useVueFlow, MarkerType, Position } from '@vue-flow/core'
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
  /** 加载/请求错误信息（有值时优先展示错误态） */
  errorMessage?: string | null
}

const props = withDefaults(defineProps<Props>(), {
  loading: false,
  highlightRoleId: null,
  errorMessage: null,
})

const { t } = useI18n()
const { fitView } = useVueFlow({ id: 'role-inherit-tree' })

/** 是否有数据 */
const hasData = computed(() => props.data && props.data.length > 0)

/** 将树结构转换为 Vue Flow 节点和边 */
function convertTreeToFlow(
  treeData: RoleInheritTreeNode[],
  highlightId: number | null
): { nodes: Node[]; edges: Edge[] } {
  const nodes: Node[] = []
  const edges: Edge[] = []

  function processNode(
    node: RoleInheritTreeNode,
    level: number,
    index: number,
    parentId?: string
  ): void {
    const nodeId = `node-${node.id}`
    const isHighlighted = node.id === highlightId

    const x = level * 260
    const y = index * 130

    nodes.push({
      id: nodeId,
      type: 'default',
      position: { x, y },
      // 边方向为「子 → 父」（继承自），故出边在左、入边在右
      sourcePosition: Position.Left,
      targetPosition: Position.Right,
      data: {
        label: node.name,
        desc: node.desc,
        roleId: node.id,
        isHighlighted,
      },
      class: isHighlighted ? 'role-node role-node--highlighted' : 'role-node',
    })

    // 子 → 父：表示「继承自 / inherits from」
    // 后端树：parent.children 含 child（child 在 Casbin g 中继承 parent）
    // 箭头指向被继承角色（父），流动方向 = 谁去继承谁
    if (parentId) {
      edges.push({
        id: `edge-${nodeId}-${parentId}`,
        source: nodeId,
        target: parentId,
        type: 'smoothstep',
        animated: true,
        style: {
          stroke: 'var(--color-primary)',
          strokeWidth: isHighlighted ? 2.5 : 2,
          opacity: isHighlighted ? 1 : 0.75,
        },
        markerEnd: {
          type: MarkerType.ArrowClosed,
          color: 'var(--color-primary)',
          width: 16,
          height: 16,
        },
      })
    }

    if (node.children && node.children.length > 0) {
      node.children.forEach((child, childIndex) => {
        processNode(child, level + 1, index + childIndex, nodeId)
      })
    }
  }

  let currentIndex = 0
  treeData.forEach((rootNode) => {
    processNode(rootNode, 0, currentIndex)
    currentIndex += countDescendants(rootNode)
  })

  return { nodes, edges }
}

function countDescendants(node: RoleInheritTreeNode): number {
  let count = 1
  if (node.children) {
    node.children.forEach((child) => {
      count += countDescendants(child)
    })
  }
  return count
}

const totalNodes = computed(() => {
  let count = 0
  props.data.forEach((node) => {
    count += countDescendants(node)
  })
  return count
})

const flowData = computed(() => convertTreeToFlow(props.data, props.highlightRoleId ?? null))

function scheduleFitView(): void {
  void nextTick(() => {
    setTimeout(() => {
      void fitView({ padding: 0.2, duration: 200 })
    }, 80)
  })
}

watch(
  () => [props.data, props.highlightRoleId] as const,
  () => {
    if (hasData.value) scheduleFitView()
  },
  { deep: true }
)
</script>

<template>
  <div class="role-inherit-tree">
    <n-spin :show="loading">
      <!-- 请求失败：明确展示原因（如无权限），不要伪装成「暂无继承关系」 -->
      <n-empty
        v-if="errorMessage"
        :description="errorMessage"
        class="role-inherit-tree__empty role-inherit-tree__empty--error"
      />

      <template v-else-if="hasData">
        <div class="role-inherit-tree__stats">
          <n-tag size="small" :bordered="false">
            {{ t('rbac.role.inheritTree.totalRoles', { count: totalNodes }) }}
          </n-tag>
          <span class="role-inherit-tree__hint">
            {{ t('rbac.role.inheritTree.dragHint') }}
          </span>
        </div>

        <div class="role-inherit-tree__canvas">
          <VueFlow
            id="role-inherit-tree"
            :nodes="flowData.nodes"
            :edges="flowData.edges"
            :default-viewport="{ x: 40, y: 40, zoom: 0.95 }"
            :min-zoom="0.2"
            :max-zoom="2"
            :nodes-draggable="true"
            :nodes-connectable="false"
            :elements-selectable="false"
            fit-view-on-init
            @nodes-initialized="scheduleFitView"
          >
            <Background />
            <Controls />

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

    &--error {
      :deep(.n-empty__description) {
        color: var(--color-danger);
        max-width: 420px;
        text-align: center;
      }
    }
  }
}

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
  transition:
    border-color var(--motion-fast) ease,
    box-shadow var(--motion-fast) ease;

  &:hover {
    border-color: var(--color-primary);
    box-shadow: var(--shadow-elev-2);
  }

  &--highlighted {
    border-color: var(--color-primary);
    background: color-mix(in srgb, var(--color-surface) 88%, var(--color-primary) 12%);
    box-shadow: 0 0 0 3px color-mix(in srgb, var(--color-primary) 22%, transparent);
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

// 去掉默认白边，保留自定义节点外观
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

/**
 * 关键：连接锚点不能 display:none！
 * Vue Flow 需要 handle 参与边路径计算，display:none 会导致继承关系虚线完全不渲染。
 * 只读树：视觉隐藏 + 禁用交互即可。
 */
.vue-flow__handle {
  width: 8px !important;
  height: 8px !important;
  min-width: 8px !important;
  min-height: 8px !important;
  opacity: 0 !important;
  border: none !important;
  background: transparent !important;
  pointer-events: none !important;
}

// 流动虚线（Vue Flow animated edge 默认 dash 动画）
.vue-flow__edge-path {
  stroke: var(--color-primary);
  stroke-width: 2;
  fill: none;
}

.vue-flow__edge.animated .vue-flow__edge-path {
  stroke: var(--color-primary) !important;
  stroke-dasharray: 6 4 !important;
  animation: role-inherit-edge-flow 0.8s linear infinite;
}

@keyframes role-inherit-edge-flow {
  to {
    stroke-dashoffset: -20;
  }
}

.vue-flow__arrowhead {
  fill: var(--color-primary);
}

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

.vue-flow__background {
  background-color: var(--color-bg);
  --vf-pattern-color: var(--color-border);

  opacity: 0.45;
}
</style>
