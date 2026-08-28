/**
 * FailWatch 开发/演示数据生成器（独立工具，不进生产逻辑）
 * 用法：
 *   tsx --env-file=../../.env src/seed.ts            # 一次性造 25 条（多样性）
 *   tsx --env-file=../../.env src/seed.ts --watch     # 每 2 分钟发 1 条（配合 SSE 看实时）
 * 前置：collector 正在跑（POST 走 /ingest 完整链路：校验→入库→广播→SSE 推送）
 */
import type { FailureEvent } from '@failwatch/sdk'

const INGEST_URL = 'http://localhost:4000/ingest'
const WATCH_INTERVAL_MS = 2 * 60 * 1000 // 2 分钟

// ===== 多样性样本池（每种 kind 多种 message/route/status，聚类后能看出 5-8 组）=====
// 开发工具放宽类型（any）：样本池是手写假数据，不需要判别联合的严格检查（makeEvent 里最终 as FailureEvent）
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const SAMPLES: any[] = [
  // —— api_error：不同接口 + 不同状态码（5xx 服务端炸 / 4xx 请求问题）——
  {
    kind: 'api_error',
    url: '/api/login',
    method: 'POST',
    status: 500,
    statusText: 'Internal Server Error',
  },
  {
    kind: 'api_error',
    url: '/api/login',
    method: 'POST',
    status: 502,
    statusText: 'Bad Gateway',
  },
  {
    kind: 'api_error',
    url: '/api/order/create',
    method: 'POST',
    status: 503,
    statusText: 'Service Unavailable',
  },
  {
    kind: 'api_error',
    url: '/api/order/create',
    method: 'POST',
    status: 500,
    statusText: 'Internal Server Error',
  },
  {
    kind: 'api_error',
    url: '/api/pay/confirm',
    method: 'POST',
    status: 500,
    statusText: 'Internal Server Error',
  },
  {
    kind: 'api_error',
    url: '/api/user/info',
    method: 'GET',
    status: 401,
    statusText: 'Unauthorized',
  },
  {
    kind: 'api_error',
    url: '/api/cart/list',
    method: 'GET',
    status: 400,
    statusText: 'Bad Request',
  },
  {
    kind: 'api_error',
    url: '/api/search',
    method: 'GET',
    status: 504,
    statusText: 'Gateway Timeout',
  },

  // —— js_error：不同报错信息（页面脚本问题）——
  {
    kind: 'js_error',
    message: 'Cannot read properties of undefined (reading map)',
  },
  { kind: 'js_error', message: 'render is not a function' },
  { kind: 'js_error', message: 'Failed to fetch dynamic import' },
  {
    kind: 'js_error',
    message: 'Cannot read properties of null (reading length)',
  },
  { kind: 'js_error', message: 'x is not defined at eval' },

  // —— resource_error：不同资源类型（script=功能崩 / img/css=样式）——
  {
    kind: 'resource_error',
    resourceUrl: '/js/main.chunk.js',
    resourceType: 'script',
  },
  { kind: 'resource_error', resourceUrl: '/img/logo.png', resourceType: 'img' },
  { kind: 'resource_error', resourceUrl: '/css/app.css', resourceType: 'css' },
  {
    kind: 'resource_error',
    resourceUrl: '/font/iconfont.woff2',
    resourceType: 'font',
  },

  // —— unhandled_rejection：不同拒绝原因（Promise 未处理）——
  { kind: 'unhandled_rejection', reason: 'Promise rejected: request timeout' },
  { kind: 'unhandled_rejection', reason: 'Promise rejected: JSON.parse error' },
  { kind: 'unhandled_rejection', reason: 'Promise rejected: aborted' },
]

// 造一条完整事件（补 base 字段；severity 按规则给）
function makeEvent(
  sample: (typeof SAMPLES)[number],
  i: number,
  route: string,
): FailureEvent {
  const severity =
    sample.kind === 'api_error'
      ? sample.status >= 500
        ? 'critical'
        : 'medium'
      : sample.kind === 'js_error'
        ? 'high'
        : sample.kind === 'resource_error'
          ? sample.resourceType === 'script'
            ? 'high'
            : 'low'
          : 'medium'
  return {
    ...sample,
    id: `seed-${Date.now()}-${i}`,
    timestamp: Date.now(),
    route,
    userAgent: 'seed-demo/1.0',
    severity,
    breadcrumbs: [],
  } as FailureEvent
}

// 发一条到 /ingest（走完整链路）
async function send(event: FailureEvent): Promise<void> {
  const resp = await fetch(INGEST_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(event),
  })
  if (!resp.ok) {
    const body = await resp.text()
    console.error(`发送失败 ${event.kind}: ${resp.status} ${body}`)
  } else {
    console.log(`✓ 已入库 ${event.kind}`)
  }
}

// ===== 模式 1：一次性造 25 条（多样性轮流取）=====
async function seedOnce(): Promise<void> {
  const routes = ['/dashboard', '/order', '/pay', '/user', '/home']
  for (let i = 0; i < 25; i++) {
    const sample = SAMPLES[i % SAMPLES.length] // 轮流取，保证种类覆盖
    await send(makeEvent(sample, i, routes[i % routes.length]))
  }
  console.log(`\n完成：共发送 25 条（${SAMPLES.length} 种样本轮流）`)
}

// ===== 模式 2：每 2 分钟发 1 条（配合 SSE 看实时上板）=====
function seedWatch(): void {
  let i = 0
  console.log('定时模式：每 2 分钟发 1 条（Ctrl+C 停止）\n')
  send(makeEvent(SAMPLES[i % SAMPLES.length], i++, '/watch')).catch(
    console.error,
  )
  setInterval(() => {
    send(makeEvent(SAMPLES[i % SAMPLES.length], i++, '/watch')).catch(
      console.error,
    )
  }, WATCH_INTERVAL_MS)
}

// 入口
const isWatch = process.argv.includes('--watch')
if (isWatch) {
  seedWatch()
} else {
  seedOnce().catch((err) => {
    console.error('seed 失败（collector 在跑吗？）:', err.message)
    process.exit(1)
  })
}
