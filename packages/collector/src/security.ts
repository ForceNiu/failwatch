/**
 * FailWatch 采集后端安全中间件（质量门禁补充项）
 * - rateLimit：内存固定窗口限流，防止写入端点被刷爆（demo 阶段够用；生产应换 Redis 等共享存储）
 * - ingestAuth：可选写入鉴权，INGEST_API_KEY 设了才校验，否则放行（本地 demo 零配置）
 */
import type { Request, Response, NextFunction } from 'express'

// ===== 限流：内存固定窗口（per IP）=====
const WINDOW_MS = 60_000 // 1 分钟窗口
const MAX_PER_WINDOW = 100 // 每 IP 每分钟最多 100 次写入

const hits = new Map<string, { count: number; resetAt: number }>()

export function rateLimit(req: Request, res: Response, next: NextFunction) {
  // 预检请求（CORS OPTIONS）不占额度
  if (req.method === 'OPTIONS') return next()

  const key = req.ip ?? 'unknown'
  const now = Date.now()
  const bucket = hits.get(key)

  // 新窗口或窗口已过期 → 重置计数后放行
  if (!bucket || now > bucket.resetAt) {
    hits.set(key, { count: 1, resetAt: now + WINDOW_MS })
    return next()
  }

  bucket.count++
  if (bucket.count > MAX_PER_WINDOW) {
    res.set('Retry-After', String(Math.ceil((bucket.resetAt - now) / 1000)))
    return res.status(429).json({ error: '请求过于频繁，请稍后重试' })
  }
  next()
}

// ===== 写入鉴权（可选）=====
// INGEST_API_KEY 未设置 → 放行（本地 demo 零配置，SDK 无需带 token）
// 设置后 → /ingest 必须带 Authorization: Bearer <key> 或 ?apiKey=<key>，否则 401
export function ingestAuth(req: Request, res: Response, next: NextFunction) {
  const expected = process.env.INGEST_API_KEY
  if (!expected) return next() // 本地未配置 → 放开

  const header = req.headers['authorization']
  const queryKey =
    typeof req.query.apiKey === 'string' ? req.query.apiKey : undefined
  const provided = header?.startsWith('Bearer ') ? header.slice(7) : queryKey

  if (provided === expected) return next()

  res.set('WWW-Authenticate', 'Bearer')
  return res.status(401).json({ error: '缺少或非法的写入凭证' })
}
