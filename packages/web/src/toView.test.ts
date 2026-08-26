import { describe, expect, it } from 'vitest'
import { toView } from './App'
import type { RawFailure } from './App'

// 造"原始行"：默认 js_error + 可覆盖任意字段
function makeRaw(over: Partial<RawFailure>): RawFailure {
  return {
    id: 'x',
    kind: 'js_error',
    severity: 'high',
    route: '/save',
    timestamp: '1756000000000',
    created_at: '2026-08-25T00:00:00.000Z',
    message: 'boom',
    url: null,
    method: null,
    status: null,
    resource_url: null,
    resource_type: null,
    ...over,
  }
}

describe('toView 转换', () => {
  // TODO 你写 3 个 it：
  // 用例①: toView(makeRaw({ kind: 'api_error', url: '/api/login', method: 'POST', status: 500, message: null }))
  //         → expect(result.message).toBe('POST /api/login (500)')
  // 用例②: toView(makeRaw({}))  → expect(result.message).toBe('boom')
  // 用例③: toView(makeRaw({ route: null })) → expect(result.route).toBe('')

  it('按 kind 筛选，只留匹配的', () => {
    const result = toView(makeRaw({ kind: 'api_error', url: '/api/login', method: 'POST', status: 500, message: null }))
    expect(result.message).toEqual('POST /api/login (500)')
  })

  it('不传条件 → 返回boom', () => {
    const result = toView(makeRaw({}))
    expect(result.message).toEqual('boom')
  })

  it('按route为null，返回空', () => {
    const result = toView(makeRaw({route: null}))
    expect(result.route).toEqual('')
  })

  it('resource_error 行 → 消息拼资源摘要', () => {
    const result = toView(makeRaw({ kind: 'resource_error', resource_url: '/logo.png', resource_type: 'img', message: null }))
    expect(result.message).toBe('资源加载失败：/logo.png (img)')
  })
})
