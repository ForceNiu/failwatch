// M5 AI 报告的类型（报告 = 老板打开的"今日问题清单"）

// 报告里的一条问题（聚合后的一个 cluster + 评分 + LLM 分析）
export interface ReportIssue {
  fingerprint: string   // 问题身份证（指纹，同类合并的依据）
  message: string       // 摘要信息（如 "POST /api/login (500)"）
  kind: string          // 类型（js_error / api_error ...）
  severity: string      // 级别（low / medium / high / critical）
  count: number         // 出现次数（频次）
  score: number         // 严重度分（count × severity权重 × 年龄衰减，排序依据）
  firstSeen: number     // 首次出现时间戳（毫秒，算"多新"用）
  lastSeen: number      // 最后出现时间戳
  rootCause?: string    // LLM 归因（为什么发生）——可选，mock 时先空
  suggestion?: string   // LLM 建议（怎么修）——可选
}

// 整份报告
export interface FailureReport {
  generatedAt: number      // 生成时间戳
  windowHours: number      // 覆盖多少小时（如 24 = 看过去 24 小时）
  totalEvents: number      // 总错误数（所有事件）
  topIssues: ReportIssue[] // 问题列表（按 score 降序，最该修的在最前）
}
