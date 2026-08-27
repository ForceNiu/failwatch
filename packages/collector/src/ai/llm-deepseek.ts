// DeepSeek LLM：真实调用（空闲时段验证用）
// 每次调用把响应"录"进样本库 → mock 下次回放（真实数据反哺 mock）
// 健壮性（M5 调试加固）：
//   1) fetch 带超时：DeepSeek 挂起时不能无限拖死报告
//   2) API 报错 / JSON 解析失败 → 降级回放样本库历史分析（LLM 挂了监控不能挂）
//   3) 录制时目录自动创建（防 ENOENT）+ 去重 + 上限（见 samples.ts）
//   4) 录制带 usage，成本可追踪
import type { ReportIssue } from './types.js'
import type { LLM } from './llm.js'
import { appendSamples, loadSamples } from './samples.js'

// DeepSeek 调用超时（毫秒）
const TIMEOUT_MS = 30_000

export class DeepSeekLLM implements LLM {
  async analyze(issues: ReportIssue[]): Promise<ReportIssue[]> {
    const apiKey = process.env.DEEPSEEK_API_KEY
    if (!apiKey) {
      throw new Error('LLM_MODE=deepseek 但缺少 DEEPSEEK_API_KEY（.env 里配置）')
    }

    // ① 构造 prompt：把问题列表交给 LLM，让它逐条归因+建议（JSON 输出）
    // 显式要求简体中文：v4-flash 偶发输出英文（实测约 1/3），加约束后基本稳定中文
    const prompt = `你是前端监控专家。分析以下失败问题，每条给出 rootCause（根因）和 suggestion（修复建议），
用 JSON 数组返回，格式 [{"fingerprint":"...","rootCause":"...","suggestion":"..."}]
请用简体中文回答。
问题：${JSON.stringify(issues.map((i) => ({ fingerprint: i.fingerprint, message: i.message, count: i.count, severity: i.severity })))}`

    // ② 调 DeepSeek（OpenAI 兼容格式），带超时
    let data: { choices?: { message?: { content?: string } }[]; usage?: { prompt_tokens?: number; completion_tokens?: number; total_tokens?: number } }
    try {
      const resp = await fetch('https://api.deepseek.com/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model: 'deepseek-v4-flash', // 用户指定模型（v4-flash，便宜快）
          messages: [{ role: 'user', content: prompt }],
          response_format: { type: 'json_object' },
        }),
        signal: AbortSignal.timeout(TIMEOUT_MS),
      })

      // ③ API 非 2xx → 降级（不抛错，报告照常出；监控系统原则：LLM 挂了监控不能挂）
      if (!resp.ok) {
        console.error(`DeepSeek API ${resp.status}:`, await resp.text().catch(() => ''))
        return fallbackAnalysis(issues)
      }
      data = (await resp.json()) as typeof data
    } catch (err) {
      // 网络错误 / 超时 / JSON 解析失败 → 同样降级
      console.error('DeepSeek 调用失败:', err)
      return fallbackAnalysis(issues)
    }

    // ④ 安全解析：content 缺失或不是合法 JSON → 降级
    let parsed: ReportIssue[]
    try {
      const content = data.choices?.[0]?.message?.content
      if (!content) throw new Error('DeepSeek 返回空 content')
      parsed = JSON.parse(content) as ReportIssue[]
    } catch (err) {
      console.error('DeepSeek 响应解析失败:', err)
      return fallbackAnalysis(issues)
    }

    // ⑤ 录制样本（真实数据反哺 mock）：目录自动建 + 去重 + 上限 + 带 usage
    appendSamples(parsed, data.usage)

    // ⑥ 把 LLM 的分析合并回问题列表（fingerprint 匹配不到 / 内容为空 → 不覆盖）
    return issues.map((issue) => {
      const hit = parsed.find((p) => p.fingerprint === issue.fingerprint)
      return hit?.rootCause && hit?.suggestion
        ? { ...issue, rootCause: hit.rootCause, suggestion: hit.suggestion }
        : issue
    })
  }
}

// 降级策略：API 挂了 → 回放样本库里该 fingerprint 的历史真实分析；没有就留空（宁缺毋假）
export function fallbackAnalysis(issues: ReportIssue[]): ReportIssue[] {
  const samples = loadSamples()
  return issues.map((issue) => {
    const hit = samples.find((s) => s.fingerprint === issue.fingerprint)
    return hit?.rootCause && hit?.suggestion
      ? { ...issue, rootCause: hit.rootCause, suggestion: hit.suggestion }
      : issue
  })
}
