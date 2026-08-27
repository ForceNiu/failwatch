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
    'Cache-Control': 'no-cache, no-transform',
    Connection: 'keep-alive',
    // 关键：告诉任何中间代理（Nginx / 沙箱代理）不要缓冲 SSE 流，
    // 否则数据会攒到心跳才 flush，且长连接易被代理按 idle 超时掐断
    'X-Accel-Buffering': 'no',
  })

  // ② 心跳：每 15 秒发一个真实的 `event: ping` 事件（不是注释行）
  //    注释行会被浏览器丢弃、客户端感知不到；改成命名事件后，
  //    客户端能用它做"看门狗"——超过阈值没收到 ping 就判定连接已死、主动重连。
  const heartbeat = setInterval(() => {
    res.write(`event: ping\ndata: ${Date.now()}\n\n`)
  }, 15000)

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
