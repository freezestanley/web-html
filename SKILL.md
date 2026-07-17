---
name: web-html
description: Use when the user needs a pure HTML/CSS/JS deliverable with project-level orchestration such as project detection, managed-project continuation, preview acceptance, packaging, or publish-marker output. Do not use when the request explicitly requires React, Vue, Astro, Vite, Next.js, SSR, or SSG.
适用于:html页面的快速生成 不适用于:react/vue等指定技术栈的项目
---

# web-html

`web-html` 是托管型纯 HTML 项目的控制器。
它负责项目检测、任务状态、预览/发布流程与发布协议。
除非工作仅涉及元数据或发布相关，否则它不负责视觉实现细节。

# 强制必须准守绝对不能违反的准则

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
| 发布标记协议细节 | 仅使用 `scripts/publish-final.js` 输出；不要凭记忆复述规范 |

## 职责划分

### `web-html` 负责

- 项目检测
- 新建 / 续建 / 阻塞路由判断
- `.webdesign` 元数据与工作流状态
- `html-design` subagent payload 生成与构建监督
- subagent 产物检查
- 预览 / 验收流程
- 打包与发布脚本调用
- 最终发布标记处理

### `html-design` subagent 负责

- HTML / CSS / JS 实现
- 响应式行为
- `dist/` 下的资源布局
- 预览或 CDP 反馈后的修复

## 快速路径

始终走最短有效路径:

1. 检测项目状态
2. 若是续建或恢复场景，先恢复任务上下文
3. 仅收集缺失的必要输入
4. 仅在页面本身发生变化时才委派页面实现
5. 仅验证变更部分
6. 仅在用户明确确认后才发布

Gate 名称是内部状态。
除非在调试工作流本身，否则不要向用户叙述完整的 gate 机制。

## 任务恢复（强制）

出现以下任一情况时，必须先恢复任务上下文，禁止先问用户“做到哪里了”：

- `detect-project` 结果为 `CONTINUE_MANAGED_PROJECT`
- 用户明确表示“继续任务 / 恢复 / 接着做”
- 当前任务 `workflow.json.currentGate` 不是 `DONE`

恢复命令：

```bash
node scripts/resume-task.js <project-id>
```

或在已知路径时：

```bash
node scripts/resume-task.js --project-path <project-path>
```

恢复顺序是硬规则：

1. 先读取项目级 `.webdesign/last-handoff.json`
2. 若其中的 `taskId` 对应任务存在且 `workflow.currentGate` 不是 `DONE`，优先恢复该任务
3. 否则回退到 `.webdesign/project.json` 的 `currentTaskId`
4. 读取选中任务的 `workflow.json`
5. 优先读取 `.webdesign/tasks/<taskId>/context-save.json`
6. 若不存在 `context-save.json`，回退到 `01_intake.json` 与 `02_project_state.json`
7. 若 gate 不是 `DONE`，直接继续下一步；不要等待用户再次描述背景

执行 `/compact` 前也有硬规则：

1. 先向用户发送以下提示语:

```text
当前上下文即将压缩。我现在执行 /compact。稍后请回复「继续任务」，我会自动恢复到这一步。
```

2. 然后再执行 `save-context`、输出存档摘要、提示用户 compact 后如何恢复

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

## html-design Subagent 委派（强制）

只要页面产物本身需要变更，主会话必须通过 subagent 委派 `html-design`。
主会话禁止直接执行 HTML/CSS/JS 构建。

触发场景:

- 新页面构建
- 布局、样式、内容模块或交互变更
- 预览或浏览器校验后的修复
- 响应式修复
- `dist/` 资源调整

委派命令:

```bash
node scripts/build-subagent.js <project-path> <task-id>
```

主会话使用脚本输出的 JSON payload 调用 `sessions_spawn`。
Subagent 完成后，主会话检查 `dist/index.html`，然后按合法 gate 顺序继续验收。

以下情况不要委派 `html-design`:

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

### G8 → G9 → publish-final.js → DONE：发布标记产出（流程终点）

1. 用户确认后立即推进到 G9：

```bash
node scripts/advance-gate.js <workflow.json-path> G9_PUBLISH_READY --reason "准备发布"
```

2. **必须**调用最终发布脚本产出标记（不是"若返回"，是"必须调用"）：

```bash
node scripts/publish-final.js <project-path> <task-id>
```

