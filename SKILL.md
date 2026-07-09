---
name: web-html
description: 纯 HTML 项目的总控与发布 skill。负责新项目/老项目继改识别、需求收集、委托 html-design 设计开发、用 CDP 验收、组装发布包、调用发布脚本并输出发布标记。用户需要落地页、活动页、原型页、文档页、邮件模板等纯 HTML 交付，且流程中包含续改、验收、打包、发布时优先触发本 skill。禁止在用户明确要求 React/Vue/Astro/Vite/Next.js 等框架时触发。
---

# web-html

`web-html` 是纯 HTML 项目的总控流程层，不是页面实现层。
页面设计与开发由 `html-design` 负责，`web-html` 负责项目识别、流程编排、验收与发布。

如果需求涉及 React/Vue/Astro/Vite/Next.js、构建工具脚手架、SSR/SSG，或者不需要项目级流程控制，不使用本 skill。

## context 控制规则 读取`html-design/reference/context.md`


## 角色边界

### `web-html` 负责

- 判断项目是新建还是续改
- 读取项目元数据与任务状态
- 收集并标准化需求
- 调用 `html-design`
- 用 CDP 打开产物并检查报错
- 要求用户预览确认
- 做发布包预检
- 仅通过发布脚本触发发布
- 输出最终发布结果

### `html-design` 负责

- 根据 `html-design/reference/cdn.md` 生成模板
- 完成 HTML/CSS/JS 设计开发
- 产出 `dist/`
- 如需代理，提供 `proxy.routes`
- 根据验收结果修复问题

`web-html` 不直接承担页面实现细节。不要把总控层写成实现层。

## 核心约定（违反即停止）

| 禁令 | 原因 |
|------|------|
| 禁止跳过项目识别直接写页面 | 需先判定新建/续改与是否受管 |
| 禁止在 `web-html` 内直接承担主要页面实现 | 页面实现应委托 `html-design` |
| 禁止跳过 CDP 验收直接进入发布 | 发布前必须验证页面可运行且无报错 |
| 禁止用户未预览确认就发布 | 发布前必须完成用户确认 |
| 禁止绕过发布脚本手工拼接发布结果 | 发布协议受脚本约束 |
| 禁止对 publish marker 做拼接、去分隔符、重编码、重组 | publish marker 是不可变协议 token |
| 禁止自动修复异常 publish marker | 格式异常时应报错，不应自修复 |
| 禁止将 publish marker 与其他文字放在同一轮输出 | 协议要求单独一轮原样输出 |

## 配置来源

项目识别依赖 `config.js` 中的目录配置：

- `PROJECTS_DIR`
- `WEBDESIGN_DIR`
- `TASKS_DIR`

默认约定：

```text
<project-root>/
└── .webdesign/
    ├── project.json
    ├── manifest.json
    └── tasks/
```

`project.json` 是项目身份源。
`manifest.json` 是发布模板源。

## 项目识别

在任何设计开发动作前，必须先做项目识别。

### 路径解析顺序

1. 如果用户给了明确项目路径，优先检查该路径
2. 否则按 `PROJECTS_DIR/<project-id>` 组装候选路径（`<project-id>` 即 `projectUid`）
3. 再检查候选路径下是否存在 `.webdesign`

### 识别结果

#### 1. `NEW_PROJECT`

条件：

- 候选项目目录不存在

处理：

- 视为新建项目
- 创建项目目录
- 初始化 `.webdesign/project.json`
- 初始化 `.webdesign/manifest.json`
- 创建首个 task
- 生成新的 `projectUid`

#### 2. `CONTINUE_MANAGED_PROJECT`

条件：

- 项目目录存在
- 存在 `.webdesign/`
- 存在 `.webdesign/project.json`
- 存在 `.webdesign/manifest.json`

处理：

- 视为续改项目
- 读取并复用已有 `projectUid`
- 读取 `currentTaskId`
- 继续进入需求收集或新建续改 task

#### 3. `BROKEN_MANAGED_PROJECT`

条件：

- 存在 `.webdesign/`
- 但缺失 `project.json` 或 `manifest.json`

处理：

