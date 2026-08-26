// Mock LLM：开发默认（不烧钱）
// 策略：优先按 fingerprint 回放"样本库"里的真实响应（真实数据反哺 mock）→ 没有样本用内置假数据
import type { ReportIssue } from './types.js'
import type { LLM } from './llm.js'
import { loadSamples } from './samples.js'

// 内置假数据（没有真实样本时用——关键词是"假"）
function fakeAnalysis(issue: ReportIssue): ReportIssue {
  return {
    ...issue,
    rootCause: `【mock】${issue.message} 的常见原因是依赖/配置/资源问题，需结合 stack 分析`,
    suggestion: '【mock】建议：检查相关日志 + 增加重试 + 定位根因后修复',
  }
}

export class MockLLM implements LLM {
  async analyze(issues: ReportIssue[]): Promise<ReportIssue[]> {
    const samples = loadSamples()

    // 按 fingerprint 匹配回放（不按索引：样本顺序 / issue 顺序变化都不会串台）
    return issues.map((issue) => {
      const real = samples.find((s) => s.fingerprint === issue.fingerprint)
      if (real?.rootCause && real?.suggestion) {
        return { ...issue, rootCause: real.rootCause, suggestion: real.suggestion }
      }
      return fakeAnalysis(issue)
    })
  }
}
