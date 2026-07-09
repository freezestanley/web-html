# 产物结构

本文件只定义 `dist/` 交付底线与长任务约束，不重复视觉或流程说明。

## 最小目录

```text
dist/
├── index.html
└── assets/
    ├── css/
    ├── js/
    ├── images/
    └── icons/
```

可按需增加 `fonts/`、`videos/`、`data/`，但资源不要散落在 `dist/` 根目录。

## 不应进入 `dist/` 的文件

- 预览图：`preview.*`、`screenshot.*`
- 设计源文件：`*.fig`、`*.sketch`、`*.xd`
- 草稿页：`draft.html`、`prototype.html`
- 系统垃圾文件：`.DS_Store`、`Thumbs.db`

## 可用性底线

- `dist/index.html` 可直接打开
- 关键资源路径正确
- 页面不依赖构建工具
- 本地资源统一放在 `dist/assets/`

## 大数据规则

当页面包含大表格或大数据集时：

- 不要把大数据直接内联到 HTML
- 优先外置到 `assets/data/`
- 需要平滑滚动时使用虚拟滚动或分页
- 默认仍以 `file://` 可用为前提；如果必须依赖 HTTP，记入已知限制

建议结构：

```text
dist/
├── index.html
└── assets/
    ├── data/
    ├── css/
    └── js/
```

## 增量交付规则

- 先落 `index.html` 骨架
- 再落基础样式
- 再补内容区和交互脚本
- 单次大块修改尽量拆小，完成即写盘
- 修复问题时只改受影响模块

## 进度反馈

长任务需要结构化进度：

- `[PROGRESS]`：模块完成
- `[BLOCKED]`：需要决策
- `[DONE]`：本轮完成

超过 `60s` 没有进度输出视为异常。

## 限流约束

遇到上游限流时：

- 使用退避重试，不要立刻重发
- 不并行生成多个大模块
- 连续失败时切小块或暂停，交由 `web-html` 向用户呈现选项
- 限流状态写入 `.webdesign/tasks/<taskId>/throttle-state.json`

## 每次交付必须回报

1. 使用了哪些外部依赖
2. 实现了哪些模块
3. 还有哪些已知限制
