// Mock LLM：开发默认（不烧钱）
// 策略：优先回放"样本库"里的真实响应（真实数据反哺 mock）→ 没有样本用内置假数据
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import path from 'node:path'
import type { ReportIssue } from './types.js'
import type { LLM } from './llm.js'

const SAMPLES_FILE = path.join(
  path.dirname(fileURLToPath(import.meta.url)),
  '../../data/llm-samples.json',
)

// 内置假数据（没有真实样本时用——关键词是"假"）
function fakeAnalysis(issue: ReportIssue) {
  return {
    ...issue,
    rootCause: `【mock】${issue.message} 的常见原因是依赖/配置/资源问题，需结合 stack 分析`,
    suggestion: '【mock】建议：检查相关日志 + 增加重试 + 定位根因后修复',
  }
}

export class MockLLM implements LLM {
  async analyze(issues: ReportIssue[]): Promise<ReportIssue[]> {
    // ① 尝试读样本库（真实 DeepSeek 调用录下来的响应）
    let samples: ReportIssue[] = []
    try {
      samples = JSON.parse(readFileSync(SAMPLES_FILE, 'utf-8'))
    } catch {
      samples = [] // 没有样本库 → 用内置假数据
    }

    // ② 有真实样本 → 回放；没有 → 假数据
    return issues.map((issue, i) => {
      const real = samples[i]
      if (real?.rootCause && real?.suggestion) {
        return { ...issue, rootCause: real.rootCause, suggestion: real.suggestion }
      }
      return fakeAnalysis(issue)
    })
  }
}
