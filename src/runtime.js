/*!
 * dsh-todo-widget — 浏览器端运行时（我写的部分）
 *
 * 职责：
 *   1. 在页面右下/右侧挂一个可拖动的圆形按钮，点击展开待办面板；
 *   2. 管理待办状态（增删改、排序、筛选）与持久化：
 *      优先走宿主提供的 /todo/api/state（跨设备），失败则退化为 localStorage；
 *   3. 把状态和动作以 api 对象交给 src/ui.js 渲染（window.TodoUI.mount）。
 *
 * 本文件与 ui.js 一起被 build.mjs 拼进 client/client.js 的 factory 里，
 * 不能用 import/export，只能定义函数。
 */

var TODO_STORE_KEY = 'dsh-todo-widget:state'
var TODO_POS_KEY = 'dsh-todo-widget:position'
var TODO_API_BASE = '/todo/api'

var LAYOUT_CSS = [
  '.dsh-todo-launcher{position:fixed;z-index:2147483000;width:44px;height:44px;border-radius:50%;',
  'display:flex;align-items:center;justify-content:center;cursor:grab;user-select:none;',
  'background:var(--dsh-todo-surface,rgba(255,255,255,.92));border:1px solid var(--dsw-alias-border-l1,#e5e7eb);',
  'box-shadow:0 6px 20px rgba(0,0,0,.16);color:var(--dsw-alias-label-primary,#1f2937);',
  'transition:transform .16s ease,box-shadow .16s ease}',
  '.dsh-todo-launcher:hover{transform:translateY(-2px);box-shadow:0 10px 26px rgba(0,0,0,.22)}',
  '.dsh-todo-launcher[data-dragging="1"]{cursor:grabbing;transition:none}',
  '.dsh-todo-badge{position:absolute;top:-4px;right:-4px;min-width:18px;height:18px;border-radius:9px;',
  'background:#ef4444;color:#fff;font-size:11px;line-height:18px;text-align:center;padding:0 4px;',
  'font-family:system-ui,sans-serif}',
  '.dsh-todo-shell{position:fixed;z-index:2147483001;width:332px;display:none}',
  '.dsh-todo-shell[data-open="1"]{display:block}',
  // 磨砂玻璃：外层做高斯模糊，内层面板用高不透明度的底衬，保证文字可读
  '.dsh-todo-shell-inner{box-shadow:0 18px 48px rgba(0,0,0,.28);border-radius:12px;overflow:hidden;',
  'backdrop-filter:blur(20px) saturate(165%);-webkit-backdrop-filter:blur(20px) saturate(165%)}',
  // ui.js 在 .dsh-todo-root 上自己声明了 --dsh-todo-bg，这里用更高优先级把它改接到
  // 运行时探测出来的高不透明度底衬上（--dsh-todo-surface），不动 ui.js 的源码。
  '.dsh-todo-shell .dsh-todo-root{--dsh-todo-bg:var(--dsh-todo-surface,rgba(255,255,255,.9))}',
].join('')

function todoEl(tag, cls, text) {
  var el = document.createElement(tag)
  if (cls) el.className = cls
  if (text != null) el.textContent = text
  return el
}

function todoUuid() {
  try {
    if (window.crypto && typeof window.crypto.randomUUID === 'function') return window.crypto.randomUUID()
  } catch (_) {}
  return 'td-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 8)
}

/** 注入一次样式（layout + UI 提供的 CSS）。 */
function todoEnsureStyles() {
  if (document.querySelector('style[data-dsh-todo-widget]')) return
  var style = document.createElement('style')
  style.setAttribute('data-dsh-todo-widget', '')
  style.textContent = LAYOUT_CSS + '\n' + ((window.TodoUI && window.TodoUI.CSS) || '')
  document.head.appendChild(style)
}

function todoReadLocal() {
  try {
    var raw = window.localStorage.getItem(TODO_STORE_KEY)
    if (!raw) return null
    var data = JSON.parse(raw)
    if (!data || !Array.isArray(data.items)) return null
    return {
      items: data.items,
      filter: data.filter || 'all',
      frost: data.frost,
      // 本地写入时间，用来和服务端的 updatedAt 比谁更新
      savedAt: typeof data.savedAt === 'number' ? data.savedAt : 0,
    }
  } catch (_) {
    return null
  }
}

