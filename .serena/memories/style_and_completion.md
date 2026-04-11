# 风格与完成标准
- 默认中文输出，遵循 AGENTS.md：高质量审美、交互和工程质量，优先类型安全与可维护性。
- UI 使用 Naive UI + 设计 token；主题通过 CSS Variables，复杂样式走 Sass，日常布局可用 Tailwind。
- 不要在模板里直接写难以推导类型的 inline arrow function；优先在 `<script setup lang="ts">` 中定义显式类型 handler。
- 站点配置 `site` 表单允许带上后端新增字段，但不一定直接展示；保存时要保留未显示字段。
- 完成任务后优先运行：`pnpm exec vue-tsc --noEmit --project tsconfig.app.json`、相关 `eslint`/`stylelint`、必要时 `pnpm test:unit`。
- 提交规范使用 Conventional Commits；提交前目标是 IDE/Volar 零报错。