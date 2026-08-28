/**
 * FailWatch SDK 捕获层（M1.2）
 * 监听全局错误（window.onerror + unhandledrejection）→ 打包成 FailureEvent → 发送
 */
import type { JsErrorEvent, UnhandledRejectionEvent } from './types.js'
import { send } from './transport.js'

// 生成所有失败都带的公共字段（对照 M1 的 BaseFailure）
function base() {
  return {
    id: crypto.randomUUID(), // 每条事件的唯一 ID
    timestamp: Date.now(), // 发生时间（毫秒）
    route: location.pathname, // 当前页面路径
    userAgent: navigator.userAgent, // 浏览器标识
    severity: 'high' as const, // 默认高严重度
    breadcrumbs: [], // 行为轨迹（M1.3 扩展，先空数组）
  }
}

// ===== 打包：把 Error 对象 → JsErrorEvent（TODO ① 你填）=====
// 对照 M1 的 JsErrorEvent 形状：
// { kind: 'js_error'; message: string; stack?: string; filename?: string; lineno?: number; colno?: number }
// 记得用 ...base() 展开公共字段
export function captureJsError(error: Error): JsErrorEvent {
  return {
    // TODO 填：...base() + kind/message/stack 等
    ...base(), // 公共字段（id/timestamp/route/userAgent/severity/breadcrumbs）
    kind: 'js_error', // 判别联合的"种类标签"
    message: error.message, // 错误信息
    stack: error.stack, // 调用栈
  }
}

// 打包：把 Promise 拒绝原因 → UnhandledRejectionEvent
export function captureUnhandledRejection(
  reason: unknown,
): UnhandledRejectionEvent {
  const message = reason instanceof Error ? reason.message : String(reason)
  const stack = reason instanceof Error ? reason.stack : undefined
  return {
    ...base(),
    kind: 'unhandled_rejection',
    reason: message,
    stack,
  }
}

// ===== 入口：装监听器（M1.4）=====
// init({ endpoint }) 让调用方配置上报地址
export function init(opts: { endpoint: string }): void {
  // 全局 JS 错误 → js_error
  window.onerror = (_msg, _source, _lineno, _colno, error) => {
    if (error) {
      send(captureJsError(error), opts.endpoint)
    }
  }

  // 未捕获的 Promise 拒绝 → unhandled_rejection
  window.addEventListener('unhandledrejection', (e) => {
    send(captureUnhandledRejection(e.reason), opts.endpoint)
  })
}
