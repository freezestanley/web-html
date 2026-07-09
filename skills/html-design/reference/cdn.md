# CDN 资源链接

本文件仅提供可用的远程 CDN 链接信息，**不是交付标准、不是白名单、不是强制约束**。

当 `design-taste-frontend` 产出需要外部依赖时，可优先从以下链接选取；如项目有自建 CDN、私有源或其他合规渠道，以项目实际约定为准。

## Tailwind CSS (Windify)

```html
<script src="https://cdn.jsdelivr.net/npm/windify"></script>
<script>
  window.addEventListener('load', () => windify());
</script>
```

## Chart.js

```text
https://cdn.jsdelivr.net/npm/chart.js
```

## Lodash

```text
https://cdn.jsdelivr.net/npm/lodash@4.17.21/lodash.min.js
```

## Axios

```text
https://cdn.jsdelivr.net/npm/axios@1.15.0/dist/axios.min.js
```

## Lucide 图标字体

引入样式表：

```html
<link rel="stylesheet" href="https://unpkg.com/lucide-static@1.21.0/font/lucide.css" />
```

使用图标（`icon-` 前缀类名）：

```html
<i class="icon-home"></i> 首页
<i class="icon-user"></i> 个人中心
```

## 使用说明

- 本文件仅作为"可用资源速查"，不构成合规校验依据
- 选用时注意版本号与完整性，必要时核对 SRI
- 如项目提供了专用 CDN / 私有源，优先使用项目指定来源
- 无法获取合适资源时，记入交付物的「已知限制」章节
