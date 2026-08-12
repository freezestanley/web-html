# web-html Context 管理方案 v3.2（两轮对抗性 review 收敛版）

> 本方案经 **codex 两轮对抗性 review** + 逐条源码核验修订。
> **v3.2 关键修正（第二轮 review 逼出）**：
> - 核心闭环从"纯代码闭合"改为**"代码 + 外部调度存活"共同闭合**——至少一个调度器（cron/heartbeat）存活是仓库代码无法保证的隐含前提。
> - 新增缺陷 F（HEARTBEAT 阈值检查会短路恢复路径2）、缺陷 G（无 compact 成功标记，savedAt 不能当判据）。
> - 闭环最小集从"序0/1/2/3"修正为**"序1/2/3/4/5/6"**：compact 成功感知与恢复源数据完整性是正确性前提，非健壮性优化。
> - token 实测结论从"已确认"降级为**"单样本方向确认，compact 回落待补测"**。
> 原则：文档只描述代码真实做到的事；代码没做到的，列入"待修复"，不写进"已落地"。

---

## 一、当前架构（实况）

三层协作。**注意：三层并非"互为兜底"——它们共享同一个前提（session.json 已登记），前提缺失时三层同时失效（见缺陷 C）。**

```
┌─ 宿主 harness 层（外部提供，非本 skill 组件）──────────────┐
│  midTurnPrecheck / autoCompaction / compact hooks         │
│  → skill 无法控制，只能被动接收其事件                       │
└──────────────────┬─────────────────────────────────────────┘
                   │ 触发
┌──────────────────▼─────────────────────────────────────────┐
│  自动闭环层（本 skill 可控）— 三条通道，共享 session.json 前提│
│                                                             │
│  A. cron 定时作业（确定性，零 model 成本，默认 10min）        │
│     gate.js check-advance <project> --compact-threshold N   │
│     判阈值 → 落存档 → openclaw sessions compact              │
│                                                             │
│  B. HEARTBEAT.md（LLM 自执行，唤醒驱动）                     │
│     跑同一批脚本。⚠ session 未登记时直接退出，不补登记        │
│                                                             │
│  C. context-handoff 插件（外部依赖，源码不在本仓库）         │
│     before_compaction: 落最小存档                            │
│     after_compaction: enqueueNextTurnInjection 注入恢复提示  │
└──────────────────┬─────────────────────────────────────────┘
                   │ 读写
┌──────────────────▼─────────────────────────────────────────┐
│  状态文件层（本 skill 拥有，⚠ 当前均为非原子裸写）           │
│  .webdesign/session.json            会话登记（运行期，不入库） │
│  .webdesign/last-handoff.json       最近断点指针              │
│  .webdesign/tasks/<id>/context-save.json  任务存档            │
│  .webdesign/tasks/<id>/workflow.json      业务 gate 状态机    │
└──────────────────────────────────────────────────────────────┘
```

---

## 二、脚本分工（保持四脚本，不合并）

| 脚本 | 职责 | 副作用 | 可测性 |
|------|------|--------|--------|
| `session-state.js` | 会话登记 + 判阈值 | 写 session.json | 纯函数 `computeThreshold` 已有 test |
| `save-context.js` | 人工存档（goal/done/block/next） | 写 context-save + last-handoff | 已有 test |
| `gate.js` | cron/hook 入口：判阈值→存档→触发 compact | 调 openclaw compact | 已有 test |
| `resume-task.js` | 恢复：选活跃任务→读 bundle | 只读 | 已有 test |

**不合并理由**：合并会把纯函数判阈值与有副作用的 compact 触发揉在一起，破坏测试隔离。

---

## 三、真正已落地、本方案确认保留的设计

仅列**核验通过**的部分：

**1. HANDOFF 不是 gate。** `writeMinimalHandoff`（gate.js:70）不改 `workflow.currentGate`，业务 gate（INTAKE→DEV→REVIEW→DONE）保持纯净。✅ 核验通过。

**2. 时间戳统一 ISO。** 全链路 `new Date().toISOString()`（save-context.js:92, gate.js:71）。驳回 v2 的 epoch 毫秒（会与现有读取不一致）。✅ 核验通过。

**3. 判阈值保守失败。** token 拿不到时 `computeThreshold` 返回 `needCompact:false`（session-state.js:88, 105）。✅ 核验通过。

> 注意：v2 及旧 v3 曾声称"恢复优先级确定、损坏时回退"为已实现——**核验不通过，见缺陷 B，已移出本节。**

---

## 四、待修复缺陷（codex review + 源码核验确认）

### 缺陷 A【严重·数据丢失】自动存档覆盖人工存档

