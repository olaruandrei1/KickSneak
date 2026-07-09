# KickSneak — Bugs & Tasks (sprint spre licență, deadline ~2026-07-13)

Legendă status: `TODO` · `WIP` · `DONE` · `BLOCKED`
Owner: **C** = Claude (backend/.NET/RBAC/SQL/infra/AI/Go/debug) · **G** = Gemini (frontend/UI/features izolate/seed data) · **C+G** = hibrid

---

## ✅ Rezolvate (sesiunea 2026-07-06)

| ID | Zonă | Descriere | Own | Status |
|----|------|-----------|-----|--------|
| B01 | Infra/RBAC | `RBAC.sql` neidempotent → `DROP OWNED BY ks_owner` ștergea tabelele → crash loop `42P01` | C | DONE |
| B02 | Cart | Add to cart eșua silențios — `.Replace()` strica matching-ul de `SizeLabel` | C | DONE |
| B03 | Checkout | 500 la `/checkout/session` — `BeginTransaction` + `EnableRetryOnFailure` | C | DONE |
| B04 | Checkout/RBAC | `42501` pe `stock_items` — `ks_user` scria pe stock; mutat în webhook | C | DONE |
| B05 | Infra/RLS | `RlsContext` `Singleton` → `Scoped` (scurgere rol între requests) | C | DONE |

---

## 🐞 Bugs deschise

### Checkout / Stripe
| ID | Descriere | Own | Status |
|----|-----------|-----|--------|
| B06 | Webhook confirma TOATE comenzile `Pending` global. **DONE**: `buyerId` prin Stripe session `Metadata` → confirmă doar comenzile acelui buyer. Bonus: secretul webhook se citea din `config` (null) → reparat să citească `StripeSettings.WebhookSecret`; semnătura chiar se verifică acum. | C | DONE |
| B07 | Webhook `400` pe orice eroare → retry infinit. **DONE**: `400` doar pe semnătură invalidă (`StripeException`); erori de procesare → `200` + log. Testat: bogus sig → 400. | C | DONE |
| B10 | `cartItemIds`: cart GET întoarce `Id`=id rând cart, checkout filtrează pe același `c.Id` → OK când cart-ul e sincronizat (cazul normal). Edge optimist = feedback FE (B08). | C | DONE |

### Backend / erori 500
| ID | Descriere | Own | Status |
|----|-----------|-----|--------|
| B11 | **Become Seller**: după `Start Selling` → 500 — `ks_user` n-avea `INSERT` pe `sellers`; grant adăugat în RBAC | C | DONE |
| B28 | **Submit Return** + Cancel order: 500 — `ks_user` făcea `UPDATE stock_items`; mutat pe cale elevated (`ExecuteElevatedAsync`, rulează ca `ks_owner`) | C | DONE |
| B27 | **Live chat WS** admin↔client — ✅ **DONE**. C: infra verificată (schema `chat_messages`/`chat_sessions` + grants `ks_chat_service` + reachability `:3005`). G: client support-mode + admin conectate real la `ws-server.js`, eliminat fake timeout. Real-time admin↔client funcțional. | C+G | DONE |

### Search / Filtre / Navbar (grup mare, cuplat)
| ID | Descriere | Own | Status |
|----|-----------|-----|--------|
| B12 | Buton **Shop** (home) → `/search` gol. **BE DONE**: `/products/search-paged` fără `q` → toate desc după `CreatedAt` (C1). G: leagă butonul. | C+G | DONE |
| B13 | Search nu precompletează brand în filtre. **BE DONE**: răspunsul are `detected.brandName/brandId` (C2, testat „adidas”→Adidas). G: prefill din `detected`. | C+G | DONE |
| B14 | Filtre → **Activity** nu se poate selecta / nu merge. `facets` sunt acum în răspuns (C2). | G | DONE |
| B15 | Filtre → **Color** idem B14. `facets.colors` livrat (C2). | G | DONE |
| B19 | Navbar → **Deals „under $150”**. **BE DONE**: `?maxPrice=150` (testat: 5916 produse ≤150). G: mapează filtrul. | C+G | DONE |
| B21 | Navbar: filtrarea + precompletarea filtrelor rupte în general (revine cu detalii) | G | DONE |
| B25 | Navbar: se face **stack de filtre/breadcrumb inutil** (vezi ss) | G | DONE |

