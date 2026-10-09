import { describe, expect, it } from 'vitest'
import { toRow } from './ingest'

// 造数据：基础字段（所有 kind 共有）
function makeBase() {
  return {
    id: 'x',
    timestamp: 1756000000000,
    route: '/save',
    userAgent: 'Mozilla/5.0',
    severity: 'high' as const,
    breadcrumbs: [],
  }
}

describe('toRow 摊平转换', () => {
  it('js_error → message/stack 摊平 + base 转换', () => {
    const row = toRow({
      ...makeBase(),
      kind: 'js_error',
      message: 'boom',
      stack: 'at foo',
      filename: 'a.js',
      lineno: 3,
      colno: 5,
    })
    expect(row.message).toBe('boom')
    expect(row.stack).toBe('at foo')
    expect(row.filename).toBe('a.js')
    expect(row.lineno).toBe(3)
    expect(row.colno).toBe(5)
    expect(row.user_agent).toBe('Mozilla/5.0')
    expect(row.breadcrumbs).toBe('[]')
  })

  it('unhandled_rejection → reason 摊平', () => {
    const row = toRow({
      ...makeBase(),
      kind: 'unhandled_rejection',
      reason: 'promise failed',
      stack: 'at p',
    })
    expect(row.reason).toBe('promise failed')
  })

  it('api_error → url/method/status 摊平', () => {
    const row = toRow({
      ...makeBase(),
      kind: 'api_error',
      url: '/api/login',
      method: 'POST',
      status: 500,
      statusText: 'Internal Server Error',
      responseBody: '{"err":"db"}',
    })
    expect(row.url).toBe('/api/login')
    expect(row.method).toBe('POST')
    expect(row.status).toBe(500)
    expect(row.status_text).toBe('Internal Server Error')
    expect(row.response_body).toBe('{"err":"db"}')
  })

  it('resource_error → resource_url/resource_type 摊平', () => {
    const row = toRow({
      ...makeBase(),
      kind: 'resource_error',
      resourceUrl: '/logo.png',
      resourceType: 'img',
    })
    expect(row.resource_url).toBe('/logo.png')
    expect(row.resource_type).toBe('img')
  })
})
