// FailWatch 上报 SDK 入口
// 导出共享类型 + SDK 使用方法
export type { FailureEvent, JsErrorEvent, UnhandledRejectionEvent, ApiErrorEvent, ResourceErrorEvent } from './types.js'
export { init } from './capture.js'
