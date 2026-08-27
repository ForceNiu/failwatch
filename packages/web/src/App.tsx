import { useEffect, useMemo, useState } from 'react'
import { Card, ConfigProvider, List, Select, Tabs, Tag, Tooltip, Typography } from 'antd'
import { useSSE, type SSEStatus } from './useSSE'
import { FailureList } from './components/FailureList'
import { FilterBar } from './components/FilterBar'
import { ClusterView } from './components/ClusterView'
import { groupFailures } from './cluster'
import type { FailureFilters } from './components/FilterBar'
import type { FailureView } from './types'

// 后端返回的原始行（FailureRow 形状：下划线字段 + 全列）
// 只声明我们要用到的字段（TS 结构类型：多余字段不影响）
// 导出：给 toView 的单测用
export interface RawFailure {
  id: string
  kind: string
  severity: string
  route: string | null
  timestamp: string
  created_at: string
  message: string | null
  url: string | null
  method: string | null
  status: number | null
  resource_url: string | null
  resource_type: string | null
}

// 转换：原始行 → 前端显示模型（toRow 的反向操作）
// ① 字段改名：created_at → createdAt（下划线转驼峰）
// ② 拼错误摘要：api_error 的 message 在数据库里是 null（消息在 url/status 里）
// 导出：给单测用
export function toView(row: RawFailure): FailureView {
  let message = row.message ?? ''
  if (row.kind === 'api_error' && row.url) {
    message = `${row.method ?? '?'} ${row.url} (${row.status ?? '?'})`
  }
  if (row.kind === 'resource_error' && row.resource_url) {
    message = `资源加载失败：${row.resource_url} (${row.resource_type ?? '?'})`
  }
  return {
    id: row.id,
    kind: row.kind,
    severity: row.severity,
    route: row.route ?? '',
    message,
    timestamp: Number(row.timestamp),
    createdAt: row.created_at,
  }
}

// 纯函数：按筛选条件过滤（导出：给单测用）
export function filterFailures(items: FailureView[], f: FailureFilters): FailureView[] {
  return items.filter(
    (item) =>
      (!f.kind || item.kind === f.kind) &&
      (!f.severity || item.severity === f.severity) &&
      (!f.route || item.route.includes(f.route)),
  )
}

export default function App() {
  // ① 数据状态：从后端拉来的失败列表（初始空数组）
  const [items, setItems] = useState<FailureView[]>([])
  const [loading, setLoading] = useState(true)

  // ② useEffect(函数, [])：挂载后跑一次 —— 相当于 Vue 的 onMounted
  //    fetch 走 Vite 代理 /api/failures → 转发到 collector:4000/failures
  useEffect(() => {
    fetch('/api/failures')
      .then((res) => res.json())
      .then((data: RawFailure[]) => setItems(data.map(toView)))
      .catch((err) => console.error('拉取失败记录失败:', err))
      .finally(() => setLoading(false))
  }, [])

  // ②.5 M4 SSE（加固版）：连广播频道，新失败自动追加；客户端扛住代理静默掐断
  const sseStatus = useSSE((data) => {
    const row: RawFailure = JSON.parse(data) // 收到的就是一条数据库行
    setItems((prev) => [toView(row), ...prev]) // 加到列表最前面
  })

  // ③ 筛选状态（老板的纸条）
  const [filters, setFilters] = useState<FailureFilters>({})

  // ④ useMemo 缓存过滤结果：items 或 filters 没变就不重算
  const filtered = useMemo(() => filterFailures(items, filters), [items, filters])

  // ⑤ 聚类：把过滤后的数据按指纹分组（也是 useMemo 缓存）
  const clusters = useMemo(() => groupFailures(filtered), [filtered])

  return (
    <ConfigProvider>
      <div style={{ padding: 24 }}>
        <Typography.Title level={2} style={{ display: 'inline-flex', alignItems: 'center', gap: 12 }}>
          FailWatch 失败监控平台
          <SSEBadge status={sseStatus} />
        </Typography.Title>
        <FilterBar value={filters} onChange={setFilters} />
        {/* ⑥ Tabs：列表视图 / 聚类视图 切换 */}
        <Tabs
          items={[
            {
              key: 'list',
              label: '列表',
              children: <FailureList items={filtered} loading={loading} />,
            },
            {
              key: 'cluster',
              label: '聚类',
              children: <ClusterView clusters={clusters} />,
            },
            {
              key: 'report',
              label: 'AI 报告',
              children: <ReportView filters={filters} />,
            },
          ]}
        />
      </div>
    </ConfigProvider>
  )
}

