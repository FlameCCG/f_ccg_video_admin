/**
 * 让 ARIA 与 data-* 属性可以直接写在标签上（strictTemplates 下的类型补齐）。
 *
 * 背景：本项目开启了 `vueCompilerOptions.strictTemplates`，vue-tsc 会拒绝标签上
 * 未声明的属性。
 *
 * 1) Naive UI 的组件 props 里没有 `aria-*`（运行时会透传到根元素，只是类型没声明），
 *    于是给 <n-button> 加 `aria-label`、给 <n-icon> 加 `aria-hidden="true"`
 *    这类无障碍属性全部会报 TS2353。
 *    Vue 用 `AllowedComponentProps` 表示「任何组件都允许接收的属性」（`class` /
 *    `style` 就是这么来的），这里把 ARIA 属性并入该接口，等于在类型层面承认
 *    「ARIA 属性对任何组件都合法」—— 既符合运行时行为，也避免为了过类型检查
 *    到处写断言。
 *
 *    注意：**刻意不包含 `role`**。本项目有多个组件把 `role` 用作业务 prop
 *    （RoleFormModal / RoleInheritDrawer / RoleMenuDrawer / RolePermissionDrawer
 *    的 `:role="Role | null"`），一旦把 ARIA 的 `role?: string` 也并进来，
 *    两者会被交叉成 `Role & string`，导致这些组件的正常用法全部报错。
 *    需要在「组件」上写 ARIA role 时，请套一层原生元素承载。
 *
 * 2) `HTMLAttributes` 没有 `data-*` 的索引签名，所以原生元素上的行为标记
 *    （如骨架屏的 `data-motion-essential`）也会报错。这里补上索引签名。
 */
import type { AriaAttributes } from 'vue'

declare module 'vue' {
  // 这里的「空接口」不是笔误：接口合并要求用 interface 声明，
  // 而本意就是把 AriaAttributes 的全部成员并入 AllowedComponentProps，
  // 不新增任何自有成员（新增 role 会与业务 prop 冲突，见上文）。
  // eslint-disable-next-line @typescript-eslint/no-empty-object-type
  interface AllowedComponentProps extends AriaAttributes {}

  interface HTMLAttributes {
    [dataAttribute: `data-${string}`]: unknown
  }
}