`gate.js:70` `writeMinimalHandoff` 用固定占位（`goal:"上下文自动压缩存档"`, `done:[]`, `block:[]`, `next:占位`）调 `writeContextSave`；而 `task-context.js:44-49` 无条件 `writeFileSync` 覆盖。

**后果**：cron/hook 自动触发时，会把用户先前 `save-context.js` 写入的详细 done/block/next **清空为占位**。不可逆信息丢失。

**修复方向**：`writeMinimalHandoff` 写入前先读现有 context-save.json；若存在且 `source !== "auto-handoff"`（即人工存档），保留原字段，只更新 `savedAt`/`gate`，不覆盖 goal/done/block/next。

### 缺陷 B【严重·虚假承诺】损坏 JSON 不降级反而抛异常

`task-context.js:16-17` `readJson` 裸 `JSON.parse`。损坏路径：
- `selectActiveTask`（task-context.js:70）读 last-handoff → 损坏则抛
- `resume-task.js:80` `readContextBundle` → 无 try/catch
- `project-state.js:13` `readProjectMeta` → 同样裸 parse

**后果**：文档（context.md:106）声称"last-handoff 损坏时回退 currentTaskId"，**代码做不到**——损坏直接抛异常，恢复链路整体失败。

**修复方向**：`readJsonIfExists` 内 `JSON.parse` 包 try/catch，损坏时返回 `null`（视同不存在），使 `selectActiveTask` 的回退分支真正生效。`resume-task.js` 顶层加兜底。

### 缺陷 C【严重·前提脆弱】session 未登记时三层同时失效

- cron：定位不到 sessionKey → skip
- HEARTBEAT.md:3：无活跃任务/无 session → 直接 `HEARTBEAT_OK` 退出，**不补登记**
- 插件：after_compaction 注入依赖会话存在

**后果**：session.json 未登记时，三条通道全部空转。**并非"互为兜底"**——它们共享同一失效点。

**修复方向**：
1. 文档删除"三层互为兜底"表述（本方案已删）。
2. HEARTBEAT 检测到活跃任务但 session 未登记时，**主动补登记**（`session-state.js set`），而非直接退出。
3. SKILL.md 开工登记设为强制第一步（已有，见 SKILL.md diff），降低未登记概率。

### 缺陷 D【中等·并发】状态文件非原子写

`task-context.js:47`、`session-state.js:135`、`project-state.js:19` 均为裸 `writeFileSync`。进程崩溃/磁盘满/并发读写可能留下半成品 JSON（进而触发缺陷 B）。

**修复方向**：写临时文件 + `fs.renameSync` 原子替换。优先级低于 A/B/C（cron 10min + heartbeat 唤醒驱动，同窗口交叉概率低）。

### 缺陷 E【中等·陈旧】last-handoff / context-save 无新鲜度校验

`task-context.js:72-83` last-handoff 只要 taskId 对应任务非 DONE 就采信；`resume-task.js:81` context-save 只要文件存在就采信。数天前的旧存档会永久优先于当前任务。

**修复方向**：last-handoff 增加与 workflow.currentGate 一致性校验；可选加 savedAt 新鲜度阈值。优先级低。

---

## 四点五、核心闭环的确定性设计（监听 → compact → 恢复）

本节直接回答："能否纯代码完成 监听→compact→恢复，不依赖仓库外组件？"
**能。设计原则：外部插件只做加速，不做承载。三个断点各给一个不依赖插件的落法。**

### 闭环全景（区分"代码保证"与"加速可选"）

```
监听                compact              恢复
─────────────       ─────────────       ─────────────────────────
cron 轮询 token  →  gate.js 触发     →  ① 插件注入提示（加速，可缺失）
（代码保证）         openclaw compact    ② 插件缺 → HEARTBEAT 补注入（代码保证）
                    （代码保证）         ③ 都缺 → 用户「继续任务」（人工兜底）
                                        ↓ 三条路殊途同归，都调 ↓
                                        resume-task.js（代码保证，须先修缺陷B）
```

关键洞察：**恢复的"送达"可以有多条路径，但"恢复动作本身"只有一个入口 `resume-task.js`。**
只要保证这个入口 (a) 无论谁触发都能跑、(b) 遇损坏能降级不崩，恢复段就是代码保证的，与插件在不在无关。

### 断点 1：监听——token 字段语义单样本已测，跨状态待补

**实测结论（openclaw 2026.7.1-2，2026-08-12，单个 done 状态 session）：`totalTokens` 在该样本中表现为当前上下文占用量，非累计量。** 判阈值可先按此采用，误判方向安全（fail-open）。

样本内证据：
1. session jsonl 中 `totalTokens` 只在**最后一条 assistant 消息**出现一次。
2. 数值 = 当前上下文规模：jsonl 内 `totalTokens=23435` = inputTokens(23423) + outputTokens(12)。
3. 配套字段 `contextTokens`（实测 128000）+ `totalTokensFresh:true`。

