/**
 * FailWatch collector 查询路由（M2 任务 2.3）
 * GET /failures：把数据库里的失败记录查出来（支持筛选）
 */
import { Router } from 'express'
import { filter } from '../store.js'

const router = Router()

// GET /failures?kind=api_error&severity=high&route=/save&from=1756000000&to=1756000999
// URL 里 ? 后面的叫 query 参数（查询字符串），Express 解析到 req.query
router.get('/failures', async (req, res) => {
  const q = req.query

  // req.query 里的值都是 string | undefined，要做类型转换
  // 数字参数（from/to）用 Number() 转成 number
  const rows = await filter({
    kind: typeof q.kind === 'string' ? q.kind : undefined,
    severity: typeof q.severity === 'string' ? q.severity : undefined,
    route: typeof q.route === 'string' ? q.route : undefined,
    from: typeof q.from === 'string' ? Number(q.from) : undefined,
    to: typeof q.to === 'string' ? Number(q.to) : undefined,
  })

  // postgres.js 的 bigint（timestamp）返回的是字符串，转成 number 方便前端用
  res.json(rows.map((r) => ({ ...r, timestamp: Number(r.timestamp) })))
})

export default router
