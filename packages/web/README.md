# @failwatch/web

Dashboard（看板）前端：React + Vite + antd。默认 **5173** 端口。

## 三个视图

| Tab | 内容 |
|---|---|
| 列表 | 失败事件列表，支持按类型 / 严重度 / 路由筛选 |
| 聚类 | 按错误指纹自动分组，重复问题折叠，便于判断优先级 |
| AI 报告 | 选时间窗（24h / 48h / 7d），聚合 Top 问题并调用 LLM 生成中文归因与修复建议 |

## 本地开发代理

`vite.config.ts` 把 `/api` 开头的请求转发到 collector（4000 端口）并**去掉 `/api` 前缀**：

```
/api/failures  →  http://localhost:4000/failures
```

所以前端代码里统一写 `/api/xxx`，开发环境靠代理、生产环境同域部署天然免 CORS（跨域资源共享），同一份代码两边都能跑。

## 实时推送

`src/useSSE.ts` 是 SSE（Server-Sent Events，服务端推送）韧性 hook，新失败无需刷新自动上板。它解决了代理"静默掐断"长连接的问题，三道防线的细节见根目录 `README.md` 的「技术难点与设计取舍」。

连接状态通过标题旁的状态灯外显：实时（绿）/ 重连中（黄）/ 连接中（灰）。

## 命令

```bash
pnpm dev          # 从根目录跑，等价于 pnpm --filter @failwatch/web dev
pnpm test         # vitest 单测
pnpm typecheck    # tsc --noEmit
pnpm build        # 类型检查 + 生产构建
```

## 目录

| 路径 | 作用 |
|---|---|
| `src/App.tsx` | 页面骨架 + Tabs + AI 报告视图；纯函数 `toView` / `filterFailures` 也在这里（导出供单测直接 import） |
| `src/useSSE.ts` | SSE 韧性 hook（三道防线） |
| `src/components/` | 列表 / 聚类 / 筛选栏 |
| `src/cluster.ts` | 错误指纹分组算法 `groupFailures` |
| `src/utils/time.ts` | 时间格式化（按本地时区，测试需在 GMT+8 环境跑） |
| `src/demo.ts` | 独立演示页入口（对应 `demo.html`） |
