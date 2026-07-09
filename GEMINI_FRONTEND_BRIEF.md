# Gemini Antigravity — Frontend Brief (KickSneak)

> **Rolul tău:** owner pe TOT ce ține de frontend. Claude lucrează în paralel pe backend
> (.NET), `kicksneak-chat` (Go) și database/RBAC. Nu vă călcați dacă respectăm regulile de mai jos.
> **Deadline:** ~2026-07-13. Prioritate: să MEARGĂ și să arate bine, nu perfecțiune de cod.

---

## 0. Sursa de adevăr
- Citește **`BUGS_TASKS.md`** din rădăcina repo-ului — acolo sunt toate item-urile cu ID-uri și owner.
- Item-urile TALE sunt cele marcate **G** sau partea de frontend din **C+G**. Lista exactă e mai jos.
- Când termini un item, treci-i statusul pe `DONE` în `BUGS_TASKS.md` (doar item-urile tale, nu cele **C**).

## 1. Reguli de bază (ce atingi / ce NU)
**Poți modifica:**
- `kicksneak-fe/**` (client, Vite + React + TS)
- `kicksneak-admin-v2/**` (admin, Next.js) — **EXCEPTIE:** NU atinge `ws-server.js` și `run-all.js` (chat WS — le face Claude, B27)
- `kicksneak-be/**/seed_data/*.json` — DOAR fișiere de date (pt T03 poze). NU atinge cod `.cs`.

**NU atinge (le face Claude):**
- Orice `.cs`, `RBAC.sql`, `docker/**`, `kicksneak-chat/**` (Go), `Program.cs`, ETL-ul de seed.
- Logica de conectare WebSocket din client (`ChatSupportClient.tsx` partea de socket) — Claude fixează contractul WS și îți zice dacă se schimbă URL-ul/handshake-ul.

**Dacă îți lipsește un API:** nu inventa backend. Lucrează pe mock-uri (vezi §3) și notează în `BUGS_TASKS.md` la item „⚠ nevoie API de la Claude: <ce>”.

## 2. Cum rulezi & verifici
- **Client:** `cd kicksneak-fe && npm install && npm run dev` (Vite, ~`http://localhost:5173`)
- **Admin:** `cd kicksneak-admin-v2 && npm install && npm run dev` (Next + WS via `run-all.js`)
- **Backend live** (pt teste reale): `docker compose -f docker/docker-compose.yml up -d` — API pe `http://localhost:5005`.
- Verifică fiecare fix în browser (nu doar „compilează”). Fără erori noi în consolă.

## 3. Mock-uri (dezvoltare fără backend gata)
Clientul are deja sistem de mock-uri: `VITE_USE_MOCKS=true` → citește din `kicksneak-fe/public/mocks/*.json`.
Pentru contractele noi (§6), actualizează/adaugă JSON-ul de mock ca să se potrivească formei agreate, dezvoltă pe mock, apoi treci pe live (`VITE_USE_MOCKS=false`).

## 4. Strategie sub-agenți (max 3 simultan)
Pornește **3 lane-uri în paralel**, grupate ca să NU atingă aceleași fișiere:

- **Lane A — Search / Filtre / Navbar** (client): `B12, B13, B14, B15, B16, B19, B21, B24, B25`
  → foarte cuplate între ele; fă-le **serial în cadrul lane-ului**, un singur sub-agent.
- **Lane B — Product page + Home** (client): `B17, B18, B20, B22, B23`
- **Lane C — Feedback + Admin + Seed poze**: `B08, B09` (client), `B29` (admin UI), `T03` (seed JSON poze)

`T02` (seed vânzări/auctions) = **C+G**: tu pregătești JSON-ul de date, Claude extinde ETL-ul să-l încarce. Coordonează pe `BUGS_TASKS.md`.

---

## 5. Item-urile tale — ce & cum

### Lane A (Search/Filtre/Navbar)
- **B12** Shop (home) → `/search` gol. Când nu-s params, cere listarea default (vezi contract **C1**) și afiș-o.
- **B24** redirect `/new` → aceeași listare default desc după dată (**C1**).
- **B13** precompletare filtre din query: folosește `detected` din răspuns (**C2**) ca să preselectezi brand/categorie când userul caută „adidas” etc.
- **B14 / B15** Activity & Color nu se pot selecta: verifică întâi **wiring-ul** (onClick/state). Dacă opțiunile sunt goale din lipsă de date, populează-le din `facets` (**C2**).
- **B19** Deals „under $150”: mapează pe `maxPrice=150` în request (**C2**). Verifică că se aplică.
- **B21** filtrarea + precompletarea din navbar rupte în general: reconstruiește fluxul pe contractul **C2** (un singur loc care construiește query-ul de search din starea filtrelor).
- **B25** stack inutil de filtre/breadcrumb: fă breadcrumb-ul/filtrele idempotente (nu se acumulează la fiecare click).
- **B16** navbar „Brands” → redirect la pagina specială de brands (există `/brands`).

