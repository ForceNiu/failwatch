// FailWatch 采集后端入口
import express from 'express'
import http from 'node:http'
import ingestRouter from './routes/ingest.js'
import queryRouter from './routes/query.js'
import eventsRouter from './routes/events.js'
import reportRouter from './routes/report.js'
import boomRouter from './routes/boom.js'

const app = express()

// CORS 中间件：允许任何页面跨域上报（SDK 从别的站点 POST /ingest 必须的，Sentry 也这样）
app.use((_req, res, next) => {
  res.set('Access-Control-Allow-Origin', '*')
  res.set('Access-Control-Allow-Methods', 'GET,POST,OPTIONS')
  res.set('Access-Control-Allow-Headers', 'Content-Type')
  if (_req.method === 'OPTIONS') return res.sendStatus(204)
  next()
})

// 中间件：把请求体（JSON）解析成 JS 对象，否则 req.body 是 undefined
app.use(express.json())

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
// SSE 长连接（/events）的响应一直不结束。Node 默认 requestTimeout=300000(5分钟) 只管"请求接收阶段"，
// 对 SSE 这种无请求体的长响应不生效；仍显式设为 0 作为最佳实践（禁用任何请求超时），
// 避免未来有请求体时触发。真正的 SSE 保活靠心跳 + 代理/进程层治理。
server.requestTimeout = 0
server.listen(port, () => {
  console.log(`FailWatch collector listening on :${port}`)
})
