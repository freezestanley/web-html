# 产物结构

`html-design` 的最终交付物必须满足以下结构与可用性要求。

## 目录布局

```text
dist/
├── index.html            # 入口页，必须存在且可直接打开
└── assets/
    ├── css/              # 样式文件
    ├── js/               # 脚本文件
    ├── images/           # 图片资源
    └── icons/            # 图标字体 / SVG
```

如项目确需额外子目录（fonts / videos / data），可在 `assets/` 下扩展，但不得把资源散落在 `dist/` 根目录。

## 禁止放入 dist/ 的文件

以下文件属于开发中间产物，**严禁**出现在 `dist/` 中：

| 文件 | 来源 | 处理方式 |
|------|------|----------|
| `preview.png` / `preview.jpg` / `screenshot.*` | design-taste-frontend 设计阶段预览图 | 删除，不放入 dist/ |
| `*.sketch` / `*.fig` / `*.xd` | 设计源文件 | 删除，不放入 dist/ |
| `draft.html` / `prototype.html` | 早期草稿 | 删除，不放入 dist/ |
| `.DS_Store` / `Thumbs.db` | 系统元数据 | 删除，不放入 dist/ |

打包时 `createDistZip` 会自动排除 `dist/preview.png`。如发现其他非预期文件，应在组装阶段清理，不要等到发布预检。

## 可用性底线

- `dist/index.html` 在浏览器直接打开即可渲染
- 关键静态资源路径正确、可访问
- 页面无需任何构建工具即可运行
- 外部依赖来源可参考 [cdn.md](./cdn.md)（仅为链接速查，非交付标准）；如使用项目指定来源，以项目约定为准
- 视觉与代码主体来自 `design-taste-frontend`，本 skill 仅做合规校验与组装

## 大数据处理规范

当页面涉及 >200 行表格或大型数据集时，**禁止内联到 HTML**。必须采用数据外置 + 按需加载：

### 目录结构

```text
dist/
├── index.html              # 只含骨架 + 加载器
└── assets/
    ├── data/
    │   ├── manifest.json   # { totalRows, chunkSize, chunks: [...] }
    │   ├── chunk-001.json  # 每片 ≤ 200 行 / ≤ 50KB
    │   ├── chunk-002.json
    │   └── ...
    ├── css/
    ├── js/
    │   └── loader.js       # 虚拟滚动 + 分片 fetch + 进度条
    └── images/
```

### 强制要求

- 数据切片由独立脚本完成（如 `chunk-data.js`），不进 agent context
- 表格使用虚拟滚动，DOM 节点数恒定（可视区 + 缓冲 ≈ 30 行）
- JS 禁用时提供分页降级方案
- 加载期间必须有骨架屏 + 进度条，禁止空白等待 >300ms
- **file:// 兼容**：≤50KB 数据必须内联到 JS；>50KB 且仅 file:// 环境时预生成多页静态化；禁止 fetch/import.meta.url（详见 [code-standards.md](./code-standards.md) file:// 协议约束章节）

## 分模块增量交付规范

`design-taste-frontend` 生成代码时，**禁止一次性输出完整页面**。必须按模块拆分、增量落盘：

### 推荐生成顺序

| 序号 | 模块 | 产出文件 | 上限 |
|------|------|----------|------|
| 1 | HTML 骨架 | `dist/index.html` | ≤150 行 |
| 2 | CSS token + 基础样式 | `dist/assets/css/base.css` | ≤200 行 |
| 3 | 核心内容区 | 追加 index.html + `css/content.css` | ≤300 行 |
| 4 | 交互逻辑 | `dist/assets/js/app.js` | ≤300 行 |
| 5 | 数据加载器（chunked 专用） | `dist/assets/js/loader.js` | ≤200 行 |

### 强制要求

- 每个模块完成后**立即写入磁盘**，不攒在 context 里
- 单模块产出 ≤300 行；超出则继续拆分子模块
- 后续模块只追加或引用已有文件，不重写已完成模块
- 修复验收问题时同样遵循增量原则，只改受影响模块

## 进度反馈协议

`html-design` 在调用 `design-taste-frontend` 及数据加载期间，必须向 `web-html` 上报进度。`web-html` 负责转发给用户。

### 上报格式

| 标记 | 时机 | 示例 |
|------|------|------|
| `[PROGRESS]` | 每完成一个模块 | `[PROGRESS] 3/5 modules · core-content written · 60%` |
| `[BLOCKED]` | 遇到阻塞需决策 | `[BLOCKED] 数据源格式未确认，需 web-html 补充` |
| `[DONE]` | 全部完成 | `[DONE] 5/5 modules · 12 files · 4m32s` |

### 超时规则

- 超过 **60s** 无进度上报 → 视为异常，主动询问是否继续
- 数据加载单片超过 **10s** → 显示重试按钮

### 禁止项

- 禁止生成期间 >60s 无任何输出
- 禁止把中间态代码留在 context 不落盘
- 禁止用"正在生成…"等模糊表述代替结构化进度

## 限流防御协议

LLM 调用可能触发上游速率限制（429 / 529 / "rate increased too quickly"）。`html-design` 与 `web-html` 必须协同执行以下防御策略。

### 请求节奏控制

| 策略 | 规则 |
|------|------|
| 指数退避重试 | 首次限流等待 2s，之后 4s → 8s → 16s，上限 60s；最多重试 4 次 |
| 块间冷却 | 每完成一个模块后主动间隔 1-2s 再发起下一块请求 |
| 串行约束 | 禁止并行生成多模块；强制串行 + 间隔 |
| 动态拆块 | 检测到限流后，下一模块自动拆分为更小子块（≤150 行） |

### 降级触发条件

- 连续 **2 次**限流 → 切换简化模板 + 块间冷却升至 3s
- 重试 **4 次**仍失败 → 暂停生成，向用户报告并提供选项：等待 / 简化需求 / 切换模型
- 总耗时超过 **5min** → 主动询问是否继续或拆分多页

### 状态持久化

限流状态写入 `.webdesign/tasks/<projectId>/throttle-state.json`：

```json
{
  "consecutiveThrottles": 0,
  "totalRetries": 0,
  "currentCooldownMs": 1000,
  "lastThrottleAt": "2026-07-09T10:30:00Z",
  "degradedMode": false
}
```

resume 时读取该文件，避免重置冷却计时。

### 进度行联动

限流期间进度行必须携带状态标识：

```text
[PROGRESS] 3/5 modules · hero written · 60% (⚠️ throttled, retry 2/4, cooldown 8s)
[BLOCKED] rate limit hit 4x, paused — options: wait / simplify / switch model
```

### 禁止项

- 禁止限流后立即重发请求（无退避）
- 禁止在循环中无间隔连续调用 LLM
- 禁止吞掉限流错误静默重试超过 4 次
- 禁止降级模式下仍使用完整模板


每次交付必须在对话中明确列出：

1. **已使用的 CDN 依赖清单** — 库名 + 版本 + URL
2. **已实现模块清单** — 按页面区块枚举
3. **已知限制** — 未能解决的兼容、资源缺失、降级方案

这三项清单是 `web-html` 进入 CDP 验收的前置条件。缺任一项即视为未完成。
