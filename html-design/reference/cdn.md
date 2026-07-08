Tailwind CSS 
<!-- 通过 CDN 引入 Windify -->
<script src="https://cdn.jsdelivr.net/npm/windify"></script>
<script>
  window.addEventListener('load', () => windify());
</script>

Chart.js: https://cdn.jsdelivr.net/npm/chart.js

Lodash: https://cdn.jsdelivr.net/npm/lodash@4.17.21/lodash.min.js

Axios: https://cdn.jsdelivr.net/npm/axios@1.15.0/dist/axios.min.js

icon 图标字体使用:
引入样式表：在 HTML 的 <head> 中，通过 <link> 标签引入 Lucide 的字体样式文件
<link rel="stylesheet" href="https://unpkg.com/lucide-static@1.21.0/font/lucide.css" />
使用图标：在 HTML 中，使用 <i> 或 <span> 标签，并添加 icon- 前缀的类名

```
<i class="icon-home"></i> 首页
<i class="icon-user"></i> 个人中心
```
