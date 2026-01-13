/**
 * v-permission 指令
 * 用于按钮级别的权限控制
 * Requirements: 5.3
 *
 * 使用方式:
 * 1. 数组格式: v-permission="['GET:/admin/user/list', 'POST:/admin/user/ban']"
 *    - 只要有任意一个权限即可显示
 *
 * 2. 对象格式: v-permission="{ resource: '/admin/user/ban', action: 'POST' }"
 *    - 检查单个权限
 *
 * 3. 对象格式（带 all）: v-permission="{ permissions: ['GET:/admin/user/list', 'POST:/admin/user/ban'], all: true }"
 *    - all: true 表示需要所有权限，all: false 或不传表示只需任意一个
 */
import type { Directive, DirectiveBinding } from 'vue'
import { usePermissionStore } from '@/stores/permission'

/**
 * 单个权限对象格式
 */
interface SinglePermission {
  resource: string
  action: string
}

/**
 * 多个权限对象格式
 */
interface MultiplePermissions {
  permissions: string[]
  all?: boolean
}

/**
 * 指令绑定值类型
 */
type PermissionValue = string[] | SinglePermission | MultiplePermissions

/**
 * 判断是否为单个权限对象
 */
function isSinglePermission(value: PermissionValue): value is SinglePermission {
  return (
    typeof value === 'object' && !Array.isArray(value) && 'resource' in value && 'action' in value
  )
}

/**
 * 判断是否为多个权限对象
 */
function isMultiplePermissions(value: PermissionValue): value is MultiplePermissions {
  return (
    typeof value === 'object' &&
    !Array.isArray(value) &&
    'permissions' in value &&
    Array.isArray(value.permissions)
  )
}

/**
 * 检查权限
 */
function checkPermission(value: PermissionValue): boolean {
  const permissionStore = usePermissionStore()

  // 数组格式: ['GET:/admin/user/list', 'POST:/admin/user/ban']
  if (Array.isArray(value)) {
    return permissionStore.hasAnyPermission(value)
  }

  // 单个权限对象格式: { resource: '/admin/user/ban', action: 'POST' }
  if (isSinglePermission(value)) {
    return permissionStore.hasPermission(value.resource, value.action)
  }

  // 多个权限对象格式: { permissions: [...], all: true/false }
  if (isMultiplePermissions(value)) {
    if (value.all) {
      return permissionStore.hasAllPermissions(value.permissions)
    }
    return permissionStore.hasAnyPermission(value.permissions)
  }

  // 无效格式，默认显示
  console.warn('[v-permission] Invalid permission value:', value)
  return true
}

/**
 * v-permission 指令
 */
export const vPermission: Directive<HTMLElement, PermissionValue> = {
  mounted(el: HTMLElement, binding: DirectiveBinding<PermissionValue>) {
    const { value } = binding

    if (!value) {
      console.warn('[v-permission] Permission value is required')
      return
    }

    if (!checkPermission(value)) {
      // 没有权限，移除元素
      el.parentNode?.removeChild(el)
    }
  },

  updated(el: HTMLElement, binding: DirectiveBinding<PermissionValue>) {
    const { value, oldValue } = binding

    // 如果值没有变化，不需要重新检查
    if (JSON.stringify(value) === JSON.stringify(oldValue)) {
      return
    }

    if (!value) {
      console.warn('[v-permission] Permission value is required')
      return
    }

    if (!checkPermission(value)) {
      // 没有权限，移除元素
      el.parentNode?.removeChild(el)
    }
  },
}

/**
 * 导出指令安装函数
 */
export function setupPermissionDirective(app: {
  directive: (name: string, directive: Directive) => void
}): void {
  app.directive('permission', vPermission)
}

export default vPermission
