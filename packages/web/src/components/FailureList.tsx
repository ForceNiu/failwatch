import { memo } from 'react'
import { Table } from 'antd'
import type { ColumnsType } from 'antd/es/table'
import type { FailureView } from '../types'
import { formatDateTime } from '../utils/time'

const columns: ColumnsType<FailureView> = [
  {
    title: 'ID',
    dataIndex: 'id',
  },
  {
    title: '类型',
    dataIndex: 'kind',
  },
  {
    title: '严重度',
    dataIndex: 'severity',
  },
  {
    title: '路由',
    dataIndex: 'route',
  },
  {
    title: '消息',
    dataIndex: 'message',
  },
  {
    // 只保留"发生时间"（浏览器里错误真正发生的时刻，SDK 上报的 timestamp）
    // 入库时间 created_at 是数据库写库时刻，与发生时间在本地 demo 下是同一瞬间，故不重复展示
    title: '时间',
    dataIndex: 'timestamp',
    render: (ts: number) => formatDateTime(ts),
  },
]

function FailureListInner({
  items,
  loading,
}: {
  items: FailureView[]
  loading?: boolean
}) {
  return (
    <Table
      rowKey="id"
      columns={columns}
      dataSource={items}
      size="small"
      loading={loading}
    />
  )
}

export const FailureList = memo(FailureListInner)
