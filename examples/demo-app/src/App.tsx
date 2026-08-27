// 故障演示商城（M6）：每个操作故意触发错误，演示 FailWatch 监控
import { useEffect, useState, type ReactNode } from 'react'
import { Button, Card, ConfigProvider, Divider, Switch, Tag, Typography, theme } from 'antd'
import { init } from '@failwatch/sdk'
import { reportApiError, reportResourceError } from './report'

// ===== 商品数据（每种商品绑定一种接口错误，固定可预期）=====
const PRODUCTS = [
  { name: '秒杀款', price: 99, boomType: '500', desc: '库存服务崩', emoji: '🔥', grad: 'linear-gradient(135deg,#FF6B6B,#EE5253)' },
  { name: '跨境款', price: 199, boomType: '502', desc: '网关错误', emoji: '🌍', grad: 'linear-gradient(135deg,#54A0FF,#2E86DE)' },
  { name: '限量款', price: 299, boomType: '503', desc: '服务过载', emoji: '⭐', grad: 'linear-gradient(135deg,#A55EEA,#8854D0)' },
  { name: '历史款', price: 49, boomType: '404', desc: '接口不存在', emoji: '', grad: '' },
]

// 错误标签颜色（按严重度分层）
const ERROR_COLORS: Record<string, string> = {
  '500': '#FF5C5C', '502': '#FF9F43', '503': '#FF9F43', '404': '#FFD166',
  promise: '#FF7AD9', js: '#FF7AD9', resource: '#8896A8',
}

// 底部「操作说明」清单（7 类错误，每行清晰可读）
const ERROR_GUIDE = [
  { op: '加购 · 秒杀款', type: '500', desc: '接口 500（库存服务崩）' },
  { op: '加购 · 跨境款', type: '502', desc: '接口 502（网关错误）' },
  { op: '加购 · 限量款', type: '503', desc: '接口 503（服务过载）' },
  { op: '加购 · 历史款', type: '404', desc: '接口 404（接口不存在）' },
  { op: '去结算', type: 'promise', desc: 'unhandled_rejection（支付失败）' },
  { op: '查看详情', type: 'js', desc: 'js_error（页面逻辑抛错）' },
  { op: '页面加载', type: 'resource', desc: 'resource_error（历史款商品图）' },
]

export default function App() {
  const [dark, setDark] = useState(true) // 默认深色霓虹
  const [cart, setCart] = useState(0)    // 购物车数量

  // 接 SDK：自动捕获 js_error + unhandled_rejection
  useEffect(() => {
    init({ endpoint: '/api/ingest' })
  }, [])

  // 加购 → 调故意失败的接口 → 上报 api_error（错误状态码固定可预期）
  async function handleAdd(product: (typeof PRODUCTS)[number]) {
    try {
      const resp = await fetch(`/api/boom?type=${product.boomType}`)
      await reportApiError({
        route: '/shop',
        url: `/api/boom?type=${product.boomType}`,
        method: 'GET',
        status: resp.status,
      })
    } catch {
      // 网络层失败也上报（走 api_error）
      await reportApiError({ route: '/shop', url: `/api/boom?type=${product.boomType}`, method: 'GET', status: 0 })
    }
    setCart((c) => c + 1)
  }

  // 结算 → 故意不处理的 Promise 拒绝 → SDK 的 unhandledrejection 自动捕获
  function handleCheckout() {
    Promise.reject(new Error('支付失败：模拟未处理的 Promise 拒绝'))
  }

  // 详情 → 故意抛 JS 错误 → SDK 的 window.onerror 自动捕获
  function handleDetail() {
    const broken = undefined as unknown as { render: () => void }
    broken.render() // TypeError: Cannot read properties of undefined
  }

  // 双主题 token（深色蓝灰 / 浅色暖白）
  const tokens = dark
    ? { colorPrimary: '#00D9FF', colorBgLayout: '#0B1120', colorBgContainer: '#151E2E', colorText: '#F0F4F8', colorTextSecondary: '#9FB0C3', colorBorder: '#243049', colorBorderSecondary: '#1C2740' }
    : { colorPrimary: '#00A8D9', colorBgLayout: '#F8F6F3', colorBgContainer: '#FFFFFF', colorText: '#1C1917', colorTextSecondary: '#5C6A7D', colorBorder: '#EAE6E0', colorBorderSecondary: '#F0ECE6' }

  return (
    <ConfigProvider theme={{ cssVar: true, algorithm: dark ? theme.darkAlgorithm : theme.defaultAlgorithm, token: tokens }}>
      <AppContent
        dark={dark}
        setDark={setDark}
        cart={cart}
        handleAdd={handleAdd}
        handleCheckout={handleCheckout}
        handleDetail={handleDetail}
      />
    </ConfigProvider>
  )
}

