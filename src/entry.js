/*!
 * dsh-todo-widget — 浏览器端入口
 *
 * 只做接线：把 src/runtime.js 的挂件创建函数交给 DSH 客户端运行时，
 * 并用 ctx.effect 登记卸载逻辑（页面卸载 / 插件热重载时清理 DOM 与监听）。
 */

/** 找挂载时机：body 还没出来就等 DOMContentLoaded。 */
function todoWhenBodyReady(fn) {
  if (typeof document === 'undefined') return
  if (document.body) {
    fn()
    return
  }
  document.addEventListener('DOMContentLoaded', function once() {
    document.removeEventListener('DOMContentLoaded', once)
    fn()
  })
}

exports.inject = []

exports.apply = function apply(ctx) {
  try {
    if (typeof document === 'undefined') return
    var install = function () {
      var widget = todoCreateWidget({ id: 'dsh-todo-widget' })
      var dispose = function () {
        try {
          widget.dispose()
        } catch (err) {
          console.warn('[dsh-todo-widget] 卸载出错', err)
        }
      }
      if (ctx && typeof ctx.effect === 'function') {
        ctx.effect(function () {
          return dispose
        }, 'todo-widget: 悬浮待办面板')
      }
    }
    todoWhenBodyReady(install)
  } catch (err) {
    // 客户端插件同样不能把整个界面拖垮
    console.error('[dsh-todo-widget] 初始化失败', err)
  }
}
