# Aufgabe (ein Agent / ein Entwickler)

**Repo:** dieses Verzeichnis (`tracking-portal`).

## Stand (für `project-shop` / Kopf) — zuletzt: 2026-05-09 (Teil-Fulfillment + UX)

| Bereich | Status |
|---------|--------|
| Repo / Branch | `tracking-portal` — Arbeit auf **`development`** / `feat/*`, **nicht** direkt auf `main`; Agent-Workflow: `.cursor/skills/caveman/SKILL.md` |
| Was existiert (Dateien, Routen) | UI-Route `/l/[token]`; Startseite `/` mit Hinweis; API `POST /api/tracking`, `GET /api/tracking/open-orders`, `GET /api/tracking/entity-logo`, `GET /api/tracking/shop-branding`; Token-Auflösung inkl. Hersteller-E-Mail; Allowlist über **`DropshippingDispatch` → `DropshippingRun`** (wie Manage); Shopify-Order-ID numerisch/GID (`shopify-order-id-match.ts`); Prisma für gemeinsame Tabellen **wie `project-shop`**; `public/logo.png`; Shop-Logo-Proxy `entity-logo.ts` (lokal + Manage-HTTP) |
| Was ist umgesetzt & getestet | Phase 1–3; **Teil-Fulfillment** nach `shopifyVariantId` aus Manage-Dispatches (Mischbestellungen); Allowlist nur **SUCCESS**; Formular-UX wie Karte 2026-05-09. Prisma-Felder an Manage: `shopifyVariantId`, `emailProviderMessageId` auf `dropshipping_dispatches`. DDL nur über Manage. |
| Offen / nächster Schritt | **Coolify:** Shop-Logo — Shared Volume `/app/public/uploads` am Portal (wie Manage) **oder** `MANAGE_PUBLIC_URL`; statische Manage-URLs reichen auf Coolify oft nicht → Manage-Route `/api/tracking/public/entity-logo` (Kopf). Smoke E2E nach Deploy. |

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

### 2026-06-11 — Shop-Logo 404 in Prod (entity-logo)

- **Priorität:** P0
- **Problem:** `GET /api/tracking/entity-logo?token=…` → **404** — Portal findet keine Datei unter `public/uploads/logos/{entityId}.*` und kein Manage-Fetch.
- **Ursache:** Logos liegen auf Manage im Volume `public/uploads/logos/`; Portal-Container hat das Volume nicht gemountet; statische `/uploads/logos/…` auf Manage-Coolify oft 404 (Manage nutzt intern `/api/entities/…/logo/image` mit Login).
- **Done wenn:**
  - Coolify Portal: **dasselbe** Persistent Storage wie Manage → `/app/public/uploads`, **oder** `MANAGE_PUBLIC_URL` gesetzt und Logo erreichbar
  - Optional Kopf: `GET /api/tracking/public/entity-logo?token=…` in `project-shop` (Token wie Portal) — Portal versucht diese URL bereits
- **Status:** 🟡 in Arbeit
- **Notiz Agent 2:** `fetchRemoteEntityLogo` + `.env.example`; Branch `fix/entity-logo-coolify`

### 2026-05-09 — Mischbestellungen: nur Lieferanten-Positionen fulfillen (Backend erledigt, UI optional)

