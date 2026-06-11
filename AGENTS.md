<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# Agent 2 — tracking-portal

**Aufträge:** `TASK.md` (Stand + Inbox). **Workflow:** Skill **caveman** (`.cursor/skills/caveman/SKILL.md`).

## Pflicht vor Code

1. `TASK.md` lesen.
2. **Nicht auf `main`** arbeiten — Branch `development` oder `feat/*` von `development`.
3. Inbox-Karte Status setzen (`🟡` → `🟢`).

## Repo-Grenze

Nur dieses Repo. `project-shop` = Kopf. DB-DDL nur über Manage.

## Qualität

`pnpm validate` vor Abschluss. Stand-Block in `TASK.md` aktualisieren.

## Cursor

| Pfad | Zweck |
|------|--------|
| `.cursor/skills/caveman/SKILL.md` | Vollständiger Agent-Workflow |
| `.cursor/rules/*.mdc` | Dauerregeln (Git, TASK, Prisma, API) |
