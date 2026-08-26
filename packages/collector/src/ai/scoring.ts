// M5 评分（技术实现）：count × severity权重 × 年龄衰减
// 参照 Sentry 优先级：log level 分级 + 事件量 + 年龄衰减（每 12h 权重减半）
import type { ReportIssue } from './types.js'

// severity 四档 → 数字权重（人定的参数：对齐 Sentry 的 level 分级，等比好调）
const SEVERITY_WEIGHT = { low: 1, medium: 2, high: 3, critical: 4 } as const

export function severityWeight(severity: string): number {
  return SEVERITY_WEIGHT[severity as keyof typeof SEVERITY_WEIGHT] ?? 1
}

// 年龄衰减：问题越老分越低（每 12 小时权重减半）——Sentry 的 age decay
export function ageDecay(firstSeen: number, now: number): number {
  const HALF_LIFE_MS = 12 * 3600 * 1000 // 12 小时的毫秒数
  return Math.pow(0.5, (now - firstSeen) / HALF_LIFE_MS)
}

// 综合评分：又严重 × 又多 × 又新 → 分高，排序依据
export function scoreCluster(count: number, severity: string, firstSeen: number, now: number): number {
  return count * severityWeight(severity) * ageDecay(firstSeen, now)
}

// 排序：把聚类结果按评分降序排，返回 TOP N
export function rankIssues(issues: ReportIssue[], topN: number): ReportIssue[] {
  return [...issues].sort((a, b) => b.score - a.score).slice(0, topN)
}
