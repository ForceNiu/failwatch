// groupFailures 的单测（第一个测试文件：示范）
import { describe, expect, it } from 'vitest'
import { groupFailures } from './cluster'
import type { FailureView } from './types'

// 造测试数据的小工具：给 id/kind/message，其余字段填固定值
function makeItem(id: string, kind: string, message: string): FailureView {
  return {
    id,
    kind,
    severity: 'high',
    route: '/save',
    message,
    timestamp: 1756000000000,
    createdAt: '2026-08-25T00:00:00.000Z',
  }
}

describe('groupFailures 聚类', () => {
  it('把相同的失败归成一组，count 正确', () => {
    const items = [
      makeItem('a', 'api_error', 'POST /api/login (500)'),
      makeItem('b', 'api_error', 'POST /api/login (500)'), // 和 a 指纹相同
      makeItem('c', 'js_error', 'Cannot read properties'), // 指纹不同
    ]

    const clusters = groupFailures(items)

    expect(clusters).toHaveLength(2) // 应该只有 2 个组
    expect(clusters[0].count).toBe(2) // 第一组 2 条
    expect(clusters[1].count).toBe(1) // 第二组 1 条
  })

  it('组内 items 保留全部明细，sample 是第一条', () => {
    const items = [
      makeItem('a', 'api_error', 'POST /api/login (500)'),
      makeItem('b', 'api_error', 'POST /api/login (500)'),
    ]

    const [cluster] = groupFailures(items)

    expect(cluster.items.map((i) => i.id)).toEqual(['a', 'b']) // 明细都在
    expect(cluster.sample.id).toBe('a') // 样本 = 第一条
  })
})
