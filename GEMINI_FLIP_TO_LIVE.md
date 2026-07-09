# Antigravity — Flip la LIVE + verificare (C1/C2/C3)

Frontend-ul tău e gata pe mock-uri. Claude a livrat API-urile **C1/C2/C3 live**. Acum:
treci pe live, verifici cap-coadă, reconciliezi orice nepotrivire.

## 1. Setup
- Backend live: `docker compose -f docker/docker-compose.yml up -d` → API pe `http://localhost:5005`.
- Client `kicksneak-fe/.env`: `VITE_USE_MOCKS=false` + `VITE_API_BASE_URL=http://localhost:5005`.
- Restart `npm run dev`.
- **ATENȚIE mock-uri stale**: `search-results-paged.json` și `product-detail.json` NU aveau `facets/detected` / mărimile noi — deci feature-urile astea NU se vedeau pe mock. Pe LIVE există. Dacă ceva „nu mergea pe mock", testează pe live înainte să sapi.

## 2. Shape-uri LIVE exacte (reconciliază codul la ele)

### `GET /products/search-paged?q=&brand=&category=&color=&gender=&minPrice=&maxPrice=&sort=&page=&pageSize=`
```json
{
  "items": [{ "id":"guid","name":"","brand":"","price":0,"image":"","category":"","sold":0,"isNew":false,"isFavorite":false }],
  "total": 9982, "page": 1, "pageSize": 24,
  "facets": {
    "brands":     [{ "id":"guid", "name":"Adidas" }],
    "categories": [{ "id":"guid", "name":"Sneakers" }],
    "colors":     [{ "id":"guid", "name":"Black" }],
    "genders":    [{ "id":"guid", "name":"Men" }],
    "priceRange": { "min": 14.21, "max": 1758.86 }
  },
  "detected": { "brandId":"guid|null", "brandName":"Adidas|null", "categoryId":"guid|null" }
}
```
- **Facet items sunt `{id, name}` — FĂRĂ `count`.** Dacă UI-ul tău cere `count`, spune-mi, îl adaug.
- `detected` e `null` când query-ul nu matchează un brand/categorie.
- `sort`: `newest` (default) | `price_asc` | `price_desc`.

### `GET /products/{id}`
Fiecare mărime are toate sistemele + `preferredSizeId` la top-level:
```json
"sizes": [
  { "sizeId":"guid", "label":"US 6.5 / EU 39.0 / UK 6", "system":"EU",
    "us":"6.5", "eu":"39.0", "uk":"6", "cm":"24.5", "price":147.69, "available":true }
],
"preferredSizeId": "guid|null"
```
- `preferredSizeId` e `null` dacă nu ești logat sau n-ai mărime salvată în profil.
- `us/eu/uk/cm` pot fi `null` individual dacă lipsesc din date (fallback pe `label`).

## 3. De verificat pe LIVE
- [ ] Search gol → toate produsele, newest first (B12). Buton Shop + ruta `/new` (B24).
- [ ] `?maxPrice=150` din Deals → doar produse ≤150 (B19).
- [ ] Caut „adidas" → `detected.brandName` precompletează brand-ul (B13).
- [ ] Filtrele Activity/Color/Brand populate din `facets` + selectabile (B14/B15).
- [ ] Fără stack de filtre/breadcrumb (B25).
- [ ] Product page: toggle EU/US/UK/CM randează câmpul corect (B22).
- [ ] Mărime preselectată din profil când ești logat (B17).
- [ ] Price history: acum ARE date pt produsele vândute; păstrează guard-ul pe listă goală (B23).

## 4. Rămâne pe MOCK (până livrează Claude T01)
- Chips-urile de notificări din `/profile?section=settings` (C5).
- Pagina de broadcast din admin (B29) — `sendBroadcast`/`getRecentBroadcasts`.
Nu le lega la live încă — vin API-urile de la mine.

## 5. QA/polish (dacă ai timp)
Pasă vizuală pe tot: responsive (mobile/tablet), stări goale/eroare, loading, toast-urile B08/B09 chiar apar pe eroare reală.

## Note
- Auth: search e public; `isFavorite`, `preferredSizeId` cer token Firebase.
- Orice nepotrivire de shape → **nu modifica backend**, scrie-mi în `BUGS_TASKS.md` „⚠ mismatch: …", o repar eu (contractul e al meu).
