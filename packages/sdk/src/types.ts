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

// ===== TODO 你写 ①：未捕获的 Promise 拒绝 =====
// 提示：kind 固定写 'unhandled_rejection'
//      独有字段：reason: string（拒绝原因）、stack?: string（可选调用栈）
export interface UnhandledRejectionEvent extends BaseFailure {
  kind: 'unhandled_rejection'
  reason: string
  stack?: string
}

// ===== TODO 你写 ②：接口错误（后端返回 4xx/5xx）=====
// 提示：kind 固定写 'api_error'
//      独有字段：url: string、method: 'GET'|'POST'|'PUT'|'DELETE'|'PATCH'、
//                status: number、statusText?: string、responseBody?: string
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

// ===== TODO 你写 ③：资源加载错误（js/css/图片等加载失败）=====
// 提示：kind 固定写 'resource_error'
//      独有字段：resourceUrl: string、resourceType: 'script'|'link'|'img'|'css'|'font'|'media'
export interface ResourceErrorEvent extends BaseFailure {
  kind: 'resource_error'
  resourceUrl: string
  resourceType: 'script' | 'link' | 'img' | 'css' | 'font' | 'media'
}

// ===== TODO 你写 ④：判别联合（把四种失败"或"起来）=====
// 写法：type FailureEvent = JsErrorEvent | UnhandledRejectionEvent | ApiErrorEvent | ResourceErrorEvent;
export type FailureEvent =
  JsErrorEvent | UnhandledRejectionEvent | ApiErrorEvent | ResourceErrorEvent

// ===== TODO 你写 ⑤：用 switch 描述每种失败（顺便验证类型收窄）=====
// function describe(e: FailureEvent): string {
//   switch (e.kind) {
//     case 'js_error':
//       return `JS 错误：${e.message}`;
//     // 补上另外三个 case
//   }
// }
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
