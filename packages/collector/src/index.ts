// FailWatch 采集后端入口
import express from 'express'
import ingestRouter from './routes/ingest.js'
import queryRouter from './routes/query.js'
import eventsRouter from './routes/events.js'

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

// 挂载路由：POST /ingest（写入）+ GET /failures（查询）+ GET /events（SSE 频道）
app.use(ingestRouter)
app.use(queryRouter)
app.use(eventsRouter)

app.get('/health', (_req, res) => {
  res.json({ ok: true })
})

const port = 4000
app.listen(port, () => {
  console.log(`FailWatch collector listening on :${port}`)
})
