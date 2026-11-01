// 客户端 bundle 自检：在一个最小 vm 上下文里真跑一遍，确认契约成立
import { readFileSync } from 'node:fs'
import vm from 'node:vm'

const code = readFileSync(new URL('./client/client.js', import.meta.url), 'utf8')

const captured = {}
const sandbox = {
  console,
  window: {
    __ModuleLoader__: {
      load(mod) {
        captured.id = mod.id
        captured.exports = mod.factory(function require(name) {
          console.warn('unexpected require:', name)
          return {}
        })
      },
    },
  },
  document: { createElement: () => ({ style: {} }), head: { appendChild() {} } },
}
sandbox.globalThis = sandbox
sandbox.window.window = sandbox.window

const ctx = vm.createContext(sandbox)
vm.runInContext(code, ctx, { filename: 'client.js' })

const fails = []
const ok = (cond, msg) => (cond ? console.log('ok  :', msg) : (fails.push(msg), console.error('FAIL:', msg)))

ok(captured.id === 'dsh-todo-widget', '模块 id 正确')
ok(captured.exports && typeof captured.exports.apply === 'function', '导出 apply()')
ok(captured.exports && Array.isArray(captured.exports.inject), '导出 inject[]')
ok(sandbox.window.TodoUI && typeof sandbox.window.TodoUI.mount === 'function', 'window.TodoUI.mount 存在')
ok(
  sandbox.window.TodoUI && typeof sandbox.window.TodoUI.CSS === 'string' && sandbox.window.TodoUI.CSS.length > 1000,
  'window.TodoUI.CSS 有实质内容',
)
// todoCreateWidget 定义在 factory 作用域内（不污染全局），所以从源码侧确认拼接与接线
ok(code.includes('function todoCreateWidget'), 'runtime.js 的 todoCreateWidget 已拼进 bundle')
ok(code.includes('todoCreateWidget({'), 'entry.js 确实调用了 todoCreateWidget')
ok(code.includes('function todoWhenBodyReady'), 'entry.js 的挂载时机逻辑已拼进 bundle')

if (fails.length) {
  console.error('\n失败项：', fails.length)
  process.exitCode = 1
} else {
  console.log('\n客户端 bundle 自检通过')
}
