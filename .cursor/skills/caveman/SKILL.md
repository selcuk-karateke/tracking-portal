---
name: caveman
description: >-
  Strikter Agent-Workflow für tracking-portal (Agent 2): TASK.md zuerst,
  nie auf main arbeiten, Feature-Branch von development, DDL nur über Manage,
  pnpm validate, Stand-Block pflegen. Nutzen bei jeder Aufgabe, neuem Inbox-Eintrag
  oder wenn der Nutzer caveman, Branch oder „vernünftig arbeiten“ sagt.
---

# Caveman — tracking-portal Agent 2

Kein Smalltalk. Kein Arbeiten auf `main`. Kein DDL im Portal. Alles Verbindliche steht in **`TASK.md`**.

## Start (jede Session / jeder Auftrag)

1. **`TASK.md` lesen** — Abschnitt **Stand** + offene **Inbox**-Karten (`⚪` / `🟡`).
2. **Git prüfen:**
   ```bash
   git status -sb
   git branch --show-current
   ```
3. Wenn Branch = **`main`** und du Code ändern willst → **sofort** wechseln (siehe unten). **Nicht** auf `main` committen.
4. Inbox-Karte auf **`🟡 in Arbeit`** setzen, wenn du sie anfasst.

## Branch-Regeln (Pflicht)

| Verboten | Pflicht |
|----------|---------|
| Commits auf `main` | Arbeit auf **`development`** oder Feature-Branch davon |
| Force-push auf `main` | Branch-Namen: `feat/…`, `fix/…`, `chore/…` |

**Neuen Auftrag starten:**

```bash
git fetch origin
git checkout development
git pull origin development
git checkout -b feat/kurzbeschreibung
```

Liegen Änderungen fälschlich auf `main`: Branch erstellen, Änderungen mitnehmen, auf `main` **nicht** committen.

## Repo-Grenze

- **Nur** Dateien in `tracking-portal` ändern.
- **`project-shop`** nicht anfassen (Kopf-Repo). Übergabe nur über `TASK.md` ↔ `TRACKING_PORTAL_INTEGRATION.md`.

## Datenbank / Prisma

- **Gemeinsame DB** mit Manage (`DATABASE_URL`).
- **DDL nur in `project-shop`** migrieren.
- Portal: `prisma/schema.prisma` **an Manage angleichen**; Portal-Migrationen nur **No-op** (z. B. `SELECT 1;`), **UTF-8 ohne BOM**.
- Nach Schema-Änderung: `pnpm exec prisma generate` — **kein** eigenes `CREATE TABLE` im Portal.

## Code

- Next.js: vor API-Änderungen `node_modules/next/dist/docs/` lesen (siehe `AGENTS.md`).
- Bestehende Muster in `src/lib/`, `design-classes.ts` wiederverwenden.
- Scope minimal — keine Drive-by-Refactors.

## Vor „fertig“

```bash
pnpm validate
```

- Inbox-Karte: **`🟢 erledigt`** + **Notiz Agent 2** (eine Zeile).
- **`TASK.md` → Stand**-Tabelle aktualisieren (Branch-Name eintragen).
- **Kein** Status nur per Chat — alles Relevante ins Repo.

## APIs / Sicherheit

- Token-gebundene Routen: `resolveEntityIdFromToken` + Hersteller-E-Mail.
- Open-Orders + POST: Allowlist (`DropshippingDispatch` → `Run`, nur **SUCCESS** wo spezifiziert).
- Strukturierte Fehler `{ ok: false, error: { code, message } }` beibehalten.

## Wenn blockiert

- Inbox: **`🔴 blockiert`** + **eine Zeile** Grund in `TASK.md`.
- Nicht raten bei Manage-only DDL — in TASK vermerken, Kopf/Manage-Migration anfordern.
