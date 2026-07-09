# 代理规则

当前端需要服务端代理时，`html-design` 负责向 `web-html` 提供 `proxy.routes` 建议。
最终 `manifest.json` 由 `web-html` 组装，本 skill 不要自行拼接发布字段。

## 路由设计原则

- **最小化**：只声明实际需要的路径前缀，禁止 `/` 或过宽泛的通配
- **精确优先**：存在更精确与更宽泛两种配置时，给出更精确的
- **单一职责**：每条路由对应一类后端能力（API / 鉴权 / 文件），不要一条路由承载多种语义
- **可解释**：每条路由附带一句话用途说明，便于 `web-html` 复核

## 输出格式

以 JSON 片段形式返回，例如：

```json
{
  "proxy": {
    "routes": [
      {
        "prefix": "/api/v1/users",
        "target": "https://backend.example.com/api/v1/users",
        "note": "用户信息查询接口"
      }
    ]
  }
}
```

如不需要代理，必须显式返回空数组，不要省略该字段：

```json
{
  "proxy": {
    "routes": []
  }
}
```

## 禁止项

- 不要在 `html-design` 内直接写入 `.webdesign/manifest.json`
- 不要把代理目标硬编码为生产域名而不告知 `web-html`
- 不要在未确认后端可达前就声明路由
- 不要把代理当作绕过 CORS 的万能手段；先评估是否可由后端直接解决