**量纲细节**：`sessions list --json` 输出的 `totalTokens` 实际取 **inputTokens 口径**（23423，不含本轮 output），而非 jsonl 里的 23435。判阈值要的正是"已积累的上下文大小"，此口径正确。

**codex review 的合理保留（v3.2 采纳）**：单样本只覆盖 done 状态、少轮次。以下**未取样、结论未外推**：
- running（进行中 turn）状态 list 是否返回上一轮旧值 → 可能漏判
- 多轮长对话累计后数值是否仍等于当前上下文
- 连续 compact 前后数值是否回落（回落才铁证"当前占用"）

**动作项（降级为轻量补测，非阻塞代码）**：在一个多轮 + compact 前后的真实 session 上再取一次样，确认 compact 后 totalTokens 回落。回落即证实；不回落则说明是累计量，需改用采样差值。

**证据①的方法学澄清**："只在最后一条出现"本身不足以证明非累计（累计也可能只写最后一条）——真正的判据是证据②（数值=当前上下文规模）+ 待补的 compact 回落验证。

### 断点 2：compact——已是代码保证，无需改

`gate.js:180-182` 判阈值→存档→`openclaw sessions compact` 完整。唯一补强：compact 失败应非零退出/标记，供 cron 感知（缺陷汇总里的 compact 静默失败项）。

### 断点 3：恢复——把插件降为加速层，代码兜住确定性

这是核心。三条送达路径，优先级从快到慢，**全部收敛到同一个 `resume-task.js`**：

| 优先级 | 送达方式 | 依赖 | 性质 |
|--------|---------|------|------|
| 1（最快） | 插件 after_compaction 注入"运行 resume-task.js" | 外部插件 | 加速，可缺失 |
| 2（兜底） | HEARTBEAT 唤醒时检测"刚 compact 过且任务非 DONE"→ 主动运行 resume-task.js | 本 skill 脚本 | **须重构 HEARTBEAT 才成立（见下）** |
| 3（人工） | 用户回复「继续任务」 | 用户 | 最终兜底 |

**codex review 揪出的两个致命设计缺陷（v3.2 修正）：**

**缺陷 F【严重·路径2逻辑跑不通】HEARTBEAT 阈值检查会挡死恢复。**
现 HEARTBEAT.md 第一步是 check-threshold，`needCompact:false` 即退出。而 compact 成功后 token 必然降到阈值下——**下次 heartbeat 一定走 false 分支直接退出，永远到不了"检测刚 compact 过→恢复"**。路径 2 与现有第一步互斥。
修复方向：HEARTBEAT 改为**两个独立判据并行**，不再是"阈值不过就退出"：
- 判据①（压缩）：token 过阈 → 存档 + compact
- 判据②（恢复）：存在"compact 已完成但未恢复"标记 → 运行 resume-task.js
两判据独立评估，任一命中都执行，互不短路。

**缺陷 G【严重·无 compact 成功标记】savedAt 不能当 compact 判据。**
`gate.js:180-181` 先 writeMinimalHandoff、后 triggerCompact，且 compact 失败仍退出 0（gate.js:114-121）。所以 last-handoff 的 savedAt 只证明"存过档"，**不证明"compact 成功"**。用它当路径 2 判据会误判。
修复方向：引入**持久化 compact 状态机**。`triggerCompact` 成功后写一个标记（如 last-handoff.json 增 `compactState: "compacted"` + `compactedAt`），失败写 `"compact-failed"`。路径 2 判据②只认 `compactState==="compacted" 且 未 resumed`；resume 后置 `"resumed"`，实现幂等，防重复恢复。

而 `resume-task.js` 入口本身还须满足（前几版已列）：
- **修缺陷 B**：`readJsonIfExists` try/catch，损坏视同不存在并降级。**注意 codex 补充**：`readContextBundle`（task-context.js:58）对 workflow.json 是**强制裸读**，损坏仍抛——B 的修复须覆盖 workflow/project.json 缺失或损坏时的降级，不止 last-handoff/context-save。
- **修缺陷 A**：自动存档不得覆盖人工存档。

### 结论：闭环是否成立（v3.2 修正）

| 链路段 | 纯代码能否闭合 | 前置条件 |
|--------|---------------|---------|
| 监听 | 能（轮询式） | 单样本已确认 totalTokens=当前占用；**running/多轮/compact 前后状态未覆盖，待补样本** |
| compact | 能，但**须补成功标记**（缺陷 G） | compact 状态机 + 非零退出感知 |
| 恢复 | 能，但**须重构 HEARTBEAT（F）+ compact 标记（G）+ 修 A/B** | A + B + F + G |

