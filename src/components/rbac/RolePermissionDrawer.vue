<script setup lang="ts">
/**
 * 角色权限分配抽屉
 * - 通配符权限：下拉选择系统已有通配符 + 支持手动输入
 * - 具体 API：勾选直接拥有 / 继承 / 通配符覆盖的权限
 * - 取消勾选通配符/继承覆盖的权限时：解除全部继承并改为仅保留勾选的具体 API
 */
import { ref, computed, watch, h } from 'vue'
import { useI18n } from 'vue-i18n'
import { useQuery, useMutation, useQueryClient } from '@tanstack/vue-query'
import {
  NDrawer,
  NDrawerContent,
  NSpace,
  NButton,
  NDataTable,
  NTag,
  NSelect,
  NInput,
  NAutoComplete,
  NSpin,
  NEmpty,
  NAlert,
  NTabs,
  NTabPane,
  NCard,
  NIcon,
  NPopconfirm,
  NTooltip,
  useMessage,
  useDialog,
} from 'naive-ui'
import type { DataTableColumns, SelectOption, DataTableRowKey, AutoCompleteOption } from 'naive-ui'
import {
  getResources,
  getRoles,
  getRolePermissions,
  getRoleInherits,
  getWildcardPermissions,
  removeRoleInherit,
  replaceRolePermissions,
} from '@/api/rbac'
import type { Role, Resource, Permission, RolePermissionsDetail } from '@/api/types'

interface Props {
  visible: boolean
  role?: Role | null
}

/** 权限来源层级 */
type PermissionSourceKind = 'direct' | 'inherit_direct' | 'inherit_indirect'

/** 通配符权限项 */
interface WildcardPermission {
  id: string
  resource: string
  action: string
  /** 来源层级 */
  sourceKind: PermissionSourceKind
  /** 直接持有该策略的角色名 */
  ownerRoleName?: string
  /** 解除继承时要断开的直接父角色 ID（仅直接继承可点） */
  unlinkParentRoleId?: number
  /** 解除继承时要断开的直接父角色名 */
  unlinkParentRoleName?: string
  /**
   * 仅表示继承关系、无实际通配符策略的占位行
   * （父角色未配置任何通配符时仍需展示，便于解除继承）
   */
  emptyPolicy?: boolean
  isNew?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  role: null,
})

const emit = defineEmits<{
  'update:visible': [value: boolean]
}>()

const { t } = useI18n()
const message = useMessage()
const dialog = useDialog()
const queryClient = useQueryClient()

const activeTab = ref<'wildcard' | 'specific'>('wildcard')
const searchKeyword = ref('')
const selectedTag = ref<string | null>(null)

/** 当前勾选的具体 API（含展示用的继承/通配符覆盖项） */
const checkedPermissions = ref<Set<string>>(new Set())

/** 打开时后端返回的 covered keys（继承 + 通配符覆盖） */
const initialCoveredKeys = ref<Set<string>>(new Set())

/** 打开时的直接具体权限（非通配符） */
const initialDirectSpecificKeys = ref<Set<string>>(new Set())

/** 直接绑定的通配符 */
const wildcardPermissions = ref<WildcardPermission[]>([])

/** 继承来的通配符（只读） */
const inheritedWildcards = ref<WildcardPermission[]>([])

/** 是否需要解除继承（用户改动了被覆盖的具体权限） */
const needBreakInheritance = ref(false)

const newWildcard = ref({ resource: '', action: '*' })
const unlinkingInherit = ref(false)

const emptyPermissionsDetail = (): RolePermissionsDetail => ({
  direct: [],
  effective: [],
  covered: [],
})

const { data: allResources, isLoading: resourcesLoading } = useQuery({
  queryKey: ['allResources'],
  queryFn: getResources,
  staleTime: 60 * 1000,
})

const { data: systemWildcards, isLoading: wildcardsLoading } = useQuery({
  queryKey: ['systemWildcards'],
  queryFn: getWildcardPermissions,
  staleTime: 60 * 1000,
  enabled: computed(() => props.visible),
})

const { data: allRoles } = useQuery({
  queryKey: ['roles'],
  queryFn: getRoles,
  staleTime: 60 * 1000,
  enabled: computed(() => props.visible),
})

const { data: roleInheritsDetail, refetch: refetchRoleParents } = useQuery({
  queryKey: ['roleInherits', computed(() => props.role?.id)],
  queryFn: () =>
    props.role
      ? getRoleInherits({ roleId: props.role.id })
      : Promise.resolve({ direct: [] as string[], indirect: [] }),
  enabled: computed(() => !!props.role && props.visible),
  staleTime: 30 * 1000,
})