// 内容组件：在 ConfigProvider 内部 → 能用 useToken() 拿到当前主题色（方案 B：body/页面背景跟随主题）
function AppContent(props: {
  dark: boolean
  setDark: (v: boolean) => void
  cart: number
  handleAdd: (p: (typeof PRODUCTS)[number]) => void
  handleCheckout: () => void
  handleDetail: () => void
}) {
  const { dark, setDark, cart, handleAdd, handleCheckout, handleDetail } = props
  const { token } = theme.useToken()
  const [imgFailed, setImgFailed] = useState(false) // 历史款图失败占位

  // 历史款图加载失败 → 上报 resource_error + 显示占位
  function handleImgError() {
    if (!imgFailed) {
      setImgFailed(true)
      reportResourceError({ route: '/shop', resourceUrl: '/img/history.png', resourceType: 'img' })
    }
  }

  // 同步 body 背景 = 主题布局色（整个页面铺满，不再透白底）
  useEffect(() => {
    document.body.style.backgroundColor = token.colorBgLayout
  }, [token.colorBgLayout])

  // 错误标签（双主题自适应，文字高对比，不靠颜色单独传达）
  function ErrorTag({ type, children }: { type: string; children: ReactNode }) {
    const c = ERROR_COLORS[type] ?? '#8896A8'
    const style = dark
      ? { background: c, color: '#0B1120', border: 'none', fontWeight: 600 as const }
      : { background: c, color: '#0B1120', border: 'none', fontWeight: 600 as const }
    return <Tag style={style}>{children}</Tag>
  }

  return (
    <div style={{ background: token.colorBgLayout, minHeight: '100vh', padding: '24px 24px 48px' }}>
      <div style={{ maxWidth: 1100, margin: '0 auto' }}>
        {/* 顶栏：标题 + 说明 + 主题切换 */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 14, flexWrap: 'wrap', gap: 8 }}>
          <div>
            <Typography.Title level={2} style={{ margin: 0, fontSize: 22 }}>故障演示商城</Typography.Title>
            <Typography.Text style={{ color: token.colorTextSecondary, fontSize: 14 }}>每个操作都会故意触发错误，用于演示 FailWatch 监控</Typography.Text>
          </div>
          <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
            <Tag style={{ background: 'rgba(0,217,255,0.12)', color: dark ? '#00D9FF' : '#00A8D9', border: 'none' }}>演示模式</Tag>
            <Switch checked={dark} onChange={setDark} checkedChildren="深色" unCheckedChildren="浅色" />
          </div>
        </div>

        {/* 全局提示条 */}
        <div
          style={{
            background: dark ? 'rgba(255,209,102,0.12)' : '#FFF7E6',
            border: `1px solid ${dark ? 'rgba(255,209,102,0.3)' : '#FFE7BA'}`,
            borderRadius: 8, padding: '10px 14px', marginBottom: 16,
            color: dark ? '#FFD166' : '#D97706', fontSize: 14,
          }}
        >
          ⚠️ 本页面故意触发错误，用于演示 FailWatch 监控——点击任意操作都会真实上报
        </div>

        {/* 商品网格（响应式铺满：auto-fit 自动填满整行，小屏 1 列 → 大屏 4 列） */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 14 }}>
          {PRODUCTS.map((p) => (
            <Card key={p.name} size="small" styles={{ body: { padding: '36px 12px 12px' } }} style={{ position: 'relative', overflow: 'hidden' }}>
              {/* 右上角故障徽章（顶部留白 36px，不压商品图） */}
              <div style={{ position: 'absolute', top: 8, right: 8, zIndex: 2 }}>
                <ErrorTag type={p.boomType}>{p.boomType} {p.desc}</ErrorTag>
              </div>

              {/* 商品图：历史款故意引用不存在图片 → onError 上报 resource_error */}
              {p.boomType === '404' ? (
                <div
                  style={{
                    height: 88, borderRadius: 8, marginBottom: 10,
                    background: dark ? '#0A0E13' : '#E2E9F0',
                    display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                    gap: 4,
                  }}
                >
                  <img src="/img/history.png" alt="历史款" onError={handleImgError} style={{ display: 'none' }} />
                  <span style={{ fontSize: 24 }}>⚠️</span>
                  {imgFailed && <span style={{ fontSize: 12, color: dark ? '#FFD166' : '#D97706' }}>图片加载失败</span>}
                </div>
              ) : (
                <div
                  style={{
                    height: 88, borderRadius: 8, marginBottom: 10,
                    background: p.grad,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 32,
                  }}
                >
                  {p.emoji}
                </div>
              )}

              {/* 名称 + 价格 */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                <Typography.Text strong style={{ fontSize: 15 }}>{p.name}</Typography.Text>
                <Typography.Text style={{ color: dark ? '#00D9FF' : '#00A8D9', fontWeight: 600, fontSize: 15 }}>¥{p.price}</Typography.Text>
              </div>

              {/* 加购按钮 */}
              <Button block size="small" type="primary" ghost onClick={() => handleAdd(p)}>加购</Button>
            </Card>
          ))}
        </div>

        {/* 结算条 */}
        <Card size="small" style={{ marginTop: 16 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 10 }}>
            <Typography.Text strong>购物车 · {cart} 件</Typography.Text>
            <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
              <ErrorTag type="promise">Promise 失败（未处理）</ErrorTag>
              <Button type="primary" size="small" onClick={handleCheckout}>去结算</Button>
            </div>
          </div>
        </Card>

        {/* 详情入口 */}
        <Card size="small" style={{ marginTop: 12 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 10 }}>
            <Typography.Text strong>商品详情</Typography.Text>
            <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
              <ErrorTag type="js">JS 错误（页面逻辑抛错）</ErrorTag>
              <Button size="small" onClick={handleDetail}>查看详情</Button>
            </div>
          </div>
        </Card>

        {/* 操作说明面板（7 类错误，每行清晰可读，深色下用主文字色保证对比度） */}
        <Card size="small" style={{ marginTop: 20 }} title={<span style={{ fontSize: 15 }}>操作说明 · 本页会触发的 7 类错误</span>}>
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            {ERROR_GUIDE.map((g, i) => (
              <div
                key={g.op}
                style={{
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12,
                  padding: '10px 0', flexWrap: 'wrap',
                  borderTop: i === 0 ? 'none' : `1px solid ${token.colorBorderSecondary}`,
                }}
              >
                <Typography.Text strong style={{ color: token.colorText }}>{g.op}</Typography.Text>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                  <ErrorTag type={g.type}>{g.type}</ErrorTag>
                  <Typography.Text style={{ color: token.colorTextSecondary, fontSize: 13 }}>{g.desc}</Typography.Text>
                </div>
              </div>
            ))}
          </div>
        </Card>

        <Divider style={{ margin: '24px 0 12px' }} />
        <Typography.Text style={{ color: token.colorTextSecondary, fontSize: 12 }}>Powered by FailWatch SDK · 错误已全部上报至监控台</Typography.Text>
      </div>
    </div>
  )
}
