---
name: html-design
description: 纯 HTML 页面的设计开发执行 skill。接收 web-html 提供的结构化需求，先调用 frontend-design 完成视觉方向与代码实现，再基于 reference/cdn.md 校验资源、组装 dist/、入口页、资源清单和代理声明。仅在 web-html 已完成项目识别和需求收敛后触发。
---

# html-design

`html-design` 是 `web-html` 的设计开发执行层。
它通过 `frontend-design` 完成页面设计与代码产出，自身负责契约校验、CDN 合规、产物组装与验收协作，不负责项目识别、发布编排、发布脚本和 publish marker。

## 核心职责

- **必须先调用 `frontend-design`** 完成视觉策划与 HTML/CSS/JS 实现
- 将 `frontend-design` 的产出对照 `reference/cdn.md` 做资源校验与替换
- 组装 `dist/` 及入口页
- 整理已使用 CDN 依赖清单、已实现模块清单、已知限制
- 如有接口代理需求，提供 `proxy.routes`
- 根据 CDP 验收结果修复问题

## 不负责的事项

- 不判断项目是新建还是续改
- 不生成或变更 `projectUid`
- 不负责最终发布包组装
- 不调用发布脚本
- 不输出 publish marker
- **不在未调用 `frontend-design` 的情况下自行手写页面视觉与布局**

这些职责归 `web-html`；视觉设计与代码创作归 `frontend-design`。

## 输入契约

仅在 `web-html` 已完成项目识别与需求收集后执行。
输入至少应包含：

- `projectMode`
- `projectRoot`
- `projectUid`
- 页面目标
- 内容模块
- 视觉风格
- 响应式要求
- 交互要求
- 资源限制
- 输出目录
- 是否需要代理
- 是否按 `reference/cdn.md` 生成模板

如果输入缺少关键页面需求，应要求 `web-html` 先补齐，不要自行发散假设。

## 输出契约

最低交付物：

- `dist/`
- `dist/index.html`
- `assets/` 或等价资源目录
- 已使用的 CDN 依赖清单
- 已实现模块清单
- 已知限制

如需服务端代理，还必须输出：

- `proxy.routes`

如不需要代理，明确返回空路由：

```json
{
  “proxy”: {
    “routes”: []
  }
}
```

## 设计开发规则

### 流程顺序（强制）

1. 将输入契约中的页面目标、内容模块、视觉风格、响应式/交互要求、受众与单一页面任务，整理为 `frontend-design` 所需的设计简报
2. 调用 `frontend-design`，由其完成：主题锚定、token 系统、排版配对、布局构思、签名元素、文案、HTML/CSS/JS 代码
3. 拿到 `frontend-design` 产出后，再执行本 skill 的后续校验与组装步骤
4. 若 `frontend-design` 不可用或调用失败，立即停止并回报 `web-html`，禁止降级为自行手写视觉方案

### 模板与资源

- 在 `frontend-design` 产出基础上，对照 `reference/cdn.md` 校验并替换外部依赖
- 只使用纯 HTML/CSS/JS
- 不引入 React/Vue/Svelte 等框架
- 不要求构建工具作为前置条件
- 若 `frontend-design` 引入了 `reference/cdn.md` 之外的 CDN，必须替换为清单内等价资源或移除；无法替换时记入”已知限制”

### HTML 规范

- 使用 HTML5 doctype
- 使用语义化标签
- 设置正确的 `lang`
- 必须包含 `charset` 与 `viewport`
- 页面标题必须有意义
- 图片必须有 `alt`

### CSS 规范

- 使用 CSS 变量承载设计令牌（沿用 `frontend-design` 输出的 token 命名）
- 默认移动优先
- 保证桌面与移动端可用
- 避免 `!important`
- 类名使用 kebab-case

### JS 规范

- 仅在确有交互需求时引入 JS
- 使用原生 DOM API
- 不引入 jQuery
- 事件委托优于逐个绑定
- 避免不必要的全局变量

## 产物要求

最终必须确保：

- `dist/index.html` 可直接打开
- 关键静态资源可访问
- 页面在无构建工具环境下可运行
- 若使用 CDN，来源应符合 `reference/cdn.md`
- 视觉与代码主体来自 `frontend-design`，本 skill 仅做合规与组装

推荐产物结构：

```text
dist/
├── index.html
└── assets/
    ├── css/
    ├── js/
    ├── images/
    └── icons/
```

## 代理规则

当前端需要服务端代理时，`html-design` 负责告知 `web-html` 所需的 `proxy.routes`。
不要在这里组装最终 `manifest.json`，只提供路由建议。

路由建议应尽量最小化，避免宽泛前缀。
如果存在更精确前缀与更宽泛前缀，优先给出更精确的配置。

## 验收协作

`html-design` 自己不结束任务，必须等待 `web-html` 用 CDP 验收。

收到验收问题时：

- 仅修复受影响部分
- 不要无关重写
- 保持原有项目结构和已确认方向
- 涉及视觉/文案调整时，优先回传 `frontend-design` 处理；仅当问题属于资源合规、产物组装或代理配置时由本 skill 直接修复

## Do Not Do

- 不要在未调用 `frontend-design` 的情况下开始页面视觉或代码创作
- 不要绕过 `web-html` 直接发布
- 不要自己拼 `manifest.json` 的最终发布字段
- 不要擅自改写项目元数据
- 不要输出 publish marker
- 不要把”页面实现”扩展成”项目总控”

