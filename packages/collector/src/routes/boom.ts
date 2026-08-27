// GET /api/boom：故意失败接口（demo-app 加购触发 api_error 用）
// ?type=500|502|503|404 —— 每种商品绑定一种错误状态码（固定可预期）
import { Router } from 'express'

const router = Router()

router.get('/boom', (req, res) => {
  const type = String(req.query.type || '500')
  const errors: Record<string, [number, string]> = {
    '500': [500, 'Internal Server Error'],
    '502': [502, 'Bad Gateway'],
    '503': [503, 'Service Unavailable'],
    '404': [404, 'Not Found'],
  }
  const [status, error] = errors[type] ?? [500, 'Internal Server Error']
  res.status(status).json({ error })
})

export default router
