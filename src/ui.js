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
