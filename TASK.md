# Aufgabe (ein Agent / ein Entwickler)

**Repo:** dieses Verzeichnis (`tracking-portal`).

## Stand (für `project-shop` / Kopf) — zuletzt: 2026-05-05

| Bereich | Status |
|---------|--------|
| Repo / Branch | `tracking-portal` (Branch: bitte bei Änderungen hier eintragen) |
| Was existiert (Dateien, Routen) | UI-Route `/l/[token]`; Startseite `/` mit Hinweis; API `POST /api/tracking`, `GET /api/tracking/open-orders`; Token-Hash + Entity-Auflösung via Prisma |
| Was ist umgesetzt & getestet | **Phase 1–3** (inkl. Fulfillment), Design-Parität (Nav/Form), **Offene Bestellungen** als Tabelle mit Suche (`q`), Pagination (`after` + `pageInfo`), Filter `status=open|unfulfilled|partial`; Validate/Lint als Pflicht |
| Offen / nächster Schritt | Feintuning nach Manage-Screenshots; optional Datumsfilter sobald gewünscht; Log-Zeile in `project-shop` siehe Kommunikation unten. |

> Regel für Agent 2: Diesen Block bei jedem relevanten Merge aktualisieren (kurz + präzise), damit der Kopf im `project-shop` ohne Chat-Verlauf den echten Stand sieht.

## Aufträge vom Kopf / Inbox (Pflicht-Eingang)

**So benutzt ihr das (einfach):**

- **Neuer Auftrag:** unten eine neue Karte `### YYYY-MM-DD — Kurztitel` anhängen.
- **Inhalt minimal:** *Was* (1–5 Stichpunkte), *Done wenn* (1–3 Checks), *Priorität* (P0/P1).
- **Agent 2:** beim Anpacken Status auf `🟡 in Arbeit` setzen; beim Ende `🟢 erledigt` oder `🔴 blockiert` + **eine** Zeile Grund.
- **Kein Chat nötig:** alles, was zählt, steht in dieser Datei + im **Stand**-Block oben.

### Vorlage (kopieren)

```markdown
### YYYY-MM-DD — Kurztitel

- **Priorität:** P0|P1
- **Auftrag:**
  - …
- **Done wenn:**
  - …
- **Status:** ⚪ offen | 🟡 in Arbeit | 🟢 erledigt | 🔴 blockiert
- **Notiz Agent 2:** …
```

<!-- Kopf/Betreiber: neue Karten **unter** dieser Vorlage einfügen (neueste oben oder unten — einheitlich „neueste oben“ bevorzugt). -->

### 2026-05-05 — Header/Nav schlank + Manage-Look

- **Priorität:** P0 (Nav), P1 (Tabelle Bestellungen)
- **Auftrag:**
  - **Nav:** Gleiche Typo-Basis wie `project-shop` (kein abweichender Font-Stack). **Logo:** wie Manage (`/logo.png`, gleiches Verhalten bei fehlender Datei).
  - **Header entlasten:** kein langer Untertitel in der Top-Leiste („Lieferanten-Tracking · Teil der …“ voll breit); Vertrauen/Hinweis **kurz** (Badge/eine Zeile) **oder** nur im bestehenden Hinweis-Kasten im Formular — nicht doppelt vollflächig.
  - **Nice-to-have:** Bereich „Offene Bestellungen“ **nicht** als Dropdown — **Tabelle/Liste** wie in Manage: **Pagination**, **Suche**, sinnvolle **Filter** (z. B. Datum/Status wenn API hergibt); Zeilenklick setzt `orderRef`; manuelle Eingabe bleibt.
- **Done wenn:**
  - Screenshot 1024px + Desktop: Nav wirkt wie Manage (Logo, Font, keine überladene Textzeile).
  - (P1) Offene Bestellungen als Tabelle mit Suche + Pagination nutzbar; Lint/Validate grün.
