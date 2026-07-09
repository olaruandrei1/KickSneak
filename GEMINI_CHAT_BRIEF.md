# Antigravity — B27: Live chat admin↔client (wiring pe ws-server.js)

## Cauza (confirmată)
Clientul, în `mode === 'support'` ([ChatSection.tsx:212](kicksneak-fe/src/pages/ProfilePage/components/sections/ChatSection.tsx:212)),
**nu deschide niciun WebSocket** — doar afișează mesaje hardcodate printr-un `setTimeout` fake.
Admin-ul (`ChatSupportClient.tsx`) vorbește pe `ws-server.js` (:3005). → sunt pe canale
diferite, nu se văd. Routing-ul din `ws-server.js` E CORECT (nu-l atinge). Trebuie doar
să conectezi clientul (și să faci admin-ul să se conecteze fiabil) la `ws-server.js`.

## Contract `ws-server.js` (nu-l modifica)
```
CONNECT:
  admin :  ws://<host>:3005/?role=admin
  client:  ws://<host>:3005/?role=client&sessionId=<id>&userId=<uid>

SEND (client):  { type:"message", sessionId, content, role:"user" }
SEND (admin):   { type:"message", sessionId, content, role:"admin" }
                { type:"register_session", sessionId }         // dacă te legi fără sessionId
                { type:"takeover", sessionId }                 // admin preia → status 'agent'
                { type:"close", sessionId }

RECV (ambii):   { type:"message", message:{ id, session_id, role, content, created_at } }
                { type:"status_changed", sessionId, status }   // 'agent' | 'closed'
                { type:"connected", role, sessionId }
                { type:"registered", sessionId }
```

## Client — `ChatSection.tsx` (mod support)
1. Adaugă `const SUPPORT_WS_URL = import.meta.env.VITE_SUPPORT_WS_URL ?? 'ws://localhost:3005';`
2. În `escalateToSupport()`: **NU** mai pune mesaje fake. Deschide WS la
   `${SUPPORT_WS_URL}/?role=client&sessionId=${sessionId}&userId=${user.uid}`
   **refolosind `sessionId`-ul sesiunii AI existente** (ca admin-ul să vadă aceeași sesiune).
   Dacă `sessionId` e null, generează unul și trimite `register_session`.
3. În `handleSend()`, ramura `mode === 'support'`: în loc de `setTimeout` fake, trimite
   `{ type:"message", sessionId, content: input, role:"user" }` pe WS-ul de support.
4. Pe `onmessage`, tratează `type:"message"` (append mesaj cu `role: message.role === 'admin' ? 'support' : 'user'`)
   și `type:"status_changed"` (afișează „agent conectat" / „închis").
5. Reconnect on close (ai deja `reconnectingRef`).

## Admin — `ChatSupportClient.tsx`
- Verifică că se conectează la `ws://<host>:3005/?role=admin` (URL/port corect din env).
- La preluarea unei sesiuni trimite `{ type:"takeover", sessionId }`, apoi mesaje cu `role:"admin"`.
- `[WS] error {}` = nu ajunge la server → verifică că `ws-server.js` rulează (via `run-all.js`) și portul.

## Config DB pt ws-server.js (verificat de Claude)
`chat_messages` + `chat_sessions` există și au schema corectă; `ks_chat_service` are SELECT/INSERT/UPDATE.
Asigură-te că `DATABASE_URL` din `kicksneak-admin-v2/.env` folosește un user cu aceste grants
(ex. `ks_chat_service` sau superuserul) — altfel INSERT-urile din ws-server.js pică.

## Env (Claude confirmă reachability)
- Client: `VITE_SUPPORT_WS_URL=ws://localhost:3005` (dev). La demo, admin rulează local cu `run-all.js`.
- Dacă vrei alt host/port, zi-mi, ajustez.

## Definiția de gata
User escaladează în client → scrie → adminul vede în `ChatSupportClient` și răspunde →
răspunsul apare la client în timp real. Mesajele se persistă în `chat_messages` (o face ws-server.js).