function todoWriteLocal(state) {
  try {
    // 带上写入时间：下次加载要靠它和服务端 updatedAt 比新旧
    var payload = {
      items: state.items,
      filter: state.filter,
      frost: state.frost,
      savedAt: Date.now(),
    }
    window.localStorage.setItem(TODO_STORE_KEY, JSON.stringify(payload))
  } catch (_) {}
}

function todoReadPos() {
  try {
    var raw = window.localStorage.getItem(TODO_POS_KEY)
    if (!raw) return null
    var p = JSON.parse(raw)
    if (typeof p.left === 'number' && typeof p.top === 'number') return p
  } catch (_) {}
  return null
}

function todoWritePos(p) {
  try {
    window.localStorage.setItem(TODO_POS_KEY, JSON.stringify(p))
  } catch (_) {}
}

/**
 * 探测当前主题，返回一个**高不透明度**的面板底衬色。
 *
 * 为什么要探测：DSH 的 --dsw-alias-bg-layer-2 这类变量本身就带透明度
 * （主题里是 color-mix(..., transparent)），面板底衬跟着它走就会透出壁纸，
 * 字看不清。这里插一个探针元素让浏览器把变量解析成 rgb()，再按亮度选浅底/深底。
 *
 * @param {number} [alpha] 底衬不透明度 0–1，由磨砂滑杆决定；不传则用默认 0.9
 * @returns {string} 形如 rgba(255,255,255,.9) 的颜色
 */
function todoSurface(alpha) {
  var a0 = typeof alpha === 'number' ? Math.max(0, Math.min(1, alpha)) : 0.9
  var alpha = a0
  try {
    var probe = document.createElement('div')
    probe.style.cssText =
      'position:absolute;left:-9999px;top:0;width:1px;height:1px;' +
      'background:var(--dsw-alias-bg-base,var(--dsw-alias-bg-layer-2,#ffffff))'
    document.body.appendChild(probe)
    var rgb = window.getComputedStyle(probe).backgroundColor
    if (probe.parentNode) probe.parentNode.removeChild(probe)
    var m = rgb && rgb.match(/[\d.]+/g)
    if (m && m.length >= 3) {
      var a = m.length > 3 ? parseFloat(m[3]) : 1
      if (a > 0.05) {
        var lum = (0.2126 * +m[0] + 0.7152 * +m[1] + 0.0722 * +m[2]) / 255
        return lum < 0.5
          ? 'rgba(26,28,34,' + alpha + ')'
          : 'rgba(255,255,255,' + alpha + ')'
      }
    }
  } catch (_) {}
  try {
    if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
      return 'rgba(26,28,34,' + alpha + ')'
    }
  } catch (_) {}
  return 'rgba(255,255,255,' + alpha + ')'
}

/**
 * 把磨砂强度（0–100）落到 CSS 变量上。
 *
 * 0   = 不模糊、底衬 62% 不透明（还能看清字，但能看到背后的壁纸）
 * 100 = 模糊 32px、底衬 98% 不透明（几乎实心）
 *
 * @param {number} value 0–100
 * @returns {number} 归一化后的值
 */
function todoApplyFrost(value) {
  var v = Math.max(0, Math.min(100, Number(value)))
  if (!isFinite(v)) v = 82
  var t = v / 100
  try {
    document.body.style.setProperty('--dsh-todo-blur', (t * 32).toFixed(1) + 'px')
    document.body.style.setProperty('--dsh-todo-surface', todoSurface(0.62 + t * 0.36))
  } catch (_) {}
  return v
}

/**
 * 创建整个挂件。
 * @param {object} options { id, version }
 */
