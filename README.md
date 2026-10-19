# Vue 3 + TypeScript + Vite

This template should help get you started developing with Vue 3 and TypeScript in Vite. The template uses Vue 3 `<script setup>` SFCs, check out the [script setup docs](https://v3.vuejs.org/api/sfc-script-setup.html#sfc-script-setup) to learn more.

Learn more about the recommended Project Setup and IDE Support in the [Vue Docs TypeScript Guide](https://vuejs.org/guide/typescript/overview.html#project-setup).

## 媒体资源

后端返回根相对路径：上传资源 `/user_files/...`、初始化横幅 `/images/banners/...`、本地存储 `/uploads/...`。开发环境已在 `vite.config.ts` 配置代理；图片请求必须返回正确的图片 Content-Type，不能落到 SPA 的 `index.html`。

生产环境可配置 `VITE_MEDIA_BASE=https://media.example.com`（若直接使用 MinIO 地址，应包含 `/videos` bucket 路径），或由网关配置同源媒体路由。例如：

```nginx
location ~ ^/(user_files|images)/ {
    proxy_pass http://127.0.0.1:9002/videos$request_uri;
}
location /uploads/ {
    proxy_pass http://127.0.0.1:8080;
}
```

媒体路由应优先于 SPA fallback，并按部署环境替换存储与后端地址。
