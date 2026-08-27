import { memo } from 'react'
import { Collapse, List, Tag } from 'antd'
import type { FailureCluster } from '../cluster'
import type { FailureView } from '../types'
import { formatDateTime } from '../utils/time'

// 聚类视图：把分组卡片画出来（antd Collapse = 可折叠面板，点开看明细）
function ClusterViewInner({ clusters }: { clusters: FailureCluster[] }) {
  // 每个分组 → 一个折叠面板：标题（次数 Tag + 摘要），内容（明细列表）
  const items = clusters.map((c) => ({
    key: c.fingerprint,
    label: (
      <span>
        <Tag color={c.count > 1 ? 'red' : 'default'}>{c.count} 次</Tag>
        {c.sample.kind}: {c.sample.message}
      </span>
    ),
    children: (
      <List
        size="small"
        dataSource={c.items}
        renderItem={(row: FailureView) => (
          <List.Item>
            <List.Item.Meta
              title={row.id}
              description={`${row.route} · ${formatDateTime(row.timestamp)}`}
            />
          </List.Item>
        )}
      />
    ),
  }))

  return <Collapse items={items} />
}

export const ClusterView = memo(ClusterViewInner)
