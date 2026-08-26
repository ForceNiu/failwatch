// GET /api/report：生成 AI 报告（M5）
// 前端打开报告页 → 调这里 → 返回"今日问题清单"
import { Router } from 'express'
import { generateReport } from '../ai/analyze.js'

const router = Router()

// ?hours=24 可调时间窗（默认 24 小时）
router.get('/report', async (req, res) => {
  const hours = Number(req.query.hours) || 24
  try {
    const report = await generateReport(hours)
    res.json(report)
  } catch (err) {
    console.error('生成报告失败:', err)
    res.status(500).json({ error: '报告生成失败' })
  }
})

export default router
