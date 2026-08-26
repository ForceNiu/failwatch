// 进程内广播中心（M4）：ingest 入库后喊话，events 路由收听
import { EventEmitter } from 'node:events'
import type { InsertRow } from './store.js'

// 唯一实例：ingest 和 events 共用这一个"广播系统"
export const failureBus = new EventEmitter<{
  failure: [InsertRow] // 事件名 'failure' 携带的数据类型
}>()
