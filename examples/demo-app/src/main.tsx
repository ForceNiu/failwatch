// demo-app 入口
import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'

// 不用 StrictMode：避免 SDK init 在开发模式双挂监听（unhandledrejection 会重复上报）
ReactDOM.createRoot(document.getElementById('root')!).render(<App />)
