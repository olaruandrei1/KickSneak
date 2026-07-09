# Antigravity — Consolă Notificări (Quartz + WebPush)

Construiește o **consolă .NET standalone** care rulează periodic (Quartz), ia subscriberii din DB
și trimite **WebPush**. Clean-ish architecture, dar **pe repede înainte**. Grosul = boilerplate +
WebPush + DI + structură **pluggable** (regulile „ce notificări trimit" le adăugăm NOI mai încolo —
tu faci plumbing-ul + o regulă exemplu/stub).

## LOCAȚIE (strict)
Totul în **`kicksneak-notifications/`** din rădăcina repo-ului. Nu atinge alt proiect.

## Șabloane existente (copiază pattern-ul)
- Quartz console: `kicksneak-be/KickSneak.AiScheduler/` (Program.cs + Quartz + Dockerfile).
- WebPush sender: `kicksneak-be/src/KickSneak.Infrastructure/Implementations/WebPushSender.cs`.
- DB raw access: `kicksneak-be/KickSneak.Seed.DatabaseETL/Program.cs` (Npgsql).

## Stack
- .NET 10, `OutputType=Exe`, `net10.0`.
- NuGet: `Quartz.Extensions.Hosting` 3.13.1, `Microsoft.Extensions.Hosting` 10.0.0, `WebPush` 1.0.12, `Npgsql` 9.0.3, `Dapper` (opțional, pt query-uri curate).

## Config (din env — sunt DEJA în docker/.env)
- DB: `Host=postgres;Port=5432;Database=kicksneak;Username=ks_owner;Password=${KS_OWNER_PASSWORD}`
  (folosește `ks_owner` — owner, ocolește RLS; sau superuserul). Env var: `DB_CONNECTION` sau `NOTIF_DB_CONNECTION`.
- VAPID (există): `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, `VAPID_SUBJECT`.
- Cron: `NOTIF_CRON` (default `0 0 * * * ?` — orar) + o rulare la startup (ca AiScheduler).

## Schema DB relevantă (NU o modifica)
```
webpush_subscriptions:
  "Id" uuid, "UserId" uuid, "Endpoint" text, "AuthKey" text, "PrivateKey" text,
  "IsDeleted" bool, "CreatedAt" timestamptz, ...
  ⚠ MAPARE: WebPush PushSubscription(endpoint, p256dh, auth):
     endpoint = "Endpoint", p256dh = "PrivateKey" (e MISNAMED — e cheia publică p256dh), auth = "AuthKey"
notifications:  (in-app; creezi rânduri aici când trimiți)
  "Id" uuid default gen_random_uuid(), "UserId" uuid, "Type" text, "Title" text, "Body" text,
  "IsRead" bool default false, "IsDeleted" bool default false, "CreatedAt" timestamptz default now(), ...
users: "Id" uuid, "FirebaseUid" text, "IsDeleted" bool, "RoleId" uuid, ...
notification_settings: "UserId" uuid, "PriceDrop","NewReleases","OrderUpdates","Marketing" bool
  (respectă preferințele: nu trimite o tipologie dacă userul a dezactivat-o)
```

## Structură propusă (clean dar rapidă)
```
kicksneak-notifications/
  KickSneak.Notifications.csproj
  Program.cs                     // Host + Quartz + DI
  Dockerfile
  Domain/
    Subscriber.cs                // UserId, Endpoint, P256dh, Auth
    PendingNotification.cs        // UserId, Type, Title, Body
    INotificationRule.cs         // Task<IReadOnlyList<PendingNotification>> EvaluateAsync(ct)
  Infrastructure/
    ISubscriberRepository.cs / SubscriberRepository.cs   // ia subscriberi + settings din DB (Dapper/Npgsql)
    INotificationStore.cs / NotificationStore.cs         // INSERT în notifications (in-app)
    IWebPushSender.cs / WebPushSender.cs                 // copiază din backend
  Rules/
    ExampleRule.cs               // STUB: întoarce listă goală (sau 1 notificare de test). Aici adăugăm noi rulele.
  Jobs/
    NotificationJob.cs           // [DisallowConcurrentExecution]: rulează toate INotificationRule →
                                 //   grupează per user → respectă notification_settings →
                                 //   INSERT in-app + WebPush către subscription-urile userului
```

## Flux job (NotificationJob)
1. Rulează toate `INotificationRule` înregistrate → colectează `PendingNotification`-uri.
2. Pentru fiecare notificare: verifică `notification_settings` pt tipul respectiv (skip dacă off).
3. INSERT rând în `notifications` (in-app).
4. Ia subscription-urile WebPush ale userului → trimite push (payload JSON `{title, body, url:"/"}`), best-effort (prinde 404/410 = expirat, ignoră/marchează deleted).

## DI (Program.cs)
- `AddQuartz` + job `NotificationJob` pe `NOTIF_CRON` + trigger startup (ca AiScheduler).
- Înregistrează `ISubscriberRepository`, `INotificationStore`, `IWebPushSender`, și toate `INotificationRule` (deocamdată `ExampleRule`).
- WebPushSender: `VapidDetails` din env; no-op dacă lipsesc cheile.

## Dockerfile + compose (opțional)
- Dockerfile ca la AiScheduler (sdk build → runtime).
- Poți adăuga un serviciu `notifications` în `docker/docker-compose.yml` (env: DB + VAPID), `depends_on: postgres healthy`. Sau lasă-l rulabil standalone `dotnet run` — spune ce alegi.

## Definiția de gata (pt acum)
- Consola pornește, Quartz declanșează `NotificationJob`, care: ia subscriberii din DB, rulează `ExampleRule`
  (stub), și — dacă returnează ceva — trimite WebPush + creează in-app. Cu stub gol, doar loghează
  „0 notificări de trimis" fără erori. **Structura pluggable e cheia** — noi adăugăm rulele reale după.
- Loghează în GEMINI_PROGRESS.md ce ai făcut + fișierele.

## NU face
- Nu atinge backend-ul .NET existent, ws-server.js, sau chat-ul (Claude e pe chat).
- Nu inventa scheme noi de DB. Nu schimba cheile VAPID.