- **Priorität:** P0 (fachlich)
- **Problem:** Tracking-Link ist pro **Hersteller-E-Mail** (`SupplierTrackingLink`). Offene Bestellungen und Submit waren auf **Bestellungsebene** erlaubt; Shopify-Fulfillment hat aber **alle** offenen Fulfillment-Positionen der Bestellung geschlossen — bei mehreren Herstellern in einer Order wurde fälschlich alles auf einen Tracking-Eintrag gebucht.
- **Manage (`project-shop`, erledigt):** `DropshippingDispatch.shopifyVariantId` (Webhook `variant_id`), Migration `20260509180000_*`; jede Dispatch-Zeile speichert die Variante.
- **Portal (erledigt):**
  - Allowlist `getAllowedShopifyOrderIdsForSupplier` nur noch **`SUCCESS`**-Dispatches (keine „nur übersprungen“-Orders mit gleicher E-Mail).
  - `getVariantQuantitiesForSupplierOrder` → Summe pro Variante aus **SUCCESS** + gesetzter `shopifyVariantId` für diese Entität + Hersteller + Order-ID.
  - `createFulfillmentForOrder`: wenn Map nicht leer → **`fulfillmentCreate` nur mit passenden `FulfillmentOrderLineItem`s** und Mengen; sonst Legacy (volle FO) für alte Daten ohne `shopifyVariantId`.
  - Fehlercodes: `partial_fulfillment_no_matching_lines`, `partial_fulfillment_quantity_mismatch` mit deutscher Message.
- **Optional / Nice-to-have (Agent 2):** UI-Text im Formular: kurz erklären, dass nur **Ihre** Artikelpositionen erfüllt werden; optional Tabelle um **Ihre** Varianten/SKUs aus einem kleinen API-Hint zu erweitern (nicht blockierend).
- **Status:** 🟢 Backend erledigt (Kopf 2026-05-09)
- **Notiz Agent 2:** Prisma-Schema `shopifyVariantId` / `emailProviderMessageId` an Manage anbinden; nach Deploy **`prisma generate`**; gemeinsame DB: Migration nur aus **Manage** ausführen.

### 2026-05-09 — „Tracking melden“: Button oben rechts + Formular über Tabelle (P1)

- **Priorität:** P1 (UX)
- **Kontext (Screenshot Betreiber):** Auf der Seite mit **offenen Bestellungen** sitzt der Primärbutton **„Tracking melden“** unten links und wirkt versteckt; die Eingaben (**Bestellreferenz**, **Sendungsnummer / Tracking**, **Versanddienst**) stehen **unter** der Tabelle — schwer zu finden.
- **Auftrag:**
  1. **Button „Tracking melden“:** prominent **rechts oben** im Formular-/Seitenkopf (nicht unten links). Button **erst sinnvoll aktivieren bzw. klar hervorheben**, wenn die **Sendungsnummer / Tracking** ausgefüllt ist — und konsistent mit den übrigen **Pflichtfeldern** fürs Absenden (Bestellreferenz, Versanddienst). **Vor dem Submit:** wo möglich **clientseitig** prüfen (z. B. nicht leer, minimale Länge, erlaubte Zeichen); **kein** Ersatz für die bestehende API-/Server-Validierung.
  2. **Layout:** Die genannten **Eingabefelder über die Tabelle** „Offene Bestellungen“ ziehen — Reihenfolge: Hinweistext → **Eingaben** → Tabelle → ggf. Fußnoten („Zeile anklicken …“).
- **Done wenn:** Smoke auf `/l/[token]`: Felder oben, Button rechts oben, leere Sendungsnummer → kein wirrer Klick auf aktiven Submit; mit gültiger Eingabe → wie bisher erfolgreicher Flow; `pnpm run lint` / `validate` grün; **Stand**-Block oben + eine Zeile im Manage-Log `docs/TRACKING_PORTAL_INTEGRATION.md` (wenn `project-shop` erreichbar).
- **Status:** 🟢 erledigt
- **Review Manage-Kopf (2026-05-09) — was an der Erstumsetzung falsch wirkte:**
  - Der Button **„Tracking melden“** stand **zwischen** dem blauen Hinweis-Banner und den **drei Eingabefeldern** — optisch wie „zuerst absenden, dann ausfüllen“, obwohl der Button zu Recht per `canSubmit` deaktiviert war, bis Bestellnummer, Sendungsnummer (mind. 3 Zeichen) und Versanddienst passen.
  - Die Felder lagen bereits **über** der Tabelle „Offene Bestellungen“ — das entsprach dem Auftrag; nur die **Button-Position** war irreführend.
