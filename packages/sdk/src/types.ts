/**
 * FailWatch 失败事件类型定义
 * 这是整个项目的"通用语言"：collector / web / demo-app 都 import 这里的 FailureEvent。
 * 下面 JsErrorEvent 是写好的【范例】，请你照它的模板补上另外三种失败。
 */

// ===== 公共基类：所有失败都带这些字段 =====
export interface BaseFailure {
  id: string
  timestamp: number
  route: string
  userAgent: string
  severity: 'low' | 'medium' | 'high' | 'critical'
  breadcrumbs: Breadcrumb[]
  release?: string
  userId?: string
}

// ===== 行为轨迹的一项 =====
export interface Breadcrumb {
  type: 'navigation' | 'click' | 'xhr' | 'console'
  timestamp: number
  message: string
}

// ===== 范例：JS 运行时错误（照这个模板写其它三种）=====
export interface JsErrorEvent extends BaseFailure {
  kind: 'js_error'
  message: string
  stack?: string
  filename?: string
  lineno?: number
  colno?: number
}

// 未捕获的 Promise 拒绝（unhandled_rejection）
export interface UnhandledRejectionEvent extends BaseFailure {
  kind: 'unhandled_rejection'
  reason: string
  stack?: string
}

// 接口错误（后端返回 4xx/5xx）
export interface ApiErrorEvent extends BaseFailure {
  kind: 'api_error'
  url: string
  method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH'
  status: number
  /**
   * 状态码的文字描述，如 404 → "Not Found"、500 → "Internal Server Error"
   */
  statusText?: string
  /**
   * 服务器返回的响应体，如错误时后端给的 JSON 错误信息或错误页 HTML
   */
  responseBody?: string
}

// 资源加载错误（js/css/图片等加载失败）
export interface ResourceErrorEvent extends BaseFailure {
  kind: 'resource_error'
  resourceUrl: string
  resourceType: 'script' | 'link' | 'img' | 'css' | 'font' | 'media'
}

// 判别联合：四种失败事件
export type FailureEvent =
  JsErrorEvent | UnhandledRejectionEvent | ApiErrorEvent | ResourceErrorEvent

export function describe(e: FailureEvent): string {
  switch (e.kind) {
    case 'js_error':
      return `JS 错误: ${e.message}`
    case 'unhandled_rejection':
      return `未捕获的 Promise 拒绝：${e.reason}`
    case 'api_error':
      return `接口错误：${e.method} ${e.url} (${e.status})`
    case 'resource_error':
      return `资源加载失败：${e.resourceUrl} (${e.resourceType})`
  }
}