const {
  data: rolePermissions,
  isLoading: permissionsLoading,
  refetch: refetchPermissions,
} = useQuery({
  queryKey: ['rolePermissions', computed(() => props.role?.name)],
  queryFn: () =>
    props.role
      ? getRolePermissions({ name: props.role.name })
      : Promise.resolve(emptyPermissionsDetail()),
  enabled: computed(() => !!props.role && props.visible),
  staleTime: 30 * 1000,
})

const replaceMutation = useMutation({
  mutationFn: replaceRolePermissions,
  onSuccess: () => {
    message.success(t('rbac.permission.updateSuccess'))
    void queryClient.invalidateQueries({ queryKey: ['rolePermissions'] })
    void queryClient.invalidateQueries({ queryKey: ['systemWildcards'] })
    handleClose()
  },
  // 业务错误（如「您已有此权限」）由 request 拦截器统一弹出
})

const isLoading = computed(
  () =>
    resourcesLoading.value ||
    permissionsLoading.value ||
    wildcardsLoading.value ||
    replaceMutation.isPending.value
)

/** path -> 推荐 method（用于选中建议时同步方法下拉） */
const wildcardPathActionHint = computed(() => {
  const map = new Map<string, string>()
  const remember = (action: string, resource: string) => {
    if (!resource || map.has(resource)) return
    map.set(resource, action || '*')
  }
  systemWildcards.value?.forEach((w) => remember(w.action || '*', w.resource))
  wildcardPermissions.value.forEach((w) => {
    if (!w.emptyPolicy) remember(w.action || '*', w.resource)
  })
  inheritedWildcards.value.forEach((w) => {
    if (!w.emptyPolicy) remember(w.action || '*', w.resource)
  })
  return map
})

/**
 * 全部建议（未过滤）。label/value 都用路径，保证选中后写入输入框的是可编辑路径。
 * 下拉展示用 render-label 补上 method 前缀。
 */
const wildcardAutoOptionsAll = computed<AutoCompleteOption[]>(() => {
  const seen = new Set<string>()
  const options: AutoCompleteOption[] = []

  const push = (resource: string) => {
    if (!resource || seen.has(resource)) return
    seen.add(resource)
    options.push({
      label: resource,
      value: resource,
    })
  }

  systemWildcards.value?.forEach((w) => push(w.resource))
  wildcardPermissions.value.forEach((w) => {
    if (!w.emptyPolicy) push(w.resource)
  })
  inheritedWildcards.value.forEach((w) => {
    if (!w.emptyPolicy) push(w.resource)
  })

  return options.sort((a, b) => String(a.value).localeCompare(String(b.value)))
})

/** 按当前输入过滤；空字符串时返回全部，便于「点中即出下拉」 */
const wildcardAutoOptions = computed<AutoCompleteOption[]>(() => {
  const keyword = (newWildcard.value.resource || '').trim().toLowerCase()
  const all = wildcardAutoOptionsAll.value
  if (!keyword) return all
  return all.filter((opt) => {
    const path = String(opt.value ?? '').toLowerCase()
    const action = (wildcardPathActionHint.value.get(String(opt.value ?? '')) || '*').toLowerCase()
    return (
      path.includes(keyword) || action.includes(keyword) || `${action}  ${path}`.includes(keyword)
    )
  })
})

/** 下拉项展示：方法 + 路径 */
function renderWildcardOptionLabel(option: SelectOption | AutoCompleteOption): string {
  const path = String((option as AutoCompleteOption).value ?? option.label ?? '')
  const action = wildcardPathActionHint.value.get(path) || '*'
  return `${action}  ${path}`
}

/**
 * 空内容时也允许弹出菜单（组件默认 getShow = !!value，空串不展示）。
 * 实际是否展开仍由组件内部「是否聚焦」控制，不会在失焦时常驻。
 */
function getWildcardAutoShow(_inputValue: string): boolean {
  return wildcardAutoOptionsAll.value.length > 0
}

/**
 * 路径输入始终是可编辑字符串。
 * 若精确匹配某条系统通配符路径，则同步方法下拉。
 */
function handleWildcardPathUpdate(value: string | null): void {
  const raw = value ?? ''
  newWildcard.value.resource = raw

  const normalized = raw.trim()
  if (!normalized) return
  const hint = wildcardPathActionHint.value.get(normalized)
  if (hint) {
    newWildcard.value.action = hint
  }
}

const tagOptions = computed<SelectOption[]>(() => {
  const tags = new Set<string>()
  allResources.value?.forEach((r) => {
    r.tags?.forEach((tag) => tags.add(tag))
  })
  return Array.from(tags).map((tag) => ({ label: tag, value: tag }))
})