**一句话（诚实版）**：v3.2 的核心闭环在设计上可靠代码闭合、插件仅加速——**但这依赖至少一个外部调度器（cron 或 heartbeat）持续存活并唤醒**，这一条仓库代码无法保证，是闭环的隐含前提。当前代码因缺陷 A/B/F/G 尚未闭合。四缺陷 + 外部调度存活，共同构成闭环成立的必要条件。

---



- **context-handoff 插件源码不在本仓库**，`enqueueNextTurnInjection` 是外部 API。插件缺失/注入失败时，**唯一兜底是 HEARTBEAT 下次唤醒**——但这依赖外部 heartbeat 调度真的会触发（代码中无法保证）。若此后无 heartbeat、无用户消息，恢复提示永不注入。
- **cron 在 Gateway 主机运行**，依赖 session.json 已登记。未登记则 cron 空转（见缺陷 C）。
- **前提约定**：LLM 开工须 `session-state.js set <project> --session-key <key>`。这是三层的**共同前提**，非某一层的可选项。
**totalTokens 语义：单样本已确认为当前占用，跨状态待补验**（session-state.js:63）。实测证据（见断点 1）在 done 状态、少轮次样本上一致指向"当前占用"，判阈值可先按此采用。但 **running / 多轮 / 连续 compact 前后 / 异常退出等状态未取样**，codex review 指出不能据单样本宣布"所有状态下恒为当前占用"。风险等级：低（现有 fail-open 策略在 usage 异常时不 compact，误判方向安全），但补样本前不写"已完全证实"。

---

## 六、驳回项汇总（对 v2 的裁决）

| v2 主张 | 裁决 | 理由 |
|---------|------|------|
| 单脚本 handoff.js 合并 | 驳回 | 破坏测试边界 |
| savedAt epoch 毫秒 | 驳回 | 与现有 ISO 不一致，是回退 |
| midTurnPrecheck 作为 skill 组件 | 修正 | harness 能力，标注为外部 |
| 恢复 fallback 到 event.messages | 修正 | 主通道即注入，兜底是 HEARTBEAT（且脆弱） |
| "恢复走确定性通道已实现" | 部分成立 | 注入机制在，但损坏降级未实现（缺陷B） |
| "HANDOFF 独立标记不污染 gate" | ✅ 确认 | writeMinimalHandoff 不改 gate |

---

## 七、落地顺序

| 序 | 缺陷 | 改动文件 | 类型 | 闭环必要性 |
|----|------|---------|------|-----------|
| 0 | token 语义单样本已测（done 状态）；补测 compact 回落 | 无（轻量取样） | 调研（待补） | 监听段方向安全，跨状态待验 |
| 0b | 占用率判阈值改造（须含 contextTokens 缺失/0/NaN 防护 + fail-open 回退绝对阈值） | session-state.js | 代码（可选） | 监听段优化，非阻塞 |
| 1 | A 覆盖人工存档 | gate.js（writeMinimalHandoff 加读取保留） | 代码 | **恢复段必需** |
| 2 | B 损坏不降级（须覆盖 workflow.json/project.json 强制裸读，非仅 last-handoff） | task-context.js + resume-task.js + project-state.js | 代码 | **恢复段必需** |
| 3 | C 三层空转表述修正 | 本文档 + context.md | 文档 | **恢复段必需** |
| 4 | **F HEARTBEAT 双判据重构**（压缩/恢复独立，不被阈值短路） | HEARTBEAT.md + session-state.js | 脚本 | **恢复段必需（路径2成立前提）** |
| 5 | **G compact 成功状态机**（compacted/failed/resumed 标记 + 幂等） | gate.js + task-context.js | 代码 | **恢复段必需（compact 判据前提）** |
| 6 | D 原子写 + 跨文件一致性（context-save 与 last-handoff 撕裂） | task-context.js / session-state.js / project-state.js | 代码 | **恢复段必需（唯一恢复源完整性）** |
| 7 | E 新鲜度校验 | task-context.js | 代码 | 防恢复到陈旧任务 |
| 8 | session.json 单文件多会话覆盖（无所有权/CAS） | session-state.js | 代码 | 防 cron compact 错 session |

**闭环最小集（v3.2 修正）= 序 1/2/3/4/5/6**（外加序 0 的补测）：
codex review 证明原"最小集=0/1/2/3"不充分——排除了 compact 成功感知（F/G）和唯一恢复源的数据完整性（D），而这些是"恢复靠代码"的正确性前提，不是健壮性优化。

**闭环的隐含前提（仓库代码无法保证，须部署层满足）**：
至少一个外部调度器（Gateway cron 或 heartbeat）持续存活并实际唤醒。进程被 kill、调度器停用、且无用户新消息时，闭环断裂——这不是代码能修的，属部署约定。方案不再声称"纯代码闭合"，改为"代码 + 外部调度存活"共同闭合。
