# FailWatch 代码审查标准与流程（Code Review Standard & Process）

> 版本：v1.0 · 适用：failwatch monorepo（sdk / collector / web / examples/demo-app）
> 定位：本仓库为**个人全栈 + AI 辅助**项目。审查机制的首要目标不是"防同事挖坑"，而是：
> 1. 把 AI 生成的代码变成**可理解、可信任**的代码；
> 2. 在合并前用自动化门禁挡住低级回归；
> 3. 作为作者（你）的**理解闸门**——每合并一行，都要讲得清它为什么这么写。

---

## 0. 三条核心原则

1. **AI 生成的代码 = 未受信补丁。** 它"看起来对"不等于"真的对"。每条 AI 改动都要过：编译过 → 行为可解释 → 无暗箱（`any` / 隐式 `any` / `as` 断言）→ 关键路径有测试。
2. **自动化门禁先挡，人工审查看逻辑。** 风格、类型、测试覆盖率交给 CI；人（或 AI 审查专家）只盯正确性、安全、架构。
3. **合并即承诺，必须"讲得清"。** 你独自开发没有第二双眼睛，所以 PR 描述要写清"改了什么 / 为什么 / 怎么验证"——这是替未来的你做笔记。

---

## 1. 严重度分级（评审注释统一用这三个标记）

| 标记 | 含义 | 处理要求 |
|---|---|---|
| 🔴 blocker | 合并前**必须修**。安全漏洞、数据损坏、破坏现有功能、类型彻底崩 | 不修不准合并 |
| 🟡 suggestion | 应该修。可维护性/正确性隐患、缺测试、性能次优 | 合并前修，或显式记录"已知取舍" |
| 💭 nit | 锦上添花。命名、注释、小重构 | 可选，不阻塞 |

---

## 2. 审查清单（按维度，针对本项目）

### 2.1 正确性（Correctness）
- 🔴 改动是否破坏现有链路？如：`/ingest` 字段增减是否同步 SDK 上报与 web `toView`；SSE 广播行是否含前端所需字段（**曾因缺 `created_at` 导致 undefined**）。
- 🔴 边界与异常：空数组、undefined、网络失败、超时是否被处理？
- 🟡 异步时序：`EventSource` / `setInterval` / `setTimeout` 在组件卸载时是否清理（避免泄漏/重复连接）？
- 🟡 状态更新是否幂等？SSE 重连后列表是否重复追加？

### 2.2 安全性（Security）
- ✅ **CORS 已收敛（2026-08-27）**：`index.ts` 抽成 `ALLOWED_ORIGINS` 环境变量白名单，缺省回退 `'*'`（本地多端口 demo 零配置），上线前设具体域名；命中才回显具体 origin。
- ✅ **`/ingest` 已加 速率限制 + body 上限 + 可选鉴权（2026-08-27）**：`express.json({ limit: '1mb' })` 限制请求体；`security.ts` 提供 per-IP 内存限流（60s/100 次，超限 429）+ 可选 `INGEST_API_KEY` 鉴权（设了才校验 Bearer/query，否则放行）。写入端点安全基线到位。
- 🟡 生产增强 TODO：限流当前是单实例内存计数，多副本需换 Redis 等共享存储；`INGEST_API_KEY` 上线前需配置且 SDK 端需支持携带 `apiKey` 上报。
- 🟡 是否把密钥写进代码/日志？`.env` 是否在 `.gitignore`（已忽略 ✅）。
- 🟡 用户输入是否都过 Zod 校验再入库？（`ingest.ts` 已有 Zod，新增字段需同步 schema）

### 2.3 类型与可维护性（TypeScript）
- 🔴 是否引入 `any` / `as any` / 非空断言 `!` 掩盖类型问题？strict 已开，审查要追这些逃逸点。
- 🟡 判别联合（如 `FailureEvent` kind 分支）是否用穷尽检查（`never`）？
- 🟡 注释是否"解释为什么（why）"而非"复述代码（what）"？本仓库注释普遍偏多，审查时删掉纯复述型注释。
- 💭 命名是否让 6 个月后的你一眼懂？

