/*!
 * dsh-todo-widget — 宿主端（Node）
 *
 * 只做一件事：给浏览器端提供一个极小的 JSON 存储 API，让待办跨浏览器、跨设备
 * 刷新都还在（落在 ~/.dsh/todo-widget/todos.json）。
 *
 * 设计原则：**永不阻塞启动**。
 * DSH 的 boot 是全有或全无的（一个插件加载失败整个进程起不来），所以这里：
 *   - 不硬 inject 任何服务（用 ctx.get 探测）；
 *   - 依赖注入 / 路由注册 / 文件读写全部 try/catch 兜住；
 *   - 任何一步失败都只是降级成"客户端用 localStorage"，绝不让 apply 抛错。
 *
 * API（前缀 /todo）：
 *   GET  /todo/api/health -> { ok, file }
 *   GET  /todo/api/state  -> { items: [], filter: 'all' }
 *   POST /todo/api/state  <- { items, filter }  （整体覆盖写）
 */

import { mkdir, readFile, writeFile, rename } from 'node:fs/promises'
import { readFileSync } from 'node:fs'
import { homedir } from 'node:os'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

export const name = 'dsh-todo-widget'

// 必须声明对 webServer 的依赖：cordis 会等该服务就绪后再调用 apply。
// 之前留空数组（想着"不依赖任何服务更保险"）反而踩坑——apply 在 webServer
// 就绪前就跑完了，ctx.get('webServer') 拿到 undefined，一条路由都没注册，
// 而插件状态依然显示 live（所以市场诊断里看不出来）。
// 依赖缺失只会让本插件保持 pending，不会让 boot 失败。
export const inject = ['webServer']

// 存储目录：默认 ~/.dsh/todo-widget；测试时用 DSH_TODO_STORE_DIR 指到临时目录，
// 免得把自检数据写进用户的真实待办里。
const STORE_DIR = process.env.DSH_TODO_STORE_DIR
  ? process.env.DSH_TODO_STORE_DIR
  : path.join(homedir(), '.dsh', 'todo-widget')
const STORE_FILE = path.join(STORE_DIR, 'todos.json')

// 客户端脚本（standalone 构建产物），每次请求现读，改完硬刷新即可生效
const HERE = path.dirname(fileURLToPath(import.meta.url))
const WIDGET_FILE = path.join(HERE, '..', 'client', 'standalone.js')

