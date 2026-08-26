// Mock LLM 测试：按 fingerprint 回放（顺序无关，不串台）
import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest'
import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { MockLLM } from './llm-mock'
import { appendSamples } from './samples'
import type { ReportIssue } from './types'

let tmpDir: string

function makeIssue(fp: string): ReportIssue {
  return {
    fingerprint: fp, message: fp, kind: 'js_error', severity: 'high',
    count: 1, score: 1, firstSeen: 1, lastSeen: 1,
  }
}

beforeEach(() => {
  tmpDir = mkdtempSync(path.join(tmpdir(), 'fw-mock-'))
  vi.stubEnv('LLM_SAMPLES_FILE', path.join(tmpDir, 'llm-samples.json'))
})
afterEach(() => {
  vi.unstubAllEnvs()
  rmSync(tmpDir, { recursive: true, force: true })
})

describe('MockLLM 回放（P1 修复点）', () => {
  it('有样本时按 fingerprint 匹配，即使传入顺序与样本顺序不同也不串台', async () => {
    // 样本顺序：a, b
    appendSamples([
      { ...makeIssue('fp-a'), rootCause: '根因A', suggestion: '建议A' },
      { ...makeIssue('fp-b'), rootCause: '根因B', suggestion: '建议B' },
    ])
    // 传入顺序：b, a（打乱）
    const result = await new MockLLM().analyze([makeIssue('fp-b'), makeIssue('fp-a')])

    expect(result[0].rootCause).toBe('根因B') // fp-b 拿到自己的
    expect(result[1].rootCause).toBe('根因A') // fp-a 拿到自己的
  })

  it('没有样本的 fingerprint 用【mock】假数据兜底', async () => {
    const result = await new MockLLM().analyze([makeIssue('fp-unknown')])
    expect(result[0].rootCause).toContain('【mock】')
  })

  it('样本库为空时全部用【mock】假数据', async () => {
    const result = await new MockLLM().analyze([makeIssue('a'), makeIssue('b')])
    expect(result.every((r) => String(r.rootCause).includes('【mock】'))).toBe(true)
  })
})
