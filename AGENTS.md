# AGENTS 项目配置（Vue3 + TypeScript 企业级后台）

> 版本：1.1-web  
> 最后更新：2026-01-11  
> 项目：视频网站-企业级后台管理系统（Admin Console）  
> 默认语言：中文（zh-CN）  
> 目标：世界级审美、世界级交互、世界级工程质量（并且：每次提交后 IDE 至少零报错）

---

## 🎯 北极星目标（North Star）

本项目不是“能用的后台”，而是**可对标国际一线 SaaS 控制台**的后台：

- **视觉**：高级、克制、信息密度可控、留白与层级有设计感（不是千篇一律蓝白灰模板）。
- **交互**：丝滑、可预期、具备“操作信心”（可撤销/可追踪/有反馈/有渐进式加载）。
- **工程**：类型安全、可测试、可维护、可扩展（但不为假想需求过度设计）。
- **能力**：
  - i18n：中文/英文/日文（默认中文）
  - 多主题：至少 4 套高质感主题 + 可扩展主题机制
  - RBAC：菜单、路由、按钮/资源权限一致
  - 全自动化测试：以 **Chrome MCP** 为端到端验收主通道
  - **提交质量门禁**：每次提交必须通过检查，确保 IDE（Volar/TS Server）不报错

---

## 📊 优先级栈（冲突时按顺序执行）

1. **安全与正确性**：权限/鉴权/数据一致性 > UI
2. **可交付**：能跑、能测、能发布、可回滚
3. **体验质量**：交互一致性、可访问性、性能、视觉精致度
4. **工程质量**：类型、结构、可维护性、文档
5. **性能优化**：在真实瓶颈出现或大数据场景明确时再做深度优化（但要预留正确接口）

---

## 🧱 技术栈（硬性指定：适配企业后台 + 顶级体验）

> 版本号不写死：统一使用“当下最新稳定版”，并锁定在 lockfile，避免团队环境漂移。

### 核心框架

- Vue 3 + TypeScript（strict）
- Vite
- Vue Router
- Pinia
- @tanstack/vue-query（服务端状态：列表、分页、缓存、重试、并发、乐观更新）
- Axios（请求层：Token/刷新/错误归一）
- vue-i18n（i18n 框架：语言包拆分/懒加载/格式化）

### 样式体系（硬性：Sass + Tokens + 运行时主题）

- **Sass（Dart Sass，SCSS 语法）**：用于
  - 生成主题 CSS Variables（避免手写 4 套主题表）
  - 编写复杂局部样式（表格、富文本、ECharts、特殊布局）
- **CSS Variables**：主题运行时切换的唯一来源（禁止用 Sass 变量做主题）
- Tailwind CSS：用于常规布局/间距/排版/快速一致性落地
- Stylelint（scss/vue）：样式门禁

> 原则：**主题 = CSS Variables（运行时）**；**工程抽象 = Sass（编译时）**；**日常 UI = Tailwind**。

### UI 组件库（硬性指定）

- **Naive UI（Vue 3 原生 + TS 友好 + 主题可覆盖）**
  - 作为“企业后台基础组件库”：Button / Form / DataTable / Drawer / Modal / DatePicker / Upload / Message / Notification…
  - 必须通过 `themeOverrides` / 统一 wrapper 将视觉收敛到 Design Tokens，避免“默认 Naive 风格一眼看穿”。

> 允许局部自研组件（尤其是布局、导航、信息密度高的表格工具条等），但禁止无体系散装 UI。

### 动画/动效（硬性指定）

- **@vueuse/motion**：微交互、进入/离开、列表过渡、骨架切换
- Vue 内建 `<Transition>` / `<TransitionGroup>`：页面级与列表级过渡
- （可选）GSAP：仅当确实需要时间线/复杂动效时引入，并封装隔离

动效规则：

- 默认遵循 `prefers-reduced-motion`（减少动效）
- 动效用于“状态变化提示”，禁止为了炫技堆砌

### 工程化与质量

- ESLint + @typescript-eslint + eslint-plugin-vue（Type-aware lint）
- Prettier
- Husky + lint-staged + commitlint（强制提交规范与检查）
- 单元测试：Vitest
- 端到端验收：Chrome MCP（强制）

---

## 🎨 设计系统规则（顶级审美 + 顶级交互）

### 1) 设计 Token（必须）

所有 UI 颜色/阴影/圆角/间距/字体必须来源于 token，不允许散落的 magic number。

- `color`：bg/surface/border/text/muted/primary/success/warn/danger
- `radius`：xs/sm/md/lg/xl
- `shadow`：elev-1/2/3（结合主题变化）
- `motion`：fast/normal/slow + easing 统一
- `spacing`：4/8/12/16/24/32…

