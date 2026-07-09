---
name: html-design
description: Use when a managed `web-html` project needs pure HTML/CSS/JS page work such as new page creation, layout changes, responsive fixes, visual refinement, asset assembly, or preview-driven bugfixes. Escalate to `design-taste-frontend` only for net-new visual direction, major redesign, or when the user explicitly wants stronger design exploration.
---

# html-design

`html-design` 是 `web-html` 的实现层。
它在 `dist/` 下交付纯 HTML、CSS 与 JS 产物。
保持默认路径轻量:中小型页面变更应直接在本技能内完成，不要自动加载更重的设计技能。

## 默认路径

当任务属于以下任一类型时，使用直接 HTML/CSS/JS 实现:

- 对现有页面的小型或中型编辑
- 响应式修复
- 文案、间距、视觉打磨或交互修复
- 资源组装与 `dist/` 清理
- 浏览器校验后的跟进修复

## 升级路径

仅在满足以下至少一个条件时调用 `design-taste-frontend`:

- 需要全新的视觉方向
- 用户明确要求更大胆的设计探索
- 任务是整体重设计，而非有边界的页面编辑

若工作主要是编排、元数据或发布相关，请停留在 `web-html`，不要调用本技能。

## 输入契约

构建前需从 `web-html` 接收以下字段:

- `projectMode`
- `projectRoot`
- `projectUid`
- 页面目标
- 内容模块
- 视觉方向
- 响应式需求
- 交互需求
- 资源限制
- 输出目录
- 是否需要代理路由

若必填字段缺失且会影响实现决策，应向 `web-html` 请求补齐，而不是自行臆造。

## 输出契约

最低交付项:

- `dist/index.html`
- 页面引用的资源文件
- 所用外部依赖的简短说明
- 需要时提供 `proxy.routes`，否则返回空数组
- 若有有意延后处理的事项，需列出已知限制

## 构建流程

1. 校验输入契约
2. 选择轻量路径或升级路径
3. 在 `dist/` 下构建或修补页面
4. 检查 H5 与 PC 端的响应式表现
5. 向 `web-html` 返回简洁的实现说明

## Reference 按需加载

仅在需要时读取 reference 文件:

| 需求 | 读取文件 |
|------|----------|
| 响应式基线 | [reference/responsive-ui.md](../../reference/responsive-ui.md) |
| 设计参数校准 | [reference/design-params.md](../../reference/design-params.md) |
| HTML / CSS / JS 编码护栏 | [reference/code-standards.md](../../reference/code-standards.md) |
| 产物布局与打包预期 | [reference/artifacts.md](../../reference/artifacts.md) |
| 外部 CDN 查询 | [reference/cdn.md](../../reference/cdn.md) |
| 代理路由结构 | [reference/proxy.md](../../reference/proxy.md) |
| 验收修复循环 | [reference/acceptance.md](../../reference/acceptance.md) |
| 长任务接力 / 上下文预算 | [reference/context.md](../../reference/context.md) |

禁止一次性预加载所有 reference。

## 护栏

- 仅使用纯 HTML / CSS / JS
- 禁止引入 React、Vue、Svelte 或任何构建工具假设
- 禁止直接修改 `.webdesign/project.json` 或工作流状态
- 禁止产出发布标记
- 当外部数据文件更合适时，禁止将大数据集内联到 HTML 中
- 若交付物需支持 `file://` 协议，禁止假设 HTTP 托管环境

## 回传给 `web-html` 的完成说明

仅返回控制器所需的信息:

- 本次变更内容
- 产出所在位置
- 任何值得注意的限制
- 是否需要代理路由
- 预览 / 浏览器校验是否需要聚焦特定区域
