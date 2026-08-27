// M5 严重度规则：按事件类型 + 字段推断级别（业务规则）
import type { FailureEvent } from '@failwatch/sdk'

// 返回严重度（low / medium / high / critical）
// 规则 = 业务判断：哪种错误最影响用户 → 级越高
export function inferSeverity(event: FailureEvent): string {
  switch (event.kind) {
    case 'api_error':
      // 服务端 5xx = 用户功能不可用（最紧急）；4xx = 请求方问题（一般）
      return event.status >= 500 ? 'critical' : 'medium'
    case 'js_error':
      return 'high' // 页面脚本崩 = 交互直接坏
    case 'unhandled_rejection':
      return 'medium' // Promise 没处理 = 可能静默失败
    case 'resource_error':
      // script（JS 脚本）= 代码，加载失败功能崩 → high；img/css 等 = 装饰 → low
      return event.resourceType === 'script' ? 'high' : 'low'
  }
}
