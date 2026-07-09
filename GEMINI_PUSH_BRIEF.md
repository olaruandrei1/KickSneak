# Antigravity — WebPush subscribe UI (ultima piesă T01)

Backend-ul e gata. Trebuie doar partea de client: service worker + subscribe + trimite subscription-ul.

## Contract backend (live)
```
GET  /notifications/vapid-public-key      → { publicKey }          (public, fără auth)
POST /notifications/subscribe             → 204                     (RequireAuth)
     body: { endpoint, p256dh, auth }
```
Payload-ul pe care-l trimite backend-ul la push: `{ "title": "...", "body": "...", "url": "/" }`.

## De făcut (client `kicksneak-fe`)
1. **Service worker** `public/sw.js`:
   ```js
   self.addEventListener('push', (e) => {
     const d = e.data ? e.data.json() : {};
     e.waitUntil(self.registration.showNotification(d.title || 'KickSneak', {
       body: d.body || '', data: { url: d.url || '/' }, icon: '/icon.png'
     }));
   });
   self.addEventListener('notificationclick', (e) => {
     e.notification.close();
     e.waitUntil(clients.openWindow(e.notification.data?.url || '/'));
   });
   ```
2. **Subscribe** (la opt-in — ex. un toggle „Enable browser notifications" în settings, sau când userul bifează Marketing):
   ```js
   const reg = await navigator.serviceWorker.register('/sw.js');
   const perm = await Notification.requestPermission();
   if (perm !== 'granted') return;
   const { publicKey } = await (await fetch(`${API}/notifications/vapid-public-key`)).json();
   const sub = await reg.pushManager.subscribe({
     userVisibleOnly: true,
     applicationServerKey: urlBase64ToUint8Array(publicKey),
   });
   const json = sub.toJSON();
   await httpClient.post(`${API}/notifications/subscribe`, {
     endpoint: json.endpoint, p256dh: json.keys.p256dh, auth: json.keys.auth,
   });
   ```
   `urlBase64ToUint8Array` = helperul standard VAPID (base64url → Uint8Array).
3. Loghează în `GEMINI_PROGRESS.md`.

## Test (gata când)
Subscribe din client → din admin trimiți un broadcast → **apare notificare push în browser**
(chiar cu tab-ul pe fundal). Notificările in-app apar oricum (deja mergeau).

Notă: WebPush cere HTTPS SAU `localhost` (localhost e ok pt dev — merge pe `http://localhost:5173`).
