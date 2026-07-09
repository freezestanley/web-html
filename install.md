### 1. Install prerequisite skills

If dependency skills are missing, install them explicitly:

- `html-design`: local file should exist at `skills/html-design/SKILL.md`
- `design-taste-frontend`: local file should exist at `skills/design-taste-frontend/SKILL.md`

If you need to restore them from upstream sources:

```bash
npx skills add anthropics/skills --skill frontend-design
npx skills add https://github.com/Leonxlnx/taste-skill --skill "design-taste-frontend"
```

### 2. Sync local support files

Only when you need shared global guidance, append:

- `reference/context.md` -> current workspace `AGENTS.md`

Append only the needed section. Do not overwrite the whole file.

### 3. Install Node dependencies

Install dependencies in `scripts/` so the controller scripts can run:

```bash
cd scripts
npm install
```
### 4. Initialize workspace config

- 把 `config.js` 中的 `PROJECTS_DIR` 指向当前 workspace 下的 `projects` 目录
- 确认模板、任务目录等配置可被脚本读取

### 5. Gateway restart

- gateway restart 让skill 生效