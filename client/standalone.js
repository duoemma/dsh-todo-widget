/*! dsh-todo-widget — 自动生成，勿手改。源文件：src/ui.js + src/runtime.js + src/entry.js */
(function () {
var TODO_BUILD = "3dda537794";
/* ============================================================================
 * TodoUI — 纯原生 JS 待办面板 UI（普通 DOM 实现，无依赖、无构建）
 *
 * 导出到全局 window.TodoUI，提供：
 *   - window.TodoUI.CSS    : 面板与按钮的全部样式字符串
 *   - window.TodoUI.mount  : mount(root, api) 渲染面板
 *
 * 硬约束遵守：
 *   - 无 import / export 语句，可直接被 <script> 或 new Function 执行
 *   - 不访问网络、不用 localStorage、不轮询（宿主通过 subscribe 回调通知）
 *   - 中文 UI 文案，代码注释中文
 *   - 兼容现代 Chromium；仅使用可选链 ?. 与空值合并 ??
 * ========================================================================== */

(function () {
  'use strict';

  /* ==========================================================================
   * 一、样式表
   * 所有选择器统一使用 .dsh-todo- 前缀；颜色全部走 CSS 变量 + 兜底值，
   * 同时适配深色 / 浅色主题。灰阶灰线用 rgba 兜底。
   * ========================================================================== */
  var CSS = [
    '.dsh-todo-root{',
    '  --dsh-todo-bg: var(--dsw-alias-bg-layer-2, #fff);',
    '  --dsh-todo-fg: var(--dsw-alias-label-primary, #1f2937);',
    '  --dsh-todo-fg-2: var(--dsw-alias-label-secondary, rgba(31,41,55,.65));',
    '  --dsh-todo-fg-3: var(--dsw-alias-label-tertiary, rgba(31,41,55,.45));',
    '  --dsh-todo-border: var(--dsw-alias-border-l1, #e5e7eb);',
    '  --dsh-todo-accent: var(--dsw-alias-accent, #2563eb);',
    '  --dsh-todo-danger: var(--dsw-alias-danger, #dc2626);',
    '  --dsh-todo-hover: var(--dsw-alias-bg-layer-1, rgba(0,0,0,.04));',
    '  --dsh-todo-shadow: 0 8px 24px rgba(0,0,0,.12);',
    '  width: 320px;',
    '  max-height: 60vh;',
    '  display: flex;',
    '  flex-direction: column;',
    '  background: var(--dsh-todo-bg);',
    '  color: var(--dsh-todo-fg);',
    '  border: 1px solid var(--dsh-todo-border);',
    '  border-radius: 12px;',
    '  box-shadow: var(--dsh-todo-shadow);',
    '  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", "PingFang SC",',
    '    "Microsoft YaHei", sans-serif;',
    '  font-size: 14px;',
    '  line-height: 1.5;',
    '  overflow: hidden;',
    '}',
    '.dsh-todo-root *{box-sizing:border-box;}',
    '.dsh-todo-root ::-webkit-scrollbar{width:8px;}',
    '.dsh-todo-root ::-webkit-scrollbar-thumb{',
    '  background: var(--dsh-todo-border); border-radius:4px;}',
    '.dsh-todo-root ::-webkit-scrollbar-track{background:transparent;}',

    /* 顶部栏 */
    '.dsh-todo-header{',
    '  display:flex; align-items:center; gap:8px;',
    '  padding:12px 12px 8px 14px;',
    '}',
    '.dsh-todo-title{font-size:15px; font-weight:600; margin:0; flex:1; min-width:0;}',
    '.dsh-todo-count{',
    '  display:inline-flex; align-items:center; justify-content:center;',
    '  min-width:20px; height:20px; padding:0 6px;',
    '  margin-left:6px; border-radius:10px;',
    '  background: var(--dsh-todo-accent); color:#fff;',
    '  font-size:12px; font-weight:600; vertical-align:1px;',
    '}',
    '.dsh-todo-count.is-zero{background:var(--dsh-todo-border); color:var(--dsh-todo-fg-2);}',
    '.dsh-todo-btn{',
    '  border:none; background:transparent; cursor:pointer;',
    '  width:28px; height:28px; border-radius:6px;',
    '  display:inline-flex; align-items:center; justify-content:center;',
    '  color:var(--dsh-todo-fg-2); font-size:16px; line-height:1;',
    '  transition: background .12s ease, color .12s ease;',
    '}',
    '.dsh-todo-btn:hover{background:var(--dsh-todo-hover); color:var(--dsh-todo-fg);}',
    '.dsh-todo-close:hover{color:var(--dsh-todo-danger);}',

    /* 磨砂强度滑杆 */
    '.dsh-todo-frost{',
    '  display:flex; align-items:center; gap:10px;',
    '  padding:0 14px 10px 14px;',
    '}',
    '.dsh-todo-frost[hidden]{display:none;}',
    '.dsh-todo-frost-label{font-size:12px; color:var(--dsh-todo-fg-2); flex:none;}',
    '.dsh-todo-frost-range{',
    '  flex:1; min-width:0; height:18px; margin:0; cursor:pointer;',
    '  accent-color:var(--dsh-todo-accent);',
    '}',
    '.dsh-todo-frost-val{',
    '  font-size:12px; color:var(--dsh-todo-fg-2);',
    '  width:38px; text-align:right; font-variant-numeric:tabular-nums; flex:none;',
    '}',
    '.dsh-todo-frost-btn.is-on{color:var(--dsh-todo-accent);}',

    /* 输入区 */
    '.dsh-todo-add{',
    '  display:flex; gap:8px; padding:0 12px 10px 12px;',
    '}',
    '.dsh-todo-input{',
    '  flex:1; min-width:0;',
    '  height:32px; padding:0 10px;',
    '  border:1px solid var(--dsh-todo-border); border-radius:8px;',
    '  background: var(--dsw-alias-bg-layer-1, #f9fafb);',
    '  color: var(--dsh-todo-fg); font-size:14px; outline:none;',
    '}',
    '.dsh-todo-input::placeholder{color:var(--dsh-todo-fg-3);}',
    '.dsh-todo-input:focus{border-color:var(--dsh-todo-accent);}',
    '.dsh-todo-add-btn{',
    '  border:none; border-radius:8px; cursor:pointer;',
    '  padding:0 14px; height:32px;',
    '  background:var(--dsh-todo-accent); color:#fff; font-size:14px;',
    '  white-space:nowrap;',
    '}',
    '.dsh-todo-add-btn:hover{filter:brightness(1.05);}',
    '.dsh-todo-add-btn:active{filter:brightness(.95);}',

    /* 筛选 tab */
    '.dsh-todo-tabs{',
    '  display:flex; gap:2px; padding:0 12px 8px 12px;',
    '  border-bottom:1px solid var(--dsh-todo-border);',
    '}',
    '.dsh-todo-tab{',
    '  border:none; background:transparent; cursor:pointer;',
    '  padding:5px 10px; border-radius:6px; font-size:13px;',
    '  color:var(--dsh-todo-fg-2);',
    '}',
    '.dsh-todo-tab:hover{background:var(--dsh-todo-hover); color:var(--dsh-todo-fg);}',
    '.dsh-todo-tab.is-active{color:var(--dsh-todo-accent); font-weight:600;}',

    /* 列表区 */
    '.dsh-todo-list{',
    '  flex:1; min-height:0; overflow-y:auto;',
    '  list-style:none; margin:0; padding:6px 8px;',
    '}',
    '.dsh-todo-item{',
    '  display:flex; align-items:center; gap:8px;',
    '  padding:6px 8px; border-radius:8px;',
    '  cursor:grab; user-select:none;',
    '}',
    '.dsh-todo-item:hover{background:var(--dsh-todo-hover);}',
    '.dsh-todo-item.dragging{opacity:.5; background:var(--dsh-todo-hover); cursor:grabbing;}',
    '.dsh-todo-item.drop-before{box-shadow:inset 0 2px 0 0 var(--dsh-todo-accent);}',
    '.dsh-todo-item.drop-after{box-shadow:inset 0 -2px 0 0 var(--dsh-todo-accent);}',

    '.dsh-todo-check{',
    '  width:16px; height:16px; flex:none; cursor:pointer; accent-color:var(--dsh-todo-accent);',
    '}',
    '.dsh-todo-text{',
    '  flex:1; min-width:0; word-break:break-all; cursor:text;',
    '  color:var(--dsh-todo-fg);',
    '}',
    '.dsh-todo-item.is-done .dsh-todo-text{',
    '  text-decoration:line-through; color:var(--dsh-todo-fg-3);',
    '}',
    '.dsh-todo-del{',
    '  border:none; background:transparent; cursor:pointer;',
    '  width:24px; height:24px; flex:none; border-radius:6px;',
    '  color:var(--dsh-todo-fg-2); font-size:14px; line-height:1;',
    '  display:inline-flex; align-items:center; justify-content:center;',
    '  opacity:0; transition:opacity .12s ease;',
    '}',
    '.dsh-todo-item:hover .dsh-todo-del{opacity:1;}',
    '.dsh-todo-del:hover{color:var(--dsh-todo-danger); background:var(--dsh-todo-hover);}',

    /* 行内编辑 */
    '.dsh-todo-edit{',
    '  flex:1; min-width:0; height:26px; padding:0 6px;',
    '  border:1px solid var(--dsh-todo-accent); border-radius:6px;',
    '  background:var(--dsh-todo-bg); color:var(--dsh-todo-fg);',
    '  font-size:14px; outline:none;',
    '}',

    /* 空状态 */
    '.dsh-todo-empty{',
    '  padding:28px 16px; text-align:center;',
    '  color:var(--dsh-todo-fg-3); font-size:13px;',
    '}',

    /* 底部 */
    '.dsh-todo-footer{',
    '  display:flex; align-items:center; justify-content:space-between;',
    '  gap:8px; padding:10px 14px;',
    '  border-top:1px solid var(--dsh-todo-border);',
    '  font-size:12px; color:var(--dsh-todo-fg-2);',
    '}',
    '.dsh-todo-clear{',
    '  border:none; background:transparent; cursor:pointer;',
    '  color:var(--dsh-todo-fg-2); font-size:12px; padding:2px 4px; border-radius:4px;',
    '}',
    '.dsh-todo-clear:hover:not(:disabled){color:var(--dsh-todo-danger);}',
    '.dsh-todo-clear:disabled{opacity:.45; cursor:not-allowed;}',
  ].join('\n');

  /* ==========================================================================
   * 二、DOM 构建工具
   * ========================================================================== */

  /** 创建元素并一次性设置属性 */
  function el(tag, className, text) {
    var node = document.createElement(tag);
    if (className) node.className = className;
    if (text != null) node.textContent = text;
    return node;
  }

  /* ==========================================================================
   * 三、挂载函数
   * ========================================================================== */

  /**
   * 将待办面板渲染到 root 中。
   * @param {HTMLElement} root 空的挂载容器
   * @param {object} api 宿主提供的状态与操作接口（见契约）
   */
  function mount(root, api) {
    // —— 结构体 ——
    var rootEl = el('div', 'dsh-todo-root');
    root.appendChild(rootEl);

    // 顶部：标题 + 未完成计数 + 最小化 / 关闭
    var header = el('div', 'dsh-todo-header');
    var titleWrap = el('div', 'dsh-todo-title');
    titleWrap.appendChild(document.createTextNode('待办'));
    var countEl = el('span', 'dsh-todo-count');
    titleWrap.appendChild(countEl);
    var minBtn = el('button', 'dsh-todo-btn dsh-todo-min', '—');
    minBtn.type = 'button';
    minBtn.title = '最小化';
    var frostBtn = el('button', 'dsh-todo-btn dsh-todo-frost-btn', '◐');
    frostBtn.type = 'button';
    frostBtn.title = '磨砂强度';
    var closeBtn = el('button', 'dsh-todo-btn dsh-todo-close', '×');
    closeBtn.type = 'button';
    closeBtn.title = '关闭';
    header.appendChild(titleWrap);
    header.appendChild(frostBtn);
    header.appendChild(minBtn);
    header.appendChild(closeBtn);
    rootEl.appendChild(header);

    // 磨砂强度：无极滑杆（0–100），实时作用到面板底衬与模糊半径
    var frostRow = el('div', 'dsh-todo-frost');
    frostRow.hidden = true;
    var frostLabel = el('span', 'dsh-todo-frost-label', '磨砂');
    var frostRange = el('input', 'dsh-todo-frost-range');
    frostRange.type = 'range';
    frostRange.min = '0';
    frostRange.max = '100';
    frostRange.step = '1';
    frostRange.title = '拖动调节磨砂强度';
    var frostVal = el('span', 'dsh-todo-frost-val');
    frostRow.appendChild(frostLabel);
    frostRow.appendChild(frostRange);
    frostRow.appendChild(frostVal);
    rootEl.appendChild(frostRow);

    function syncFrostUI() {
      var st = api.getState();
      var v = typeof st.frost === 'number' ? st.frost : 82;
      frostRange.value = String(v);
      frostVal.textContent = v + '%';
    }
    syncFrostUI();
    frostRange.addEventListener('input', function () {
      frostVal.textContent = frostRange.value + '%';
      api.setFrost(Number(frostRange.value));
    });
    frostBtn.addEventListener('click', function () {
      frostRow.hidden = !frostRow.hidden;
      if (!frostRow.hidden) {
        syncFrostUI();
        frostRange.focus();
      }
    });

    // 输入区：输入框 + 添加按钮
    var addRow = el('div', 'dsh-todo-add');
    var input = el('input', 'dsh-todo-input');
    input.type = 'text';
    input.placeholder = '添加待办，回车确认';
    var addBtn = el('button', 'dsh-todo-add-btn', '添加');
    addBtn.type = 'button';
    addRow.appendChild(input);
    addRow.appendChild(addBtn);
    rootEl.appendChild(addRow);

    // 筛选 tab
    var tabs = el('div', 'dsh-todo-tabs');
    var FILTERS = [
      { key: 'all', label: '全部' },
      { key: 'open', label: '未完成' },
      { key: 'done', label: '已完成' },
    ];
    var tabEls = {};
    FILTERS.forEach(function (f) {
      var t = el('button', 'dsh-todo-tab', f.label);
      t.type = 'button';
      t.dataset.filter = f.key;
      tabEls[f.key] = t;
      tabs.appendChild(t);
    });
    rootEl.appendChild(tabs);

    // 列表区
    var listEl = el('ul', 'dsh-todo-list');
    rootEl.appendChild(listEl);

    // 空状态
    var emptyEl = el('div', 'dsh-todo-empty', '暂无待办事项');
    rootEl.appendChild(emptyEl);

    // 底部
    var footer = el('div', 'dsh-todo-footer');
    var remainEl = el('span', 'dsh-todo-remain');
    var clearBtn = el('button', 'dsh-todo-clear', '清除已完成');
    clearBtn.type = 'button';
    footer.appendChild(remainEl);
    footer.appendChild(clearBtn);
    rootEl.appendChild(footer);

    /* —— 拖拽状态 —— */
    var dragId = null; // 当前被拖拽的条目 id
    var dropAnchor = null; // { id, position: 'before'|'after' } 放置指示

    /* —— 编辑状态 —— */
    var editingId = null; // 当前正在行内编辑的条目 id

    /* ========================================================================
     * 渲染
     * ======================================================================== */

    /** 根据 api.getState() 重绘整个列表与状态 */
    function render() {
      var state = api.getState();
      var items = state.items || [];
      var filter = state.filter || 'all';

      // 更新未完成计数徽标
      var openCount = items.reduce(function (n, it) { return n + (it.done ? 0 : 1); }, 0);
      countEl.textContent = String(openCount);
      countEl.classList.toggle('is-zero', openCount === 0);

      // 更新筛选 tab 高亮
      FILTERS.forEach(function (f) {
        tabEls[f.key].classList.toggle('is-active', f.key === filter);
      });

      // 过滤列表
      var visible = items.filter(function (it) {
        if (filter === 'open') return !it.done;
        if (filter === 'done') return it.done;
        return true;
      });

      // 清空列表并按过滤后的顺序重绘
      listEl.textContent = '';

      if (visible.length === 0) {
        emptyEl.style.display = '';
        // 空状态文案随筛选类型变化
        emptyEl.textContent =
          items.length === 0 ? '暂无待办事项' :
          filter === 'done' ? '没有已完成的事项' : '没有未完成的事项';
      } else {
        emptyEl.style.display = 'none';
        visible.forEach(function (it) {
          listEl.appendChild(buildItem(it));
        });
      }

      // 行内编辑态：输入框必须在挂进文档之后再聚焦（buildItem 里聚焦是无效的）
      if (editingId) {
        var editEl = listEl.querySelector('.dsh-todo-edit');
        if (editEl) {
          editEl.focus();
          editEl.select();
        }
      }

      // 底部：未完成计数 + 清除按钮禁用态
      remainEl.textContent = openCount + ' 项未完成';
      var hasDone = items.some(function (it) { return it.done; });
      clearBtn.disabled = !hasDone;
    }

    /** 构建单条待办元素 */
    function buildItem(item) {
      var li = el('li', 'dsh-todo-item');
      li.dataset.id = item.id;
      if (item.done) li.classList.add('is-done');
      li.draggable = true;

      // 勾选框
      var check = el('input', 'dsh-todo-check');
      check.type = 'checkbox';
      check.checked = !!item.done;
      check.title = item.done ? '标记为未完成' : '标记为已完成';
      li.appendChild(check);

      // 文本（或编辑输入框）
      var textEl;
      if (editingId === item.id) {
        textEl = el('input', 'dsh-todo-edit');
        textEl.type = 'text';
        textEl.value = item.text;
      } else {
        textEl = el('span', 'dsh-todo-text', item.text);
      }
      li.appendChild(textEl);

      // 删除按钮（hover 显示）
      var del = el('button', 'dsh-todo-del', '×');
      del.type = 'button';
      del.title = '删除';
      li.appendChild(del);

      // —— 事件绑定 ——

      check.addEventListener('change', function () {
        api.toggle(item.id);
      });

      del.addEventListener('click', function () {
        api.remove(item.id);
      });

      if (editingId === item.id) {
        // 聚焦交给 render()：此时节点还没进文档，这里调用无效
        attachEditHandlers(textEl, item.id);
      } else {
        textEl.addEventListener('dblclick', function () {
          editingId = item.id;
          render();
        });
      }

      // 拖拽（HTML5 draggable）
      li.addEventListener('dragstart', function (e) {
        dragId = item.id;
        li.classList.add('dragging');
        if (e.dataTransfer) {
          e.dataTransfer.effectAllowed = 'move';
          // Firefox 需要 setData 才会触发拖拽
          try { e.dataTransfer.setData('text/plain', item.id); } catch (err) { /* 忽略 */ }
        }
      });
      li.addEventListener('dragend', function () {
        li.classList.remove('dragging');
        clearDropIndicator();
        dragId = null;
        dropAnchor = null;
      });

      li.addEventListener('dragover', function (e) {
        if (dragId == null || dragId === item.id) return;
        e.preventDefault();
        if (e.dataTransfer) e.dataTransfer.dropEffect = 'move';
        // 根据鼠标在条目上半/下半决定放置位置
        var rect = li.getBoundingClientRect();
        var pos = (e.clientY - rect.top) / rect.height;
        dropAnchor = { id: item.id, position: pos < 0.5 ? 'before' : 'after' };
        clearDropIndicator();
        li.classList.add(pos < 0.5 ? 'drop-before' : 'drop-after');
      });

      li.addEventListener('dragleave', function () {
        li.classList.remove('drop-before', 'drop-after');
      });

      li.addEventListener('drop', function (e) {
        e.preventDefault();
        if (dragId == null || dragId === item.id) return;
        var ids = api.getState().items.map(function (it) { return it.id; });
        var from = ids.indexOf(dragId);
        var to = ids.indexOf(item.id);
        if (from < 0 || to < 0) return;
        // 从数组移除被拖拽项
        ids.splice(from, 1);
        // 重新定位目标下标（移除后索引可能前移）
        to = ids.indexOf(item.id);
        // 放置到目标前 / 后
        var insertAt = dropAnchor && dropAnchor.position === 'after' ? to + 1 : to;
        ids.splice(insertAt, 0, dragId);
        api.reorder(ids);
        dragId = null;
        dropAnchor = null;
        clearDropIndicator();
      });

      return li;
    }

    /** 清除所有条目的放置指示样式 */
    function clearDropIndicator() {
      var nodes = listEl.querySelectorAll('.dsh-todo-item');
      Array.prototype.forEach.call(nodes, function (n) {
        n.classList.remove('drop-before', 'drop-after');
      });
    }

    /** 为行内编辑输入框绑定事件（Esc 取消 / Enter 与失焦保存 / 空文本删除） */
    function attachEditHandlers(editInput, id) {
      var finished = false;

      function commit() {
        if (finished) return;
        finished = true;
        var text = editInput.value.trim();
        editingId = null;
        if (text === '') {
          // 空文本视为删除
          api.remove(id);
        } else if (text !== (api.getState().items.find(function (it) { return it.id === id; }) || {}).text) {
          api.update(id, { text: text });
        } else {
          // 未变化，仅重绘退出编辑态
          render();
        }
      }

      function cancel() {
        if (finished) return;
        finished = true;
        editingId = null;
        render();
      }

      editInput.addEventListener('keydown', function (e) {
        if (e.key === 'Enter') {
          e.preventDefault();
          commit();
        } else if (e.key === 'Escape') {
          e.preventDefault();
          e.stopPropagation(); // 阻止冒泡触发面板关闭
          cancel();
        }
      });

      // 失焦保存（点击别处 / Tab 离开）
      editInput.addEventListener('blur', function () {
        // 若已因 Enter/Esc 结束，则忽略
        if (!finished) commit();
      });
    }

    /* ========================================================================
     * 交互事件
     * ======================================================================== */

    // 新增：回车提交，空输入不提交，提交后清空并保持焦点
    function submitAdd() {
      var text = input.value.trim();
      if (text === '') return;
      api.add(text);
      input.value = '';
      input.focus();
    }
    input.addEventListener('keydown', function (e) {
      if (e.key === 'Enter') {
        e.preventDefault();
        submitAdd();
      }
    });
    addBtn.addEventListener('click', function () {
      submitAdd();
      input.focus();
    });

    // 筛选 tab 点击
    FILTERS.forEach(function (f) {
      tabEls[f.key].addEventListener('click', function () {
        api.setFilter(f.key);
      });
    });

    // 清除已完成
    clearBtn.addEventListener('click', function () {
      api.clearDone();
    });

    // 最小化 / 关闭
    minBtn.addEventListener('click', function () { api.minimize(); });
    closeBtn.addEventListener('click', function () { api.close(); });

    // Esc 关闭面板（编辑态中 Esc 已被阻止冒泡）
    rootEl.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') {
        e.stopPropagation();
        api.close();
      }
    });

    // 订阅宿主状态变化，变化时重绘
    var unsubscribe = api.subscribe(function () {
      render();
    });

    // 首次渲染 + autofocus
    render();
    input.focus();

    // 返回卸载函数（可选）：移除订阅、清空容器
    return function dispose() {
      if (typeof unsubscribe === 'function') unsubscribe();
      rootEl.remove();
    };
  }

  /* ==========================================================================
   * 四、导出
   * 仅此一处全局副作用。
   * ========================================================================== */
  window.TodoUI = { CSS: CSS, mount: mount };
})();

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
    return { items: data.items, filter: data.filter || 'all', frost: data.frost }
  } catch (_) {
    return null
  }
}

function todoWriteLocal(state) {
  try {
    window.localStorage.setItem(TODO_STORE_KEY, JSON.stringify(state))
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
        // 以较新的一份为准：远端有数据就用远端，否则把本地推上去
        if (data.items.length || !local) {
          state.items = data.items
          if (data.filter) state.filter = data.filter
          if (typeof data.frost === 'number') state.frost = todoApplyFrost(data.frost)
          emit()
        } else {
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

})();
