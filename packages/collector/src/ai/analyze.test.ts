// groupRows 的测试（纯函数：按指纹分组）
import { describe, expect, it } from 'vitest'
import { groupRows } from './analyze'
import type { FailureRow } from '../store'

// 造行：id + kind + message，其余固定
function makeRow(id: string, kind: string, message: string, timestamp: number): FailureRow {
  return {
    id, kind, severity: 'high', route: '/save', timestamp,
    created_at: '2026-08-26T00:00:00.000Z', user_agent: 'x',
    message, url: null, method: null, status: null, status_text: null,
    response_body: null, resource_url: null, resource_type: null,
    reason: null, stack: null, filename: null, lineno: null, colno: null,
    breadcrumbs: '[]', release: undefined, user_id: null,
  } as unknown as FailureRow
}

describe('groupRows 聚类', () => {
  it('相同指纹（kind+message）归一组', () => {
    const groups = groupRows([
      makeRow('a', 'api_error', 'POST /login (500)', 1000),
      makeRow('b', 'api_error', 'POST /login (500)', 2000),
      makeRow('c', 'js_error', 'boom', 3000),
    ])
    expect(groups).toHaveLength(2) // 2 组（a+b 同组，c 单独）
    expect(groups[0]).toHaveLength(2) // 第一组 2 条
    expect(groups[1]).toHaveLength(1)
  })

  it('message 不同 → 不同组', () => {
    const groups = groupRows([
      makeRow('a', 'api_error', 'POST /login (500)', 1000),
      makeRow('b', 'api_error', 'POST /login (400)', 2000),
    ])
    expect(groups).toHaveLength(2)
  })
})
