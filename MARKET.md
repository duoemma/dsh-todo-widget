# 插件市场发布文案

> 这份文件是给市场用的**文案与元数据**，不含代码。发布时按需复制。

---

## 一、一句话标语（Slogan）

**把待办钉在 DSH 边上——不切应用，随手记，随手勾。**

---

## 二、市场卡片简介

**短版（列表页，约 30 字）**

> DSH 右侧悬浮待办：可拖动、可磨砂、可排序，数据只存本机。

**中版（详情页首屏，约 80 字）**

> DSH 界面右侧常驻一个圆形按钮，点开就是待办面板：回车添加、勾选完成、双击改名、拖动排序。面板磨砂强度无级可调，深色浅色自动适配。数据保存在本机 `~/.dsh/todo-widget/todos.json`，不联网、不上传。

---

## 三、详细介绍

**为什么做它**

待办经常是聊着聊着冒出来的。切到别的应用记一笔，回到 DSH 思路就断了；记在聊天里，过两天又翻不到。所以干脆把它挂在界面边上——不打断手上的事，抬眼就能记。

**能做什么**

| 能力 | 说明 |
|---|---|
| 悬浮按钮 | 可拖到任意位置，位置会记住，下次打开还在原处 |
| 未完成角标 | 按钮右下角实时显示未完成数量 |
| 快速新增 | 输入框回车即添加，空内容不提交，提交后保持焦点 |
| 完成 / 撤销 | 勾选即变灰划线，再点一次恢复 |
| 行内改名 | 双击文本就地编辑，Esc 取消，清空即删除 |
| 拖拽排序 | 按住条目上下拖动，带放置指示线 |
| 三种筛选 | 全部 / 未完成 / 已完成 |
| 一键清理 | 折叠区的「清除已完成」，没有已完成项时自动禁用 |
| 磨砂强度 | 0–100% 无级滑杆：0% 不模糊、几乎透出壁纸，100% 接近实心 |
| 主题自适应 | 跟随 DSH 的浅色/深色主题，面板底衬自动切换 |
| 快捷键 | Esc 关闭面板；行内编辑时 Esc 只取消编辑 |

**数据在哪**

- 主存储：`~/.dsh/todo-widget/todos.json`（跨浏览器、跨设备一致）
- 兜底：`localStorage`，宿主接口不可用时自动降级，不会丢数据也不会报错
- **不联网，不上传，不采集任何信息**

**它是怎么挂上去的**

不改 DSH 任何源码。插件通过 `webserver/index-inject` 往页面注入一小段脚本，界面完全由插件自己渲染；宿主端只提供一个极小的 JSON 存储接口（4 个路由）。

宿主端对启动是**零风险**设计：不硬依赖任何服务，路由注册和文件读写全部 try/catch 兜住，任何一步失败都只降级成"纯本地模式"，绝不让 DSH 启动失败。

**兼容性**

- DSH 桌面版 0.2.x（Web 形态同样适用）
- 浅色 / 深色主题均可
- 不依赖 React，无额外运行时依赖

---

## 四、元数据字段

| 字段 | 值 |
|---|---|
| `name` | `dsh-todo-widget` |
| 显示名 | 待办挂件 |
| 显示名（英） | Todo Widget |
| `version` | `0.2.0` |
| 分类 | 生产力 / 界面增强 |
| 图标 | `icon.png`（512×512） |
| 关键词 | `dsh`, `dsh-plugin`, `deepseek-harness`, `todo`, `task`, `widget`, `floating`, `productivity` |

**仓库 / 主页**：待建（发布前需要补 `repository` 与 `homepage` 字段）

---

## 五、English listing

**Tagline**

> Keep your todos pinned to DSH — no app switching, just jot and tick.

**Short description**

> A floating todo widget for the DeepSeek Harness web UI: draggable, sortable, with an adjustable frosted-glass panel and local-only storage.

**Long description**

> A small circular button sits at the edge of the DSH interface; click it and a todo panel unfolds. Add with Enter, tick to finish, double-click to rename inline, drag to reorder, filter by all/open/done. The frosted-glass intensity is a continuous 0–100% slider that adapts to light and dark themes.
>
> Todos are stored locally in `~/.dsh/todo-widget/todos.json` with a `localStorage` fallback. No network calls, no telemetry, no uploads.
>
> The plugin injects a script via `webserver/index-inject` and renders its own UI — no changes to DSH source. The host half is deliberately fail-safe: it declares no hard service dependencies and swallows every error, so a broken widget can never prevent DSH from booting.

---

## 六、截图

| 文件 | 内容 | 状态 |
|---|---|---|
| `docs/screenshot-panel.png` | 展开状态：列表 + 勾选 + 筛选（400×308） | ✅ 已在 README 中使用 |
| 磨砂 0% / 50% / 100% 对比 | 展示滑杆效果 | 待补 |

---

## 七、发布清单

- [x] 包名可用（`dsh-todo-widget` 在 npm 上是空闲的）
- [x] `package.json` 的 `icon` / `files` / `keywords` / `repository` / `homepage` 已配
- [x] 图标 `icon.png`（512×512）+ `icon-128.png`
- [x] 三套自检全绿（宿主端 / 客户端接缝 / DOM 冒烟）
- [x] GitHub 仓库 <https://github.com/duoemma/dsh-todo-widget> 已建并推送
- [x] README 配了效果图
- [ ] 磨砂 0% / 50% / 100% 对比图
- [ ] 提交到 awesome-dsh-plugin 注册表
- [ ] `npm publish`（可选，GitHub 安装已可用）
