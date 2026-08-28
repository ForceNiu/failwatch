/**
 * FailWatch collector 数据存储层（M2 任务 2.1）
 * postgres.js 连 Neon，建表 + 插入 + 查询
 */
import postgres from 'postgres'

// 连接串从环境变量读（.env，已被 gitignore）
const databaseUrl = process.env.DATABASE_URL

// 懒加载连接池：模块加载时不再连库。
// 原因：import store 的代码（路由 / collector 单测 / 未来的 SSR、CLI）不应在加载期就被强制要求
//       DATABASE_URL 环境，否则无库的 CI、单测环境一加载 store 就崩。
//       postgres.js 本身惰性连接，这里只是把『DATABASE_URL 未设置』的 fail-fast 检查从加载期延后到首次使用时。
let _sql: ReturnType<typeof postgres> | null = null
function getSql(): ReturnType<typeof postgres> {
  if (!databaseUrl) {
    throw new Error(
      'DATABASE_URL 未设置：请确认根目录 .env 存在，且通过 --env-file=../../.env 启动',
    )
  }
  if (!_sql) {
    // 连接池：postgres.js 连 Neon，sslmode=require
    _sql = postgres(databaseUrl, { ssl: 'require' })
  }
  return _sql
}

// ===== 数据库里"一行失败记录"的样子（TODO ① 你写）=====
// 对照 failures 表列清单，把每一列翻译成字段。
// 规则：非空列 → 字段: 类型；可空列 → 字段?: 类型；禁用 any。
export interface FailureRow {
  // TODO 填
  id: string
  kind: string
  timestamp: number
  route?: string
  user_agent?: string
  severity: string
  breadcrumbs?: string
  release?: string
  user_id?: string
  message?: string
  stack?: string
  filename?: string
  lineno?: number
  colno?: number
  reason?: string
  url?: string
  method?: string
  status?: number
  status_text?: string
  response_body?: string
  resource_url?: string
  resource_type?: string
  source?: string
  created_at: string
}

// ===== 建表（表结构固定，SQL 我来写，你负责看懂每一行）=====
export async function createTable(): Promise<void> {
  await getSql()`
    CREATE TABLE IF NOT EXISTS failures (
      id            TEXT PRIMARY KEY,
      kind          TEXT NOT NULL,
      timestamp     BIGINT NOT NULL,
      route         TEXT,
      user_agent    TEXT,
      severity      TEXT NOT NULL,
      breadcrumbs   JSONB,
      release       TEXT,
      user_id       TEXT,
      message       TEXT,
      stack         TEXT,
      filename      TEXT,
      lineno        INT,
      colno         INT,
      reason        TEXT,
      url           TEXT,
      method        TEXT,
      status        INT,
      status_text   TEXT,
      response_body TEXT,
      resource_url  TEXT,
      resource_type TEXT,
      source        TEXT,
      created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
    )
  `
}

// ===== 插入行：与 FailureRow 的区别 =====
// created_at 是数据库自动填的（DEFAULT now()），插入时不需要也不应该有
// Omit<FailureRow, 'created_at'> = "把 FailureRow 里的 created_at 拿掉"
export type InsertRow = Omit<FailureRow, 'created_at'>

// ===== 插入一行失败记录 =====
// row: 要写入的完整一行（InsertRow 形状，不含 created_at）
// 返回: 插入后的行（含数据库自动填的 created_at）
export async function insert(row: InsertRow): Promise<FailureRow> {
  // 模板字符串里的 SQL：INSERT INTO failures (列名...) VALUES (值...)
  // ${row.xxx} 是参数化占位：数据安全传入，不会拼成命令（防 SQL 注入）
  const [inserted] = await getSql()`
    INSERT INTO failures (
      id, kind, timestamp, route, user_agent, severity,
      breadcrumbs, release, user_id,
      message, stack, filename, lineno, colno,
      reason,
      url, method, status, status_text, response_body,
      resource_url, resource_type,
      source
    ) VALUES (
      ${row.id}, ${row.kind}, ${row.timestamp}, ${row.route ?? null}, ${row.user_agent ?? null}, ${row.severity},
      ${row.breadcrumbs ?? null}, ${row.release ?? null}, ${row.user_id ?? null},
      ${row.message ?? null}, ${row.stack ?? null}, ${row.filename ?? null}, ${row.lineno ?? null}, ${row.colno ?? null},
      ${row.reason ?? null},
      ${row.url ?? null}, ${row.method ?? null}, ${row.status ?? null}, ${row.status_text ?? null}, ${row.response_body ?? null},
      ${row.resource_url ?? null}, ${row.resource_type ?? null},
      ${row.source ?? null}
    )
    RETURNING *
  `
  return inserted as FailureRow
}

// ===== 查全部（按时间倒序，新的在前）=====
export async function list(limit = 100): Promise<FailureRow[]> {
  const rows = await getSql()`
    SELECT * FROM failures
    ORDER BY timestamp DESC
    LIMIT ${limit}
  `
  return rows as unknown as FailureRow[]
}

export interface FailureFilter {
  kind?: string
  severity?: string
  route?: string
  from?: number
  to?: number
}

export async function filter(f: FailureFilter): Promise<FailureRow[]> {
  const rows = await getSql()`
    SELECT * FROM failures
    WHERE
      (${f.kind ?? null}::text IS NULL OR kind = ${f.kind ?? null})
      AND (${f.severity ?? null}::text IS NULL OR severity = ${f.severity ?? null})
      AND (${f.route ?? null}::text IS NULL OR route = ${f.route ?? null})
      AND (${f.from ?? null}::bigint IS NULL OR timestamp >= ${f.from ?? null})
      AND (${f.to ?? null}::bigint IS NULL OR timestamp <= ${f.to ?? null})
    ORDER BY timestamp DESC
  `
  return rows as unknown as FailureRow[]
}
