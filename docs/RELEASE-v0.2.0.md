# v0.2.0 — 首个可用版本

## 功能

- 悬浮按钮，可拖动，位置会记住
- 未完成数量角标
- 回车添加、勾选完成、双击改名、拖动排序
- 全部 / 未完成 / 已完成 三种筛选，一键清除已完成
- 磨砂强度 0–100% 无级调节，深色浅色主题自适应
- 数据存本机，宿主 JSON 与 localStorage 双写、按时间戳取新

## 安装

```powershell
dsh plugin --profile desktop add github:duoemma/dsh-todo-widget
```

安装后重启一次 DSH。

## 说明

- 不改动 DSH 源码，通过 `webserver/index-inject` 注入脚本
- 宿主端对启动零风险：不硬依赖任何服务，异常只降级不抛出
- 支持自更新：服务端构建号变化后页面会在 45 秒内换成新版本