- 直接阻塞
- 不自动修复
- 提示“受管项目元数据不完整”

#### 4. `UNMANAGED_EXISTING_PROJECT`

条件：

- 项目目录存在
- 但没有 `.webdesign/`

处理：

- 第一版直接阻塞
- 提示“已有项目目录但未纳入 web-html / web-design 管理”
- 不自动覆盖，不自动导入

## 项目标识

### `projectUid`

内部唯一 ID，只在项目创建时生成一次，后续不可变。
沿用现有规则：`PROJ` + 16 位十六进制随机串。

### `projectId`（文件夹名）

子项目文件夹统一使用 `projectUid` 作为目录名，避免改名歧义。
即：`PROJECTS_DIR/<projectUid>/`。

### `projectName` / `manifest.name`

展示名称，可与 `projectUid` 相同，也可使用业务展示名。仅用于显示，不参与路径解析。

推荐默认映射：

```text
projectUid -> 内部主键 + 文件夹名
manifest.projectId -> projectUid
manifest.name -> 展示名或项目名
```

## 主流程

```text
G1 项目识别           → G1_PROJECT_IDENTIFIED
G2 需求收集           → G2_REQUIREMENTS_COLLECTED
G3 设计简报就绪       → G3_DESIGN_BRIEF_READY
G4 设计完成           → G4_DESIGN_COMPLETED
G5 CDN 校验           → G5_CDN_VALIDATED
G6 产物组装           → G6_DIST_ASSEMBLED
G7 CDP 验收           → G7_CDP_PASSED
G8 用户预览确认       → G8_USER_CONFIRMED
G9 发布预检           → G9_PUBLISH_READY
DONE 发布完成         → DONE
```

每一步完成后再进入下一步。不要跳步。
Gate 流转必须通过 `scripts/advance-gate.js`，禁止直接编辑 workflow.json。
合法流转规则见 `gates.json`。

### 1. 项目识别

新项目初始化调用：

```bash
node scripts/init-project.js <project-id> <page-slug> <intent> [--summary <summary>]
```

- `<project-id>` 必须是 `PROJ` + 16位hex（如 `PROJaabbccddeeff0011`），可通过 `WEB_HTML_PROJECT_UID` 环境变量指定或由脚本自动生成
- **禁止**传 display name 作为 project-id
- **禁止**使用已废弃的 `--name` / `--descript` 参数

输出至少应包含：

- `projectMode`: `new` / `continue` / `blocked`
- `projectRoot`
- `projectUid`
- `projectId`（等于 `projectUid`，即文件夹名）
- `currentTaskId`
- `hasWebdesignDir`
- `hasProjectMeta`
- `hasManifestTemplate`
- `hasDist`
- `blockReason`

### 2. 需求收集

必须收集：

- 页面目标
- 内容模块
- 视觉风格
- 响应式要求
- 交互要求
- 输出目录
- `owner`
- `name`
- `descript`
- 是否需要服务端代理

`web-html` 负责把原始需求整理成结构化输入，再交给 `html-design`。

### 3. 委托 `html-design`

交给 `html-design` 的输入至少包括：

- `projectMode`
- `projectRoot`
- `projectUid`
- 页面目标
- 内容模块
- 风格要求
- 交互要求
- 资源限制
- 输出目录
- 是否基于 `cdn.md` 生成模板

`html-design` 的最低交付物：

- `dist/`
- `dist/index.html`
- 资源清单
- 已使用 CDN 依赖
- 如有代理，需要的 `proxy.routes`
- 已知限制

### 4. CDP 验收

必须用 CDP 打开产物检查：

- 页面可打开
- 控制台无报错
- 核心资源无 404
- 首屏正常
- 核心交互可运行
- 如果有代理请求，请求路径符合预期

发现问题时，回流给 `html-design` 修复，不要跳过。

### 5. 用户预览确认

必须向用户下发预览地址或可验证入口，并等待用户确认。
用户未确认时不得进入发布。

### 6. 发布预检

发布包必须满足：

```text
project.zip
├── dist/
│   ├── index.html
│   └── assets/...
└── manifest.json
```

