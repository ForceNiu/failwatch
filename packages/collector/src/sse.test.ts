import { describe, expect, it } from 'vitest'
import { formatSse } from './sse'

describe('formatSse 格式化', () => {
  it('对象 → data: + JSON + 空行', () => {
    expect(formatSse({ id: 'x' })).toBe('data: {"id":"x"}\n\n')
  })

  it('含中文/引号的 JSON 正确转义', () => {
    expect(formatSse({ msg: '接口 "500" 错误' })).toBe(
      'data: {"msg":"接口 \\"500\\" 错误"}\n\n',
    )
  })
})
