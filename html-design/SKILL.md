---
name: html-design
description: 纯 HTML 页面的设计开发执行 skill。接收 web-html 的结构化需求，强制先调用 design-taste-frontend 完成视觉与代码产出，再按 reference/ 下的规范做资源校验、产物组装与验收协作。交付物必须支持 H5 + PC 双端适配并达到良好 UI/UE 基线。仅在 web-html 完成项目识别与需求收敛后触发。禁止在未调用 design-taste-frontend 时自行手写页面视觉。
---

# html-design

`html-design` 是 `web-html` 的设计开发执行层。
它**不创作视觉**，也**不控制项目流程**。它的唯一价值是把 `design-taste-frontend` 的产出转化为合规、可发布、可验收的纯 HTML 交付物。

> **铁律：**
> 1. 未调用 `design-taste-frontend` 之前，禁止写任何页面视觉或布局代码。
> 2. 交付物必须同时支持 **H5 + PC** 双端适配，并达到 [reference/responsive-ui.md](./reference/responsive-ui.md) 定义的 UI/UE 基线。
>
> 违反任一条即停止，回报 `web-html`。

## 职责边界

### ✅ 本 skill 负责

- 将输入契约整理为 `design-taste-frontend` 所需的设计简报，**明确要求 H5 + PC 双端适配与 UI/UE 基线**，**必须包含三组设计参数（DESIGN_VARIANCE / MOTION_INTENSITY / VISUAL_DENSITY）**
- 调用 `design-taste-frontend` 完成主题、token、排版、布局、文案、HTML/CSS/JS
- 按 [reference/responsive-ui.md](./reference/responsive-ui.md) 校验产出的多端表现与体验质量
- 按 [reference/design-params.md](./reference/design-params.md) 校验产出风格是否与所选参数一致
- 对照 [reference/cdn.md](./reference/cdn.md) 选取可用的远程 CDN 资源（该文件仅为链接速查，非交付标准）
- 组装 `dist/` 入口页与资源目录（结构见 [reference/artifacts.md](./reference/artifacts.md)）
- 输出 CDN 清单、模块清单、已知限制
- 如需代理，提供 `proxy.routes`（规则见 [reference/proxy.md](./reference/proxy.md)）
- 根据 CDP 验收反馈修复问题（协作方式见 [reference/acceptance.md](./reference/acceptance.md)）

### ❌ 不归本 skill

- 项目新建 / 续改判定 → `web-html`
- `projectUid` 生成与变更 → `web-html`
- 最终发布包组装、发布脚本、publish marker → `web-html`
- 视觉方向决策、主体代码创作 → `design-taste-frontend`

## 执行流程（强制顺序）

```text
1. 校验输入契约 ──缺关键字段──▶ 要求 web-html 补齐，停止
       │
       ▼
2. 整理设计简报 ──▶ 调用 design-taste-frontend
       │              ├─ 要求分模块增量交付（每模块 ≤300 行，完成即落盘）
       │              ├─ 大数据集走 chunked 模式（数据外置 + 虚拟滚动）
       │              └─ 每模块完成后上报 [PROGRESS] / [BLOCKED] / [DONE]
       ▼
3. 收到产出 ──▶ 按 code-standards 校验；CDN 资源可参考 cdn.md
       │            │
       │            ├─ 合规 ──▶ 继续
       │            └─ 不合规 ──▶ 替换 / 移除 / 记入已知限制
       ▼
4. 组装 dist/ + 输出三份清单
       │
       ▼
5. 等待 web-html CDP 验收 ──问题──▶ 按 acceptance.md 修复 ──┐
       │                                                    │
       ▼                                                    │
6. 用户预览确认 ◀────────────────────────────────────────────┘
       │
       ▼
   完成
```

**步骤 2 失败或不可用时，立即停止并回报 `web-html`。禁止降级为自行手写。**

## 输入契约

仅在 `web-html` 完成项目识别与需求收集后执行。输入至少包含：

| 字段 | 必需 | 说明 |
|------|------|------|
| `projectMode` | ✅ | `new` / `continue` |
| `projectRoot` | ✅ | 项目绝对路径 |
| `projectUid` | ✅ | 内部唯一 ID |
| 页面目标 | ✅ | 一句话任务陈述 |
| 内容模块 | ✅ | 区块列表与优先级 |
| 视觉风格 | ✅ | 调性关键词或参考 |
| 设计参数 | ✅ | DESIGN_VARIANCE / MOTION_INTENSITY / VISUAL_DENSITY；按 design-params.md 推荐值选取，不允许省略 |
| 响应式要求 | ✅ | 默认 H5 + PC 双端；如需扩展平板 / 折叠屏等在此说明 |
| UI/UE 基线 | ✅ | 默认遵循 responsive-ui.md；如有更高要求在此覆盖 |
| 交互要求 | ✅ | 动效 / 状态 / 表单 |
| 资源限制 | ✅ | 禁用库 / 体积上限 |
| 输出目录 | ✅ | 通常为 `dist/` |
| 是否需要代理 | ✅ | bool |
| 是否按 cdn.md 生成模板 | ✅ | bool |
| 数据源类型 | 条件 | `inline`（≤50行）/ `chunked`（>50行）/ `none`；chunked 时必须提供数据文件路径 |

