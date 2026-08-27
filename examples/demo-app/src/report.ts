// 手动上报工具：api_error / resource_error（SDK 只自动捕获 js_error + unhandled_rejection）
import type { ApiErrorEvent, ResourceErrorEvent } from '@failwatch/sdk'

const ENDPOINT = '/api/ingest' // 走 vite 代理 → collector:4000/ingest

// 所有事件都带的公共字段（与 SDK 的 base() 一致）
function base(route: string) {
  return {
    id: crypto.randomUUID(),
    timestamp: Date.now(),
    route,
    userAgent: navigator.userAgent,
    severity: 'high' as const,
    breadcrumbs: [],
  }
}

// 接口错误上报（加购时 /api/boom 返回错误状态 → 构造 api_error）
export async function reportApiError(p: { route: string; url: string; method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH'; status: number; statusText?: string }) {
  const event: ApiErrorEvent = {
    ...base(p.route),
    kind: 'api_error',
    url: p.url,
    method: p.method,
    status: p.status,
    statusText: p.statusText,
  }
  await fetch(ENDPOINT, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(event),
  })
}

// 资源错误上报（商品图加载失败时 onError 触发）
export async function reportResourceError(p: { route: string; resourceUrl: string; resourceType: 'script' | 'link' | 'img' | 'css' | 'font' | 'media' }) {
  const event: ResourceErrorEvent = {
    ...base(p.route),
    kind: 'resource_error',
    resourceUrl: p.resourceUrl,
    resourceType: p.resourceType,
  }
  await fetch(ENDPOINT, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(event),
  })
}
