// 时间格式化工具：把后端给的原始时间（epoch 毫秒数 / ISO 字符串）转成可读文本
// 浏览器端格式化 = 自动用用户本地时区（中国 GMT+8），无需手动算时差

// 把时间格式化成 "YYYY-MM-DD HH:mm:ss"（绝对时间，适合排查时精确定位）
export function formatDateTime(input: number | string): string {
  const ms = typeof input === 'number' ? input : new Date(input).getTime()
  if (!Number.isFinite(ms)) return String(input)
  const d = new Date(ms)
  const pad = (n: number) => String(n).padStart(2, '0')
  return (
    `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ` +
    `${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`
  )
}

// 相对时间：刚刚 / x 分钟前 / x 小时前 / x 天前（适合一眼看"多久前出的错"）
export function formatRelative(input: number | string): string {
  const ms = typeof input === 'number' ? input : new Date(input).getTime()
  if (!Number.isFinite(ms)) return String(input)
  const diff = Date.now() - ms
  const sec = Math.floor(diff / 1000)
  if (sec < 60) return '刚刚'
  const min = Math.floor(sec / 60)
  if (min < 60) return `${min} 分钟前`
  const hr = Math.floor(min / 60)
  if (hr < 24) return `${hr} 小时前`
  const day = Math.floor(hr / 24)
  if (day < 30) return `${day} 天前`
  return formatDateTime(input)
}
