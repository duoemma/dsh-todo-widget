# 待办挂件 · dsh-todo-widget

> **把待办钉在 DSH 边上——不切应用，随手记，随手勾。**

<img src="icon.png" alt="图标" width="96" align="right" />

给 DeepSeek Harness（DSH）用的悬浮待办面板：界面右侧一个可拖动的圆形按钮，点开就是清单。
回车添加、勾选完成、双击改名、拖动排序，磨砂强度 0–100% 无级可调。
数据只存本机 `~/.dsh/todo-widget/todos.json`，**不联网、不上传**。

```powershell
dsh plugin --profile desktop add dsh-todo-widget
```

> 市场文案与发布清单见 [MARKET.md](MARKET.md)；离线预览可打开 `test/preview.html`（含假数据，不用装到 DSH）。

## 功能

- 悬浮按钮固定可拖，位置会记住，下次打开还在原处
- 按钮角标实时显示未完成数量
- 面板：新增（回车提交）、勾选完成、删除、双击行内改名
- HTML5 拖拽排序，带放置指示线
- 筛选：全部 / 未完成 / 已完成
- 磨砂强度 0–100% 无级滑杆（0% 透出壁纸，100% 接近实心）
- 底部：`N 项未完成` + 一键清除已完成
- Esc 关闭面板；深色/浅色主题自适应（走 DSH 的 CSS 变量）

## 数据放哪

| 层 | 位置 | 作用 |
|---|---|---|
| 宿主 | `~/.dsh/todo-widget/todos.json` | 权威存储，跨浏览器/跨设备 |
| 浏览器 | `localStorage["dsh-todo-widget:state"]` | 离线兜底 + 秒开 |

宿主 API 不可用时（比如只装了客户端）自动退化为纯 localStorage，不会报错。

## 安装

**方式一：从 GitHub 装（推荐，不需要 npm）**

```powershell
dsh plugin --profile desktop add github:<你的用户名>/dsh-todo-widget
```

装完重启一次 DSH 即可。

**方式二：从 npm 装（发布到 npm 之后可用）**

```powershell
dsh plugin --profile desktop add dsh-todo-widget
```

**方式三：本地开发 / 离线安装**

```powershell
# 需要写 ~/.dsh，所以要提权
powershell -NoProfile -ExecutionPolicy Bypass -File install-plugin.ps1
```

脚本做四件事：同步到 `~/.dsh/local-plugins/dsh-todo-widget`（ASCII 路径，避开 pnpm 对中文路径的坑）
→ 备份 `profile/package.json` → 幂等写入 `link:` 依赖和 bundles 名册 → 跑 runtime 自带的 pnpm。
**pnpm 失败会自动回滚 package.json**，避免把 profile 弄成起不来的状态。

装完**重启一次 DSH**，刷新页面即可看到右侧的圆形按钮。

卸载：

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File install-plugin.ps1 -Uninstall
```

## 结构

```
dsh-todo-widget/
├─ lib/index.js        宿主端：/todo/api/* JSON 存储（永不阻塞启动）
├─ src/ui.js           面板 UI（纯原生 DOM，由 WorkBuddy 的 deepseek-v4-pro 实现）
├─ src/runtime.js      悬浮按钮 / 拖拽 / 状态 / 持久化
├─ src/entry.js        DSH 客户端插件入口
├─ build.mjs          零依赖构建：三段拼成 __ModuleLoader__ 握手包
├─ client/client.js   构建产物（DSH 实际加载的文件）
├─ test/preview.html   离线预览页（mock __ModuleLoader__ + 假数据）
├─ test-host.mjs       宿主端自检（导入、apply 不抛、路由、404）
├─ test-client.mjs     客户端 bundle 自检（vm 里跑一遍验契约）
└─ install-plugin.ps1  安装/卸载脚本
```

## 开发

```powershell
node build.mjs                # 改完 src/*.js 重新构建（同时打印构建号）
node test\run-bundle-dom.cjs  # ⚠️ 必跑：用最小 DOM 桩把产物真跑一遍
node test-host.mjs            # 宿主端自检（路由、frost 持久化、版本号）
node test-client.mjs          # 客户端 bundle 接缝自检
```

> **`run-bundle-dom.cjs` 是必跑项。** `new Function()` 只能校验语法，抓不到运行时错误。
> v0.1.1 就因为少一个分号（`var TODO_BUILD = "x"` 后面紧跟 `(function(){…})()` 被 ASI
> 拼成"字符串调用"）导致挂件整个不挂载，而语法检查是通过的。这个冒烟脚本会真执行
> bundle 并断言 launcher / shell / 磨砂滑杆三个节点都被创建出来。

## 设计取舍

- **宿主端永不抛错**：DSH 的 boot 是全有或全无的，一个插件加载失败会让整个进程起不来。
  所以 `lib/index.js` 不硬 `inject` 任何服务（用 `ctx.get('webServer')` 探测），
  路由注册和文件读写全部 try/catch，失败只降级不报错。
- **不依赖 React**：客户端 bundle 里没有 React，纯 DOM，少一层版本耦合。
- **构建零依赖**：只用 node 内置模块，不需要 esbuild/rollup。