缺任一项 → 要求 `web-html` 补齐，不要自行假设。

## 输出契约

最低交付物：

- `dist/index.html`
- `dist/assets/` 及子目录
- 已使用 CDN 依赖清单
- 已实现模块清单
- 已知限制

如需代理，附加 `proxy.routes`（格式见 [reference/proxy.md](./reference/proxy.md)）。
不需要代理时显式返回空路由数组，不要省略字段。

## 详细规范索引

所有说明类规范已从本文档剥离，按需查阅：

| 主题 | 文件 | 何时读 |
|------|------|--------|
| 多端适配与 UI/UE 基线 | [reference/responsive-ui.md](./reference/responsive-ui.md) | 整理设计简报、校验产出、CDP 验收时（**必读**） |
| 设计参数体系 | [reference/design-params.md](./reference/design-params.md) | 整理设计简报、校验风格一致性时（**必读**） |
| HTML / CSS / JS 编码规范 | [reference/code-standards.md](./reference/code-standards.md) | 校验 `design-taste-frontend` 产出时 |
| 产物结构与交付规范 | [reference/artifacts.md](./reference/artifacts.md) | 组装 `dist/` 时（含数据外置、分模块交付、进度反馈） |
| CDN 资源链接速查 | [reference/cdn.md](./reference/cdn.md) | 需要外部依赖时查阅（非交付标准） |
| 代理路由规则 | [reference/proxy.md](./reference/proxy.md) | 需要服务端代理时 |
| 验收协作与修复原则 | [reference/acceptance.md](./reference/acceptance.md) | 收到 CDP 反馈时 |
| 上下文预算与 handoff | [reference/context.md](./reference/context.md) | 长任务分段时 |

## Do Not Do

| 禁令 | 原因 |
|------|------|
| 未调用 `design-taste-frontend` 就写页面视觉 / 布局 | 视觉创作归 `design-taste-frontend`，本 skill 只做合规与组装 |
| 绕过 `web-html` 直接发布或直接与用户确认 | 发布与用户沟通归总控层 |
| 自行拼接 `.webdesign/manifest.json` 的最终发布字段 | manifest 由 `web-html` 在发布阶段组装 |
| 擅自改写项目元数据（project.json / workflow.json） | 元数据所有权归 `web-html` |
| 输出 publish marker | marker 由发布脚本生成，本 skill 不参与 |
| 把"页面实现"扩展成"项目总控" | 角色越界会破坏流程分层 |
| 引入 React / Vue / Svelte / 构建工具 | 本 skill 限定纯 HTML/CSS/JS 交付 |
| 使用 cdn.md 之外的外部依赖而不说明来源 | cdn.md 仅为链接速查；选用其他来源时应确认项目约定或记入已知限制 |
| 交付仅适配单端（只 H5 或只 PC） | 本 skill 强制双端适配；单端需求需在输入契约中显式豁免并记入已知限制 |
| 忽略 UI/UE 基线（无状态、无反馈、对比度不足等） | 违反 responsive-ui.md 即视为未完成，CDP 验收不通过 |
| 将 >200 行数据内联到 HTML | 撑爆 context + 阻塞首屏；应走 chunked 模式 |
| 大数据表无虚拟滚动直接渲染全量 | 渲染卡顿、内存溢出 |
| 数据加载或代码生成期间 >60s 无进度上报 | 用户无法判断是卡死还是在工作 |
| 一次性生成完整页面代码再落盘 | 撑爆 context + 用户无进度感知；必须分模块增量交付 |
| 单模块超 300 行不拆分 | 单次 tool call 过大，失败重做成本高 |
| 把生成中间态代码留在 context 不落盘 | 浪费 token，恢复困难 |
| 使用 `import.meta.url` / ES module import / fetch 本地文件 | file:// 下被 CORS 阻止；必须用内联数据或 `<script src>` |
| 默认假设运行于 HTTP 服务而不考虑 file:// | 交付物默认需支持双击打开；仅当输入契约显式豁免时才可依赖服务端特性 |
| 省略设计参数让 design-taste-frontend 自行猜测风格 | 必须在简报中显式指定 DESIGN_VARIANCE / MOTION_INTENSITY / VISUAL_DENSITY |
| 设计参数与产出不一致（如选低 VARIANCE 但布局散乱） | 违反 design-params.md，CDP 验收不通过 |
