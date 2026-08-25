// FailWatch 采集后端入口
import express from 'express'
import ingestRouter from './routes/ingest.js'
import queryRouter from './routes/query.js'

const app = express()

// 中间件：把请求体（JSON）解析成 JS 对象，否则 req.body 是 undefined
app.use(express.json())

// 挂载路由：POST /ingest（写入）+ GET /failures（查询）
app.use(ingestRouter)
app.use(queryRouter)

app.get('/health', (_req, res) => {
  res.json({ ok: true })
})

const port = 4000
app.listen(port, () => {
  console.log(`FailWatch collector listening on :${port}`)
})
