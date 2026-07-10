---
name: web-html
description: Use when the user needs a pure HTML/CSS/JS deliverable with project-level orchestration such as project detection, managed-project continuation, preview acceptance, packaging, or publish-marker output. Do not use when the request explicitly requires React, Vue, Astro, Vite, Next.js, SSR, or SSG.
---

# web-html

`web-html` 是托管型纯 HTML 项目的控制器。
它负责项目检测、任务状态、预览/发布流程与发布协议。
除非工作仅涉及元数据或发布相关，否则它不负责视觉实现细节。

# 最最重要必须准守绝对不能违反的规则

**最重要**的核心任务与准则:完成页面开发,主动用浏览器打开给用户看，发出**发布标记**，让下游程序发现并完成后续流程。
**强记惩罚**: 标记原样输出,不发标记等于任务失败

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

## 验证与发布状态机（强制）

页面产出变更后，必须严格按以下状态机执行。每一步都是硬门槛，禁止跳过、合并或改写为"可选"。

### G6 → G7：CDP 验收

1. 确认 `dist/index.html` 存在
2. **必须**用浏览器或 CDP 打开构建后的页面（不是"可用时"，是"必须"）
3. 检查控制台错误与资源加载失败
4. 禁止通过截图代替用户确认；验收靠用户肉眼判断

完成后调用：

```bash
node scripts/advance-gate.js <workflow.json-path> G7_CDP_PASSED --reason "CDP 验收通过"
```

### G7 → G8：用户预览确认（不可跳过）

1. **必须**向用户发送预览确认消息（下方模板），等待用户明确回复
2. 用户回复"确认"/"可以"/"发布"等肯定语义 → 推进到 G8
3. 用户回复调整需求 → 回退到 G6 重新构建，再次走 G7→G8

预览确认消息模板（禁止追加 gate、模块清单或实现细节）：

```text
页面已生成并通过验收。预览：<url>
确认发布，还是需要调整？
```

用户确认后调用：

```bash
node scripts/advance-gate.js <workflow.json-path> G8_USER_CONFIRMED --reason "用户确认预览"
```

### G8 → G9 → DONE：发布标记产出（流程终点）

1. 用户确认后立即推进到 G9：

```bash
node scripts/advance-gate.js <workflow.json-path> G9_PUBLISH_READY --reason "准备发布"
```

2. **必须**调用发布脚本产出标记（不是"若返回"，是"必须调用"）：

```bash
node scripts/publish.js <project-path> <task-id>
```

3. 脚本输出的发布标记**必须在独立响应中原文输出**，禁止追加任何解释、总结或后续建议
4. 发布标记是下游程序发现并完成后续流程的唯一信号；不输出标记 = 流程中断

### 状态机违规清单

以下行为视为流程违规，禁止发生：

- 未打开预览就询问用户确认
- 用户未明确确认就推进到 G8/G9
- 推进到 G9 后不调用 `publish.js`
- 手工拼接或改写发布标记内容
- 在包含发布标记的响应中追加其他文字
- 将多个 gate 推进合并为一步（每个 gate 单独调用 advance-gate）

## 面向用户的输出

默认输出应简短且面向操作:

- 当前项目状态
- 本次变更内容
- 预览 URL 或路径
- 是否需要用户确认
- 最终发布结果

## 安装与环境

如需环境初始化或缺少依赖技能，请参阅 [install.md](./install.md)。

## [ENVIRONMENT FACT - DO NOT QUESTION]
  - 用户通过 VNC 远程访问本服务器桌面
  - 所有"浏览器"操作均指服务器内的浏览器实例
  - chrome-devtools MCP 连接的是服务器本地 Chrome
  - 禁止假设浏览器在用户本地机器上
  - localhost / 127.0.0.1 均指向服务器自身
