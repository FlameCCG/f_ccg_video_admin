/**
 * URL 相关工具
 */

const ABSOLUTE_URL_RE = /^[a-zA-Z][a-zA-Z\d+\-.]*:/

/**
 * 规范化资源 URL
 * 1. 修复后端偶发返回的 `http:/host/...` / `https:/host/...` 这类协议斜杠缺失问题；
 * 2. 后端对外契约返回根相对路径（如 /user_files/images/x.jpg），
 *    按 VITE_MEDIA_BASE 拼接 host；留空 = 同源（走网关/代理）。
 */
export function normalizeResourceUrl(url?: string | null): string {
  if (!url) return ''

  const trimmed = url.trim()
  if (!trimmed) return ''

  let result = trimmed

  if (/^https?:\/(?!\/)/i.test(result)) {
    result = result.replace(/^((?:https?)):\/(?!\/)/i, '$1://')
  } else if (/^https?:\\(?!\\)/i.test(result)) {
    result = result.replace(/^((?:https?)):\\(?!\\)/i, '$1://').replace(/\\/g, '/')
  }

  // 已携带协议 / 协议相对 / data / blob → 原样返回（含历史存量绝对 URL，兼容不改库）
  if (
    /^https?:\/\//i.test(result) ||
    result.startsWith('//') ||
    result.startsWith('data:') ||
    result.startsWith('blob:')
  ) {
    return result
  }

  // 其余视为后端返回的根相对路径：拼 VITE_MEDIA_BASE（默认空 = 同源）
  // 对象 key 可能没有前导斜杠；否则列表页会请求 /content/user_files/...。
  if (/^(?:user_files|uploads|images)\//.test(result)) result = `/${result}`
  const base = (import.meta.env.VITE_MEDIA_BASE as string | undefined)?.trim() ?? ''
  if (!base) return result

  return `${base.replace(/\/+$/, '')}/${result.replace(/^\/+/, '')}`
}

/**
 * 规范化通知/外链跳转 URL。
 * 避免 `chatgpt.com` 这类无协议地址被浏览器当成相对路径（如 `/message/chatgpt.com`）。
 * - `/video/1` 保持站内路径
 * - `https://example.com` 保持绝对地址
 * - `//example.com` → `http://example.com`
 * - `chatgpt.com` → `http://chatgpt.com`
 * 默认补 http，兼容性更好；明确需要 https 时可直接填写。
 */
export function normalizeExternalHref(url?: string | null): string {
  if (!url) return ''

  const trimmed = url.trim()
  if (!trimmed) return ''

  if (ABSOLUTE_URL_RE.test(trimmed)) return trimmed
  if (trimmed.startsWith('//')) return `http:${trimmed}`
  if (trimmed.startsWith('/')) return trimmed

  return `http://${trimmed}`
}
