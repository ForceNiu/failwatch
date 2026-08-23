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
| AI 分析 | LangGraph.js（分析流） |

## 本地开发

前置要求：Node.js 22+、pnpm 11+

```bash
pnpm install      # 安装全部依赖
pnpm dev          # 启动 web 看板（Vite dev server）
pnpm typecheck    # 全包 TypeScript 类型检查
```

分包单独操作：

```bash
pnpm --filter @failwatch/sdk typecheck
pnpm --filter @failwatch/collector dev
```

## 项目状态

| 阶段 | 内容 | 状态 |
|---|---|---|
| M0 | monorepo 脚手架（sdk / collector / web / demo-app 四包） | ✅ 完成 |
| M1 | SDK 共享类型 `FailureEvent` 判别联合 + 收窄自证 | ✅ 完成（tsc 零报错） |
| M2 | collector 接收上报 + Zod 校验 + Neon 建表存储 | ⏳ 规划中 |
| M3 | web 看板：失败事件列表 / 筛选 / 详情 | ⏳ 规划中 |
| M4 | AI 报告：LangGraph 6 节点分析流（聚合→分级→归因→建议→汇总→校验） | ⏳ 规划中 |
| M5 | SDK 完整采集能力（捕获 JS 错 / Promise / 接口 / 资源 + breadcrumbs） | ⏳ 规划中 |
| M6 | demo-app 联调 + SSE 实时推送 | ⏳ 规划中 |
| M7 | 部署：Neon 建库 + Vercel | ⏳ 规划中 |

## 为什么用 monorepo

collector / web / demo-app 都要复用 SDK 里定义的 `FailureEvent` 数据结构。monorepo + pnpm workspace 让三处直接 import 同一份源码（软链接，非复制），实现**单一真相源**：复制会悄悄漂移、运行时才炸；共享 import 让错误在编译期就暴露。
