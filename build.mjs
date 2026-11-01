/**
 * dsh-todo-widget 构建脚本（零依赖）
 *
 * 把 src/ui.js + src/runtime.js + src/entry.js 拼成 DSH 客户端要求的
 * `window.__ModuleLoader__.load({ id, factory })` 握手包，输出 client/client.js。
 *
 * 用法：node build.mjs
 */

import { readFile, writeFile, mkdir } from 'node:fs/promises'
import { createHash } from 'node:crypto'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const here = path.dirname(fileURLToPath(import.meta.url))
const PKG_ID = 'dsh-todo-widget'

async function read(rel) {
  return readFile(path.join(here, rel), 'utf8')
}

// ui.js 必须是"裸脚本"：任何 import/export 都会让 factory 语法错误
const BANNED = /^\s*(import\s|export\s)/m

function assertBare(name, code) {
  const hit = code.match(BANNED)
  if (hit) {
    throw new Error(`${name} 里出现了模块语法（${hit[0].trim()}），必须改成裸脚本`)
  }
}

const [ui, runtime, entry] = await Promise.all([
  read(path.join('src', 'ui.js')),
  read(path.join('src', 'runtime.js')),
  read(path.join('src', 'entry.js')),
])

assertBare('src/ui.js', ui)
assertBare('src/runtime.js', runtime)
assertBare('src/entry.js', entry)

const banner = `/*! dsh-todo-widget — 自动生成，勿手改。源文件：src/ui.js + src/runtime.js + src/entry.js */\n`

// 形态 A：DSH 客户端模块握手包（走 dsh.client，留作备用路径）
const moduleOut =
  banner +
  `window.__ModuleLoader__.load({ id: ${JSON.stringify(PKG_ID)}, factory: function (require) {\n` +
  `var module = { exports: {} }; var exports = module.exports;\n` +
  ui +
  '\n' +
  runtime +
  '\n' +
  entry +
  '\n' +
  `return module.exports; } });\n`

// 形态 B：独立脚本（走 webserver/index-inject 注入，当前实际使用的路径）
// 整段包在 IIFE 里，不往全局倒变量；只保留 window.TodoUI 这一个约定出口。
const bootstrap = `
/* 自举：body 就绪后创建挂件（避免在 DOM 未就绪时取不到 document.body） */
function todoBoot() {
  try {
    todoCreateWidget({ id: 'dsh-todo-widget' })
  } catch (err) {
    console.error('[dsh-todo-widget] 挂载失败', err)
  }
}
if (document.body) todoBoot()
else document.addEventListener('DOMContentLoaded', function () { todoBoot() })
`

// 构建号：对**最终产物**做哈希（而不是只哈希源码）。
// 只哈希源码的话，包装层的改动（比如补一个分号）不会让构建号变，
// 客户端就以为是同一个版本、不会自更新——之前就是这么漏掉一次修复的。
const BUILD_PLACEHOLDER = '__TODO_BUILD_PLACEHOLDER__'
const bodyTemplate =
  banner +
  '(function () {\n' +
  // 结尾的分号不能省：下一段以 (function(){ 开头，缺了会被 ASI 拼成 "字符串(...)" 调用
  `var TODO_BUILD = "${BUILD_PLACEHOLDER}";\n` +
  ui +
  '\n' +
  runtime +
  '\n' +
  bootstrap +
  '\n})();\n'

const BUILD_ID = createHash('sha1').update(bodyTemplate).digest('hex').slice(0, 10)
const standaloneOut = bodyTemplate.split(BUILD_PLACEHOLDER).join(BUILD_ID)

await mkdir(path.join(here, 'client'), { recursive: true })
await writeFile(path.join(here, 'client', 'client.js'), moduleOut, 'utf8')
await writeFile(path.join(here, 'client', 'standalone.js'), standaloneOut, 'utf8')
await writeFile(path.join(here, 'client', 'build-id.txt'), BUILD_ID, 'utf8')

// 语法自检：用 Function 构造，不执行
new Function(ui + '\n' + runtime + '\n' + entry)
new Function(standaloneOut)

console.log(
  `[build] client/client.js     ${(Buffer.byteLength(moduleOut, 'utf8') / 1024).toFixed(1)} KB (模块握手包，备用)`,
)
console.log(
  `[build] client/standalone.js ${(Buffer.byteLength(standaloneOut, 'utf8') / 1024).toFixed(1)} KB (注入用，主路径)  (ui ${ui.length}B / runtime ${runtime.length}B)`,
)