const groupedResources = computed(() => {
  const resources = allResources.value ?? []
  const groups = new Map<string, Resource[]>()

  resources.forEach((r) => {
    const tag = r.tags?.[0] || t('rbac.api.uncategorized')
    if (!groups.has(tag)) {
      groups.set(tag, [])
    }
    groups.get(tag)!.push(r)
  })

  return groups
})

const filteredResources = computed(() => {
  let list = allResources.value ?? []

  if (searchKeyword.value) {
    const keyword = searchKeyword.value.toLowerCase()
    list = list.filter(
      (r) => r.path.toLowerCase().includes(keyword) || r.summary?.toLowerCase().includes(keyword)
    )
  }

  if (selectedTag.value) {
    list = list.filter((r) => r.tags?.includes(selectedTag.value!))
  }

  return list
})

function getPermissionKey(resource: string, action: string): string {
  return `${action.toUpperCase()}:${resource}`
}

function parsePermissionKey(key: string): Permission {
  const idx = key.indexOf(':')
  if (idx <= 0) {
    return { action: '', resource: key }
  }
  return {
    action: key.slice(0, idx),
    resource: key.slice(idx + 1),
  }
}

function isWildcardPermission(resource: string, action: string): boolean {
  return resource.includes('*') || action === '*'
}

/** 路径匹配：pattern 是否覆盖 target */
function pathCovers(pattern: string, target: string): boolean {
  if (pattern === target) return true
  if (pattern.endsWith('/**')) {
    const prefix = pattern.slice(0, -3)
    // /v1/admin/** 覆盖 /v1/admin 与 /v1/admin/...，不覆盖 /v1/adminX
    return target === prefix || target.startsWith(prefix + '/')
  }
  if (pattern.includes('*')) {
    const escaped = pattern.replace(/[.+?^${}()|[\]\\]/g, '\\$&')
    const regex = new RegExp('^' + escaped.replace(/\*\*/g, '.*').replace(/\*/g, '[^/]+') + '$')
    return regex.test(target)
  }
  return false
}

function actionCovers(existing: string, target: string): boolean {
  return existing === '*' || existing.toUpperCase() === target.toUpperCase()
}

function permissionCovers(
  existRes: string,
  existAct: string,
  newRes: string,
  newAct: string
): boolean {
  return pathCovers(existRes, newRes) && actionCovers(existAct, newAct)
}

/** 当前直接通配符 +（未 break 时）继承通配符，用于前端判重 */
function getEffectiveWildcardPolicies(): Permission[] {
  const list: Permission[] = []
  wildcardPermissions.value.forEach((w) => {
    if (w.emptyPolicy || !w.resource) return
    list.push({ resource: w.resource, action: w.action })
  })
  if (!needBreakInheritance.value) {
    inheritedWildcards.value.forEach((w) => {
      if (w.emptyPolicy || !w.resource) return
      list.push({ resource: w.resource, action: w.action })
    })
  }
  return list
}

/** 判断某具体 API 是否被当前有效通配符覆盖 */
function isCoveredByWildcards(key: string): boolean {
  const { resource, action } = parsePermissionKey(key)
  return getEffectiveWildcardPolicies().some((p) =>
    permissionCovers(p.resource, p.action, resource, action)
  )
}

function getMethodType(method: string): 'success' | 'info' | 'warning' | 'error' | 'default' {
  if (method === '*') return 'default'
  switch (method.toUpperCase()) {
    case 'GET':
      return 'success'
    case 'POST':
      return 'info'
    case 'PUT':
      return 'warning'
    case 'DELETE':
      return 'error'
    default:
      return 'default'
  }
}

function sourceKindLabel(kind: PermissionSourceKind): string {
  switch (kind) {
    case 'inherit_direct':
      return t('rbac.permission.sourceInheritDirect')
    case 'inherit_indirect':
      return t('rbac.permission.sourceInheritIndirect')
    default:
      return t('rbac.permission.sourceDirect')
  }
}

function sourceKindTagType(kind: PermissionSourceKind): 'success' | 'warning' | 'info' | 'default' {
  switch (kind) {
    case 'inherit_direct':
      return 'info'
    case 'inherit_indirect':
      return 'warning'
    default:
      return 'success'
  }
}