### 2.4 测试（Testing）
- 🔴 以下路径**必须有测试**：`/ingest` 校验与入库、`groupFailures` / `filterFailures`、评分模型、SSE 格式化（`formatSse`）、路由错误码。
- 🟡 纯函数（scoring / severity / cluster）100% 覆盖；UI 组件至少关键交互有测试。
- 🟡 "时间 / 随机 / 网络"相关逻辑是否用注入时钟 / `vi.mock` 固定（参考 `time.test.ts` 用 `vi` 固定 `Date.now`）？

### 2.5 性能（Performance）
- 🟡 SSE：是否每条连接都正确 `res.write` + 适时结束？长连接是否设了 `X-Accel-Buffering: no`（已加 ✅）、是否避免缓冲积压？
- 🟡 查询 / 聚类是否 N+1？当前数据量小，但 `query.ts` 拉全表需注意。
- 💭 是否有不必要的重渲染（`useMemo` / ref 持有回调，参考 `useSSE` 的 `onMsgRef` 模式）？

### 2.6 AI 生成代码专项（本仓库最关键的一条）
- 🔴 **可解释性闸门**：AI 写的每一段，作者必须能用自己话讲清因果（"为什么用 `EventSource` 不用 `WebSocket`"、"这个定时器为什么是 35s"）。讲不清 = 不允许合并。
- 🟡 是否做了"对照验证"？如 SSE 修复时曾用 `requestTimeout=8000` 临时值证明假设——这种实证习惯要保留。
- 🟡 AI 是否偷偷加了未声明的依赖 / 文件？合并前 `git status` 核对范围。
- 💭 注释里是否有"AI 语气"（过度解释 / 废话）？精简。

---

## 3. 审查流程（Process）

### 3.1 分支与提交（沿用现有约定）
- 功能 / 修复 → `feat/*` 或 `fix/*` 分支（已配 CI 对 `feat/**` 触发）。
- 提交信息用 conventional commits（`feat:` / `fix:` / `refactor:` / `test:` / `docs:`）。
- 合并用 `git merge --no-ff`，保留合并提交（已实践）。

### 3.2 自审清单（开 PR 前，作者自己过一遍）
开 PR 前，作者对照第 2 节勾选，并在 PR 描述里给出：
- **改了什么**（1-3 句）
- **为什么**（因果，不是"AI 说要"）
- **怎么验证**（命令 / 截图 / 实测现象）
- **自查**：□ 类型过 □ 测试过 □ 关键路径有测试 □ 无 `any`/暗箱 □ 理解每一行

### 3.3 谁来审
当前为单人项目，采用**双轨审查**：
1. **自动轨（CI）**：format + typecheck + lint + test + build 五道门禁必须全绿（见 3.5）。
2. **人工 / AI 轨**：作者可随时把 diff 交给「代码审查专家」做一轮结构化评审（🔴/🟡/💭）。**重大改动**（新路由、安全相关、SSE / 长连接）**强制**走这一轨。

### 3.4 PR 模板
已建 `.github/PULL_REQUEST_TEMPLATE.md`，把上述自审清单固化进每次 PR。

### 3.5 CI 门禁现状与缺口（重要）
现有 `ci.yml` 五道门禁：

| 门禁 | 命令 | 状态 | 说明 |
|---|---|---|---|
| Format | `pnpm format:check` | ✅ | Prettier 全仓检查（2026-08-29 纳入，最便宜的门禁放最前） |
| Typecheck | `pnpm -r typecheck` | ✅ | 覆盖三包 |
| Lint | `pnpm lint` | ✅ | ESLint flat config，强制 `no-explicit-any` 堵暗箱 |
| Unit test | `pnpm -r --if-present test` | ✅ | web + collector 全包跑（collector 40 + web 15 = 55 测试）；`store.ts` 懒加载使 CI 无 `DATABASE_URL` 也能绿 |
| Build | `pnpm -r build` | ✅ | 建 sdk + web |

