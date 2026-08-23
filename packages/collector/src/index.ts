// FailWatch 采集后端入口（M0 占位骨架，M2 起接 SQLite + 路由）。
import express from 'express'

const app = express()
app.get('/health', (_req, res) => {
  res.json({ ok: true })
})

const port = 4000
app.listen(port, () => {
  console.log(`FailWatch collector listening on :${port}`)
})
