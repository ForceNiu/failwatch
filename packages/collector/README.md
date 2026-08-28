# @failwatch/collector

采集后端：接收 SDK 上报 → Zod（运行时校验库）校验 → 存 Postgres → 提供查询、SSE 推送与 AI 报告。

默认监听 **4000** 端口。

## 路由

| 方法 | 路径 | 作用 | 备注 |
|---|---|---|---|
| POST | `/ingest` | 接收上报事件 | 挂了限流 + 可选鉴权中间件 |
| GET | `/failures` | 查询失败列表 | 支持按 kind / severity / route 过滤 |
| GET | `/events` | SSE（Server-Sent Events，服务端推送）长连接 | 每 15s 发 `event: ping` 心跳 |
| GET | `/report?hours=24` | AI 整合报告 | 按评分排序 Top 问题并调 LLM 归因 |
| GET | `/boom?type=500` | 故意返回错误状态 | 供 demo-app 演示接口错误采集 |
| GET | `/health` | 健康检查 | 返回 `{ ok: true }` |

## 启动

```bash
pnpm --filter @failwatch/collector dev              # 开发（热重载，LLM 走 mock）
pnpm --filter @failwatch/collector start:deepseek   # 真实 AI 归因（需 DEEPSEEK_API_KEY）
pnpm --filter @failwatch/collector seed             # 一次性造 25 条测试数据
pnpm --filter @failwatch/collector seed:watch       # 每 2 分钟发 1 条（配合 SSE 看实时效果）
```

> 所有命令都从仓库根目录 `.env` 读 `DATABASE_URL`。数据库连接是**懒加载**的——首次查询时才真正建立，所以 CI 里没有 `DATABASE_URL` 也能跑测试。

## 环境变量

见仓库根目录 `.env.example`：`DATABASE_URL` / `ALLOWED_ORIGINS` / `INGEST_API_KEY` / `DEEPSEEK_API_KEY` / `LLM_MODE`。

## 写入端安全

`/ingest` 单独挂了两道中间件（`src/security.ts`），不波及查询和 SSE：

- **限流**：内存固定窗口，每 IP 每分钟 100 次，超出返回 429 + `Retry-After`。当前是单实例内存实现，多实例部署需换成 Redis 等共享存储。
- **鉴权**：设了 `INGEST_API_KEY` 才校验（Bearer 头或 `?apiKey=`），未设置则放行，保证本地 demo 零配置。

## 目录

| 路径 | 作用 |
|---|---|
| `src/index.ts` | 入口：CORS / body 上限 / 安全中间件 / 路由挂载 / 请求超时 |
| `src/routes/` | 五个路由 |
| `src/ai/` | LLM 抽象层（`deepseek` / `mock` 双实现）+ 评分模型 |
| `src/security.ts` | 限流 + 写入鉴权 |
| `src/sse.ts` | SSE 广播 |
| `src/store.ts` | 数据库访问（懒加载连接） |
