# 代码规范

本文件定义 `html-design` 在 HTML / CSS / JS 三层必须遵守的编码规范。
视觉方向与主体代码来自 `design-taste-frontend`，本文件仅约束合规底线。

## HTML

- 使用 HTML5 doctype：`<!doctype html>`
- `<html>` 必须设置正确的 `lang`
- `<head>` 必须包含 `charset=utf-8` 与 `viewport`
- 页面标题必须有意义，禁止默认 "Untitled"
- 图片必须有语义化 `alt`；纯装饰图使用 `alt=""`
- 优先使用语义化标签（`header / nav / main / section / article / footer`）
- 表单控件必须关联 `<label>` 或使用 `aria-label`

## CSS

- 设计令牌通过 CSS 变量承载，沿用 `design-taste-frontend` 输出的 token 命名
- 默认移动优先；断点向上叠加；**具体断点与双端要求见 [responsive-ui.md](./responsive-ui.md)**
- 桌面端与移动端都必须可用
- 类名统一 kebab-case，禁止 camelCase / snake_case
- 禁止 `!important`，除非用于覆盖第三方不可控样式并在注释中说明原因
- 颜色、字号、间距一律走 token，禁止散落的魔法数字
- 布局优先 Flexbox / Grid，避免 float 布局

## JavaScript

- 仅在确有交互需求时引入 JS；纯展示页不要加脚本
- 只使用原生 DOM API，禁止 jQuery 及同类封装
- 事件委托优于逐个绑定
- 避免不必要的全局变量；模块作用域或 IIFE 包裹
- 异步操作使用 `async/await`，禁止回调地狱
- 不引入 React / Vue / Svelte 等框架
- 不要求构建工具作为前置条件
- **file:// 兼容**：交付物必须支持双击 `index.html` 直接打开（见下方 file:// 协议约束）

## file:// 协议约束（强制）

交付物必须能在 `file://` 协议下正常运行。以下 API 在 `file://` 下会被 CORS 阻止或行为不一致：

| 禁止使用 | 原因 | 替代方案 |
|----------|------|----------|
| `import.meta.url` | file:// 下被 CORS 阻止 | 相对路径或内联数据 |
| ES module `import/export` | file:// 下跨文件 import 被 CORS 阻止 | 单文件 IIFE / 全局变量 / `<script>` 标签拼接 |
| `fetch()` 加载本地文件 | file:// 下多数浏览器阻止 fetch 本地路径 | 数据内联到 JS 或用 `<script src>` 加载 JSONP |
| `XMLHttpRequest` 加载本地文件 | 同上 | 同上 |

### 数据加载策略

根据数据量选择：

| 数据量 | 策略 | 说明 |
|--------|------|------|
| ≤ 50KB | **内联到 JS** | 直接写入 `<script>` 或独立 .js 文件，用 `<script src>` 引入 |
| > 50KB 且需服务端 | chunked + fetch | 仅在确认运行于 HTTP 服务时使用，记入已知限制 |
| > 50KB 且仅 file:// | 分页静态化 | 预生成多个 HTML 页面，用 `<a>` 导航 |

**默认假设交付物需在 file:// 下可用。** 如项目明确只在 HTTP 服务下运行，可在输入契约中声明豁免，并在已知限制中注明。

## 资源引用

- 外部依赖可参考 [cdn.md](./cdn.md) 提供的链接速查；该文件不是交付标准
- 如项目有自建 CDN / 私有源 / 其他合规渠道，以项目实际约定为准
- 选用任何来源时注意版本号与完整性，必要时核对 SRI
- 无法获取合适资源时记入交付物的「已知限制」章节
- 本地资源放在 `dist/assets/` 下对应子目录
