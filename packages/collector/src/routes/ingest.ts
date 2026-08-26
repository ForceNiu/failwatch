/**
 * FailWatch collector ingest 路由（M2 任务 2.2）
 * POST /ingest 收 FailureEvent → Zod 校验 → 合法写库 / 非法 400
 */
import { Router } from 'express'
import { z } from 'zod'
import { insert } from '../store.js'
import { failureBus } from '../emitter.js'

import type { FailureEvent } from '@failwatch/sdk'
import type { InsertRow } from '../store.js'

// ===== Zod schema：SDK 的 FailureEvent 的"运行时检查清单" =====
// 导出：给 toRow 的单测用
export function toRow(event: FailureEvent): InsertRow {
  const base = {
    id: event.id,
    kind: event.kind,
    timestamp: event.timestamp,
    route: event.route,
    user_agent: event.userAgent,
    severity: event.severity,
    breadcrumbs: JSON.stringify(event.breadcrumbs),
    release: event.release,
    user_id: event.userId,
  }

  switch (event.kind) {
    case 'js_error':
      return {
        ...base,
        message: event.message,
        stack: event.stack,
        filename: event.filename,
        lineno: event.lineno,
        colno: event.colno
      }
    case 'unhandled_rejection':
      return {
        ...base,
        reason: event.reason,
        stack: event.stack
      }
    case 'api_error':
      return {
        ...base,
        url: event.url,
        method: event.method,
        status: event.status,
        status_text: event.statusText,
        response_body: event.responseBody
      }
    case 'resource_error':
      return {
        ...base,
        resource_url: event.resourceUrl,
        resource_type: event.resourceType
      }
  }
}


// Breadcrumb（行为轨迹单项）—— TODO ① 你写
// TS 版（M1 写过）：{ type: 'navigation'|'click'|'xhr'|'console'; timestamp: number; message: string }
// Zod 版对照：z.object({ ... })，type 用 z.enum，message 用 z.string()
const breadcrumbSchema = z.object({
  // TODO 填
  type: z.enum(['navigation', 'click', 'xhr', 'console']), 
  timestamp: z.number(),
  message: z.string(),
})

// 公共基类（示范，对照 M1 的 BaseFailure）
const baseFailureSchema = z.object({
  id: z.string(),
  timestamp: z.number(),
  route: z.string(),
  userAgent: z.string(),
  severity: z.enum(['low', 'medium', 'high', 'critical']),
  breadcrumbs: z.array(breadcrumbSchema),
  release: z.string().optional(),
  userId: z.string().optional(),
})

// ===== 四种失败各自的分支（TODO ② 你写，先写 jsErrorSchema）=====
// TS 版：interface JsErrorEvent extends BaseFailure { kind: 'js_error'; message: string; stack?: string; ... }
// Zod 版：z.object({ ...baseFailureSchema.shape, kind: z.literal('js_error'), message: z.string(), ... })
// 注意：Zod 里"继承"不是 extends，是展开 ...baseFailureSchema.shape（shape = 它里面的字段们）

const jsErrorSchema = z.object({
  ...baseFailureSchema.shape,
  kind: z.literal('js_error'),
  // TODO 填 message 和可选字段
  message: z.string(),
  stack: z.string().optional(),
  filename: z.string().optional(),
  lineno: z.number().optional(),
  colno: z.number().optional(),
})

const unhandledRejectionSchema = z.object({
  ...baseFailureSchema.shape,
  kind: z.literal('unhandled_rejection'),
  reason: z.string(),
  stack: z.string().optional(),
})

const apiErrorSchema = z.object({
  ...baseFailureSchema.shape,
  kind: z.literal('api_error'),
  url: z.string(),
  method: z.enum(['GET','POST','PUT','DELETE','PATCH']),
  status: z.number(),
  statusText: z.string().optional(),
  responseBody: z.string().optional(),
})

const resourceErrorSchema = z.object({
  ...baseFailureSchema.shape,
  kind: z.literal('resource_error'),
  resourceUrl: z.string(),
  resourceType: z.enum(['script','link','img','css','font','media'])
})

const failureSchema = z.discriminatedUnion('kind', [
  jsErrorSchema,
  unhandledRejectionSchema,
  apiErrorSchema,
  resourceErrorSchema,
])

// ===== POST /ingest 路由（收货口本身）=====
// Router = express 的路由器，把接口"注册"到 /ingest 这个地址
const router = Router()

router.post('/ingest', async (req, res) => {
  // safeParse = Zod 的安全解析：不抛异常，返回 { success, data | error }
  // req.body = 请求体（SDK POST 过来的整包数据），express.json() 负责把它解析成对象
  const result = failureSchema.safeParse(req.body)

  if (!result.success) {
    // 安检不过：返回 400（客户端错误），带上不合格原因
    return res.status(400).json({
      error: '数据不合法',
      issues: result.error.issues.map((i) => i.message),
    })
  }

  // 安检通过：FailureEvent → 摊平成一行 → 入库
  const row = toRow(result.data)
  const inserted = await insert(row)
  // M4：入库成功 → 广播"新失败来了"（SSE 频道推给所有收听者）
  failureBus.emit('failure', row)
  res.status(201).json({ ok: true, id: inserted.id })
})

export default router