// 样本库读写测试（M5 调试加固：目录自动建 / 去重 / 上限 / 容错）
import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest'
import { mkdtempSync, rmSync, existsSync, readFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { appendSamples, loadSamples, SAMPLES_MAX } from './samples'
import type { ReportIssue } from './types'

let tmpDir: string

// 造一条问题（rootCause/suggestion 都带上，模拟真实样本）
function makeIssue(fp: string): ReportIssue {
  return {
    fingerprint: fp, message: fp, kind: 'js_error', severity: 'high',
    count: 1, score: 1, firstSeen: 1, lastSeen: 1,
    rootCause: `rc-${fp}`, suggestion: `sg-${fp}`,
  }
}

// 每个用例独立临时目录（放在深层子目录，专门验证"目录不存在自动建"）
beforeEach(() => {
  tmpDir = mkdtempSync(path.join(tmpdir(), 'fw-samples-'))
  vi.stubEnv('LLM_SAMPLES_FILE', path.join(tmpDir, 'nested', 'deep', 'llm-samples.json'))
})
afterEach(() => {
  vi.unstubAllEnvs()
  rmSync(tmpDir, { recursive: true, force: true })
})

describe('appendSamples 目录自动创建（P0 修复点）', () => {
  it('目录不存在时自动创建并写入文件', () => {
    appendSamples([makeIssue('fp1')])
    expect(existsSync(path.join(tmpDir, 'nested', 'deep', 'llm-samples.json'))).toBe(true)
    expect(loadSamples()).toHaveLength(1)
  })
})

describe('样本去重（P1 修复点）', () => {
  it('相同 fingerprint 只保留 1 条，新样本覆盖旧样本', () => {
    appendSamples([makeIssue('fp1')])
    appendSamples([{ ...makeIssue('fp1'), rootCause: '新根因', suggestion: '新建议' }])
    const samples = loadSamples()
    expect(samples).toHaveLength(1)
    expect(samples[0].rootCause).toBe('新根因')
  })

  it('不同 fingerprint 正常追加', () => {
    appendSamples([makeIssue('fp1'), makeIssue('fp2')])
    appendSamples([makeIssue('fp3')])
    expect(loadSamples()).toHaveLength(3)
  })
})

describe('样本上限（P1 修复点）', () => {
  it(`超过 ${SAMPLES_MAX} 条时截断，只保留最近的部分`, () => {
    const batch = Array.from({ length: SAMPLES_MAX + 50 }, (_, i) => makeIssue(`fp-${i}`))
    appendSamples(batch)
    const samples = loadSamples()
    expect(samples).toHaveLength(SAMPLES_MAX)
    // 保留的是靠后的指纹（最早的被淘汰）
    expect(samples[0].fingerprint).toBe(`fp-${50}`)
    expect(samples[samples.length - 1].fingerprint).toBe(`fp-${SAMPLES_MAX + 49}`)
  })
})

describe('loadSamples 容错', () => {
  it('文件不存在时返回空数组（不抛错）', () => {
    expect(loadSamples()).toEqual([])
  })

  it('文件内容损坏时返回空数组（不抛错）', () => {
    const file = path.join(tmpDir, 'nested', 'deep', 'llm-samples.json')
    // 先正常写一个，再手动写坏内容
    appendSamples([makeIssue('fp1')])
    // 手动覆盖成非法 JSON（直接写文件，绕过 appendSamples）
    const { writeFileSync } = require('node:fs')
    writeFileSync(file, '{oops not json')
    expect(loadSamples()).toEqual([])
  })
})

describe('usage 录制（P2）', () => {
  it('录制时携带 usage 字段（成本可追踪）', () => {
    appendSamples([makeIssue('fp1')], { prompt_tokens: 10, completion_tokens: 20, total_tokens: 30 })
    const samples = loadSamples()
    expect(samples[0].usage).toEqual({ prompt_tokens: 10, completion_tokens: 20, total_tokens: 30 })
  })
})
