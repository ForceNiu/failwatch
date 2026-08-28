// GET /api/report：生成 AI 报告（M5）
// 前端打开报告页 → 调这里 → 返回"今日问题清单"
import { Router } from 'express'
import { generateReport } from '../ai/analyze.js'

const router = Router()

// ?hours=24 可调时间窗（默认 24 小时）；?kind= / ?severity= / ?route= 顶部筛选（报告也生效）
router.get('/report', async (req, res) => {
  const hours = Number(req.query.hours) || 24
  const kind = typeof req.query.kind === 'string' ? req.query.kind : undefined
  const severity =
    typeof req.query.severity === 'string' ? req.query.severity : undefined
  const route =
    typeof req.query.route === 'string' ? req.query.route : undefined
  try {
    const report = await generateReport(hours, { kind, severity, route })
    res.json(report)
  } catch (err) {
    console.error('生成报告失败:', err)
    res.status(500).json({ error: '报告生成失败' })
  }
})

export default router