### Product page / Home
| ID | Descriere | Own | Status |
|----|-----------|-----|--------|
| B16 | Navbar **Brands** ar trebui să facă redirect la pagina specială de brands | G | DONE |
| B17 | Preselectează mărimea din profil. **BE DONE**: `/products/{id}` întoarce `preferredSizeId` (match pe EU din profil). G: preselectează. | C+G | DONE |
| B18 | **Buy Now** fără mărime selectată → duce aiurea în cart; nevoie protecție (ca la add-to-cart) | G | DONE |
| B20 | Home: carusele fără **titluri** | G | DONE |
| B22 | Product details: translate mărimi US/UK/CM. **BE DONE**: fiecare size are `us/eu/uk/cm` + `sizeId/available` (C3). G: toggle-ul randează câmpul. | C+G | DONE |
| B23 | **Price History** `N/A` + `$Infinity`/`$-Infinity`. BE deja safe (N/A pe gol). G: guard `Math.min/max` pe listă goală. Date reale ← T02. | C+G | DONE |
| B24 | Redirect home → `/new` desc după dată. **BE DONE** (același `/products/search-paged` fără `q`, C1). G: leagă ruta. | C+G | DONE |

### Găsite la testare (post-QA)
| ID | Descriere | Own | Status |
|----|-----------|-----|--------|
| B32 | **AI rerank CORS**: frontend (`:3000`) cheamă direct `ai-service:5050/api/rerank`, care n-avea CORS → browser blocat (non-fatal, fallback pe Elastic). Fix: `flask-cors` + `CORS(app)` în `kicksneak-ai`. Rebuild cu `--no-deps` (fără re-truncate). | C | DONE |
| B31 | **Chat Go crash-loop** (`must be owner of table chat_sessions`, 42501): bucla de ownership din RBAC lua `chat_sessions`/`chat_messages` la `ks_owner` la restart de backend → serviciul Go (ca `ks_chat_service`) nu-și putea rula migrația → nu asculta pe 8080 → WS pica. Fix: RBAC exclude cele 2 tabele + le re-atribuie `ks_chat_service`; aplicat și live prin ALTER. | C | DONE |
| B30 | **Mărimi — mapare greșită** — ✅ DONE (Gemini): parsare regex care extrage US/EU/UK din `size.label` + aproximează CM; tab-urile randează valoarea sistemului selectat. | G | DONE |

### AI
| ID | Descriere | Own | Status |
|----|-----------|-----|--------|
| B26 | **AI search/recommend** — ✅ **DONE**. Date sintetice în ETL (referențial-safe) → retrain pe date reale → `/api/recommend` personalizat → **wiring**: `/products/recommended` cheamă `ai-service` (best-effort + fallback DB), ordonat după scor AI. `cold_start` personalizează per-user la inferență fără retrain. Testat 200 fără regresie. | C | DONE |

### Admin app
| ID | Descriere | Own | Status |
|----|-----------|-----|--------|
| B29 | **Pagina de notificări din admin** — ✅ **DONE**. API-uri live (T01 Faza 1) + Gemini a legat `sendBroadcast`/`getRecentBroadcasts` la ele; mock temporar scos. Settings chips (client) la fel, cuplate la `/profile/notification-settings`. | C+G | DONE |

### Frontend feedback (moștenite)
| ID | Descriere | Own | Status |
|----|-----------|-----|--------|
| B08 | `cartStore.addItem` `catch {}` gol — fără feedback la eroare | G | DONE |
| B09 | `CheckoutPage` `catch {}` gol la place order — fără feedback | G | DONE |

---

## 🧩 Tasks

| ID | Descriere | Own | Status |
|----|-----------|-----|--------|
| T01 | **Sistem notificări** — ✅ **DONE**. In-app + settings + broadcast + **WebPush** cap-coadă: BE (vapid key, subscribe, push-pe-broadcast) + G (sw.js, toggle „Enable Browser Notifications", subscribe flow). Worker auto = tăiat (in-app acoperă). | C+G | DONE |
| T02 | Mai multe **seed-uri**, în special vânzări + auctions | G | DONE |
| T03 | Înlocuit **pozele produselor** în seed cu Unsplash (cont făcut) — actual sunt puse prost | G | DONE |
| T04 | **DONE**: consolă .NET Quartz `KickSneak.AiScheduler` (serviciu compose `ai-scheduler`) → orar (+ o dată la startup) cheamă `POST /api/train` din `ai-service`, care re-antrenează pe interacțiunile proaspete din DB + hot-reload modele (gunicorn 1 worker). Testat: startup trigger → 202 → retrain ok. | C | DONE |

---

## Note de împărțire
- **Claude (C)**: backend .NET, RBAC/SQL/EF, Docker/infra, Go chat/WS, AI, debugging cross-cutting, notificări.
- **Gemini (G)**: frontend React/UI, filtre/navbar, styling, seed data (poze/date).
- **C+G**: backend expune date/logică → frontend consumă. Se face contractul (shape API) întâi, apoi în paralel.
- Regula de aur: nu dăm în paralel task-uri care ating aceleași fișiere.
