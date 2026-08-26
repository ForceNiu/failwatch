// M5 报告生成核心流程：拉数据 → 聚类 → 评分 → LLM 归因/建议 → 组装报告
import { filter, type FailureRow } from '../store.js'
import { scoreCluster, rankIssues } from './scoring.js'
import { getLLM } from './llm.js'
import type { FailureReport, ReportIssue } from './types.js'

// 按指纹分组（M3.3 的 Map 思想，collector 端用 FailureRow 实现）
export function groupRows(rows: FailureRow[]): FailureRow[][] {
  const buckets = new Map<string, FailureRow[]>()
  for (const row of rows) {
    const fp = `${row.kind}|${row.message ?? ''}` // 指纹：类型 + 消息
    const bucket = buckets.get(fp) ?? []
    bucket.push(row)
    buckets.set(fp, bucket)
  }
  return Array.from(buckets.values())
}

// 生成报告：windowHours = 看过去多少小时
export async function generateReport(windowHours: number): Promise<FailureReport> {
  const now = Date.now()
  // ① 拉数据：时间窗内的所有失败行（filter 支持 from）
  const rows = await filter({ from: now - windowHours * 3600 * 1000 })

  // ② 聚类 + ③ 评分：每个组 → 一条 ReportIssue
  const issues: ReportIssue[] = groupRows(rows).map((group) => {
    const first = group[0]
    const count = group.length
    const firstSeen = Math.min(...group.map((r) => r.timestamp)) // 组内最早
    const lastSeen = Math.max(...group.map((r) => r.timestamp)) // 组内最晚
    return {
      fingerprint: `${first.kind}|${first.message ?? ''}`,
      message: first.message ?? first.kind,
      kind: first.kind,
      severity: first.severity, // 数据库里已存的级别（SDK 上报时定的）
      count,
      score: scoreCluster(count, first.severity, firstSeen, now), // 评分
      firstSeen,
      lastSeen,
    }
  })

  // ④ 排序取 TOP 10 + LLM 归因/建议（mock 默认，deepseek 空闲时段）
  const topIssues = rankIssues(issues, 10)
  const analyzed = await getLLM().analyze(topIssues)

  return {
    generatedAt: now,
    windowHours,
    totalEvents: rows.length,
    topIssues: analyzed,
  }
}
