# HEARTBEAT — web-html context 自检

每次唤醒执行本清单，全程静默、不打扰用户。

**核心：两个判据相互独立，各自评估，互不短路（缺陷F）。**
不要因为"token 未过阈"就跳过恢复检查——compact 成功后 token 必然下降，
恢复判据正是要在这种"token 已低"的状态下把任务接回来。

若当前无 web-html 活跃任务，两个判据都会 skip，回复 `HEARTBEAT_OK` 结束。

## 判据②（恢复）— 先查，因为 compact 后 token 低会让判据①静默

```bash
node scripts/gate.js check-resume <当前项目路径>
```

- `needResume:true` → **立即运行返回的 `resumeCommand`**（`resume-task.js --project-path ...`），
  按其输出的 gate/goal/next 接回任务。resume-task 会把 last-handoff 标记为 `resumed`，保证幂等，
  下次 heartbeat 不会重复恢复。
- `needResume:false`（任意 reason：no-last-handoff / not-compacted-pending / done / not-managed）→ 恢复判据结束，继续判据①。

## 判据①（压缩）— 独立评估，与判据②无先后依赖

1. 阈值探测

   ```bash
   node scripts/session-state.js check-threshold <当前项目路径> --compact-threshold 120000
   ```

   - `needCompact:false` → 判据①结束。
   - `reason:"usage-unavailable"` / `"session-not-found"` → 保守结束，不动。
   - `needCompact:true` → 继续第 2 步。

2. 确认任务仍活跃

   读取 `<项目>/.webdesign/tasks/<taskId>/workflow.json`：
   - `currentGate` 为 `DONE` → 结束，不 compact。
   - 否则继续第 3 步。

3. 存档 + 压缩（推荐直接用 gate.js check-advance 一步完成判阈值→存档→压缩）

   ```bash
   node scripts/gate.js check-advance <项目路径> --compact-threshold 120000
   ```

   - 该命令内部：判阈值 → 写最小存档（**不覆盖已有人工存档**，缺陷A）→ 触发 compact
     → 成功写 `compactState:"compacted"` 到 last-handoff（供下次 heartbeat 判据②恢复，缺陷G）。
   - compact 失败时该命令**以非零退出码结束**（缺陷G），可据此感知失败。

   若需人工填写详细存档，先手动 `save-context.js` 再执行上面命令；
   compact 触发前会向用户发送固定提示语（一字不差）：

   > 当前上下文即将压缩。我现在执行 /compact。稍后回复「继续任务」即可自动恢复。

   sessionKey 无法确定时，回退到手动 `/compact`。

## 开工登记（仅当本项目 session.json 缺失或 sessionKey 变化时）

```bash
node scripts/session-state.js set <项目路径> --session-key <你的 sessionKey>
```

登记是 cron / compaction 插件 / 本 heartbeat 定位会话的**共同前提**。
未登记时三者都无法自动 handoff（不是互为兜底，是共享同一失效点，缺陷C）。
因此：检测到活跃任务但 session.json 缺失时，**主动补登记**，不要直接退出。
