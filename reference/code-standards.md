# 代码规范

本文件只保留 HTML / CSS / JS 的合规底线。

## HTML

- 使用 `<!doctype html>`
- 正确设置 `lang`、`charset`、`viewport`
- 标题有意义，不用默认值
- 图片有正确 `alt`
- 优先语义化标签
- 表单控件有 `label` 或 `aria-label`

## CSS

- 默认移动优先
- 双端都可用
- 类名统一 kebab-case
- 避免 `!important`
- 颜色、字号、间距优先走 token
- 布局优先 Flexbox / Grid

## JavaScript

- 只有确有交互需求时才加 JS
- 使用原生 DOM API
- 优先事件委托
- 避免无意义全局变量
- 异步优先 `async/await`
- 不引入 React / Vue / Svelte

## `file://` 约束

默认交付物需要双击 `index.html` 即可运行，因此禁止默认依赖:

- `import.meta.url`
- ES module `import/export`
- `fetch()` 读取本地文件
- `XMLHttpRequest` 读取本地文件

### 数据策略

- `<= 50KB`:内联到 JS 或普通 `<script src>`
- `> 50KB` 且必须 HTTP:可分块加载，但要写入已知限制
- `> 50KB` 且必须 `file://`:改为多页静态化或分页

## 资源引用

- 外部依赖来源可参考 [cdn.md](./cdn.md)
- 本地资源统一放在 `dist/assets/`
