// SSE 消息格式化（M4）
// 把数据格式化成 SSE 协议格式：data: {json}\n\n
// TODO：先返回空字符串让测试红，再实现
export function formatSse(data: unknown): string {
  return `data: ${JSON.stringify(data)}\n\n` // TODO 实现：`data: ${JSON.stringify(data)}\n\n`
}
