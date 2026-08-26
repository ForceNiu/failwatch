import { describe, expect, it } from 'vitest'
import { formatSse } from './sse'   // ← 注意：这个文件还不存在！这就是"红"

describe('formatSse 格式化', () => {
  it('对象 → data: + JSON + 空行', () => {
    // TODO：expect(formatSse({ id: 'x' })).toBe('data: {"id":"x"}\n\n')
    expect(formatSse({ id: 'x' })).toBe('data: {"id":"x"}\n\n')
  })

  it('含中文/引号的 JSON 正确转义', () => {
    // TODO：expect(formatSse({ msg: '接口 "500" 错误' })).toBe('data: {"msg":"接口 \\"500\\" 错误"}\n\n')
    expect(formatSse({ msg: '接口 "500" 错误' })).toBe('data: {"msg":"接口 \\"500\\" 错误"}\n\n')
  })
})
