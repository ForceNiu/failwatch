import type { FailureView } from './types'

// 一个"分组卡片"的数据形状
export interface FailureCluster {
  fingerprint: string   // 组的身份证（指纹字符串）
  count: number         // 这组有几条
  sample: FailureView   // 代表样本（第一条）
  items: FailureView[]  // 组里全部明细
}

// 把失败列表按指纹分组（聚类核心逻辑）
// 输入：[A, B, C] → 输出：[组1(count=2), 组2(count=1)]
export function groupFailures(items: FailureView[]): FailureCluster[] {
  // ① 收集桶：指纹 → 明细列表（Map = 字典，key 是动态字符串）
  const buckets = new Map<string, FailureView[]>()
  for (const item of items) {
    const fp = `${item.kind}|${item.message}` // 指纹：kind + message 拼成身份证
    const bucket = buckets.get(fp) ?? []      // 拿桶；没有就新建空桶
    bucket.push(item)                         // 把这条塞进桶
    buckets.set(fp, bucket)                   // 放回字典
  }

  // ② 每个桶 → 一张卡片（count = 桶长度，sample = 第一条）
  return Array.from(buckets.entries()).map(([fp, list]) => ({
    fingerprint: fp,
    count: list.length,
    sample: list[0],
    items: list,
  }))
}
