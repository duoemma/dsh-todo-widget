// 宿主端自检：能不能 import、apply 会不会抛、路由注册对不对
import { pathToFileURL } from 'node:url'
import path from 'node:path'
import { mkdtempSync } from 'node:fs'
import { tmpdir } from 'node:os'

// 指到临时目录，避免污染真实的 ~/.dsh/todo-widget（也绕过工作区沙箱）
process.env.DSH_TODO_STORE_DIR = mkdtempSync(path.join(tmpdir(), 'dsh-todo-test-'))

const entry = pathToFileURL(path.resolve('lib/index.js')).href
const mod = await import(entry)

const assert = (cond, msg) => {
  if (!cond) {
    console.error('FAIL:', msg)
    process.exitCode = 1
  } else {
    console.log('ok  :', msg)
  }
}

assert(typeof mod.apply === 'function', '导出 apply()')
assert(Array.isArray(mod.inject), '导出 inject[]')
assert(mod.name === 'dsh-todo-widget', '导出 name')
assert(mod.inject.includes('webServer'), "inject 声明了 'webServer'（否则 apply 会早于服务就绪，路由注册不上）")

// 1) 没有任何服务时也不能抛
let threw = false
try {
  mod.apply({ get: () => undefined })
} catch (e) {
  threw = true
  console.error(e)
}
assert(!threw, 'webServer 缺失时 apply 不抛错')

// 2) 有 webServer 时注册 /todo 前缀路由，并返回可用的 disposer
let registered = null
let disposeCalled = false
const ctx = {
  get: (name) => (name === 'webServer' ? { register: (r) => { registered = r; return () => { disposeCalled = true } } } : undefined),
  effect: (fn) => { fn() },
  logger: { info: () => {}, warn: () => {} },
}
threw = false
try {
  mod.apply(ctx)
} catch (e) {
  threw = true
  console.error(e)
}
assert(!threw, '有 webServer 时 apply 不抛错')
assert(registered && registered.kind === 'prefix' && registered.path === '/todo', '注册了 prefix /todo')
assert(typeof registered.handler === 'function', 'handler 是函数')

// 3) 跑一遍 GET health / GET state / 404
const fakeRes = () => {
  const r = { status: 0, headers: null, body: '', writeHead(s, h) { r.status = s; r.headers = h }, end(b) { r.body = b } }
  return r
}
const call = async (method, url, payload) => {
  const req = {
    method,
    url,
    async *[Symbol.asyncIterator]() {
      if (payload !== undefined) yield Buffer.from(JSON.stringify(payload))
    },
  }
  const res = fakeRes()
  await registered.handler(req, res)
  let parsed = null
  try { parsed = JSON.parse(res.body) } catch {}
  return { status: res.status, data: parsed }
}

const health = await call('GET', '/todo/api/health')
assert(health.status === 200 && health.data && health.data.ok === true, 'GET /todo/api/health -> ok')

const state = await call('GET', '/todo/api/state')
assert(state.status === 200 && Array.isArray(state.data.items), 'GET /todo/api/state 返回 items[]')

// 磨砂强度持久化：写进去再读回来必须一致，越界值要被夹紧
const written = await call('POST', '/todo/api/state', { items: [], filter: 'all', frost: 40 })
assert(written.status === 200 && written.data.frost === 40, 'POST state 保存 frost=40')
const reread = await call('GET', '/todo/api/state')
assert(reread.data.frost === 40, 'GET state 读回 frost=40')
const clamped = await call('POST', '/todo/api/state', { items: [], filter: 'all', frost: 999 })
assert(clamped.data.frost === 100, '越界 frost 被夹到 100')
await call('POST', '/todo/api/state', { items: [], filter: 'all', frost: 82 })

// 自更新用的构建号端点
const ver = await call('GET', '/todo/version')
assert(ver.status === 200 && typeof ver.data.build === 'string' && ver.data.build.length > 0, 'GET /todo/version 返回构建号')

const nope = await call('GET', '/todo/api/nope')
assert(nope.status === 404, '未知路径 -> 404')

console.log('\n宿主端自检完成')
