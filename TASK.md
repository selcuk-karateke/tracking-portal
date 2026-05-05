# Aufgabe (ein Agent / ein Entwickler)

**Repo:** dieses Verzeichnis (`tracking-portal`).

## Stand (für `project-shop` / Kopf) — zuletzt: 2026-05-05 (Phase 3b umgesetzt)

| Bereich | Status |
|---------|--------|
| Repo / Branch | `tracking-portal` (Branch: bitte bei Änderungen hier eintragen) |
| Was existiert (Dateien, Routen) | UI-Route `/l/[token]`; Startseite `/` mit Hinweis; API `POST /api/tracking`; Token-Hash + Entity-Auflösung via Prisma |
| Was ist umgesetzt & getestet | **Phase 1 + 2 + 3a + 3b**: inkl. Endpoint `GET /api/tracking/open-orders` (token-gebunden), UI-Auswahlliste „Offene Bestellungen“ mit Fallback auf manuelle Eingabe; Validate grün |
| Offen / nächster Schritt | Live-Feinschliff: Ergebnis-UX und Carrier-Mapping mit echten Shop-Daten prüfen |

> Regel für Agent 2: Diesen Block bei jedem relevanten Merge aktualisieren (kurz + präzise), damit der Kopf im `project-shop` ohne Chat-Verlauf den echten Stand sieht.

## Kommunikation

**Keine Statusberichte oder „Abnahme“-Texte an einzelne Personen per Chat.** Alles, was das Team wissen muss, gehört **ins Repository**:

1. Checkliste unten aktualisieren (Phase + Datum).
2. Eine Zeile in `../project-shop/docs/TRACKING_PORTAL_INTEGRATION.md` unter **Log** (Pflicht, sobald `project-shop` im Workspace liegt und die Änderung gepusht werden kann).
3. Optional: kurze technische Stichworte unter **Phase X — Notizen (Stand)** in dieser Datei — nicht in Messenger.

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
