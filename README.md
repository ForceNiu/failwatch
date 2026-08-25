# FailWatch（失败监控平台）

一个**前端失败监控平台**（迷你 Sentry）：采集网页上的 JS 运行时错误、未捕获的 Promise 拒绝、接口 4xx/5xx、资源加载失败，统一上报后端存储，在 Dashboard 看板展示，并由 AI 生成每日整合报告与调整建议。

## 为什么做这个项目

此前在业务中使用 skyeye 只做**访问统计 / 功能使用统计**，前端失败与后端失败完全是盲区——页面出错了、接口 500 了，没有数据可查。FailWatch 就是为了补上这块盲区：把"失败"变成可采集、可存储、可分析、可改进的数据。

## 架构与数据流

```
用户网页出错
   │  SDK（前端采集包）捕获，打包成 FailureEvent
   ▼
POST 上报
   │  collector（后端）Zod 校验 → 存 Neon Postgres
   ▼
Dashboard 看板（web）查询展示
   │
   ▼
AI 每日/区间整合报告（LangGraph 分析流）
```

核心设计：全链路共享**同一份 `FailureEvent` 类型定义**（`packages/sdk/src/types.ts`，判别联合 discriminated union），SDK / collector / web 三处直接 import，改一处编译期三处同步，杜绝"字段对不上"。

## 目录结构（pnpm monorepo）

```
failwatch/
├── packages/
│   ├── sdk/          # 前端采集 SDK：捕获失败事件，定义共享类型
│   ├── collector/    # 后端服务：接收上报、校验（Zod）、存储（Neon Postgres）
│   └── web/          # Dashboard 看板（React + Vite + antd）
├── examples/
│   └── demo-app/     # 示例应用：演示 SDK 采集与上报
├── pnpm-workspace.yaml
├── package.json
└── .gitignore
```

## 技术栈

| 层 | 技术 |
|---|---|
| 仓库组织 | pnpm workspace monorepo（本地软链接共享，无需发版） |
| 语言 | TypeScript（strict） |
| SDK | 原生 TS，无框架依赖 |
| collector | Node.js + Express + Zod（运行时校验）+ postgres.js + Neon Postgres |
| web | React + Vite + antd |
| 测试 | Vitest（单测）+ GitHub Actions CI（typecheck / test / build） |
| AI 分析 | LangGraph.js（分析流，M5） |

## 本地开发

前置要求：Node.js 22+、pnpm 11+

```bash
pnpm install      # 安装全部依赖
pnpm dev          # 启动 web 看板（Vite dev server，5173）
pnpm typecheck    # 全包 TypeScript 类型检查
pnpm test         # 运行单测（vitest）
```

分包单独操作：

```bash
pnpm --filter @failwatch/collector dev   # 启动后端（4000 端口，需根目录 .env 的 DATABASE_URL）
```

SDK 验证（demo 页）：`pnpm dev` 后打开 http://localhost:5173/demo.html，点按钮故意抛错 → 看板列表/聚类标签下出现新记录（无需刷新）。

## 项目状态（2026-08-25）

| 阶段 | 内容 | 状态 |
|---|---|---|
| M0 | monorepo 脚手架（sdk / collector / web 三包） | ✅ 完成 |
| M1 | SDK：`FailureEvent` 判别联合 + 全局捕获（onerror / unhandledrejection）+ 上报 | ✅ 完成 |
| M2 | collector：Neon 建表存储 + Zod 校验 + /ingest + 查询路由 | ✅ 完成 |
| M3 | Dashboard：失败列表 / 筛选栏 / 聚类视图 | ✅ 完成 |
| — | 单测基线（vitest：groupFailures + filterFailures，5 断言） | ✅ 完成 |
| — | CI（GitHub Actions：typecheck / test / build 三道门禁） | ✅ 完成 |
| M4 | SSE 实时推送（新失败自动上板） | ⏳ 下一步 |
| M5 | AI 每日整合报告（LangGraph 分析流） | ⏳ 规划中 |
| M6 | demo-app 正式联调（示例应用接 SDK） | ⏳ 规划中 |
| M7 | 部署：Vercel 上线（面试可演示） | ⏳ 规划中 |

**已打通全链路**：浏览器抛错 → SDK 捕获打包 → POST /ingest → collector Zod 校验 → Neon 入库 → 看板列表/聚类展示。当前进度约 58%。

## 为什么用 monorepo

collector / web / demo-app 都要复用 SDK 里定义的 `FailureEvent` 数据结构。monorepo + pnpm workspace 让三处直接 import 同一份源码（软链接，非复制），实现**单一真相源**：复制会悄悄漂移、运行时才炸；共享 import 让错误在编译期就暴露。