- **Status:** 🟢 erledigt
- **Notiz Agent 2:** Nav: kompaktes „Kawai Labs“-Badge, kein mobiler Trust-Streifen; voller Hinweis nur im Formular-Info-Banner. Open-Orders-API: `q`, `after`, `status`, Response `pageInfo`. UI: Tabelle, Zeilenklick → `orderRef`.

## Kommunikation

**Keine Statusberichte oder „Abnahme“-Texte an einzelne Personen per Chat.** Alles, was das Team wissen muss, gehört **ins Repository**.

**Strikte Arbeitsgrenze:**
- Agent 2 ändert **nur** Dateien im Repo `tracking-portal`.
- Kopf/Haupt-Agent ändert **nur** Dateien im Repo `project-shop`.
- Übergabe erfolgt ausschließlich über die MDs (`TASK.md` ↔ `TRACKING_PORTAL_INTEGRATION.md`), nicht per Zuruf.

**Zugriff auf `project-shop/docs/TRACKING_PORTAL_INTEGRATION.md`:** Diese Datei liegt **nicht** im `tracking-portal`-Repo. Agent 2 sieht sie nur, wenn **beide Repos** im gleichen Workspace geöffnet sind **oder** der Kopf den relevanten Auftrag (wie hier) **in `TASK.md` spiegelt**. Die kanonische, ausführliche Beschreibung bleibt in `project-shop`; `TASK.md` enthält die operative Kurzfassung + Abnahme.

1. Checkliste unten aktualisieren (Phase + Datum).
2. Eine Zeile in `../project-shop/docs/TRACKING_PORTAL_INTEGRATION.md` unter **Log** (Pflicht, sobald `project-shop` im Workspace liegt und die Änderung gepusht werden kann).
3. Optional: kurze technische Stichworte unter **Phase X — Notizen (Stand)** in dieser Datei — nicht in Messenger.

---

## Design-Parität (Pflicht) — Portal ↔ Manage

**Ziel:** Endnutzer sollen beim Öffnen des Tracking-Links **keinen „Fake-Seite“-Eindruck** bekommen; UI wirkt wie ein nahtloser Teil von **Kawai Labs Shopverwaltung** (`project-shop`).

**Umsetzung:** nur im Repo `tracking-portal` (Agent 2). Referenz-Look: aktuelle Manage-Oberfläche (Header/Nav, Formular-Karten, Buttons, Typo).

### Muss

1. **Top-Nav / Header:** gleiches Prinzip wie Manage (Logo + kompakte Aktionen); bei `<=1024px` **nur Icons** für Haupt-Nav-Punkte, gleiche Hover/Cursor/Focus-States.
2. **Typografie:** gleiche Heading-Hierarchie und Größenlogik wie Manage (`h2`/`h3`/Section-Titel).
3. **Form-UI:** Inputs, Select, Primärbutton, Fehler-/Info-Banner im gleichen Stil wie Manage.
4. **Trust:** kurzer sichtbarer Hinweis „Teil von Kawai Labs Shopverwaltung“ (ohne rechtlichen Overkill).
5. **Responsive:** Mobile, Tablet (1024), Desktop ohne gebrochene Layouts.

### Done

- Stand-Block oben aktualisieren + **Screenshots** (Mobile/Tablet/Desktop) in `TASK.md` verlinken oder als kurze Pfad-Notiz (`/docs/…` im Portal-Repo, falls ihr Screens dort ablegt).
- Kopf + Betreiber: visueller Smoke — Manage-Tab → generierter Link → Portal wirkt „aus einem Guss“.

**Vollständige Spez (Kopf):** `../project-shop/docs/TRACKING_PORTAL_INTEGRATION.md` → Abschnitt *Auftrag an Agent 2: Design-Parität*.

---

## Phase 1 — Abnahme (MVP, Referenz)

**Ziel war:** Lieferanten können Tracking melden — noch ohne Shopify, nur Nachweis dass Daten ankommen.

**Liefern war:**