- **Korrektur (umgesetzt in `src/app/tracking-form.tsx`):** Eine Zeile **`sm:flex-row`**: **links** die drei Pflichtfelder (gestapelt), **rechts** der Primärbutton inkl. Kurzhinweis wenn noch nicht absendbar; **darunter** der Block mit Tabelle. Auf schmalen Viewports: Button unter den Feldern, volle Breite (`w-full sm:w-auto`).
- **Technik unverändert:** `canSubmit` = `clientFieldMessage === null` (Bestellnr. + Regex, Sendung ≥3 Zeichen + Regex) **und** `carrierOk` **und** nicht `submitting`; API-Validierung bleibt maßgeblich.
- **Notiz Agent 2:** Nach Deploy kurz smoke-testen; `pnpm run lint` war nach Änderung grün.

### 2026-05-06 — Hersteller-Isolation (SupplierTrackingLink ↔ Portal) (P0)

- **Priorität:** P0 (Sicherheit / Datenhoheit)
- **Kontext:** Tracking-Links waren nur an `entityId` gebunden — das Portal konnte theoretisch **alle** offenen Shop-Bestellungen einer Entität sehen. In Manage gibt es jetzt **`supplier_tracking_links.manufacturerEmail`** (Pflicht bei **neuen** Links; gleiche Normalisierung wie Dropshipping: trim + lowercase).
- **Auftrag:**
  1. **Prisma:** Feld `manufacturerEmail` auf dem Link-Modell (wie Manage); Zugriff auf **`DropshippingDispatch`** (oder gleichwertige Tabelle) mit `entityId`, `manufacturerEmail`, `shopifyOrderId` / Order-Referenz — nur um die **erlaubte Menge** offener Bestellungen für Token + E-Mail zu bestimmen.
  2. **`resolveEntityIdFromToken` (o. Ä.):** Neben `entityId` auch **`manufacturerEmail`** zurückgeben; wenn Link-Zeile **kein** `manufacturerEmail` hat → **klarer Fehler** (Legacy-Link: neuen Link in Manage erzeugen).
  3. **`GET /api/tracking/open-orders`:** Nur Bestellungen, die zur Kombination **Entität + Hersteller-E-Mail** aus Dropshipping/Dispatch passen — nicht mehr die komplette offene Order-Liste der Entität.
  4. **`POST /api/tracking`:** Vor Fulfillment prüfen, ob die anvisierte Bestellung in der **erlaubten Menge** liegt; sonst strukturierter Fehler (z. B. `ORDER_NOT_ALLOWED_FOR_SUPPLIER`), kein Fulfillment.
- **Done wenn:**
  - Mit zwei unterschiedlichen Hersteller-E-Mails am selben Shop sind die sichtbaren/erfüllbaren Bestellungen getrennt.
  - Lint/Validate grün; kurze Notiz im **Stand**-Block oben + eine Zeile im Manage-Log `docs/TRACKING_PORTAL_INTEGRATION.md` (macht Kopf bei Bedarf nach Merge).
- **Status:** 🟢 erledigt (Kopf 2026-05-06): Prisma an Manage angeglichen; Allowlist per Run-Join; GID/numerische Order-ID; fehlerhafte Migration entfernt.
- **Notiz Agent 2:** Finale Korrektur im Repo: `prisma/schema.prisma` (Runs + Dispatches wie Manage), `supplier-order-allowlist.ts`, `shopify-order-id-match.ts`, `shopify-fulfillment`/`open-orders`/`tracking` Route; Migration `20260506130000_*` gelöscht, `20260506203000_portal_shared_schema_from_manage` = No-op DDL.

### 2026-05-05 — Layout: weniger Leerraum links/rechts (P0)

- **Priorität:** P0
- **Kontext (Screenshot):** Hauptinhalt war durch inneres `max-w-lg` schmaler als die Nav-Zeile (`max-w-7xl`) — große weiße Flächen links und rechts.
- **Auftrag:** Inhalt unter `/` und `/l/[token]` **volle nutzbare Breite** innerhalb des bestehenden `max-w-7xl`-Wrappers; Tabelle/Formular aus einer Hand mit dem Header.
- **Done wenn:** Auf Desktop wirkt die Spalte nicht unnötig schmal; Lint/Validate grün.
- **Status:** 🟢 erledigt
- **Notiz Agent 2:** `max-w-lg` + `items-center` auf den inneren Wrappern entfernt (`page.tsx`, `l/[token]/page.tsx`).

