# @failwatch/sdk

前端失败采集 SDK（Software Development Kit，软件开发工具包），同时是全链路**共享类型**的唯一来源。

## 两个职责

1. **共享类型源**：`FailureEvent` 判别联合（discriminated union）在本包 `src/types.ts` 定义，collector / web / demo-app 三处直接 import。改一处，编译期三处同步报错，杜绝"字段对不上"这类运行时才炸的问题。
2. **错误采集与上报**：`init()` 挂载全局监听，自动捕获并上报。

## 用法

```ts
import { init } from '@failwatch/sdk'

init({ endpoint: '/api/ingest' })
```

## 自动捕获 vs 手动上报

| 错误类型 | `kind` | 采集方式 |
|---|---|---|
| JS（JavaScript）运行时错误 | `js_error` | ✅ 自动（`window.onerror`） |
| 未捕获的 Promise（异步承诺）拒绝 | `unhandled_rejection` | ✅ 自动（`unhandledrejection` 事件） |
| 接口 4xx / 5xx | `api_error` | ⚠️ 手动上报 |
| 资源加载失败 | `resource_error` | ⚠️ 手动上报 |

**为什么只有两类是自动的**：接口错误和资源错误要自动采集，就得给全局 `fetch` / `XMLHttpRequest` 打猴子补丁（monkey-patch，运行时改写原生方法），或在捕获阶段监听所有 `error` 事件——侵入性强、容易干扰业务代码。这里选择**显式上报优先**：业务在自己的 fetch 封装里判断 `res.ok` 后上报，或在 `<img onError>` 里上报，可控性更高。

`examples/demo-app/src/report.ts` 是一份可直接抄的参考实现（`reportApiError` / `reportResourceError` 两个函数）。

## 目录

| 文件 | 作用 |
|---|---|
| `src/types.ts` | `FailureEvent` 判别联合定义（全链路共享） |
| `src/capture.ts` | `init()` 入口 + 两类错误的捕获与结构化 |
| `src/transport.ts` | `send()` 上报（POST 到 endpoint） |
