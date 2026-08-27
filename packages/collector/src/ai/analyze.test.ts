// groupRows 的测试（纯函数：按指纹分组）
// M5 调试：指纹按类型取更细维度（api_error 看接口+状态码 / resource 看资源 / rejection 看原因）
import { describe, expect, it } from 'vitest'
import { groupRows } from './analyze'
import type { FailureRow } from '../store'

// 造行：id + kind + 可选的细粒度字段，其余固定
function makeRow(
  id: string,
  kind: string,
  opts: { message?: string; method?: string; url?: string; status?: number; resourceUrl?: string; resourceType?: string; reason?: string } = {},
): FailureRow {
  return {
    id, kind, severity: 'high', route: '/save', timestamp: 1000,
    created_at: '2026-08-26T00:00:00.000Z', user_agent: 'x',
    message: opts.message ?? null,
    url: opts.url ?? null, method: opts.method ?? null,
    status: opts.status ?? null, status_text: null,
    response_body: null,
    resource_url: opts.resourceUrl ?? null, resource_type: opts.resourceType ?? null,
    reason: opts.reason ?? null,
    stack: null, filename: null, lineno: null, colno: null,
    breadcrumbs: '[]', release: undefined, user_id: null,
  } as unknown as FailureRow
}

describe('groupRows 聚类（细粒度指纹）', () => {
  it('js_error 相同指纹（kind+message）归一组', () => {
    const groups = groupRows([
      makeRow('a', 'js_error', { message: 'boom' }),
      makeRow('b', 'js_error', { message: 'boom' }),
      makeRow('c', 'js_error', { message: 'bang' }),
    ])
    expect(groups).toHaveLength(2) // a+b 同组，c 单独
    expect(groups[0]).toHaveLength(2)
  })

  it('api_error 按 方法+接口+状态码 分组：同接口不同状态码 → 不同组', () => {
    const groups = groupRows([
      makeRow('a', 'api_error', { method: 'POST', url: '/api/login', status: 500 }),
      makeRow('b', 'api_error', { method: 'POST', url: '/api/login', status: 502 }),
      makeRow('c', 'api_error', { method: 'POST', url: '/api/order', status: 500 }),
    ])
    expect(groups).toHaveLength(3) // 500 / 502 / 不同接口，各一组（500 和 502 根因可能不同）
  })

  it('api_error 完全相同的 方法+接口+状态码 归一组', () => {
    const groups = groupRows([
      makeRow('a', 'api_error', { method: 'POST', url: '/api/login', status: 500 }),
      makeRow('b', 'api_error', { method: 'POST', url: '/api/login', status: 500 }),
    ])
    expect(groups).toHaveLength(1)
    expect(groups[0]).toHaveLength(2)
  })

  it('resource_error 按 资源类型+地址 分组', () => {
    const groups = groupRows([
      makeRow('a', 'resource_error', { resourceType: 'script', resourceUrl: '/js/main.js' }),
      makeRow('b', 'resource_error', { resourceType: 'script', resourceUrl: '/js/main.js' }),
      makeRow('c', 'resource_error', { resourceType: 'img', resourceUrl: '/img/logo.png' }),
    ])
    expect(groups).toHaveLength(2) // a+b 同组，c 单独
    expect(groups[0]).toHaveLength(2)
  })

  it('unhandled_rejection 按 原因 分组', () => {
    const groups = groupRows([
      makeRow('a', 'unhandled_rejection', { reason: 'timeout' }),
      makeRow('b', 'unhandled_rejection', { reason: 'timeout' }),
      makeRow('c', 'unhandled_rejection', { reason: 'aborted' }),
    ])
    expect(groups).toHaveLength(2)
    expect(groups[0]).toHaveLength(2)
  })
})