1. Startseite (`/`): Formular mit Bestellnummer, Sendungsnummer, Versanddienst (DHL, DPD, UPS, Sonstiges).
2. `POST /api/tracking` mit `{ orderRef, trackingNumber, carrier }`, 200/400 wie spezifiziert, Payload loggen.
3. Client: `fetch` + kurze Erfolgs-/Fehlermeldung.
4. Lint sauber (`pnpm lint` bzw. `pnpm validate`).

**Einschränkungen Phase 1:** kein Shopify, keine DB, kein Auth; `project-shop` nicht anfassen.

**Fertig melden:** In `../project-shop/docs/TRACKING_PORTAL_INTEGRATION.md` unter **Log** eintragen (wenn noch nicht geschehen).

---

## Phase 2 — Token aus URL & `entityId`

**Ziel:** Jede Meldung gehört zu genau einer Entität (Shop). Der Lieferant nutzt nur den **Lang-Link** von Manage; das Portal leitet daraus `entityId` ab.

### Phase 2 — Notizen (Stand, nur Repo)

- Route `src/app/l/[token]/page.tsx`, Token per `decodeURIComponent` aus dem Segment; `/` nur Hinweis auf persönlichen Link `/l/…`, kein Formular ohne Token-Kontext.
- `POST /api/tracking`: Pflichtfeld `token` zusätzlich zu `orderRef`, `trackingNumber`, `carrier`. Auflösung: SHA-256 (hex) wie Manage; `supplier_tracking_links` mit `revokedAt` / `expiresAt`; HTTP **401** unbekannt, **403** widerrufen/abgelaufen, **503** ohne `DATABASE_URL` oder DB nicht erreichbar; bei Erfolg Log mit `entityId`.
- Variante A: Prisma minimales Modell, `src/lib/prisma.ts`, `resolve-entity-from-token.ts`, `token-hash.ts`; `.env.example` mit `DATABASE_URL`.
- Manage muss denselben Hash speichern: **SHA-256(Klartext-Token) als Hex-String** in `tokenHash`. Gleiche DB wie Portal für Auflösung.

### Phase 2 — Spec-Kern (Abgleich; Umsetzung = Notizen oben)

Route `/l/…` mit Formular, `/` ohne blindes Absenden, `POST` mit Pflichtfeld `token`, SHA-256-Hex-Lookup auf `supplier_tracking_links`, sinnvolle HTTP-Codes, `.env.example`, `pnpm validate` grün.

### Phase 2 — Nicht tun

- Noch **kein** Shopify Fulfillment (das ist Phase 3).  
- **`project-shop` nur anfassen**, wenn das Team ausdrücklich die Manage-API für Variante B will — sonst DB-Readonly in Portal.

---

## Phase 3 — Shopify Fulfillment (danach)

**Ziel:** Nach erfolgreicher Auflösung `entityId`: Bestellung finden, Fulfillment anlegen, Kunde benachrichtigen (wie in `../project-shop/docs/TRACKING_PORTAL_INTEGRATION.md` → Abschnitt *Fulfillment-Logik*).

### Phase 3 — Konkreter Auftrag (jetzt ausführen)

1. `POST /api/tracking` so erweitern, dass nach `entityId`-Auflösung der Shopify-Zugang für diese Entität geladen wird (Quelle wie mit Kopf abgestimmt: gemeinsame Credentials-Quelle oder Manage-API).
2. Bestellsuche implementieren gemäß bereits entschiedener Regel:
   - Primär Bestellname (`1001`/`#1001`) normalisieren und nach `order.name` auflösen.
   - Optional numerische ID als Fallback nur wenn eindeutig.
3. Fulfillment erstellen (`fulfillmentCreate` o. ä.) inkl. `trackingNumber`, Carrier-Mapping, `notifyCustomer: true`.
4. Fehlerpfade als strukturierte JSON-Antworten liefern:
   - 400: ungültige Eingabe / mehrdeutige Referenz
   - 404: Bestellung/Fulfillment Order nicht gefunden
   - 502/503: Upstream/Shopify/Credentials nicht verfügbar
