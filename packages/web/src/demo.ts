// FailWatch Demo 页逻辑：接入 SDK，故意抛错验证捕获链路
import { init } from '@failwatch/sdk'

// 初始化 SDK：告诉它错误上报到哪（collector 的 /ingest）
init({ endpoint: 'http://localhost:4000/ingest' })

// 按钮 1：抛一个普通 JS 错误 → window.onerror 捕获 → js_error
document.getElementById('boom')!.addEventListener('click', () => {
  throw new Error('Demo 故意抛出的 JS 错误')
})

// 按钮 2：拒绝一个 Promise 且不 catch → unhandledrejection 捕获 → unhandled_rejection
document.getElementById('reject')!.addEventListener('click', () => {
  Promise.reject(new Error('Demo 故意拒绝的 Promise'))
})