3. `publish-final.js` 会调用发布流程、校验完整发布标记、写入 `publish-marker.txt`，并确保 stdout 只有一行完整发布标记
4. 脚本 stdout 的唯一一行**必须在下一条独立响应中原文输出**，禁止追加任何解释、总结或后续建议
5. 发布标记响应发出后，当前任务即完成；不要再发送发布说明、产物摘要或完成确认
6. 发布标记是下游程序发现并完成后续流程的唯一信号；不输出标记 = 流程中断

`DONE` 是发布脚本的完成结果，不是 LLM 可手动推进的 gate。
禁止调用 `advance-gate.js <workflow.json-path> DONE`。

#### 发布完成响应协议（强制）

发布阶段不是汇报阶段，而是发送机器协议帧。发布标记对 LLM 是不可解释的 opaque string。
一旦 `publish-final.js` 成功输出发布标记，下一条 assistant 响应必须满足:

- 完整内容等于 `publish-final.js` 的 `stdout.trim()`
- 不解析、不解释、不截取、不补全、不重排、不格式化 stdout
- 不允许前置标题、后置说明、markdown 代码块、表格、列表、引用块、状态文字或空行

禁止根据记忆、源码、示例或任何规则生成发布标记；只能复制 `publish-final.js` stdout 的唯一一行。

发布标记响应就是任务完成响应。
不要在同一条或后一条消息中补充“发布成功”“任务完成”“产物如下”等面向用户的说明。

#### 发布标记裁剪禁令

以下都不是发布标记，禁止输出:

- 只输出内部加密体
- 只输出内部片段
- 输出占位内容代替脚本输出
- 缺少脚本输出的任一字符
- 调换脚本输出中的任意片段顺序
- 对脚本 stdout 做截取、补全、重排或格式化

#### 发布前状态判定

| 当前 gate | 正确动作 |
|-----------|----------|
| `G8_USER_CONFIRMED` | 先推进到 `G9_PUBLISH_READY`，再立即调用 `publish-final.js` |
| `G9_PUBLISH_READY` | 直接调用 `publish-final.js` |
| `DONE` 且发布标记已原文输出 | 停止，不重复发布 |
| `DONE` 但发布标记未输出 | 报告流程已不可补发，禁止手工生成标记 |
| 其他 gate | 回到对应验收 / 用户确认流程，禁止发布 |

#### 发布标记来源（强制）

- 发布标记只能来自 `node scripts/publish-final.js <project-path> <task-id>` 的 stdout
- 最终 assistant 响应必须完整等于该 stdout 去掉末尾换行后的字符串
- 禁止直接调用、导入或复用 `buildPublishMarker`
- 禁止手工拼接、改写、重放、补造发布标记
- 禁止因为密钥相同就自行加密任何数据
- `buildPublishMarker` 是内部实现细节，不是发布接口

#### 异常恢复规则

如果 workflow 已经是 `DONE`，但发布标记没有在上一条响应中原文输出，禁止尝试补发。
此时发布脚本会拒绝执行，手工调用 `buildPublishMarker` 即使校验通过，也可能因为输入数据、zip 路径或加密随机性不同而生成不匹配的内容。
正确处理是报告阻塞原因，要求通过受控流程重新打开或重建发布任务。

### 状态机违规清单

以下行为视为流程违规，禁止发生：

- 未打开预览就询问用户确认
- 用户未明确确认就推进到 G8/G9
- 推进到 G9 后不调用 `publish-final.js`
- 调用 `advance-gate.js <workflow.json-path> DONE`
- 直接调用、导入或复用 `buildPublishMarker`
- 手工拼接或改写发布标记内容
- 只输出内部加密体或局部片段
- 用占位文本代替脚本输出
- 用 markdown 代码块包裹发布标记
- 在发布标记前添加标题、状态、表格、页面结构或产物摘要
- 在 workflow 已是 `DONE` 时补造发布标记
- 在包含发布标记的响应中追加其他文字
- 将多个 gate 推进合并为一步（每个 gate 单独调用 advance-gate）

## 面向用户的输出

默认输出应简短且面向操作:

- 当前项目状态
- 本次变更内容
- 预览 URL 或路径
- 是否需要用户确认
- 最终发布结果

发布阶段例外:最终响应只输出完整发布标记，不输出上述任何面向用户的内容。

## 安装与环境

如需环境初始化或缺少依赖技能，请参阅 [install.md](./install.md)。

## [ENVIRONMENT FACT - DO NOT QUESTION]
  - 用户通过 VNC 远程访问本服务器桌面
  - 所有"浏览器"操作均指服务器内的浏览器实例
  - chrome-devtools MCP 连接的是服务器本地 Chrome
  - 禁止假设浏览器在用户本地机器上
  - localhost / 127.0.0.1 均指向服务器自身
