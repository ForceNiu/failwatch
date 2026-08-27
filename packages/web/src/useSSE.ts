// SSE 韧性 hook（M4 加固）：让浏览器端能扛住中间代理的静默掐断
//
// 背景：沙箱代理（HTTPS_PROXY）会在连接空闲/存活约 5 分钟时静默掐断 SSE 长连接，
// 且往往不给 FIN（结束信号），导致连接"半开"——浏览器以为还连着，收不到推送也不重连。
// 浏览器原生 EventSource 的自动重连对这种"静默掐断"无效。
//
// 本 hook 用三道防线彻底解决（应用层，不依赖改代理）：
//   ① 主动重连：每 RECONNECT_MS(4 分钟) 自己关掉再开，永远压在代理 5 分钟上限之前。
//   ② 心跳看门狗：服务端每 15s 发 `event: ping`，超过 WATCHDOG_MS(35s) 没收到任何事件
//      → 判定连接已死（半开），立即强制重连。
//   ③ 断线状态：对外暴露 status，UI 显示"实时 / 重连中"，不再盲目。
import { useEffect, useRef, useState } from 'react'

// 主动重连间隔：4 分钟，远低于沙箱代理 5 分钟上限，保证连接永远在代理掐断前被刷新
const RECONNECT_MS = 4 * 60 * 1000
// 看门狗阈值：超过 35 秒没收到任何事件（数据或心跳）即判定连接已死，强制重连
const WATCHDOG_MS = 35 * 1000
// 意外断开后的重连退避
const RETRY_MS = 2000

export type SSEStatus = 'connecting' | 'live' | 'reconnecting'

export function useSSE(onMessage: (data: string) => void): SSEStatus {
  const [status, setStatus] = useState<SSEStatus>('connecting')
  // 用 ref 持有最新回调，避免 onMessage 变化导致整个 effect 重建
  const onMsgRef = useRef(onMessage)
  onMsgRef.current = onMessage
  // 最近一次收到事件（数据或心跳）的时间戳，看门狗用
  const lastMsgRef = useRef<number>(Date.now())
  const esRef = useRef<EventSource | null>(null)

  useEffect(() => {
    let reconnectTimer: ReturnType<typeof setTimeout> | undefined
    let watchdogTimer: ReturnType<typeof setInterval> | undefined
    let proactiveTimer: ReturnType<typeof setTimeout> | undefined
    let closedByUs = false

    function open() {
      if (closedByUs) return
      const es = new EventSource('/api/events')
      esRef.current = es
      lastMsgRef.current = Date.now()
      setStatus((s) => (s === 'live' ? 'reconnecting' : 'connecting'))

      es.onopen = () => setStatus('live')
      es.onmessage = (e) => {
        lastMsgRef.current = Date.now()
        setStatus('live')
        onMsgRef.current(e.data)
      }
      // 服务端心跳是命名事件 `event: ping`，用于看门狗计时
      es.addEventListener('ping', () => {
        lastMsgRef.current = Date.now()
        setStatus('live')
      })
      es.onerror = () => {
        // 沙箱代理静默掐断往往不触发 onerror（半开）。这里主动关掉，
        // 交给我们的重连定时器，确保一定能恢复。
        setStatus('reconnecting')
        es.close()
        esRef.current = null
        scheduleReconnect()
      }
    }

    function scheduleReconnect() {
      if (closedByUs) return
      clearTimeout(reconnectTimer)
      reconnectTimer = setTimeout(open, RETRY_MS)
    }

    function start() {
      open()
      // 看门狗：每 10s 检查，35s 无事件 → 强制重连（防半开）
      watchdogTimer = setInterval(() => {
        if (!closedByUs && esRef.current && Date.now() - lastMsgRef.current > WATCHDOG_MS) {
          esRef.current.close()
          esRef.current = null
          open()
        }
      }, 10 * 1000)
      // 主动重连：每 4 分钟刷新，永远压在代理 5 分钟上限之前
      proactiveTimer = setTimeout(function tick() {
        if (closedByUs) return
        if (esRef.current) {
          esRef.current.close()
          esRef.current = null
        }
        open()
        proactiveTimer = setTimeout(tick, RECONNECT_MS)
      }, RECONNECT_MS)
    }

    start()

    return () => {
      closedByUs = true
      clearTimeout(reconnectTimer)
      clearInterval(watchdogTimer)
      clearTimeout(proactiveTimer)
      esRef.current?.close()
      esRef.current = null
    }
  }, [])

  return status
}
