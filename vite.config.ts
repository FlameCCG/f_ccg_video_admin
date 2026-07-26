import { fileURLToPath, URL } from 'node:url'
import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

/**
 * 判断模块 id 是否属于给定的 node_modules 包（可传多个）。
 *
 * - 先把路径分隔符归一成 `/`，兼容 Windows 的反斜杠 id
 * - 匹配 `/node_modules/<pkg>/`：pnpm 的真实路径形如
 *   `node_modules/.pnpm/<pkg>@<ver>/node_modules/<pkg>/...`，同样命中
 * - 传入 scope（如 `@vue-flow`）即可整组匹配该 scope 下的所有包
 */
const inDep =
  (...names: string[]) =>
  (id: string): boolean => {
    const p = id.replace(/\\/g, '/')
    return names.some((name) => p.includes(`/node_modules/${name}/`))
  }

// https://vite.dev/config/
export default defineConfig({
  plugins: [vue()],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
      // dashjs 默认入口是 dash.all.min.js（829 KB），里面打包了本项目完全用不到的
      // Protection(EME/DRM) / MetricsReporting / ExternalSubtitle。
      // 这里改指 dash.mediaplayer.min.js（758 KB，导出 Debug/FactoryMaker/MediaPlayer/default），
      // 已覆盖 src 中唯一用到的 `dashjs.MediaPlayer()` 与 `dashjs.MediaPlayer.events`。
      // 必须走 alias：dashjs 的 exports map 只声明了 '.' 与 './mss'，深层路径导入会被拒绝。
      // 类型仍从 dashjs/index.d.ts 解析（alias 只影响打包，不影响 tsc），故 typecheck 不受影响。
      dashjs: fileURLToPath(
        new URL('./node_modules/dashjs/dist/modern/esm/dash.mediaplayer.min.js', import.meta.url)
      ),
    },
  },
  // 生产特性开关：裁掉 vue / vue-i18n 的 devtools 与 legacy 分支。
  // 关闭 legacy/full-install 是安全的：src/locales/index.ts 已设 `legacy: false`，
  // 且全仓没有使用 `$t()/$d()/$n()` 与 <i18n-t> 全局组件。
  define: {
    __VUE_I18N_FULL_INSTALL__: 'false',
    __VUE_I18N_LEGACY_API__: 'false',
    __INTLIFY_PROD_DEVTOOLS__: 'false',
    __VUE_PROD_DEVTOOLS__: 'false',
    __VUE_PROD_HYDRATION_MISMATCH_DETAILS__: 'false',
  },
  server: {
    port: 3001,
    host: true,
    proxy: {
      '/v1': {
        target: 'http://127.0.0.1:8080',
        changeOrigin: true,
      },
    },
  },
  build: {
    target: 'esnext',
    minify: 'esbuild',
    sourcemap: false,
    // 900 KB 的巨块曾经因为阈值是 1500 而一路无声通过，这里收紧到 600 KB
    chunkSizeWarningLimit: 600,
    rollupOptions: {
      output: {
        // 注意：本项目的 vite 是 rolldown-vite，底层 rolldown 只支持函数形式的
        // `manualChunks`，且一旦存在 `advancedChunks` 就会整个忽略它——
        // 常见的 `manualChunks: { vendor: [...] }` 在这里是静默无效的写法。
        // 因此分包策略必须写在 `advancedChunks.groups` 里。
        //
        // priority 越大越先匹配，并把命中的模块从更低优先级的组里移除。
        //
        // 关键（也反直觉）：rolldown 的 `advancedChunks.includeDependenciesRecursively`
        // 默认为 **true** —— 每个组除了命中的模块，还会把这些模块的依赖一起吸进来
        //（官方说明：this reduces the chance of generating circular chunks）。
        //
        // 所以「把懒加载重型库排在最前」是错的：把 vue-flow 放在 priority 95 时，
        // 它会连带把 @vue-flow 依赖的 Vue runtime 一起吸进 vue-flow chunk，
        // 而 Vue runtime 是所有页面都要的 —— 结果每个 chunk 都静态 import vue-flow，
        // 它还进了 index.html 的 modulepreload，登录页也要下载 268 KB。
        // （实测症状：shallowReactive / effectScope / createElementBlock 出现在
        //   vue-flow chunk 里，而 vue chunk 只剩 36 KB。）
        //
        // 正确顺序是「共享地基优先」：先让 vue / naive-ui / i18n / data 认领各自的模块，
        // 等重型库递归查找依赖时这些模块已被认领，于是重型库 chunk 里只剩它自己的代码。
        // vendor 兜底组仍然放在最低，避免它抢走任何东西。
        advancedChunks: {
          groups: [
            // ① 共享地基：必须最先认领，否则会被下面的重型库递归吸走
            {
              name: 'vue',
              test: inDep('vue', 'vue-router', 'pinia', '@vue', '@vueuse'),
              priority: 100,
            },
            {
              name: 'naive-ui',
              test: inDep(
                'naive-ui',
                'vueuc',
                'vooks',
                'vdirs',
                'seemly',
                'treemate',
                'evtd',
                'css-render',
                '@css-render',
                'async-validator'
              ),
              priority: 95,
            },
            { name: 'i18n', test: inDep('vue-i18n', '@intlify'), priority: 90 },
            { name: 'data', test: inDep('axios', '@tanstack'), priority: 85 },
            { name: 'date-fns', test: inDep('date-fns'), priority: 80 },

            // ② 按需加载的重型库：只装自己的代码，依赖已由 ① 认领
            { name: 'dashjs', test: inDep('dashjs'), priority: 40 },
            { name: 'vue-flow', test: inDep('@vue-flow'), priority: 35 },
            { name: 'swiper', test: inDep('swiper'), priority: 30 },

            // ③ 兜底：其余第三方依赖合并成 vendor
            {
              name: 'vendor',
              test: (id: string) => id.replace(/\\/g, '/').includes('/node_modules/'),
              priority: 10,
            },
          ],
        },
      },
    },
  },
})
