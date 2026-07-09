---
name: web-html
description: Use when the user needs a pure HTML/CSS/JS deliverable with project-level orchestration such as project detection, managed-project continuation, preview acceptance, packaging, or publish-marker output. Do not use when the request explicitly requires React, Vue, Astro, Vite, Next.js, SSR, or SSG.
---

# web-html

`web-html` 是托管型纯 HTML 项目的控制器。
它负责项目检测、任务状态、预览/发布流程与发布协议。
除非工作仅涉及元数据或发布相关，否则它不负责视觉实现细节。

## 适用场景

- 新建或续建托管型纯 HTML 项目
- 落地页、活动页、文档页、原型、邮件类静态交付物
- 需要 `.webdesign` 元数据、预览确认或发布打包的流程

## 不适用场景

- React / Vue / Astro / Vite / Next.js / SSR / SSG
- 不涉及项目编排的通用前端分析
- 无需项目级流程的纯视觉实现工作

## 上下文预算

保持本技能轻量。不要预加载所有 reference 文件。
仅在当前步骤需要时读取对应文件:

| 需求 | 读取文件 |
|------|----------|
| 长时接力或上下文受限 | `reference/context.md` |
| HTML 构建规则与产物 | `skills/html-design/SKILL.md` |
| 发布标记协议细节 | 仅使用本地脚本输出；不要凭记忆复述规范 |

## 职责划分

### `web-html` 负责

- 项目检测
- 新建 / 续建 / 阻塞路由判断
- `.webdesign` 元数据与工作流状态
- 预览 / 验收流程
- 打包与发布脚本调用
- 最终发布标记处理

### `html-design` 负责

- HTML / CSS / JS 实现
- 响应式行为
- `dist/` 下的资源布局
- 预览或 CDP 反馈后的修复

## 快速路径

始终走最短有效路径:

1. 检测项目状态
2. 仅收集缺失的必要输入
3. 仅在页面本身发生变化时才委派页面实现
4. 仅验证变更部分
5. 仅在用户明确确认后才发布

Gate 名称是内部状态。
除非在调试工作流本身，否则不要向用户叙述完整的 gate 机制。

## 项目检测

在执行任何构建工作前，必须先检测状态。

### 命令

按项目 ID 或显式路径检测:

```bash
node scripts/detect-project.js <project-id> [--project-path <path>]
```

按 `projectUid` 解析已有托管项目:

```bash
node scripts/resolve-project.js <project-id>
```

新建托管项目:

```bash
node scripts/init-project.js <project-id> <page-slug> <intent> --name <english-name> [--summary <summary>]
```

注意事项:

- `project-id` 必须为 `PROJ` + 16 位十六进制字符
- `--name` 必填，且必须为小写 kebab-case
- 已弃用标志:`--descript`、`--description`、`--project-name`

### 检测结果

- `NEW_PROJECT`:候选目录不存在
- `CONTINUE_MANAGED_PROJECT`:`.webdesign/project.json` 与 `.webdesign/manifest.json` 均存在
- `BROKEN_MANAGED_PROJECT`:托管元数据不完整
- `UNMANAGED_EXISTING_PROJECT`:目录存在但未纳入 `web-html` 管理

对于 `BROKEN_MANAGED_PROJECT` 与 `UNMANAGED_EXISTING_PROJECT`，必须停止并报告阻塞原因。
禁止自动导入或自动修复。

## 何时调用 `html-design`

仅在页面产出本身需要变更时调用 `html-design`:

- 新页面构建
- 布局、样式、内容模块或交互变更
- 预览或浏览器校验后的修复

以下情况不要调用 `html-design`:

- 项目检测
- 工作流 / 元数据更新
- Manifest 渲染
- 仅打包或仅发布操作

## 验证流程

若页面产出发生变更，按以下顺序验证:

1. 确认 `dist/index.html` 存在
2. 可用时使用浏览器工具 / CDP 打开构建后的页面
3. 检查明显的控制台错误或资源加载失败
4. 主动用浏览器或 CDP 打开页面,让用户确认视觉效果和交互行为
4. 发布前请用户确认预览

给用户的消息保持简短:

```text
页面已生成并通过验收。预览:<url>
确认发布，还是需要调整？
```

禁止在该提示中倾倒内部 gate、模块清单或实现细节。
禁止通过CDP或浏览器截图来验证页面

## 发布规则

工作流推进只能通过脚本:

```bash
node scripts/advance-gate.js <workflow.json-path> <target-gate> [--reason <text>] [--unblock]
```

发布只能通过脚本:

```bash
node scripts/publish.js <project-path> <task-id>
```

硬性规则:

- 禁止手工构造发布结果
- 禁止改写或"修复"发布标记
- 若发布脚本返回标记，必须在独立响应中单独输出该标记
- 不得在包含标记的同一响应中追加解释

## 面向用户的输出

默认输出应简短且面向操作:

- 当前项目状态
- 本次变更内容
- 预览 URL 或路径
- 是否需要用户确认
- 最终发布结果

## 安装与环境

如需环境初始化或缺少依赖技能，请参阅 [install.md](./install.md)。