落地方式（强制）：

- `<html data-theme="obsidian">`
- `src/styles/tokens/themes.scss` 生成：
  - `:root { --color-bg: ... }`
  - `[data-theme="aurum"] { --color-bg: ... }` 等
- Tailwind 颜色统一走 `var(--color-xxx)`，禁止写死颜色值（仅允许在 tokens 文件里出现）

### 2) 高级主题（至少 4 套，且“有性格”）

建议主题（命名可调整）：

1. **Pearl（珍珠白）**：高端浅色、温润背景、低饱和强调色
2. **Obsidian（黑曜石）**：深色低对比、适合长时间操作
3. **Aurum（鎏金）**：深色 + 金色点缀（克制的奢华）
4. **Sakura（樱）**：浅色 + 轻樱粉点缀（日系、现代、克制）

要求：

- 对比度可读（正文/次级/禁用态层次明确）
- 支持 `prefers-color-scheme` 与用户手动选择（手动优先）
- 支持 `prefers-reduced-motion`

---

## 🌍 i18n 规范（中英日，默认中）

- 语言：`zh-CN`（默认）、`en-US`、`ja-JP`
- 不允许硬编码文案（按钮、提示、空状态、校验文案、表头等）
- key 命名：`module.page.section.label`，例如 `auth.login.title`

工程建议：

- 语言包按模块拆分并支持懒加载：
  - `src/locales/{zh-CN,en-US,ja-JP}/{auth,user,video,...}.ts`
- 日期/数字：统一使用 `Intl.DateTimeFormat` / `Intl.NumberFormat`
- Naive UI 语言与 i18n 同步：在全局 Provider 中根据当前语言切 `locale/dateLocale`

---

## 🔐 鉴权与权限（RBAC 必须做“前后端一致”）

### Token

- 登录成功返回：`accessToken` + `refreshToken`
- access 过期：使用 refreshToken 调 `/common/user/login/refresh` 刷新
- 请求层必须实现：
  - 自动携带 accessToken
  - 401/业务码提示 token 失效时自动刷新并重放请求
  - 防并发风暴：single-flight（同一时间只允许一个 refresh 请求）

### 菜单与权限

登录后初始化顺序（必须）：

1. 当前用户信息：`GET /admin/user/info`
2. 当前用户菜单：`GET /admin/rbac/user/menus`
3. 当前用户最终权限：`GET /admin/rbac/user/permissions`

路由策略：

- 用后端菜单树生成“可访问路由集合”
- 按钮级权限：基于权限点提供 `v-permission` 指令（禁止纯前端写死）

---

## 🔌 后端 API 契约（必须遵守）

- Base URL：`/v1`
- 统一返回结构：`{ code: 0|1, data: any, msg: string }`（用 `code` 判断成功/失败；`msg` 用于 toast/错误提示）
- 登录链路：必须实现滑块验证码 → 登录 → 初始化用户/菜单/权限 → token 刷新
- 开发前必须阅读并以文档为准（禁止“拍脑袋”造字段/造接口）：
  - `docs/common.md`
  - `docs/01-admin-user-management.md`
  - `docs/02-admin-video-management.md`
  - `docs/03-admin-comment-management.md`
  - `docs/04-admin-dynamic-management.md`
  - `docs/05-admin-banner-management.md`
  - `docs/06-admin-notification-management.md`
  - `docs/07-admin-site-management.md`
  - `docs/08-rbac-management.md`

---

## ✅ “IDE 零报错”提交门禁（强制）

> 目标：每次 commit 之后，**当前提交涉及的 Vue/TS 文件在 IDE（Volar/TS Server）至少不报错**。  
> 工程落地：用 **vue-tsc（严格模板）+ eslint（type-aware）** 做门禁，禁止“IDE 报错但能提交”。

### 必须开启的严格配置

1. TypeScript strict：`"strict": true`（含 `noImplicitAny`）
2. Vue 模板严格类型：`vueCompilerOptions.strictTemplates = true`

建议在 `tsconfig.json` 或 `tsconfig.app.json` 写：

```json
{
  "compilerOptions": {
    "strict": true,
    "noImplicitAny": true
  },
  "vueCompilerOptions": {
    "strictTemplates": true
  }
}
```

### 必须提供的脚本（package.json）

```json
{
  "scripts": {
    "lint": "eslint . --ext .ts,.tsx,.vue --max-warnings 0",
    "typecheck": "vue-tsc --noEmit --pretty false",
    "stylelint": "stylelint \"src/**/*.{css,scss,vue}\" --max-warnings 0",
    "test:unit": "vitest run",
    "check:commit": "pnpm -s lint && pnpm -s typecheck && pnpm -s stylelint && pnpm -s test:unit",
    "check:ci": "pnpm -s check:commit && pnpm -s build"
  }
}
```

