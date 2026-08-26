// DeepSeek LLM：真实调用（空闲时段验证用）
// 每次调用把响应"录"进样本库 → mock 下次回放（真实数据反哺 mock）
import { writeFileSync, readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import path from 'node:path'
import type { ReportIssue } from './types.js'
import type { LLM } from './llm.js'

const SAMPLES_FILE = path.join(
  path.dirname(fileURLToPath(import.meta.url)),
  '../../data/llm-samples.json',
)

export class DeepSeekLLM implements LLM {
  async analyze(issues: ReportIssue[]): Promise<ReportIssue[]> {
    const apiKey = process.env.DEEPSEEK_API_KEY
    if (!apiKey) {
      throw new Error('LLM_MODE=deepseek 但缺少 DEEPSEEK_API_KEY（.env 里配置）')
    }

    // ① 构造 prompt：把问题列表交给 LLM，让它逐条归因+建议（JSON 输出）
    const prompt = `你是前端监控专家。分析以下失败问题，每条给出 rootCause（根因）和 suggestion（修复建议），
用 JSON 数组返回，格式 [{"fingerprint":"...","rootCause":"...","suggestion":"..."}]
问题：${JSON.stringify(issues.map((i) => ({ fingerprint: i.fingerprint, message: i.message, count: i.count, severity: i.severity })))}`

    // ② 调 DeepSeek（OpenAI 兼容格式）
    const resp = await fetch('https://api.deepseek.com/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: 'deepseek-chat',
        messages: [{ role: 'user', content: prompt }],
        response_format: { type: 'json_object' },
      }),
    })
    const data = (await resp.json()) as { choices: { message: { content: string } }[] }
    const parsed = JSON.parse(data.choices[0].message.content) as ReportIssue[]

    // ③ 录制样本（真实数据反哺 mock）：追加进样本库
    appendSamples(parsed)

    // ④ 把 LLM 的分析合并回问题列表
    return issues.map((issue) => {
      const hit = parsed.find((p) => p.fingerprint === issue.fingerprint)
      return hit ? { ...issue, rootCause: hit.rootCause, suggestion: hit.suggestion } : issue
    })
  }
}

// 录制：读现有样本 → 追加新样本 → 写回（样本库越攒越真实）
function appendSamples(newSamples: ReportIssue[]): void {
  let existing: ReportIssue[] = []
  try {
    existing = JSON.parse(readFileSync(SAMPLES_FILE, 'utf-8'))
  } catch {
    existing = []
  }
  writeFileSync(SAMPLES_FILE, JSON.stringify([...existing, ...newSamples], null, 2))
}
