import { memo } from 'react'
import { Button, Input, Select, Space } from 'antd'

// 筛选状态类型：3 个字段都可选（不填 = 不过滤）
export interface FailureFilters {
  kind?: string
  severity?: string
  route?: string
}

// 受控组件：自己不存状态，value 由 App 下发，用户操作时通过 onChange 上报
function FilterBarInner({
  value,
  onChange,
}: {
  value: FailureFilters
  onChange: (f: FailureFilters) => void
}) {
  return (
    <Space wrap style={{ marginBottom: 16 }}>
      <Select
        placeholder="类型"
        allowClear
        value={value.kind ?? null}
        onChange={(kind) => onChange({ ...value, kind })}
        style={{ width: 140 }}
        options={[
          { value: 'js_error', label: 'JS 错误' },
          { value: 'unhandled_rejection', label: 'Promise 拒绝' },
          { value: 'api_error', label: '接口错误' },
          { value: 'resource_error', label: '资源错误' },
        ]}
      />
      <Select
        placeholder="严重度"
        allowClear
        value={value.severity ?? null}
        onChange={(severity) => onChange({ ...value, severity })}
        style={{ width: 120 }}
        options={[
          { value: 'low', label: '低' },
          { value: 'medium', label: '中' },
          { value: 'high', label: '高' },
          { value: 'critical', label: '严重' },
        ]}
      />
      <Input
        placeholder="路由"
        allowClear
        value={value.route ?? ''}
        onChange={(e) => onChange({ ...value, route: e.target.value })}
        style={{ width: 200 }}
      />
      <Button onClick={() => onChange({})}>清空</Button>
    </Space>
  )
}

export const FilterBar = memo(FilterBarInner)