const wildcardColumns = computed<DataTableColumns<WildcardPermission>>(() => [
  {
    title: t('rbac.api.method'),
    key: 'action',
    width: 88,
    render: (row) =>
      row.emptyPolicy
        ? h('span', { class: 'empty-policy-hint' }, '—')
        : h(
            NTag,
            { type: getMethodType(row.action), size: 'small', round: true },
            () => row.action || '*'
          ),
  },
  {
    title: t('rbac.api.path'),
    key: 'resource',
    minWidth: 180,
    render: (row) =>
      row.emptyPolicy
        ? h('span', { class: 'empty-policy-hint' }, t('rbac.permission.emptyInheritPolicy'))
        : h('code', { class: 'api-path' }, row.resource),
  },
  {
    title: t('rbac.permission.roleName'),
    key: 'ownerRoleName',
    width: 110,
    ellipsis: { tooltip: true },
    render: (row) =>
      h('span', { class: 'role-name' }, row.ownerRoleName || props.role?.name || '—'),
  },
  {
    title: t('rbac.permission.source'),
    key: 'source',
    width: 100,
    render: (row) =>
      h(
        NTag,
        {
          type: sourceKindTagType(row.sourceKind),
          size: 'small',
          bordered: false,
        },
        () => sourceKindLabel(row.sourceKind)
      ),
  },
  {
    title: t('common.table.operation'),
    key: 'actions',
    width: 100,
    render: (row) => {
      if (row.sourceKind === 'inherit_indirect') {
        const tip = t('rbac.permission.unlinkIndirectTip', {
          role: row.unlinkParentRoleName || row.ownerRoleName || '-',
        })
        return h(
          NTooltip,
          {},
          {
            trigger: () =>
              h(
                NButton,
                {
                  size: 'tiny',
                  type: 'warning',
                  quaternary: true,
                  disabled: true,
                },
                { default: () => t('rbac.permission.removeInherit') }
              ),
            default: () => tip,
          }
        )
      }

      if (row.sourceKind === 'inherit_direct') {
        const parentLabel = row.unlinkParentRoleName || row.ownerRoleName || ''
        return h(
          NPopconfirm,
          {
            onPositiveClick: () => handleRemoveInheritedWildcard(row),
          },
          {
            trigger: () =>
              h(
                NButton,
                {
                  size: 'tiny',
                  type: 'warning',
                  quaternary: true,
                  loading: unlinkingInherit.value,
                  disabled: !row.unlinkParentRoleId,
                },
                { default: () => t('rbac.permission.removeInherit') }
              ),
            default: () =>
              t('rbac.permission.confirmRemoveInherit', {
                role: parentLabel || '-',
              }),
          }
        )
      }

      return h(
        NPopconfirm,
        {
          onPositiveClick: () => handleRemoveWildcard(row.id),
        },
        {
          trigger: () =>
            h(
              NButton,
              { size: 'tiny', type: 'error', quaternary: true },
              { default: () => t('common.delete') }
            ),
          default: () => t('rbac.permission.confirmRemove'),
        }
      )
    },
  },
])

const columns = computed<DataTableColumns<Resource>>(() => [
  {
    type: 'selection',
    width: 50,
  },
  {
    title: t('rbac.api.method'),
    key: 'method',
    width: 90,
    render: (row) =>
      h(NTag, { type: getMethodType(row.method), size: 'small', round: true }, () => row.method),
  },
  {
    title: t('rbac.api.path'),
    key: 'path',
    minWidth: 250,
    ellipsis: { tooltip: true },
    render: (row) => h('code', { class: 'api-path' }, row.path),
  },
  {
    title: t('rbac.api.summary'),
    key: 'summary',
    minWidth: 150,
    ellipsis: { tooltip: true },
  },
])

/** 通配符表格数据：直接 + 继承（break 后只显示直接，继承会清空） */
const displayedWildcards = computed(() => {
  if (needBreakInheritance.value) {
    return wildcardPermissions.value
  }
  return [...wildcardPermissions.value, ...inheritedWildcards.value]
})

function mapApiSourceToKind(source: string | undefined): PermissionSourceKind {
  if (source === 'inherit_direct') return 'inherit_direct'
  if (source === 'inherit_indirect' || source === 'inherited') return 'inherit_indirect'
  return 'direct'
}

const checkedRowKeys = computed<DataTableRowKey[]>(() => Array.from(checkedPermissions.value))

/**
 * 勾选变化：若取消了被通配符/继承覆盖的项，提示将解除继承并清除通配符
 */
