// LLM 抽象层（M5）：接口 + 按环境变量切换实现
// LLM_MODE=mock（默认）→ 假分析（开发零成本）
// LLM_MODE=deepseek → 真调 DeepSeek（空闲时段验证 + 录样本）
import type { ReportIssue } from './types.js'
import { MockLLM } from './llm-mock.js'
import { DeepSeekLLM } from './llm-deepseek.js'

// 接口：任何 LLM 实现都要能做这件事——给问题列表补上归因和建议
export interface LLM {
  analyze(issues: ReportIssue[]): Promise<ReportIssue[]>
}

// 按环境变量返回实现（依赖注入的简单版）
export function getLLM(): LLM {
  return process.env.LLM_MODE === 'deepseek' ? new DeepSeekLLM() : new MockLLM()
}
