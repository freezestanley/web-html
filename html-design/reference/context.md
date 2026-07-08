# 上下文管理最佳实践（Context Budget Rules）

### 一、token 消耗结构认知

一个 session 的上下文通常由三部分构成：

| 来源 | 典型占比 | 说明 |
|------|---------|------|
| 工具返回值 (toolResult) | **60-75%** | 最大头羊，read/exec/edit/web_fetch/gateway 等 |
| Agent 回复与思考 | 20-30% | assistant + reasoning |
| 用户消息 + 系统提示 | 5-10% | user + system + bootstrap files |
| 生成的文件或源码 | 5-50K+ | 生成的文件或源码 |

**结论：控制 context 的关键不是少说，而是控制工具返回值的体积。**

### 二、高危操作黑名单（吃 token 大户）

| 操作 | 单次消耗 | 规避策略 |
|------|---------|---------|
| `gateway config.get` | **20-30K tokens** | 配置查一次后写进文件，后续从文件读，禁止反复调用 |
| `read` 大文件（>30K） | 8-20K+ | 拆成小块读，或读前80行+末尾总结 |
| `web_fetch` 完整页面 | 5-15K+ | 用 maxChars 截断，只取必要内容 |
| `exec` 长输出（如 npm install） | 5-20K+ | 只保留 exitCode + 最后5行摘要 |
| `browser snapshot` | 5-50K+ | 单次任务最多2次，非必要不截图 |
| 生成的文件或源码 | 5-50K+ | 生成的文件或源码，属于"已用完即可丢弃"的内容，用的时候 read 读取就行 |

### 三、主动 handoff 触发条件

禁止等 context 满了才行动。达到以下任一条件应立即执行 HANDOFF：

- Context 使用率 ≥ 60%  且  刚完成一个 gate 阶段
- Context 使用率 ≥ 70%  且  有未保存的中间产物
- Context 使用率 ≥ 80%  →  必须立刻 HANDOFF，无例外

**HANDOFF 正确顺序：**
1. 调用 `gate.js advance/block/reopen-dev` 把当前状态写回 `workflow.json`
2. 输出 `CONTEXT_SAVE` 摘要块（格式见下）
3. **必须**在摘要块之后追加以下固定提示语，一字不差：
   > 存档完毕。执行 `/clear` 后，在新对话中回复「继续任务」即可恢复进度。
4. 调用 `/compact` 或 `/clear` 清理上下文
5. 从 handoff 摘要恢复，继续下一步

**`CONTEXT_SAVE` 格式：**
```
[TASK] 当前目标（一句话，含完成标准）
[DONE] 已完成步骤（文件路径 + 改了什么）
[BLOCK] 阻塞点（最多3条）
[NEXT] 下一步（具体到命令或函数名）
[REF] 关键引用（变量名、API路径、端口号等）
```

**禁止项：** 在 HANDOFF 前执行 `/compact` 或 `/clear` → gate 状态和进度丢失。

### 四、工具返回值瘦身规范

**必须执行** 每次工具调用后，agent 必须主动做摘要，禁止把原始结果原样留在上下文中：

| 工具 | 摘要原则 |
|------|---------|
| `read` | 只保留"文件存在 + 关键内容摘要"，不要保留全文 |
| `exec` | 只保留"exitCode + 关键输出 + 错误信息"的总结，截掉冗长日志 |
| `web_fetch` | 保留"状态码 + 内容摘要"，截掉原始 HTML |
| `gateway` | 保留"操作结果（ok/error）"，不要把整个配置塞回来 |
| `edit` | 保留"修改成功 + 变更行数"，diff 详情可丢弃 |
| 生成的文件或源码 | 5-50K+ | 生成的文件或源码，属于"已用完即可丢弃"的内容，用的时候 read 读取就行 |

必须准守瘦身规范,违反则任务失败,执行HANDOFF正确顺序

### 五、长任务分段 handoff 示例

以 web-design SOP 为例，每个 gate 阶段完成后检查 context：
G2 product.md 写完 → product-sync.js 执行完 → handoff正确顺序
G4 design.md 写完 → handoff正确顺序
G6 开发完成 + build 成功 → handoff正确顺序 → audit.md 写完 → handoff正确顺序
G8 用户确认后 → 进入 G9 → handoff正确顺序

**目标：每个 gate 之间的上下文是独立的，不要跨 gate 累积。**