### 2026-05-05 — Header/Nav: wie Manage (P0)

- **Priorität:** P0
- **Kontext (Screenshot Betreiber):** Oben wirkt die Portal-Nav „fremd“: zu viel Text links, kein sichtbares Logo, wirkt gequetscht. Ziel: **optisch wie `project-shop`**, ohne Fake-Site-Eindruck.
- **Auftrag:**
  1. **Logo:** `public/logo.png` ist im Repo angelegt (Kopie aus Manage). Sicherstellen, dass es **committed** und in Deploy unter `/logo.png` erreichbar ist; `<img src="/logo.png" …>` wie in `components/nav-logo.tsx` (Manage).
  2. **Typo wie Manage:** In `project-shop` setzt `app/globals.css` am `body` u. a. **`font-family: Arial, Helvetica, sans-serif`** — Portal aktuell Geist auf `body`. Für Parität: **`src/app/globals.css`** so anpassen, dass **`body`** dieselbe Schriftregel wie Manage hat (Tailwind `@theme` / `font-sans` kann unverändert bleiben oder bewusst angleichen — wichtig ist: **gleicher sichtbarer Fließtext** wie Manage).
  3. **Nav entlasten:** Link-Cluster links **verschlanken** — kein langer Untertitel in der Zeile, kein „Badge-Stapel“, der Platz frisst. Trust-Hinweis **nicht** in die Top-Nav quetschen; **eine** kurze Zeile oder nur Logo + Kurzname; Details in Hilfe/Info-Box im Formular (bereits vorhanden).
  4. **Rechte Nav-Aktionen:** Gleiche Interaktion wie Manage-Nav (`cursor-pointer`, Hover, Fokus-Ring, bei `≤1024px` nur Icons mit `aria-label`/`title`).
- **Done wenn:**
  - Logo sichtbar (wenn Datei deployed), Nav auf 1024px nicht überladen, Schrift wirkt wie Manage-Seite.
  - `pnpm run lint` / `validate` grün.
- **Status:** 🟢 erledigt
- **Notiz Agent 2:** Geist entfernt; `globals.css` + `body` Arial/Helvetica; Nav ohne Zusatz-Badge; Icon-Links mit `aria-label` + `cursor-pointer`; Logo-`img` mit Maßen/`object-contain`.

### 2026-05-05 — Offene Bestellungen: Tabelle statt Dropdown (P1)

- **Priorität:** P1 (Nice-to-have nach Nav-P0)
- **Auftrag:** Dropdown „offene Bestellungen“ durch eine **Liste/Tabelle** ersetzen im Stil der Manage-Oberfläche (sortierbare Spalten optional, **Suche/Filter** sinnvoll z. B. nach `#1001` / Name, **Pagination** oder „mehr laden“, Zeilen-Klick setzt `orderRef`).
- **API:** Bestehenden token-gebundenen Endpoint nutzen oder erweitern (`GET …/open-orders` o. ä.); Fehler/Loading-Zustände wie übriges Portal.
- **Done wenn:** Lieferant kann ohne Dropdown schneller die richtige Zeile finden; manuelle Eingabe bleibt möglich; Lint/Validate grün.
- **Status:** 🟢 erledigt
- **Notiz Agent 2:** `GET /api/tracking/open-orders` mit `q`/`after`/`status` + `pageInfo`; UI in `tracking-form.tsx` (Tabelle, Zeilenklick → `orderRef`).

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
6. **Seitenbreite:** Hauptinhalt nutzt dieselbe horizontale Spanne wie Nav/Footer (`max-w-7xl`), **ohne** zusätzlich verengenden inneren Container — vermeidet große Leerflächen links/rechts auf Desktop.

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