function readWidgetBundle() {
  try {
    return readFileSync(WIDGET_FILE, 'utf8')
  } catch (err) {
    return (
      'console.error("[dsh-todo-widget] 读取 standalone.js 失败：' +
      String((err && err.message) || err).replace(/"/g, "'") +
      '")'
    )
  }
}

// 注入到页面 body 结尾的内联脚本：同步执行，再异步拉真正的 bundle
const LOADER_SNIPPET =
  "(function(){try{var s=document.createElement('script');" +
  "s.src='/todo/widget.js?v='+Date.now();s.async=false;" +
  "(document.body||document.head).appendChild(s);}catch(e){" +
  "console.error('[dsh-todo-widget] loader failed',e)}})()"

// 构建号（客户端靠它判断要不要自更新）
const BUILD_FILE = path.join(HERE, '..', 'client', 'build-id.txt')

function readBuildId() {
  try {
    return readFileSync(BUILD_FILE, 'utf8').trim()
  } catch (_) {
    return ''
  }
}

const EMPTY = { items: [], filter: 'all', frost: 82, updatedAt: 0 }

function log(ctx, level, msg) {
  try {
    const logger = ctx && ctx.logger
    if (logger && typeof logger[level] === 'function') logger[level]('todo-widget: ' + msg)
  } catch (_) {
    /* 日志失败也不能影响主流程 */
  }
}

async function readState() {
  try {
    const raw = await readFile(STORE_FILE, 'utf8')
    const data = JSON.parse(raw)
    if (!data || typeof data !== 'object') return { ...EMPTY }
    return {
      items: Array.isArray(data.items) ? data.items : [],
      filter: typeof data.filter === 'string' ? data.filter : 'all',
      frost: clampFrost(data.frost),
      updatedAt: typeof data.updatedAt === 'number' ? data.updatedAt : 0,
    }
  } catch (_) {
    return { ...EMPTY }
  }
}

/** 磨砂强度 0–100，非法值回落默认 82 */
function clampFrost(value) {
  const n = Number(value)
  if (!Number.isFinite(n)) return 82
  return Math.max(0, Math.min(100, Math.round(n)))
}

async function writeState(input) {
  const items = Array.isArray(input && input.items) ? input.items : []
  const filter = input && typeof input.filter === 'string' ? input.filter : 'all'
  const state = { items, filter, frost: clampFrost(input && input.frost), updatedAt: Date.now() }
  await mkdir(STORE_DIR, { recursive: true })
  const tmp = STORE_FILE + '.tmp'
  await writeFile(tmp, JSON.stringify(state, null, 2), 'utf8')
  await rename(tmp, STORE_FILE)
  return state
}

function sendJson(res, status, payload) {
  try {
    res.writeHead(status, {
      'content-type': 'application/json; charset=utf-8',
      'cache-control': 'no-store',
    })
    res.end(JSON.stringify(payload))
  } catch (_) {
    /* 客户端已经断开就随它去 */
  }
}

async function readBody(req) {
  const chunks = []
  for await (const chunk of req) chunks.push(chunk)
  const raw = Buffer.concat(chunks).toString('utf8')
  if (!raw) return {}
  try {
    return JSON.parse(raw)
  } catch (_) {
    return {}
  }
}

export function apply(ctx) {
  try {
    const webServer =
      (typeof ctx.get === 'function' ? ctx.get('webServer') : undefined) || (ctx && ctx.webServer)
    if (!webServer || typeof webServer.register !== 'function') {
      log(ctx, 'info', 'webServer 不可用，客户端将退化为 localStorage 模式')
      return
    }

    const handler = async (req, res) => {
      const url = String((req && req.url) || '')
      const clean = url.split('?')[0].replace(/\/+$/, '')
      try {
        if (req.method === 'GET' && clean.endsWith('/api/health')) {
          sendJson(res, 200, { ok: true, file: STORE_FILE, build: readBuildId() })
          return
        }
        if (req.method === 'GET' && clean.endsWith('/version')) {
          sendJson(res, 200, { build: readBuildId() })
          return
        }
        if (req.method === 'GET' && clean.endsWith('/api/state')) {
          sendJson(res, 200, await readState())
          return
        }
        if (req.method === 'POST' && clean.endsWith('/api/state')) {
          const body = await readBody(req)
          sendJson(res, 200, await writeState(body))
          return
        }
        // 客户端脚本：每次请求现读磁盘，改了 widget 硬刷新页面就生效，不用重启
        if (req.method === 'GET' && clean.endsWith('/widget.js')) {
          const js = readWidgetBundle()
          res.writeHead(200, {
            'content-type': 'application/javascript; charset=utf-8',
            'cache-control': 'no-store',
          })
          res.end(js)
          return
        }
        sendJson(res, 404, { ok: false, error: 'unknown todo endpoint' })
      } catch (err) {
        sendJson(res, 500, { ok: false, error: String((err && err.message) || err) })
      }
    }

    if (typeof ctx.effect === 'function') {
      ctx.effect(
        () => webServer.register({ kind: 'prefix', path: '/todo', handler }),
        'todo-widget: /todo JSON API',
      )
    } else {
      webServer.register({ kind: 'prefix', path: '/todo', handler })
    }

    // 把客户端脚本挂进页面：桌面端只认 `webserver/index-inject` 推的结构化行。
    // 用内联 script 行（同步执行、不可能加载失败），再由它去拉 /todo/widget.js。
    const injectRow = { kind: 'script', placement: 'body', text: LOADER_SNIPPET }
    if (typeof ctx.on === 'function') {
      ctx.on('webserver/index-inject', (table) => {
        try {
          if (!Array.isArray(table)) return
          // 去重：热重载可能让本回调注册多次
          for (const row of table) {
            if (row && row.kind === 'script' && typeof row.text === 'string' && row.text.includes('/todo/widget.js')) return
          }
          table.push(injectRow)
        } catch (_) {
          /* 注入失败不影响宿主其余功能 */
        }
      })
    }
    log(ctx, 'info', '已注册 /todo/api/* + /todo/widget.js （存储：' + STORE_FILE + '）')
  } catch (err) {
    // 关键：这里吞掉一切异常。宁可没有后端，也不能让 DSH 起不来。
    log(ctx, 'warn', '初始化失败，已降级为纯前端模式：' + String((err && err.message) || err))
  }
}