### Lane B (Product + Home)
- **B22** translate mărimi: în product details, toggle-ul EU/US/UK/CM/KR randează câmpul corespunzător din obiectul size (**C3**). Default rămâne EU.
- **B17** preselectează mărimea din profil: dacă răspunsul are `preferredSizeId` (**C3**), selecteaz-o automat.
- **B18** Buy Now fără mărime: aceeași protecție ca add-to-cart (blochează + mesaj „alege mărimea”), nu duce în cart.
- **B20** carusele home: adaugă titlurile lipsă.
- **B23** Price History: **guard pe listă goală** — nu calcula `Math.min/max` pe array gol (de acolo vine `$Infinity` / `$-Infinity`). Afișează stare „Not enough data yet” curată. Datele reale vin cu **C4** (după seed vânzări).

### Lane C (Feedback / Admin / Seed)
- **B08** `cartStore.addItem` `catch {}` gol → arată feedback la eroare (toast/mesaj).
- **B09** `CheckoutPage` `catch {}` gol → idem, feedback la place-order eșuat.
- **B29** pagina de notificări din admin dă fail: **păstrează UI-ul**, repar-o și leag-o la API-urile din **C5** (când Claude le publică). Până atunci, mock.
- **T03** înlocuiește pozele produselor în seed cu Unsplash (URL-uri reale, coerente cu produsul) în `seed_data/*.json` (câmpul `PhotoUrl`).

---

## 6. Contracte API livrate de Claude (construiește pe ele)
> Aditive și non-breaking. Unde nu-s încă live, dezvoltă pe mock cu forma asta.

**C1 — Listare fără query (B12, B24)**
`GET /products/search-paged?q=&page=1&pageSize=24&sort=newest`
- `q` gol/absent → TOATE produsele, desc după `CreatedAt`.
- Răspuns: **aceeași formă** ca `search-paged` de azi (fără schimbare). Accept-ă în plus filtrele din C2.

**C2 — Listare filtrată + facets + detecție (B13, B14, B15, B19, B21)**
`GET /products/search-paged?q=&brand=&category=&color=&gender=&minPrice=&maxPrice=&size=&sort=&page=&pageSize=`
```json
{
  "items": [ /* forma existentă de produs */ ],
  "total": 123, "page": 1, "pageSize": 24,
  "facets": {
    "brands":    [{ "id": "..", "name": "Adidas", "count": 42 }],
    "categories":[{ "id": "..", "name": "Sneakers", "count": 30 }],
    "colors":    [{ "id": "..", "name": "Black", "count": 18 }],
    "genders":   [{ "id": "..", "name": "Men", "count": 50 }],
    "priceRange":{ "min": 45.0, "max": 890.0 }
  },
  "detected": { "brandId": "..|null", "brandName": "Adidas|null", "categoryId": "..|null" }
}
```
- `facets` → populezi opțiunile de filtru. `detected` → precompletezi filtrele din text. `priceRange` → slider de preț / Deals.

**C3 — Product detail: sisteme de mărimi + preselecție (B22, B17)**
`GET /products/{id}` — fiecare mărime disponibilă capătă toate sistemele:
```json
"sizes": [
  { "sizeId": "..", "label": "US 6.5 / EU 39.0 / UK 6",
    "us": "6.5", "eu": "39.0", "uk": "6", "cm": "24.5", "kr": "245",
    "price": 147.69, "available": true }
],
"preferredSizeId": "..|null"
```

**C4 — Price history (B23)** — `GET /products/{id}` va include `priceHistory` (serie + stats). Poate fi gol până la seed-ul de vânzări (T02). Frontend-ul trebuie să suporte gol elegant.

**C5 — Notificări (T01, B29)** — Claude va publica:
- Client chips: `GET`/`PUT /profile/notification-settings` (4 booleeni: priceDrop, newReleases, orderUpdates, marketing).
- Admin broadcast: `POST /admin/notifications/broadcast` (title, message, htmlBody, attachments).
Leagă UI-ul existent la astea când apar în `BUGS_TASKS.md`.

---

## 7. Definiția de „gata” & raportare
- Fiecare item: verificat în browser, fără regresii vizibile, fără erori noi în consolă.
- Actualizează statusul în `BUGS_TASKS.md` (`WIP` → `DONE`) doar pe item-urile tale.
- Blocaje / nevoi de API → notează la item cu „⚠ nevoie API: …”, ca să le prind eu (Claude).
