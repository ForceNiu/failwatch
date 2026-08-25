import { memo } from 'react'
import { Table } from 'antd'
import type { ColumnsType } from 'antd/es/table'
import type { FailureView } from '../types'

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
    title: '时间戳',
    dataIndex: 'timestamp',
  },
  {
    title: '入库时间',
    dataIndex: 'createdAt',
  },
]

function FailureListInner({
  items,
  loading,
}: {
  items: FailureView[]
  loading?: boolean
}) {
  return <Table
    rowKey="id"
    columns={columns}
    dataSource={items}
    size='small'
    loading={loading}></Table>
}

export const FailureList = memo(FailureListInner)