// DeepSeek LLM 测试：错误处理与降级（LLM 挂了监控不能挂）
import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest'
import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { DeepSeekLLM } from './llm-deepseek'
import { appendSamples, loadSamples } from './samples'
import type { ReportIssue } from './types'

let tmpDir: string

function makeIssue(fp: string): ReportIssue {
  return {
    fingerprint: fp, message: fp, kind: 'js_error', severity: 'high',
    count: 1, score: 1, firstSeen: 1, lastSeen: 1,
  }
}

// 模拟 fetch：默认返回 DeepSeek 风格的成功响应
function stubFetch(overrides: {
  ok?: boolean
  status?: number
  content?: string
  usage?: unknown
} = {}) {
  const { ok = true, status = 200, content = '[]', usage = undefined } = overrides
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
    ok,
    status,
    text: async () => 'server error',
    json: async () => ({ choices: [{ message: { content } }], usage }),
  }))
}

beforeEach(() => {
  tmpDir = mkdtempSync(path.join(tmpdir(), 'fw-llm-'))
  vi.stubEnv('LLM_SAMPLES_FILE', path.join(tmpDir, 'llm-samples.json'))
  vi.stubEnv('DEEPSEEK_API_KEY', 'sk-test')
})
afterEach(() => {
  vi.unstubAllEnvs()
  vi.unstubAllGlobals()
  rmSync(tmpDir, { recursive: true, force: true })
})

describe('DeepSeekLLM 降级（P0 修复点）', () => {
  it('API 返回 500 时不抛错，有历史样本则回放', async () => {
    // 先造一条真实样本（模拟之前录过）
    appendSamples([{ ...makeIssue('fp1'), rootCause: '历史根因', suggestion: '历史建议' }])
    stubFetch({ ok: false, status: 500 })

    const llm = new DeepSeekLLM()
    const result = await llm.analyze([makeIssue('fp1'), makeIssue('fp2')])

    expect(result).toHaveLength(2)
    // fp1 命中历史样本 → 回放
    expect(result[0].rootCause).toBe('历史根因')
    // fp2 无样本 → 留空（宁缺毋假）
    expect(result[1].rootCause).toBeUndefined()
  })

  it('响应不是合法 JSON 时不抛错，降级', async () => {
    stubFetch({ content: '这不是 JSON' })
    const result = await new DeepSeekLLM().analyze([makeIssue('fp1')])
    expect(result).toHaveLength(1)
    expect(result[0].rootCause).toBeUndefined()
  })

  it('fetch 网络异常（reject）时不抛错，降级', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('network down')))
    const result = await new DeepSeekLLM().analyze([makeIssue('fp1')])
    expect(result).toHaveLength(1)
    expect(result[0].rootCause).toBeUndefined()
  })
})

describe('DeepSeekLLM 正常路径', () => {
  it('API 正常返回时合并 rootCause/suggestion，并录制样本', async () => {
    stubFetch({
      content: JSON.stringify([{ fingerprint: 'fp1', rootCause: '真根因', suggestion: '真建议' }]),
      usage: { prompt_tokens: 86, completion_tokens: 10, total_tokens: 96 },
    })
    const result = await new DeepSeekLLM().analyze([makeIssue('fp1')])

    expect(result[0].rootCause).toBe('真根因')
    expect(result[0].suggestion).toBe('真建议')
    // 样本录制成功 + 带 usage
    const samples = loadSamples()
    expect(samples).toHaveLength(1)
    expect(samples[0].usage?.total_tokens).toBe(96)
  })

  it('LLM 返回的 fingerprint 不匹配时，不覆盖原问题（静默丢归因）', async () => {
    stubFetch({
      content: JSON.stringify([{ fingerprint: '别的指纹', rootCause: 'x', suggestion: 'y' }]),
    })
    const result = await new DeepSeekLLM().analyze([makeIssue('fp1')])
    expect(result[0].rootCause).toBeUndefined()
  })
})

describe('DeepSeekLLM 前置校验', () => {
  it('缺少 DEEPSEEK_API_KEY 时抛出明确错误', async () => {
    vi.stubEnv('DEEPSEEK_API_KEY', '')
    await expect(new DeepSeekLLM().analyze([makeIssue('fp1')])).rejects.toThrow(/DEEPSEEK_API_KEY/)
  })
})
