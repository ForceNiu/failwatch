import { describe, expect, it } from 'vitest'
import { filterFailures } from './App'
import type { FailureView } from './types'

// 造数据工具：id + kind + severity + route，其余固定
function makeItem(id: string, kind: string, severity: string, route: string): FailureView {
  return {
    id, kind, severity, route,
    message: 'x', timestamp: 1756000000000, createdAt: '2026-08-25T00:00:00.000Z',
  }
}

describe('filterFailures 筛选', () => {
  const items = [
    makeItem('a', 'api_error', 'high', '/save'),
    makeItem('b', 'js_error', 'low', '/dashboard'),
    makeItem('c', 'api_error', 'low', '/home'),
  ]

  it('按 kind 筛选，只留匹配的', () => {
    const result = filterFailures(items, { kind: 'api_error' })
    expect(result.map((i) => i.id)).toEqual(['a', 'c'])
  })

  it('不传条件 → 全部返回', () => {
    expect(filterFailures(items, {})).toHaveLength(3)
  })

  it('按 route 模糊匹配（includes）', () => {
    const result = filterFailures(items, { route: '/sa' })
    expect(result.map((i) => i.id)).toEqual(['a'])
  })
})