5. UI-Hinweistext am Formular aktualisieren (kurz: welche Bestellreferenz erwartet wird).

### Phase 3 — Done-Kriterien

- End-to-end im Portal-Repo lokal nachweisbar: gültiger Token + gültige Bestellung → Fulfillment erstellt.
- Bei Erfolg enthält Response mindestens: `ok`, `entityId`, `orderId`/`orderName`, `fulfillmentId`.
- Fehlerfälle liefern konsistente JSON-Struktur (`error.code`, `error.message`) statt generischer 500.
- `pnpm run lint` und (falls vorhanden) `pnpm run test` / `pnpm run validate` im `tracking-portal` laufen grün.
- Danach **Pflicht**: Abschnitt **Stand (für `project-shop` / Kopf)** oben aktualisieren.

### Phase 3a — Stabilisierung (Pflicht, nach erstem Live-Test)

1. **Shop-Domain normalisieren/validieren** vor Shopify-Request:
   - Falls `shopify_shop` keinen Punkt enthält (z. B. `dev-shop-pro-atalblt4`), automatisch `.myshopify.com` anhängen.
   - Wenn Host danach ungültig ist: sauberer Fehler `shop_domain_invalid` (400/503, aber **kein** generisches `shopify_unavailable`).
2. **Spezifische Fehlercodes für DNS/Netz**:
   - `ENOTFOUND` → `shop_domain_not_resolvable` mit Hinweis auf `shopify_shop` in Credentials.
   - Timeout/Connection-Refused → `shopify_unreachable`.
3. **Regression-Check**: bestehende Erfolgsfälle dürfen unverändert funktionieren.

### Phase 3b — UX-Verbesserung „Offene Bestellungen“ (Nice-to-have, danach)

1. Neuer Endpoint im Portal (token-gebunden), z. B. `GET /api/tracking/open-orders?token=...&limit=10`.
2. Liefert die ersten offenen Bestellungen der zugehörigen Entität (`orderId`, `orderName`, optional `createdAt`).
3. Formular bekommt Auswahl-Liste; Klick setzt `orderRef` automatisch.
4. Fallback bleibt: manuelle Eingabe weiter möglich.
5. Done erst, wenn API + UI + Lint/Validate grün und Stand-Block aktualisiert ist.

### Liefern (grober Ablauf)

1. Pro **`entityId`** Shopify-Zugang laden (gleiche Quelle wie Manage: Credentials / Env-Muster — mit Team abstimmen, ob Lesen aus derselben DB-Tabelle `entity_credentials` oder Aufruf Manage-API).

2. **Bestellung finden:** ein klares Verhalten wählen und im UI kurz erklären (Placeholder/Hilfetext): z. B. Shop-Bestellname `#1001` **oder** numerische Order-ID — wie in der Integrations-Doku Variante A/B.

3. **Fulfillment:** offene Fulfillment Order(s) zur Order, dann `fulfillmentCreate` (GraphQL) bzw. REST-Äquivalent mit `trackingNumber`, Carrier-Mapping DHL/DPD/UPS → Shopify, **`notifyCustomer: true`** wo sinnvoll.

4. **Fehler:** Order nicht gefunden / mehrere Treffer / keine Fulfillment Order → **strukturierte JSON-Fehler** (400/404), keine leeren 500 ohne Message.

5. **Log** in `TRACKING_PORTAL_INTEGRATION.md` ergänzen, wenn Phase 3 live geht.

---

## Abnahme-Checkliste kurz

| Phase | Thema        | Erledigt wenn |
|-------|--------------|----------------|
| 1     | Formular+API | MVP oben erfüllt, Doku-Log |
| 2     | Token+Entity | `/l/...` + `token` in POST + Auflösung + Env-Doku + validate grün (`2026-05-01` — siehe Notizen oben) |
| 3     | Shopify      | Fulfillment end-to-end + saubere Fehler |

Bei Unklarheiten: **eine** Quelle — `../project-shop/docs/TRACKING_PORTAL_INTEGRATION.md`.