function handleCheckedRowKeysUpdate(keys: DataTableRowKey[]): void {
  const next = new Set(keys.map(String))
  const prev = checkedPermissions.value

  // 找出被取消勾选的 keys
  const unchecked: string[] = []
  prev.forEach((k) => {
    if (!next.has(k)) unchecked.push(k)
  })

  // 若取消的是「打开时被覆盖」的权限，且尚未确认 break
  const touchesCovered = unchecked.some((k) => initialCoveredKeys.value.has(k))

  if (touchesCovered && !needBreakInheritance.value) {
    dialog.warning({
      title: t('rbac.permission.breakInheritTitle'),
      content: t('rbac.permission.breakInheritContent'),
      positiveText: t('common.confirm'),
      negativeText: t('common.cancel'),
      onPositiveClick: () => {
        needBreakInheritance.value = true
        // 解除继承后清除继承通配符展示，并去掉所有通配符（按产品规则）
        wildcardPermissions.value = []
        checkedPermissions.value = next
        message.warning(t('rbac.permission.breakInheritApplied'))
      },
      onNegativeClick: () => {
        // 恢复勾选，不改动
      },
    })
    return
  }

  checkedPermissions.value = next
}

/** 根据 topParent 名称解析角色 ID */
function resolveRoleIdByName(name: string | undefined): number | undefined {
  if (!name) return undefined
  return allRoles.value?.find((r) => r.name === name)?.id
}

function applyRolePermissions(detail: RolePermissionsDetail | undefined): void {
  if (!detail) return

  const wildcards: WildcardPermission[] = []
  const inheritedWc: WildcardPermission[] = []
  const directSpecific = new Set<string>()

  // 以 effective 为准构建表格（同一 path 可来自多个角色，按 owner 分行展示）
  const seenWildcardRows = new Set<string>()
  ;(detail.effective ?? []).forEach((item, index) => {
    if (!isWildcardPermission(item.resource, item.action)) {
      return
    }

    const kind = mapApiSourceToKind(item.source)
    const owner = item.owner || (kind === 'direct' ? props.role?.name : undefined) || ''
    const rowKey = `${owner}|${item.action}|${item.resource}`
    if (seenWildcardRows.has(rowKey)) return
    seenWildcardRows.add(rowKey)

    const topParentName = item.topParent || (kind === 'inherit_direct' ? item.owner : undefined)
    const row: WildcardPermission = {
      id: `${kind}-${index}-${owner}`,
      resource: item.resource,
      action: item.action,
      sourceKind: kind,
      ownerRoleName: owner || props.role?.name,
      unlinkParentRoleName: topParentName,
      unlinkParentRoleId: resolveRoleIdByName(topParentName),
    }

    if (kind === 'direct') {
      wildcards.push(row)
    } else {
      inheritedWc.push(row)
    }
  })

  // 若 effective 未覆盖某些仅 direct 的通配符，再补 direct 列表
  ;(detail.direct ?? []).forEach((p, index) => {
    if (p.length < 3) return
    const resource = p[1] ?? ''
    const action = p[2] ?? ''
    if (!resource || !action) return

    if (isWildcardPermission(resource, action)) {
      const owner = props.role?.name || ''
      const rowKey = `${owner}|${action}|${resource}`
      if (!seenWildcardRows.has(rowKey)) {
        seenWildcardRows.add(rowKey)
        wildcards.push({
          id: `direct-fallback-${index}`,
          resource,
          action,
          sourceKind: 'direct',
          ownerRoleName: owner,
        })
      }
    } else {
      directSpecific.add(getPermissionKey(resource, action))
    }
  })

  // 规范化 covered key：METHOD:path
  const coveredNormalized = new Set<string>()
  ;(detail.covered ?? []).forEach((k) => {
    const parsed = parsePermissionKey(k)
    if (parsed.resource && parsed.action) {
      coveredNormalized.add(getPermissionKey(parsed.resource, parsed.action))
    } else {
      coveredNormalized.add(k)
    }
  })

  // 勾选 = 直接具体 + 后端计算的 covered（含通配符/继承）
  const checked = new Set<string>([...directSpecific, ...coveredNormalized])

  // 补全：已继承但没有任何通配符策略的父角色也要展示（否则用户看不到「123」这类空权限继承）
  appendMissingInheritRoles(wildcards, inheritedWc)

  wildcardPermissions.value = wildcards
  inheritedWildcards.value = inheritedWc
  initialDirectSpecificKeys.value = directSpecific
  initialCoveredKeys.value = coveredNormalized
  checkedPermissions.value = checked
  needBreakInheritance.value = false
}

/**
 * 把「已继承但未出现在通配符列表」的角色补成占位行。
 * 场景：直接继承了角色 123，但 123 未配置任何通配符权限。
 */
