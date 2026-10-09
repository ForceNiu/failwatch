// SSE 消息格式化（M4）
// 把数据格式化成 SSE 协议格式：data: {json}\n\n
export function formatSse(data: unknown): string {
  return `data: ${JSON.stringify(data)}\n\n`
}
