// 用最小 DOM 桩把 standalone.js 真跑一遍，抓运行时错误（浏览器里没控制台看不到）
const fs = require('fs')
const vm = require('vm')

function makeEl(tag) {
  const el = {
    tagName: String(tag).toUpperCase(),
    children: [],
    parentNode: null,
    style: {
      _p: {},
      setProperty(k, v) {
        this._p[k] = v
      },
      getPropertyValue(k) {
        return this._p[k] || ''
      },
      removeProperty(k) {
        delete this._p[k]
      },
      cssText: '',
    },
    dataset: {},
    classList: {
      _s: new Set(),
      add(...a) {
        a.forEach((x) => this._s.add(x))
      },
      remove(...a) {
        a.forEach((x) => this._s.delete(x))
      },
      toggle(x, f) {
        if (f === undefined) f = !this._s.has(x)
        f ? this._s.add(x) : this._s.delete(x)
      },
      contains(x) {
        return this._s.has(x)
      },
    },
    attributes: {},
    listeners: {},
    textContent: '',
    value: '',
    checked: false,
    hidden: false,
    disabled: false,
    draggable: false,
    innerHTML: '',
    title: '',
    type: '',
    placeholder: '',
    min: '',
    max: '',
    step: '',
    className: '',
    offsetHeight: 420,
    setAttribute(k, v) {
      this.attributes[k] = v
    },
    getAttribute(k) {
      return this.attributes[k]
    },
    removeAttribute(k) {
      delete this.attributes[k]
    },
    appendChild(c) {
      this.children.push(c)
      c.parentNode = this
      return c
    },
    removeChild(c) {
      const i = this.children.indexOf(c)
      if (i >= 0) this.children.splice(i, 1)
      c.parentNode = null
      return c
    },
    remove() {
      if (this.parentNode) this.parentNode.removeChild(this)
    },
    addEventListener(t, fn) {
      ;(this.listeners[t] = this.listeners[t] || []).push(fn)
    },
    removeEventListener() {},
    dispatchEvent() {
      return true
    },
    focus() {},
    select() {},
    setPointerCapture() {},
    releasePointerCapture() {},
    getBoundingClientRect() {
      return { left: 1200, top: 300, right: 1244, bottom: 344, width: 44, height: 44 }
    },
    querySelector(sel) {
      return findAll(this, sel)[0] || null
    },
    querySelectorAll(sel) {
      return findAll(this, sel)
    },
  }
  return el
}

function matches(el, sel) {
  // 只处理测试里用到的简单选择器：.cls / tag
  if (sel.startsWith('.')) return (el.className || '').split(/\s+/).includes(sel.slice(1))
  return (el.tagName || '').toLowerCase() === sel.toLowerCase()
}

function findAll(root, sel) {
  const out = []
  const walk = (n) => {
    for (const c of n.children || []) {
      if (matches(c, sel)) out.push(c)
      walk(c)
    }
  }
  walk(root)
  return out
}

const html = makeEl('html')
const body = makeEl('body')
const head = makeEl('head')
html.appendChild(head)
html.appendChild(body)

const document = {
  documentElement: html,
  body,
  head,
  createElement: (t) => makeEl(t),
  createTextNode: (t) => ({ nodeType: 3, textContent: t }),
  querySelector: (s) => (matches(body, s) ? body : findAll(body, s)[0] || null),
  querySelectorAll: (s) => findAll(body, s),
  addEventListener: () => {},
  removeEventListener: () => {},
}

const store = {}
const sandbox = {
  console,
  document,
  setTimeout,
  clearTimeout,
  setInterval: () => 1,
  clearInterval: () => {},
  fetch: () => Promise.reject(new Error('offline in test')),
  Promise,
  Date,
  Math,
  JSON,
}
sandbox.window = {
  document,
  innerWidth: 1280,
  innerHeight: 720,
  getComputedStyle: () => ({ backgroundColor: 'rgb(24, 26, 32)' }),
  matchMedia: () => ({ matches: true }),
  addEventListener: () => {},
  setInterval: () => 1,
  clearInterval: () => {},
  crypto: { randomUUID: () => 'uuid-1' },
  localStorage: {
    getItem: (k) => (k in store ? store[k] : null),
    setItem: (k, v) => {
      store[k] = String(v)
    },
    removeItem: (k) => {
      delete store[k]
    },
  },
  fetch: () => Promise.reject(new Error('offline in test')),
  setTimeout,
  clearTimeout,
}
sandbox.globalThis = sandbox

const code = fs.readFileSync(__dirname + '/../client/standalone.js', 'utf8')
const ctx = vm.createContext(sandbox)

try {
  vm.runInContext(code, ctx, { filename: 'standalone.js' })
} catch (err) {
  console.error('❌ bundle 执行就抛错：', err && err.stack)
  process.exit(1)
}

setTimeout(() => {
  const launchers = findAll(body, '.dsh-todo-launcher')
  const shells = findAll(body, '.dsh-todo-shell')
  console.log('launcher 节点数 :', launchers.length)
  console.log('shell 节点数    :', shells.length)
  const frost = findAll(body, '.dsh-todo-frost-range')
  console.log('磨砂滑杆节点数  :', frost.length)
  console.log('body 子节点     :', body.children.map((c) => c.className || c.tagName).join(' | '))
  if (launchers.length === 0) {
    console.error('❌ 按钮没被创建')
    process.exit(1)
  }
  console.log('✅ 挂件正常挂载')
}, 80)
