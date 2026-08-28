## 改了什么
<!-- 1-3 句，讲事实，不要写"AI 帮我改了"这种空话 -->

## 为什么
<!-- 因果链：为什么要这么改，而不是"AI 说要" -->

## 怎么验证
<!-- 命令 / 截图 / 实测现象。如：pnpm typecheck 全绿、POST /ingest 返回 201、SSE 流收到 data 行 -->

## 自审清单（合并前必勾）
- [ ] `pnpm typecheck` 全绿（sdk / collector / web）
- [ ] `pnpm --filter @failwatch/web test` 全绿
- [ ] `pnpm --filter @failwatch/collector test` 全绿（若改了 collector）
- [ ] 关键路径有测试（ingest / scoring / SSE / 路由错误码）
- [ ] 无 `any` / `as any` / 非空断言 `!` 掩盖类型问题
- [ ] 理解所合并的每一行（能讲清因果，符合 AI 代码可解释性闸门）
- [ ] AI 改动已做对照验证（如临时值实证假设）

## 审查专家评审结论（重大改动必填）
<!-- 新路由 / 安全相关 / SSE 长连接类改动，必须交「代码审查专家」走一轮 -->
- [ ] 已交「代码审查专家」评审，无 🔴 遗留
