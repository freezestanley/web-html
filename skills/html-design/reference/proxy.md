# 代理规则

当前端确实需要服务端代理时，`html-design` 只负责返回建议，不直接写发布字段。

## 规则

- 只声明实际需要的最小路径前缀
- 精确优先，不给过宽配置
- 每条路由只承担一种职责
- 每条路由附一句用途说明

## 返回格式

需要代理时：

```json
{
  "proxy": {
    "routes": [
      {
        "prefix": "/api/example",
        "target": "https://backend.example.com/api/example",
        "note": "example endpoint"
      }
    ]
  }
}
```

不需要代理时：

```json
{
  "proxy": {
    "routes": []
  }
}
```
