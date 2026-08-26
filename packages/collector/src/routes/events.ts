// GET /events：SSE 频道（M4）
// 浏览器连上来 → 保持长连接 → 有新失败就推给它（实时）
import { Router } from 'express'
import type { InsertRow } from '../store.js'
import { failureBus } from '../emitter.js'
import { formatSse } from '../sse.js'

const router = Router()

router.get('/events', (req, res) => {
  // ① SSE 响应头：流式 + 长连接（关键：text/event-stream）
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    Connection: 'keep-alive',
  })

  // ② 心跳：每 15 秒发个注释，防止中间代理把"安静的连接"掐断
  const heartbeat = setInterval(() => res.write(': ping\n\n'), 15000)

  // ③ 登记收听：广播中心一喊"failure"，就推给这个浏览器
  const onFailure = (row: InsertRow) => {
    res.write(formatSse(row))
  }
  failureBus.on('failure', onFailure)

  // ④ 浏览器断开时：停心跳 + 退订广播（不清理会内存泄漏）
  req.on('close', () => {
    clearInterval(heartbeat)
    failureBus.off('failure', onFailure)
  })
})

export default router
