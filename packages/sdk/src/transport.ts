/**
 * FailWatch SDK 传输层（M1.3）
 * 把打包好的 FailureEvent POST 到 collector 的 /ingest
 */
import type { FailureEvent } from './types.js'

// 发送一条失败事件到 collector
// 注意：监控 SDK 不能影响业务——发送失败要静默吞掉（catch 后什么都不做）
export function send(event: FailureEvent, endpoint: string): void {
  fetch(endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(event),
  }).catch(() => {
    // 静默失败：上报失败不影响页面正常运行
  })
}