// SSE 连接状态灯：实时(绿) / 重连中(黄) / 连接中(灰)
function SSEBadge({ status }: { status: SSEStatus }) {
  const color = status === 'live' ? '#52c41a' : status === 'reconnecting' ? '#faad14' : '#999'
  const label = status === 'live' ? '实时' : status === 'reconnecting' ? '重连中…' : '连接中…'
  return (
    <Tooltip title="SSE 实时推送连接状态（代理静默掐断会自动恢复）">
      <span
        style={{
          fontSize: 13,
          fontWeight: 400,
          color,
          display: 'inline-flex',
          alignItems: 'center',
          gap: 6,
        }}
      >
        <span style={{ width: 8, height: 8, borderRadius: '50%', background: color, display: 'inline-block' }} />
        {label}
      </span>
    </Tooltip>
  )
}

// M5：AI 报告视图（拉 /api/report，展示"最该修的问题"）
// filters：顶部筛选（kind/severity/route）——现在也作用于报告（M5 调试补上）
function ReportView({ filters }: { filters: FailureFilters }) {
  const [hours, setHours] = useState(24) // 时间窗（小时）
  const [report, setReport] = useState<{ generatedAt: number; windowHours: number; totalEvents: number; topIssues: { message: string; severity: string; count: number; score: number; rootCause?: string; suggestion?: string }[] } | null>(null)

  useEffect(() => {
    // 拼查询参数：hours + 顶部筛选（有值才带上）
    const qs = new URLSearchParams({ hours: String(hours) })
    if (filters.kind) qs.set('kind', filters.kind)
    if (filters.severity) qs.set('severity', filters.severity)
    if (filters.route) qs.set('route', filters.route)
    fetch(`/api/report?${qs}`)
      .then((res) => res.json())
      .then(setReport)
      .catch((err) => console.error('拉取报告失败:', err))
  }, [hours, filters])

  if (!report) return <Typography.Text type="secondary">报告生成中…</Typography.Text>

  return (
    <div>
      <div style={{ marginBottom: 12 }}>
        <Select
          value={hours}
          onChange={setHours}
          options={[
            { value: 24, label: '24 小时' },
            { value: 48, label: '48 小时' },
            { value: 168, label: '7 天' },
          ]}
          style={{ width: 120 }}
        />
        <Typography.Text type="secondary" style={{ marginLeft: 12 }}>
          共 {report.totalEvents} 次错误 · 按严重度排序
          {filters.kind || filters.severity || filters.route
            ? `（已筛选：${filters.kind ?? ''} ${filters.severity ?? ''} ${filters.route ?? ''}）`
            : ''}
        </Typography.Text>
      </div>
      <List
        dataSource={report.topIssues}
        renderItem={(issue) => (
          <List.Item>
            <Card size="small" style={{ width: '100%' }}>
              <Typography.Text strong>{issue.message}</Typography.Text>
              <div style={{ marginTop: 4 }}>
                <Tag color={issue.severity === 'critical' ? 'red' : issue.severity === 'high' ? 'orange' : 'default'}>
                  {issue.severity}
                </Tag>
                <Tag>{issue.count} 次</Tag>
                <Tooltip title="评分越高越该先修 = 出现次数 × 严重度权重(low=1,medium=2,high=3,critical=4) × 时间衰减(每12小时减半)">
                  <Tag>评分 {issue.score.toFixed(1)}</Tag>
                </Tooltip>
              </div>
              {issue.rootCause && (
                <Typography.Paragraph style={{ marginTop: 8, marginBottom: 4 }}>
                  <Typography.Text strong>原因：</Typography.Text>
                  {issue.rootCause}
                </Typography.Paragraph>
              )}
              {issue.suggestion && (
                <Typography.Paragraph style={{ marginBottom: 0 }}>
                  <Typography.Text strong>建议：</Typography.Text>
                  {issue.suggestion}
                </Typography.Paragraph>
              )}
            </Card>
          </List.Item>
        )}
      />
    </div>
  )
}
