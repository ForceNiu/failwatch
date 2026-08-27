// scoring 的测试（技术实现的验证：公式对不对）
import { describe, expect, it } from 'vitest'
import { severityWeight, ageDecay, scoreCluster, rankIssues } from './scoring'
import type { ReportIssue } from './types'

describe('severityWeight 权重', () => {
  it('四档映射 1/2/3/4', () => {
    expect(severityWeight('low')).toBe(1)
    expect(severityWeight('medium')).toBe(2)
    expect(severityWeight('high')).toBe(3)
    expect(severityWeight('critical')).toBe(4)
  })

  it('未知级别兜底 1（不崩）', () => {
    expect(severityWeight('unknown' as string)).toBe(1)
  })
})

describe('ageDecay 年龄衰减', () => {
  it('刚发生（now = firstSeen）→ 权重 1', () => {
    expect(ageDecay(1000, 1000)).toBe(1)
  })

  it('12 小时后 → 权重减半（0.5）', () => {
    const twelveHours = 12 * 3600 * 1000
    expect(ageDecay(1000, 1000 + twelveHours)).toBeCloseTo(0.5, 5)
  })
})

describe('scoreCluster 综合评分', () => {
  it('count × 权重 × 衰减（刚发生：衰减=1）', () => {
    const now = 1000
    expect(scoreCluster(10, 'high', now, now)).toBe(30) // 10 × 3 × 1
  })

  it('越老分数越低（同一个问题，12 小时后分减半）', () => {
    const now = 1000
    const twelveHours = 12 * 3600 * 1000
    const fresh = scoreCluster(10, 'high', now, now)          // 刚发生
    const old = scoreCluster(10, 'high', now, now + twelveHours) // 12 小时后
    expect(old).toBeCloseTo(fresh / 2, 5)
  })
})

describe('rankIssues 排序取 TOP', () => {
  it('按 score 降序 + 只取前 N', () => {
    const issues: ReportIssue[] = [
      { fingerprint: 'a', message: 'x', kind: 'x', severity: 'low', count: 1, score: 10, firstSeen: 1, lastSeen: 1 },
      { fingerprint: 'b', message: 'y', kind: 'x', severity: 'low', count: 1, score: 99, firstSeen: 1, lastSeen: 1 },
      { fingerprint: 'c', message: 'z', kind: 'x', severity: 'low', count: 1, score: 50, firstSeen: 1, lastSeen: 1 },
    ]
    const top = rankIssues(issues, 2)
    expect(top.map((i) => i.fingerprint)).toEqual(['b', 'c']) // 99 最高，取 2 个
  })
})