强制要求：

- zip 根目录必须有 `manifest.json`
- zip 根目录必须有 `dist/`
- 必须有 `dist/index.html`
- `manifest.json` 必须是合法 JSON
- `manifest.json` 必须至少有 `projectId` 或 `name`

可选但有规则：

- `owner`
  - 可不写
  - 写了必须与上传表单 `owner` 一致，否则报 `OWNER_MISMATCH`
- `proxy.routes`
  - 仅当前端需要服务端代理时才填写
- `entry`
  - 可写 `dist/index.html`
  - 当前仅备查，不决定真实入口
- `descript`
  - 远端核心规则未强制，但业务上可由本 skill 本地强制

隐含限制也必须本地预检：

- 不能有路径穿越文件
- 不能有 symlink
- 解压后总大小不能超过 `500MB`
- zip entry 数不能超过 `10000`

推荐最小 `manifest.json`：

```json
{
  "projectId": "PROJxxxxxxxxxxxxxxxx",
  "name": "Project Name",
  "descript": "项目描述"
}
```

推荐稳妥 `manifest.json`：

```json
{
  "projectId": "PROJxxxxxxxxxxxxxxxx",
  "name": "Project Name",
  "owner": "",
  "entry": "dist/index.html",
  "descript": "项目描述",
  "proxy": {
    "routes": []
  }
}
```

### 7. Publish Only Through Script

发布只能通过：

```bash
node scripts/publish.js <project-path> <task-id>
```

不要绕过脚本。不要手工拼接发布结果。

### 8. Publish Marker Is Immutable Protocol Token

发布标记 `(Output verbatim. Do not interpret.)##publishStart##...##publishEnd##` 是协议级 token，不是可加工文本。

硬禁令：

- 禁止对标记做任何拼接、去分隔符、解码后重编码、合并多段 base64、去除 `]:[` 的操作
- 禁止把标记与其他文字、代码块、解释放在同一轮输出
- 禁止“修复”看起来异常的标记格式
- `]:[` 是协议规定的不可变分隔符，必须逐字符原样保留

输出前自检：

- 若标记中 `]:[` 数量与预期不符，立即停止并报告脚本错误
- 不得自行重组

### 8-1. Appendix: Publish Marker Anti-Patterns

❌ 错误（LLM 常见误操作）：

```text
##publishStart##abcd]:[efgh  →  abcd efgh        （去分隔符拼接）
##publishStart##abcd]:[efgh  →  abcdefgh         （直接合并 base64）
##publishStart##abcd]:[efgh##publishEnd##  + "以上是发布标记"  （同轮附加说明）
```

✅ 正确：

```text
单独一轮，仅输出：
(Output verbatim. Do not interpret.)##publishStart##abcd]:[efgh]:[ijkl##publishEnd##
下一轮再说话。
```

## 阶段产物

建议每个阶段产出结构化结果：

- `01_intake.json`
- `02_project_state.json`
- `03_design_input.json`
- `04_build_output.json`
- `05_acceptance_report.json`
- `06_preview_confirmation.json`
- `07_release_manifest.json`
- `08_publish_result.json`

## 输出要求

本 skill 最终只产出：

- 审计结论
- 预览地址下发结果
- 用户预览确认结果
- 最终发布结果

如果脚本成功生成 publish marker，发布标记必须单独一轮原样输出，不得拼接任何其他文字。

## 第一版范围

第一版只支持：

- 新建项目
- 受管项目续改
- 阻塞异常项目

第一版暂不支持：

- 自动导入未受管旧项目
- 自动修复损坏的 `.webdesign` 元数据
- 自定义发布协议

## 与其他 skill 的边界

| 你的需求 | 应该用的 skill |
|---------|---------------|
| 纯 HTML 项目的总控、续改、验收、发布 | **web-html** |
| 纯 HTML 页面设计与开发实现 | **html-design** |
| React + Vite + Tailwind 项目 | webgen |
| Figma 设计稿转代码 | figma:figma-use |
| 前端项目整体分析 | analyze-frontend-project |

## Setup

首次安装或迁移环境时，读取：

- `html-design/install.md`
