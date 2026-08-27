// FailWatch 采集后端入口
import express from 'express'
import http from 'node:http'
import ingestRouter from './routes/ingest.js'
import queryRouter from './routes/query.js'
import eventsRouter from './routes/events.js'
import reportRouter from './routes/report.js'
import boomRouter from './routes/boom.js'
import { rateLimit, ingestAuth } from './security.js'

const app = express()

// CORS：允许的来源白名单。本地 demo 多端口（web 5173 / demo-app 5175）→ collector 4000，
// 不设 ALLOWED_ORIGINS 时回退 '*' 保证本地零配置可跑；上线前必须设具体域名（见 CODE_REVIEW.md 2.2）。
const allowedOrigins = (process.env.ALLOWED_ORIGINS ?? '*')
  .split(',')
  .map((o) => o.trim())
  .filter(Boolean)

app.use((req, res, next) => {
  const origin = req.headers.origin
  // 命中白名单才回显具体 origin；带凭据也不能用 '*'，必须具体域名
  if (allowedOrigins.includes('*')) {
    res.set('Access-Control-Allow-Origin', '*')
  } else if (origin && allowedOrigins.includes(origin)) {
    res.set('Access-Control-Allow-Origin', origin)
  }
  res.set('Access-Control-Allow-Methods', 'GET,POST,OPTIONS')
  res.set('Access-Control-Allow-Headers', 'Content-Type')
  if (req.method === 'OPTIONS') return res.sendStatus(204)
  next()
})

// 中间件：把请求体（JSON）解析成 JS 对象，否则 req.body 是 undefined。
// limit 限制最大 1mb，防止超大 body 撑爆 Node 内存 / 数据库。
app.use(express.json({ limit: '1mb' }))

// 写入端点安全：限流 + 可选鉴权（只作用于 /ingest，不波及 SSE 查询等其他路由）
app.use('/ingest', rateLimit, ingestAuth)

// 挂载路由：ingest（写入）+ failures（查询）+ events（SSE）+ report（AI 报告）+ boom（故意失败）
app.use(ingestRouter)
app.use(queryRouter)
app.use(eventsRouter)
app.use(reportRouter)
app.use(boomRouter)

app.get('/health', (_req, res) => {
  res.json({ ok: true })
})

const port = 4000
const server = http.createServer(app)
// requestTimeout：从请求发起到完整接收的超时（Node 默认 5 分钟）。
// 之前设 0（永不超时）会被慢速攻击占满连接，改为 30s 作合理上限。
// 对 /events 的 SSE 长连接无影响：GET 无请求体，请求瞬间接收完，响应流靠心跳保活。
server.requestTimeout = 30000
server.listen(port, () => {
  console.log(`FailWatch collector listening on :${port}`)
})