function appendMissingInheritRoles(
  wildcards: WildcardPermission[],
  inheritedWc: WildcardPermission[]
): void {
  if (needBreakInheritance.value) return

  const shownOwners = new Set<string>()
  ;[...wildcards, ...inheritedWc].forEach((w) => {
    if (w.ownerRoleName) shownOwners.add(w.ownerRoleName)
  })

  const directParents = roleInheritsDetail.value?.direct ?? []
  directParents.forEach((parentName) => {
    if (!parentName || shownOwners.has(parentName)) return
    shownOwners.add(parentName)
    inheritedWc.push({
      id: `empty-direct-${parentName}`,
      resource: '',
      action: '*',
      sourceKind: 'inherit_direct',
      ownerRoleName: parentName,
      unlinkParentRoleName: parentName,
      unlinkParentRoleId: resolveRoleIdByName(parentName),
      emptyPolicy: true,
    })
  })

  const indirectParents = roleInheritsDetail.value?.indirect ?? []
  indirectParents.forEach((item) => {
    if (!item.name || shownOwners.has(item.name)) return
    shownOwners.add(item.name)
    inheritedWc.push({
      id: `empty-indirect-${item.name}`,
      resource: '',
      action: '*',
      sourceKind: 'inherit_indirect',
      ownerRoleName: item.name,
      unlinkParentRoleName: item.via || undefined,
      unlinkParentRoleId: resolveRoleIdByName(item.via),
      emptyPolicy: true,
    })
  })
}

watch(
  () => [rolePermissions.value, roleInheritsDetail.value, allRoles.value] as const,
  () => {
    applyRolePermissions(rolePermissions.value)
  },
  { immediate: true }
)

watch(
  () => props.visible,
  (visible) => {
    if (visible && props.role) {
      void refetchPermissions()
      void refetchRoleParents()
      searchKeyword.value = ''
      selectedTag.value = null
      newWildcard.value = { resource: '', action: '*' }
      needBreakInheritance.value = false
    }
  }
)

function handleClose(): void {
  emit('update:visible', false)
}

/** 添加通配符：前端先判重（含继承与 method=* 覆盖） */
function handleAddWildcard(): void {
  const finalResource = newWildcard.value.resource.trim()
  const finalAction = (newWildcard.value.action || '*').trim()
  if (!finalResource) {
    message.warning(t('rbac.permission.resourceRequired'))
    return
  }

  const candidate: Permission = { resource: finalResource, action: finalAction }

  // 已在直接列表中
  const inDirect = wildcardPermissions.value.some((w) =>
    permissionCovers(w.resource, w.action, candidate.resource, candidate.action)
  )
  if (inDirect) {
    message.error(t('rbac.permission.alreadyOwned'))
    return
  }

  // 被继承通配符覆盖（且未 break）
  if (!needBreakInheritance.value) {
    const inInherited = inheritedWildcards.value.some(
      (w) =>
        w.sourceKind !== 'direct' &&
        permissionCovers(w.resource, w.action, candidate.resource, candidate.action)
    )
    if (inInherited) {
      message.error(t('rbac.permission.alreadyOwned'))
      return
    }
  }

  // 也被当前有效策略覆盖
  const effective = rolePermissions.value?.effective ?? []
  if (!needBreakInheritance.value) {
    const owned = effective.some((e) =>
      permissionCovers(e.resource, e.action, candidate.resource, candidate.action)
    )
    if (owned) {
      message.error(t('rbac.permission.alreadyOwned'))
      return
    }
  }

  wildcardPermissions.value.push({
    id: `new-${Date.now()}`,
    resource: finalResource,
    action: finalAction,
    sourceKind: 'direct',
    ownerRoleName: props.role?.name,
    isNew: true,
  })

  newWildcard.value = { resource: '', action: '*' }
  message.success(t('rbac.permission.wildcardAdded'))
}

function handleRemoveWildcard(id: string): void {
  wildcardPermissions.value = wildcardPermissions.value.filter((p) => p.id !== id)
}

/** 解除继承：断开提供该权限的直接父角色 */
async function handleRemoveInheritedWildcard(row: WildcardPermission): Promise<void> {
  if (!props.role || !row.unlinkParentRoleId) {
    message.error(t('rbac.permission.removeInheritFailed'))
    return
  }

  unlinkingInherit.value = true
  try {
    await removeRoleInherit({
      roleId: props.role.id,
      parentRoleId: row.unlinkParentRoleId,
    })
    message.success(t('rbac.permission.removeInheritSuccess'))
    await Promise.all([refetchPermissions(), refetchRoleParents()])
    void queryClient.invalidateQueries({ queryKey: ['roleInherits'] })
    void queryClient.invalidateQueries({ queryKey: ['rolePermissions'] })
  } catch (error) {
    const msg = error instanceof Error ? error.message : t('rbac.permission.removeInheritFailed')
    // request 拦截器通常已弹出业务错误；这里仅兜底
    if (msg && msg !== t('rbac.permission.removeInheritFailed')) {
      // already shown
    } else {
      message.error(t('rbac.permission.removeInheritFailed'))
    }
  } finally {
    unlinkingInherit.value = false
  }
}