**门禁演进记录**：
- 2026-08-27：collector 测试纳入 CI（`store.ts` 改懒加载 + `ci.yml` 改 `pnpm -r --if-present test`）；引入 ESLint + Prettier（根 `eslint.config.js` + `@typescript-eslint` + `eslint-config-prettier`），增 `pnpm lint` 门禁。
- 2026-08-29：增 `pnpm format:check` 门禁（第四道→五道），并一次性把 32 个历史文件统一 `prettier --write`（此前仅新写文件符合规范，历史 `src/` 一直是漏网状态，导致 format 门禁一加就红）。

### 3.6 合并规则
- 🔴 门禁全绿 + 自审清单勾满，才允许合并。
- 🟡 重大改动需附「代码审查专家」评审结论（无 🔴 遗留）。
- 合并后删除特性分支（或保留一周备查）。

---

## 4. 真枪实弹：用本标准审两段现有代码

> 目的：让你看到"标准长什么样"，而不是空谈。

### 4.1 `packages/collector/src/index.ts`
✅ **Security：CORS / body 上限 / 超时 / 写入鉴权 已全部收敛（2026-08-27）**
- ~~开放写入（CORS `*` / 无 body 上限 / 无超时 / 无鉴权）~~ → 全部已修：
  - CORS：抽成 `ALLOWED_ORIGINS` 环境变量白名单，缺省回退 `'*'`（本地零配置），命中才回显具体 origin。
  - `express.json({ limit: '1mb' })`：限制请求体最大 1mb，防超大 body 撑爆内存 / 数据库。
  - `server.requestTimeout = 30000`：从"永不超时（0）"改为 30s 合理上限，防慢速攻击占满连接。
  - `/ingest` 挂载 `rateLimit` + `ingestAuth`（`security.ts`）：per-IP 内存限流（60s/100 次，超限 429）+ 可选 `INGEST_API_KEY` 鉴权（设了才校验，否则放行）。
- 🟡 生产 TODO：限流为单实例内存计数，多副本需 Redis；`INGEST_API_KEY` 上线前配置 + SDK 需支持携带 `apiKey`。

💭 **nit（已解决）**：CORS 中间件原写死 `*`，现已抽成 `ALLOWED_ORIGINS` 环境变量。

### 4.2 `packages/web/src/useSSE.ts`
✅ **praise**：这是高质量代码。`onMsgRef` 用 ref 持有回调避免 effect 重建、`closedByUs` 守卫防卸载后重连、三道防线（主动重连 / 看门狗 / 状态）注释清晰且讲清"为什么是 4 分钟 / 35 秒"。符合第 2.6 节"可解释性"要求。

🟡 **suggestion：看门狗与主动重连可能竞态重复 `open()`**
`watchdogTimer` 和 `proactiveTimer` 独立触发，极端情况下两者同 tick 都调 `open()`。当前因 `closedByUs` 与 `esRef` 守卫未出 bug，但建议给 `open()` 加"已在连接中则跳过"的 `isOpening` 标志，消除隐患。

💭 **nit**：`RETRY_MS=2000` 固定重连，未做指数退避；长时间断网会高频重试。可加 `min(RETRY_MS * 2^n, MAX)`。

---

## 5. 落地清单（下一步，需你拍板）

- [x] 确认把本标准写入仓库（本文件已就位：`CODE_REVIEW.md`）。
- [x] 确认 PR 模板启用（`.github/PULL_REQUEST_TEMPLATE.md`）。
- [x] 是否实施 🔴 CI 缺口：补 `collector test` 门禁？（✅ 已做：store.ts 懒加载 + ci.yml 全包测试）
- [x] 是否引入 ESLint + Prettier？（✅ 已做：根 eslint.config.js + CI 门禁 `pnpm lint`）
- [x] 是否把 format 纳入门禁？（✅ 已做：CI 增 `pnpm format:check`，五道门禁；32 个历史文件统一格式化）
- [x] CORS / 限流 / 超时 / 写入鉴权：`ALLOWED_ORIGINS` 白名单 ✅；`express.json` 1mb 上限 ✅；`requestTimeout=30000` ✅；`/ingest` 限流 + 可选 `INGEST_API_KEY` 鉴权 ✅（生产需 Redis 限流 + SDK 携带 apiKey）