function todoCreateWidget(options) {
  var opts = options || {}
  var ui = window.TodoUI
  if (!ui || typeof ui.mount !== 'function') {
    console.warn('[dsh-todo-widget] 找不到 window.TodoUI，客户端 UI 未加载')
    return { dispose: function () {} }
  }
  todoEnsureStyles()

  // ---------- 状态 ----------
  var state = { items: [], filter: 'all', frost: 82 }
  var listeners = []
  var saveTimer = null
  var usingServer = false
  var disposed = false

  function snapshot() {
    return { items: state.items.slice(), filter: state.filter, frost: state.frost }
  }

  function emit() {
    for (var i = 0; i < listeners.length; i++) {
      try {
        listeners[i]()
      } catch (err) {
        console.warn('[dsh-todo-widget] 订阅回调出错', err)
      }
    }
    updateBadge()
  }

  /** 保存：本地立刻写，远端防抖写。 */
  function persist() {
    todoWriteLocal(snapshot())
    if (!usingServer) return
    if (saveTimer) clearTimeout(saveTimer)
    saveTimer = setTimeout(function () {
      saveTimer = null
      try {
        fetch(TODO_API_BASE + '/state', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify(snapshot()),
        }).catch(function () {})
      } catch (_) {}
    }, 350)
  }

  function commit(mutator) {
    mutator()
    emit()
    persist()
  }

  // ---------- 动作 ----------
  var api = {
    getState: function () {
      return snapshot()
    },
    subscribe: function (fn) {
      if (typeof fn !== 'function') return function () {}
      listeners.push(fn)
      return function () {
        var i = listeners.indexOf(fn)
        if (i >= 0) listeners.splice(i, 1)
      }
    },
    add: function (text) {
      var value = String(text || '').trim()
      if (!value) return
      commit(function () {
        state.items.push({ id: todoUuid(), text: value, done: false, createdAt: Date.now() })
      })
    },
    toggle: function (id) {
      commit(function () {
        for (var i = 0; i < state.items.length; i++) {
          if (state.items[i].id === id) state.items[i].done = !state.items[i].done
        }
      })
    },
    remove: function (id) {
      commit(function () {
        state.items = state.items.filter(function (it) {
          return it.id !== id
        })
      })
    },
    update: function (id, patch) {
      var next = patch && typeof patch.text === 'string' ? patch.text.trim() : null
      if (next === '') {
        api.remove(id)
        return
      }
      commit(function () {
        for (var i = 0; i < state.items.length; i++) {
          if (state.items[i].id === id && next !== null) state.items[i].text = next
        }
      })
    },
    reorder: function (ids) {
      if (!Array.isArray(ids) || !ids.length) return
      commit(function () {
        var map = {}
        for (var i = 0; i < state.items.length; i++) map[state.items[i].id] = state.items[i]
        var out = []
        for (var j = 0; j < ids.length; j++) if (map[ids[j]]) out.push(map[ids[j]])
        // 保底：没出现在 ids 里的条目按原顺序补在后面，避免丢数据
        for (var k = 0; k < state.items.length; k++) {
          if (ids.indexOf(state.items[k].id) < 0) out.push(state.items[k])
        }
        state.items = out
      })
    },
    clearDone: function () {
      commit(function () {
        state.items = state.items.filter(function (it) {
          return !it.done
        })
      })
    },
    setFilter: function (f) {
      var next = f === 'open' || f === 'done' ? f : 'all'
      commit(function () {
        state.filter = next
      })
    },
    // 磨砂强度（0–100，无级）。即时生效，状态走同一套持久化。
    setFrost: function (value) {
      var v = todoApplyFrost(value)
      commit(function () {
        state.frost = v
      })
    },
    getFrost: function () {
      return state.frost
    },
    close: function () {
      setOpen(false)
    },
    minimize: function () {
      setOpen(false)
    },
  }

  // ---------- DOM ----------
  var launcher = todoEl('div', 'dsh-todo-launcher')
  launcher.setAttribute('role', 'button')
  launcher.setAttribute('tabindex', '0')
  launcher.title = '待办（点击展开，可拖动）'
  launcher.innerHTML =
    '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" ' +
    'stroke-linecap="round" stroke-linejoin="round"><path d="M9 11l3 3L22 4"/>' +
    '<path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/></svg>'
  var badge = todoEl('span', 'dsh-todo-badge', '')
  badge.style.display = 'none'
  launcher.appendChild(badge)

  var shell = todoEl('div', 'dsh-todo-shell')
  shell.setAttribute('data-open', '0')
  var shellInner = todoEl('div', 'dsh-todo-shell-inner')
  shell.appendChild(shellInner)

  document.body.appendChild(launcher)
  document.body.appendChild(shell)

  // 先算一次底衬色，保证悬浮按钮第一次出现就是实心可读的
  try {
    document.body.style.setProperty('--dsh-todo-surface', todoSurface())
  } catch (_) {}

  // 初始位置：右侧、偏上（避开右下角的小鲸鱼挂件）
  var pos = todoReadPos()
  if (!pos) {
    pos = { left: window.innerWidth - 62, top: Math.max(120, Math.round(window.innerHeight * 0.28)) }
  }
  applyPos(pos)

  /**
   * 把坐标夹进当前视口。
   * 存下来的位置是按当时的窗口大小算的；如果之后窗口变小（或换了分辨率），
   * 旧坐标可能落在屏幕外，按钮就"凭空消失"了——所以每次上屏都要夹一次。
   */
  function clampPos(p) {
    var maxLeft = Math.max(4, window.innerWidth - 52)
    var maxTop = Math.max(4, window.innerHeight - 52)
    return {
      left: Math.min(Math.max(4, Number(p.left) || 0), maxLeft),
      top: Math.min(Math.max(4, Number(p.top) || 0), maxTop),
    }
  }

  function applyPos(p) {
    var q = clampPos(p)
    launcher.style.left = Math.round(q.left) + 'px'
    launcher.style.top = Math.round(q.top) + 'px'
    launcher.style.right = 'auto'
    return q
  }

  var open = false
  function setOpen(next) {
    open = !!next
    shell.setAttribute('data-open', open ? '1' : '0')
    if (open) {
      // 每次展开时重算底衬色：这样切换浅色/深色主题后不需要刷新页面
      try {
        todoApplyFrost(state.frost)
      } catch (_) {}
      placeShell()
    }
  }

  function placeShell() {
    var rect = launcher.getBoundingClientRect()
    var width = 332
    var margin = 12
    var left = rect.left - width - margin
    if (left < margin) left = Math.min(rect.right + margin, window.innerWidth - width - margin)
    var height = shell.offsetHeight || 420
    var top = rect.top - 8
    var maxTop = window.innerHeight - height - margin
    if (top > maxTop) top = Math.max(margin, maxTop)
    shell.style.left = Math.round(left) + 'px'
    shell.style.top = Math.round(top) + 'px'
  }

  function updateBadge() {
    var n = 0
    for (var i = 0; i < state.items.length; i++) if (!state.items[i].done) n++
    if (n > 0) {
      badge.textContent = n > 99 ? '99+' : String(n)
      badge.style.display = ''
    } else {
      badge.style.display = 'none'
    }
  }

  // 拖动 + 点击
  var drag = null
  launcher.addEventListener('pointerdown', function (e) {
    e.preventDefault()
    launcher.setAttribute('data-dragging', '1')
    var rect = launcher.getBoundingClientRect()
    drag = { dx: e.clientX - rect.left, dy: e.clientY - rect.top, moved: false }
    try {
      launcher.setPointerCapture(e.pointerId)
    } catch (_) {}
  })
  launcher.addEventListener('pointermove', function (e) {
    if (!drag) return
    var left = e.clientX - drag.dx
    var top = e.clientY - drag.dy
    if (Math.abs(left - parseFloat(launcher.style.left || '0')) > 2) drag.moved = true
    left = Math.min(Math.max(4, left), window.innerWidth - 48)
    top = Math.min(Math.max(4, top), window.innerHeight - 48)
    applyPos({ left: left, top: top })
  })
  launcher.addEventListener('pointerup', function (e) {
    if (!drag) return
    var moved = drag.moved
    drag = null
    launcher.removeAttribute('data-dragging')
    try {
      launcher.releasePointerCapture(e.pointerId)
    } catch (_) {}
    if (!moved) {
      setOpen(!open)
    } else {
      todoWritePos({ left: parseFloat(launcher.style.left || '0'), top: parseFloat(launcher.style.top || '0') })
      if (open) placeShell()
    }
  })
  launcher.addEventListener('keydown', function (e) {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault()
      setOpen(!open)
    }
  })

  window.addEventListener('resize', function () {
    // 窗口变小后旧坐标可能跑到屏幕外，重新夹一次并把结果存回去
    try {
      var r = launcher.getBoundingClientRect()
      var q = applyPos({ left: r.left, top: r.top })
      todoWritePos(q)
    } catch (_) {}
    if (open) placeShell()
  })

  // ---------- 挂载 UI ----------
  var uiResult = null
  try {
    uiResult = ui.mount(shellInner, api)
  } catch (err) {
    console.error('[dsh-todo-widget] UI 挂载失败', err)
    shellInner.textContent = '待办面板加载失败：' + String((err && err.message) || err)
  }

  // ---------- 载入数据 ----------
  var local = todoReadLocal()
  if (local) {
    state.items = local.items
    state.filter = local.filter
    if (typeof local.frost === 'number') state.frost = todoApplyFrost(local.frost)
    emit()
  }
  try {
    fetch(TODO_API_BASE + '/state', { headers: { accept: 'application/json' } })
      .then(function (res) {
        if (!res.ok) throw new Error('HTTP ' + res.status)
        return res.json()
      })
      .then(function (data) {
        if (disposed || !data || !Array.isArray(data.items)) return
        usingServer = true
        // 以**较新的一份**为准，而不是"服务端有没有数据"。
        // 只看有没有数据的话，在服务端清空待办后，浏览器 localStorage 里的旧副本
        // 会把清空结果又盖回去（这个坑真踩过：清掉的两条测试数据自己长回来了）。
        var serverAt = typeof data.updatedAt === 'number' ? data.updatedAt : 0
        var localAt = local && typeof local.savedAt === 'number' ? local.savedAt : 0
        if (serverAt >= localAt) {
          state.items = data.items
          if (data.filter) state.filter = data.filter
          if (typeof data.frost === 'number') state.frost = todoApplyFrost(data.frost)
          emit()
        } else {
          // 本地比服务端新（比如刚才离线改过），把本地推上去
          persist()
        }
      })
      .catch(function () {
        usingServer = false
      })
  } catch (_) {
    usingServer = false
  }

  updateBadge()

  // ---------- 自更新 ----------
  // 桌面端没有刷新快捷键（"刷新页面"菜单项只在开发模式注册），所以改一次客户端
  // 就得重启一次应用，体验很差。这里让挂件自己比对服务端的构建号，发现有新版本
  // 就卸掉旧 DOM、按新 build 重新拉脚本，用户什么都不用做。
  var updateTimer = null
  function todoSelfUpdateCheck() {
    if (disposed) return
    try {
      fetch(TODO_API_BASE + '/version', { headers: { accept: 'application/json' }, cache: 'no-store' })
        .then(function (res) {
          return res.ok ? res.json() : null
        })
        .then(function (data) {
          if (disposed || !data || !data.build) return
          if (typeof TODO_BUILD === 'undefined' || data.build === TODO_BUILD) return
          todoHotSwap(data.build)
        })
        .catch(function () {})
    } catch (_) {}
  }

  function todoHotSwap(build) {
    try {
      // 每个页面生命周期只允许换一次：换完之后新实例的构建号应当与服务端一致，
      // 万一不一致（比如脚本没更新成功），没有这个闸就会每 45 秒自我替换一次，
      // 旧实例的定时器还活着，越滚越多。
      if (window.__dshTodoSwapped) return
      window.__dshTodoSwapped = true
      if (updateTimer) {
        try {
          window.clearInterval(updateTimer)
        } catch (_) {}
        updateTimer = null
      }
      var stale = document.querySelectorAll('.dsh-todo-launcher,.dsh-todo-shell')
      for (var i = 0; i < stale.length; i++) {
        if (stale[i].parentNode) stale[i].parentNode.removeChild(stale[i])
      }
      var s = document.createElement('script')
      s.src = '/todo/widget.js?v=' + encodeURIComponent(build)
      s.async = false
      ;(document.body || document.head).appendChild(s)
    } catch (err) {
      console.warn('[dsh-todo-widget] 自更新失败', err)
    }
  }

  try {
    updateTimer = window.setInterval(todoSelfUpdateCheck, 45000)
  } catch (_) {}
  todoSelfUpdateCheck()

  return {
    dispose: function () {
      disposed = true
      if (saveTimer) clearTimeout(saveTimer)
      if (updateTimer) {
        try {
          window.clearInterval(updateTimer)
        } catch (_) {}
      }
      try {
        if (uiResult && typeof uiResult.dispose === 'function') uiResult.dispose()
      } catch (_) {}
      if (launcher.parentNode) launcher.parentNode.removeChild(launcher)
      if (shell.parentNode) shell.parentNode.removeChild(shell)
    },
  }
}
