// inferSeverity 的测试（TDD：先红后绿）
import { describe, expect, it } from 'vitest'
import { inferSeverity } from './severity'

// 造事件：默认 js_error，可覆盖 kind/status（测试只需要这两个字段，其余固定）
function makeEvent(over: Partial<{ kind: string; status: number; resourceType: string }> = {}) {
  return {
    kind: 'js_error',
    timestamp: 1,
    route: '/',
    userAgent: 'x',
    severity: 'high',
    breadcrumbs: [],
    ...over,
  } as any // as any：测试里简化类型（生产代码有真实类型约束）
}

describe('inferSeverity 严重度规则', () => {
  it('api_error 500 → critical（服务端炸，最严重）', () => {
    expect(inferSeverity(makeEvent({ kind: 'api_error', status: 500 }))).toBe('critical')
  })

  it('api_error 400 → medium（请求方问题，一般）', () => {
    expect(inferSeverity(makeEvent({ kind: 'api_error', status: 400 }))).toBe('medium')
  })

  it('js_error → high（脚本崩，交互坏）', () => {
    expect(inferSeverity(makeEvent({ kind: 'js_error' }))).toBe('high')
  })

  it('unhandled_rejection → medium（可能静默失败）', () => {
    expect(inferSeverity(makeEvent({ kind: 'unhandled_rejection' }))).toBe('medium')
  })

  it('resource_error script → high（JS 脚本加载失败 = 功能崩）', () => {
    expect(inferSeverity(makeEvent({ kind: 'resource_error', resourceType: 'script' }))).toBe('high')
  })

  it('resource_error img → low（图片失败 = 样式瑕疵）', () => {
    expect(inferSeverity(makeEvent({ kind: 'resource_error', resourceType: 'img' }))).toBe('low')
  })
})