function handleSave(): void {
  if (!props.role) return

  const permissions: Permission[] = []

  // 直接通配符（占位继承行不参与保存）
  wildcardPermissions.value.forEach((wp) => {
    if (wp.emptyPolicy) return
    permissions.push({ resource: wp.resource, action: wp.action })
  })

  // 仅提交「真实直接具体权限」，避免与通配符重复
  Array.from(checkedPermissions.value).forEach((key) => {
    if (isCoveredByWildcards(key)) {
      return
    }
    if (!needBreakInheritance.value) {
      // 未 break 时：继承覆盖的勾选仅作展示，不写成直接策略
      const wasOnlyCovered =
        initialCoveredKeys.value.has(key) && !initialDirectSpecificKeys.value.has(key)
      if (wasOnlyCovered) {
        return
      }
    }
    permissions.push(parsePermissionKey(key))
  })

  replaceMutation.mutate({
    roleId: props.role.id,
    permissions,
    breakInheritance: needBreakInheritance.value,
  })
}

function handleSelectAllInTag(tag: string): void {
  const resources = groupedResources.value.get(tag) ?? []
  resources.forEach((r) => {
    checkedPermissions.value.add(getPermissionKey(r.path, r.method))
  })
  checkedPermissions.value = new Set(checkedPermissions.value)
}

function handleDeselectAllInTag(tag: string): void {
  const resources = groupedResources.value.get(tag) ?? []
  const next = new Set(checkedPermissions.value)
  const toUncheck: string[] = []
  resources.forEach((r) => {
    const key = getPermissionKey(r.path, r.method)
    if (next.has(key)) toUncheck.push(key)
  })

  const touchesCovered = toUncheck.some((k) => initialCoveredKeys.value.has(k))
  if (touchesCovered && !needBreakInheritance.value) {
    dialog.warning({
      title: t('rbac.permission.breakInheritTitle'),
      content: t('rbac.permission.breakInheritContent'),
      positiveText: t('common.confirm'),
      negativeText: t('common.cancel'),
      onPositiveClick: () => {
        needBreakInheritance.value = true
        wildcardPermissions.value = []
        toUncheck.forEach((k) => next.delete(k))
        checkedPermissions.value = next
        message.warning(t('rbac.permission.breakInheritApplied'))
      },
    })
    return
  }

  toUncheck.forEach((k) => next.delete(k))
  checkedPermissions.value = next
}

function rowKey(row: Resource): string {
  return getPermissionKey(row.path, row.method)
}

const methodOptions: SelectOption[] = [
  { label: '* (全部)', value: '*' },
  { label: 'GET', value: 'GET' },
  { label: 'POST', value: 'POST' },
  { label: 'PUT', value: 'PUT' },
  { label: 'DELETE', value: 'DELETE' },
  { label: 'PATCH', value: 'PATCH' },
]

const specificCountDisplay = computed(() => checkedPermissions.value.size)
const wildcardCountDisplay = computed(() => displayedWildcards.value.length)
</script>

