// M5 报告生成核心流程：拉数据 → 聚类 → 评分 → LLM 归因/建议 → 组装报告
import { filter, type FailureRow, type FailureFilter } from '../store.js'
import { scoreCluster, rankIssues } from './scoring.js'
import { getLLM } from './llm.js'
import type { FailureReport, ReportIssue } from './types.js'

// 指纹：按类型取更细的维度（M5 调试：让报告看得出"是什么问题"）
// api_error 的 message 在库里是 null → 用 方法+接口+状态码；resource 用 资源；rejection 用 原因
function makeFingerprint(row: FailureRow): string {
  switch (row.kind) {
    case 'api_error':
      return `api_error|${row.method ?? ''} ${row.url ?? ''} (${row.status ?? ''})`
    case 'resource_error':
      return `resource_error|${row.resource_type ?? ''} ${row.resource_url ?? ''}`
    case 'unhandled_rejection':
      return `unhandled_rejection|${row.reason ?? ''}`
    default:
      return `${row.kind}|${row.message ?? ''}`
  }
}

// 报告摘要：让老板一眼看出"是什么问题"（message 列的展示文本）
function makeSummary(row: FailureRow): string {
  switch (row.kind) {
    case 'api_error':
      return `${row.method ?? '?'} ${row.url ?? '?'} (${row.status ?? '?'})`
    case 'resource_error':
      return `资源加载失败：${row.resource_url ?? '?'} (${row.resource_type ?? '?'})`
    case 'unhandled_rejection':
      return `未捕获的 Promise 拒绝：${row.reason ?? '?'}`
    default:
      return row.message ?? row.kind
  }
}

// 按指纹分组（M3.3 的 Map 思想，collector 端用 FailureRow 实现）
export function groupRows(rows: FailureRow[]): FailureRow[][] {
  const buckets = new Map<string, FailureRow[]>()
  for (const row of rows) {
    const fp = makeFingerprint(row) // 指纹：类型 + 细粒度标识
    const bucket = buckets.get(fp) ?? []
    bucket.push(row)
    buckets.set(fp, bucket)
  }
  return Array.from(buckets.values())
}

// 生成报告：windowHours = 看过去多少小时；filters = 顶部筛选（kind/severity/route，可选）
// 顶部筛选现在也作用于报告（之前只有列表/聚类生效）
export async function generateReport(
  windowHours: number,
  filters: FailureFilter = {},
): Promise<FailureReport> {
  const now = Date.now()
  // ① 拉数据：时间窗内的所有失败行（filter 支持 from + 筛选条件）
  const rows = await filter({
    from: now - windowHours * 3600 * 1000,
    ...filters,
  })

  // ② 聚类 + ③ 评分：每个组 → 一条 ReportIssue
  const issues: ReportIssue[] = groupRows(rows).map((group) => {
    const first = group[0]
    const count = group.length
    const firstSeen = Math.min(...group.map((r) => r.timestamp)) // 组内最早
    const lastSeen = Math.max(...group.map((r) => r.timestamp)) // 组内最晚
    return {
      fingerprint: makeFingerprint(first),
      message: makeSummary(first), // 具体到"哪个接口/哪个资源/什么原因"
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