> `tsc --noEmit` 不能替代 `vue-tsc`：因为 `.vue template` 的类型问题只有 `vue-tsc` 才能稳定兜住。

### 
 Hook（强制，防止“检查不出来”）

- **pre-commit**：必须跑 `pnpm check:commit`
- **pre-push/CI**：跑 Chrome MCP 的 e2e 回归（见下文）

建议 Husky：

```bash
# .husky/pre-commit
pnpm -s check:commit
```

> 任何一次提交，只要出现 TS/Vue 模板错误、隐式 any、事件参数类型不匹配等，必须被 hook 拦截。

### 代码规范：避免“模板里难以类型推导导致 IDE 报错”

**禁止在 template 里写带参数的 inline arrow function**（除非你能保证类型），原因：Volar/ts-plugin 对模板表达式类型推导会更严格，容易出现隐式 any 或不匹配。

✅ 推荐写法（把 handler 挪到 `<script setup lang="ts">` 并显式类型）：

```ts
const onPageSizeChange = (size: number) => {
  pagination.pageSize = size;
};
```

```vue
<a-pagination @page-size-change="onPageSizeChange" />
```

✅ 对于像 `refetch` 这种签名不是 `(ev: MouseEvent)` 的函数，禁止直接传给 `@click`：

```ts
const onRetryClick = () => refetch();
```

```vue
<n-button @click="onRetryClick">Retry</n-button>
```

---

## 🧪 自动化测试（Chrome MCP 为最终验收）

### 每次提交（pre-commit）必须

- lint + typecheck(vue-tsc) + stylelint + unit test

### 每次推送 / 合并（pre-push 或 CI）必须

- Chrome MCP 核心回归（最少覆盖）：
  1. 登录（滑块验证码）→ 进入布局 → 拉取 user/info + menus + permissions
  2. 主题切换（4 套）+ 语言切换（中/英/日）刷新持久化
  3. 站点统计：图表渲染、空数据处理、加载态
  4. 用户列表：筛选/分页/详情/更新/封禁（或最少关键链路）
  5. 视频列表：筛选/分页/详情/审核/删除/恢复
  6. 评论/动态：列表与批量删除
  7. RBAC：角色创建 + 分配菜单/权限（关键链路）

失败要求：

- 输出：截图 + 控制台错误 + 网络错误（若 MCP 可取到）
- 必须修复后再继续推进

---

## ✅ Git 规范（强制：功能点完成即提交，但提交必过门禁）

### 原则

- **一个功能点 = 一个可交付增量**：UI + API 接入 + 基本测试（至少 unit 或 smoke）+ 通过 `pnpm check:commit`
- 完成一个功能点后，必须立刻提交（不要堆积再提交）
- **禁止使用** `git commit --no-verify` 绕过门禁（除非在救火分支且随后补齐检查与修复）

### 提交要求（Conventional Commits）

- `feat(scope): ...`
- `fix(scope): ...`
- `refactor(scope): ...`
- `test(scope): ...`
- `chore(scope): ...`

scope 示例：`auth` `layout` `i18n` `theme` `rbac` `user` `video` `comment` `dynamic` `banner` `notification` `site`

提交信息必须可追溯（建议写 body）：

- 做了什么（1 句话）
- 影响范围（页面/模块）
- 关键接口（endpoint）
- 测试说明（通过哪些用例）

---

## 🧰 MCP 工具矩阵（按需使用）

| 意图                | 首选 MCP   | 备用     | 说明                           |
| ------------------- | ---------- | -------- | ------------------------------ |
| 端到端验收、UI 回归 | **chrome** | 本地 e2e | 强制走 Chrome MCP 作为最终验收 |
| 官方文档检索        | context7   | fetch    | Vue/TanStack/NaiveUI 等查官方  |
| 网页内容抓取        | fetch      | 手动搜索 | 获取最佳实践文章/文档          |

---

## ✅ Definition of Done（交付标准）

- [ ] i18n：中/英/日覆盖核心页面（至少：登录、布局、站点统计、用户、视频、RBAC）
- [ ] 主题：4 套主题可切换、刷新持久化、暗色/浅色均可用
- [ ] 权限：菜单/路由/按钮权限与后端数据一致
- [ ] 核心页面可用：站点统计、用户管理、视频管理、评论管理、动态管理、轮播图、通知、RBAC
- [ ] 自动化测试可跑：Chrome MCP 核心回归套件通过
- [ ] Git 记录清晰：每个功能点有独立 commit
- [ ] **每次提交均通过 pnpm check:commit（确保 IDE 至少零报错）**

---
