import { useEffect, useMemo, useState } from 'react'
import { ConfigProvider, Tabs, Typography } from 'antd'
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

  // ③ 筛选状态（老板的纸条）
  const [filters, setFilters] = useState<FailureFilters>({})

  // ④ useMemo 缓存过滤结果：items 或 filters 没变就不重算
  const filtered = useMemo(() => filterFailures(items, filters), [items, filters])

  // ⑤ 聚类：把过滤后的数据按指纹分组（也是 useMemo 缓存）
  const clusters = useMemo(() => groupFailures(filtered), [filtered])

  return (
    <ConfigProvider>
      <div style={{ padding: 24 }}>
        <Typography.Title level={2}>FailWatch 失败监控平台</Typography.Title>
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
          ]}
        />
      </div>
    </ConfigProvider>
  )
}
