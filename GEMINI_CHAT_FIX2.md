# Antigravity — Chat Live Support: cele 4 probleme (fix chirurgical)

Ai eșuat de câteva ori pentru că arhitectura nu e clară. Citește ÎNTÂI asta, apoi rezolvi punct cu punct.

## Arhitectura (fixă — nu o schimba)
- **Go service (:8080)** = chat **AI** (Ollama, streaming). Clientul e pe ăsta cât `mode==='ai'`.
- **`ws-server.js` (:3005, Node, în admin)** = **support uman**, routing pe sessionId. Aici stau ȘI clientul (mode support) ȘI adminul.
- **Sesiune partajată**: clientul refolosește `sessionId`-ul sesiunii AI când trece pe support (așa se leagă de admin).
- **Backend Claude e OK** (verificat din DB): mesajele se persistă corect, sub același `session_id`. NU e problemă de backend/routing pe server. Totul de mai jos e frontend + ws-server.js.

---

## P1 — Mesajele nu ajung „live" (nici într-o parte)
**Cauză:** socket-ul nu e stabil / clientul nu e în `clients[sessionId]` pe ws-server.js, SAU un race de `useEffect` re-deschide conexiunea.
**Fix (client `ChatSection.tsx` + admin `ChatSupportClient.tsx`):**
1. Conexiunea WS se creează O SINGURĂ DATĂ per sesiune. Ține-o în `useRef`, guard: `if (wsRef.current) return;`. NU o pune în deps care se schimbă des.
2. La `open`, clientul trimite EXPLICIT `{ type:"register_session", sessionId }` (pe lângă `?sessionId=` din URL) → garantează că e în `clients[sessionId]`.
3. Pe `onmessage`, la `{type:"message", message}` → append cu rolul din `message.role` ('admin'→bulă support, 'user'→bulă user, 'assistant'→AI). NU hardcoda rolul.
4. Test: în consola `run-all.js` trebuie să vezi `Client connected. Session: <id>` și, când adminul trimite, `clients.has(sId)` = true.

## P2 — Apar doar după refresh + „ca și cum le-am dat eu" + conexiunea se pierde
**Cauză:** conexiunea WS pică (idle, fără keepalive) → mesajele apar doar din istoric la refresh; iar la încărcarea istoricului rolul nu e respectat → toate par „ale mele".
**Fix A — keepalive în `ws-server.js`** (ca să nu mai pice conexiunea; adaugă în `wss.on('connection', (ws)=>{...})`):
```js
ws.isAlive = true;
ws.on('pong', () => { ws.isAlive = true; });
// o singură dată, global, după crearea wss:
const keepAlive = setInterval(() => {
  wss.clients.forEach((c) => {
    if (c.isAlive === false) return c.terminate();
    c.isAlive = false; c.ping();
  });
}, 25000);
wss.on('close', () => clearInterval(keepAlive));
```
**Fix B — reconnect + persistență:** pe `onclose` (client & admin), reconnect + re-trimite `register_session`. NU închide WS-ul la re-render; închide-l DOAR când adminul apasă „Închide Chat" (sau componenta se demontează definitiv).
**Fix C — istoric:** când încarci istoricul (din DB / Go), mapează fiecare mesaj după `role`-ul lui real (admin/user/assistant), nu totul ca „user".

## P3 — Auto-scroll pe tot div-ul mare (nu doar în chat)
**Cauză:** folosești `scrollIntoView()` sau setezi scroll pe containerul greșit → scrollează pagina/ancestorii.
**Fix:** scrollează DOAR div-ul intern de mesaje:
```js
messagesRef.current.scrollTop = messagesRef.current.scrollHeight;
```
unde `messagesRef` e div-ul de mesaje cu `overflow-y:auto` + înălțime mărginită (`flex:1; min-height:0` sau `max-height`). NU `scrollIntoView`.

## P4 — Butonul „Preia de la AI" nu face nimic
**Ce trebuie:** oprește AI-ul + pornește conversația live.
**Cauză:** handler-ul nu trimite `takeover`.
**Fix (admin `ChatSupportClient.tsx`):**
1. La click → trimite pe ws-server.js `{ type:"takeover", sessionId }` (setează status `agent` + broadcast `status_changed`).
2. Clientul (are deja polling la 3s pe statusul sesiunii) vede `status==='agent'` → **închide WS-ul Go (oprește AI-ul)** + deschide WS-ul support (:3005) cu același `sessionId`. Verifică că polling-ul chiar închide `goWsRef.current?.close()`.
3. Dacă vrei oprire AI instant: la switch, clientul face `goWsRef.current?.close()` ÎNAINTE de a deschide support-ul.

---

## Ordine recomandată
P4 (takeover) → P1 (real-time) → P2 (keepalive+reconnect+istoric) → P3 (scroll). P2-Fix A (keepalive) rezolvă jumate din „conexiunea se pierde".

## Definiția de gata
Client escaladează (sau admin „Preia de la AI") → AI se oprește → client & admin schimbă mesaje în timp real, fără refresh → conexiunea ține până admin apasă „Închide Chat" → scroll doar în chat.

> Backend/DB (Claude): confirmat OK — 401-urile de rate-limit/blacklist le-am dezactivat, chat tables owner reparat. Dacă apare ceva ce arată server-side, scrie în GEMINI_PROGRESS.md.
