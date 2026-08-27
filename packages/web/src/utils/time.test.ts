import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { formatDateTime, formatRelative } from './time'

// 固定"当前时间"为基准，让"相对时间"可断言（不依赖真实运行时刻）
const NOW = new Date('2026-08-27T08:00:00.000Z').getTime()
const restore = () => vi.restoreAllMocks()
afterEach(restore)

describe('formatDateTime', () => {
  it('epoch 毫秒数 → YYYY-MM-DD HH:mm:ss（按本地时区，中国 GMT+8 应为 16:00）', () => {
    // 2026-08-27T08:00:00Z 在北京时间 = 2026-08-27 16:00:00
    expect(formatDateTime(NOW)).toBe('2026-08-27 16:00:00')
  })

  it('ISO 字符串也能解析', () => {
    expect(formatDateTime('2026-08-27T08:00:00.000Z')).toBe('2026-08-27 16:00:00')
  })
})

describe('formatRelative', () => {
  beforeEach(() => vi.spyOn(Date, 'now').mockReturnValue(NOW))

  it('1 分钟内 → 刚刚', () => {
    expect(formatRelative(NOW - 30 * 1000)).toBe('刚刚')
  })
  it('5 分钟前', () => {
    expect(formatRelative(NOW - 5 * 60 * 1000)).toBe('5 分钟前')
  })
  it('3 小时前', () => {
    expect(formatRelative(NOW - 3 * 60 * 60 * 1000)).toBe('3 小时前')
  })
  it('2 天前', () => {
    expect(formatRelative(NOW - 2 * 24 * 60 * 60 * 1000)).toBe('2 天前')
  })
})
