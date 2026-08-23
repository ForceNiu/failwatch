import { Button, ConfigProvider, Typography } from 'antd'

export default function App() {
  return (
    <ConfigProvider>
      <div style={{ padding: 24 }}>
        <Typography.Title level={2}>FailWatch 失败监控平台</Typography.Title>
        <Button type="primary">M0 脚手架 OK</Button>
      </div>
    </ConfigProvider>
  )
}