<template>
  <n-drawer :show="visible" :width="780" placement="right" @update:show="handleClose">
    <n-drawer-content
      :title="t('rbac.permission.assignPermissions')"
      :native-scrollbar="false"
      closable
    >
      <n-spin :show="isLoading">
        <n-alert v-if="role" type="info" :show-icon="false" style="margin-bottom: 16px">
          {{ t('rbac.role.name') }}: {{ role.name }}
          <template v-if="wildcardCountDisplay > 0 || specificCountDisplay > 0">
            &nbsp;|&nbsp;{{ t('rbac.permission.wildcardCount') }}:
            {{ wildcardCountDisplay }} &nbsp;|&nbsp;{{ t('rbac.permission.specificCount') }}:
            {{ specificCountDisplay }}
          </template>
        </n-alert>

        <n-alert
          v-if="needBreakInheritance"
          type="warning"
          :show-icon="true"
          style="margin-bottom: 16px"
        >
          {{ t('rbac.permission.breakInheritBanner') }}
        </n-alert>

        <n-tabs v-model:value="activeTab" type="line" animated>
          <n-tab-pane name="wildcard" :tab="t('rbac.permission.wildcardPermissions')">
            <n-card size="small" style="margin-bottom: 16px">
              <n-space :size="8" align="center" wrap>
                <n-select
                  v-model:value="newWildcard.action"
                  :options="methodOptions"
                  style="width: 120px"
                  size="small"
                />
                <!-- AutoComplete：聚焦即出下拉；选中后仍是可编辑文本 -->
                <n-auto-complete
                  :value="newWildcard.resource"
                  :options="wildcardAutoOptions"
                  :placeholder="t('rbac.permission.wildcardSelectPlaceholder')"
                  :get-show="getWildcardAutoShow"
                  :render-label="renderWildcardOptionLabel"
                  clearable
                  blur-after-select
                  size="small"
                  style="width: 360px"
                  @update:value="handleWildcardPathUpdate"
                >
                  <template #default="{ handleInput, handleBlur, handleFocus }">
                    <n-input
                      :value="newWildcard.resource"
                      :placeholder="t('rbac.permission.wildcardSelectPlaceholder')"
                      size="small"
                      clearable
                      @update:value="
                        (val) => {
                          handleInput(val)
                          handleWildcardPathUpdate(val)
                        }
                      "
                      @focus="handleFocus"
                      @blur="handleBlur"
                      @keyup.enter="handleAddWildcard"
                    />
                  </template>
                </n-auto-complete>
                <n-button type="primary" size="small" @click="handleAddWildcard">
                  <template #icon>
                    <n-icon>
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        width="16"
                        height="16"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        stroke-width="2"
                        stroke-linecap="round"
                        stroke-linejoin="round"
                      >
                        <line x1="12" y1="5" x2="12" y2="19" />
                        <line x1="5" y1="12" x2="19" y2="12" />
                      </svg>
                    </n-icon>
                  </template>
                  {{ t('common.add') }}
                </n-button>
              </n-space>
              <div class="hint-text">
                {{ t('rbac.permission.wildcardSelectHint') }}
              </div>
            </n-card>

            <n-data-table
              v-if="displayedWildcards.length > 0"
              :columns="wildcardColumns"
              :data="displayedWildcards"
              :max-height="400"
              size="small"
              bordered
            />
            <n-empty v-else :description="t('rbac.permission.noWildcard')" />
          </n-tab-pane>

          <n-tab-pane name="specific" :tab="t('rbac.permission.specificPermissions')">
            <n-space :size="12" style="margin-bottom: 16px">
              <n-input
                v-model:value="searchKeyword"
                :placeholder="t('rbac.api.searchPlaceholder')"
                clearable
                style="width: 200px"
              />
              <n-select
                v-model:value="selectedTag"
                :options="tagOptions"
                :placeholder="t('rbac.api.tagPlaceholder')"
                clearable
                style="width: 150px"
              />
            </n-space>

            <n-tabs v-if="!selectedTag && groupedResources.size > 0" type="line" animated>
              <n-tab-pane
                v-for="[tag, resources] in groupedResources"
                :key="tag"
                :name="tag"
                :tab="tag"
              >
                <n-space :size="8" style="margin-bottom: 8px">
                  <n-button size="tiny" quaternary @click="handleSelectAllInTag(tag)">
                    {{ t('common.selectAll') }}
                  </n-button>
                  <n-button size="tiny" quaternary @click="handleDeselectAllInTag(tag)">
                    {{ t('common.deselectAll') }}
                  </n-button>
                </n-space>
                <n-data-table
                  :checked-row-keys="checkedRowKeys"
                  :columns="columns"
                  :data="resources"
                  :row-key="rowKey"
                  :max-height="350"
                  size="small"
                  bordered
                  @update:checked-row-keys="handleCheckedRowKeysUpdate"
                />
              </n-tab-pane>
            </n-tabs>

            <template v-else-if="filteredResources.length > 0">
              <n-data-table
                :checked-row-keys="checkedRowKeys"
                :columns="columns"
                :data="filteredResources"
                :row-key="rowKey"
                :max-height="450"
                size="small"
                bordered
                @update:checked-row-keys="handleCheckedRowKeysUpdate"
              />
            </template>

            <n-empty v-else :description="t('common.noData')" />
          </n-tab-pane>
        </n-tabs>
      </n-spin>

      <template #footer>
        <n-space justify="end">
          <n-button :disabled="isLoading" @click="handleClose">
            {{ t('common.cancel') }}
          </n-button>
          <n-button type="primary" :loading="isLoading" @click="handleSave">
            {{ t('common.save') }}
          </n-button>
        </n-space>
      </template>
    </n-drawer-content>
  </n-drawer>
</template>

<style scoped lang="scss">
:deep(.api-path) {
  font-family: var(--font-mono, monospace);
  font-size: var(--text-xs);
  color: var(--color-primary);
}

.hint-text {
  margin-top: var(--spacing-2);
  font-size: var(--text-xs);
  color: var(--color-text-tertiary);
}

.empty-policy-hint {
  font-size: var(--text-xs);
  color: var(--color-text-tertiary);
  font-style: italic;
}
</style>
