// 样本库读写（"真实数据反哺 mock"的基础设施，M5 调试加固）
// 路径可用 LLM_SAMPLES_FILE 环境变量覆盖（测试注入临时目录用，避免污染真实样本）
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import path from 'node:path'
import type { ReportIssue } from './types.js'

// 样本条目 = 问题分析 + 可选 usage（token 消耗，成本可追踪）
export interface SampleEntry extends ReportIssue {
  usage?: {
    prompt_tokens?: number
    completion_tokens?: number
    total_tokens?: number
  }
}

// 默认样本库路径（相对本文件：packages/collector/data/llm-samples.json）
const DEFAULT_SAMPLES_FILE = path.join(
  path.dirname(fileURLToPath(import.meta.url)),
  '../../data/llm-samples.json',
)

// 每次读取时解析（支持测试注入 LLM_SAMPLES_FILE，运行时也允许覆盖）
export function getSamplesFile(): string {
  return process.env.LLM_SAMPLES_FILE ?? DEFAULT_SAMPLES_FILE
}

// 样本上限：去重后只保留最近 N 条（防止无限膨胀）
export const SAMPLES_MAX = 200

// 读样本库：文件不存在 / 内容损坏 → 空数组（不抛错）
export function loadSamples(): SampleEntry[] {
  try {
    return JSON.parse(readFileSync(getSamplesFile(), 'utf-8')) as SampleEntry[]
  } catch {
    return []
  }
}

// 录制：目录不存在自动创建（防 ENOENT）→ 按 fingerprint 去重（新覆盖旧）→ 上限截断
export function appendSamples(
  newSamples: ReportIssue[],
  usage?: SampleEntry['usage'],
): void {
  mkdirSync(path.dirname(getSamplesFile()), { recursive: true })

  // Map 保证 fingerprint 唯一：先载入旧样本，再写入新样本（新分析覆盖旧分析）
  const byFp = new Map<string, SampleEntry>()
  for (const s of loadSamples()) byFp.set(s.fingerprint, s)
  for (const s of newSamples) byFp.set(s.fingerprint, { ...s, usage })

  const merged = Array.from(byFp.values()).slice(-SAMPLES_MAX)
  writeFileSync(getSamplesFile(), JSON.stringify(merged, null, 2))
}
