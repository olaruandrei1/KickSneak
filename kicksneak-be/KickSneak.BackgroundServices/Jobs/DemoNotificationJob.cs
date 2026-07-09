using KickSneak.Application.Contracts.Persistence;
using KickSneak.Application.Hubs;
using KickSneak.Domain.Entities.Notifications;
using KickSneak.Infrastructure.Contracts;
using Microsoft.AspNetCore.SignalR;
using Microsoft.Extensions.DependencyInjection;
using Quartz;
using System.Text.Json;

namespace KickSneak.BackgroundServices.Jobs;

/// <summary>
/// Demo-mode job: every minute it sends a varied, realistic notification to the
/// real (non-seeded) users so live delivery is visible during the thesis demo —
/// in-app toast + bell (SignalR), plus browser web-push for subscribed users.
/// Disable with env DEMO_NOTIFICATIONS=off.
/// </summary>
[DisallowConcurrentExecution]
public sealed class DemoNotificationJob(IServiceScopeFactory scopeFactory) : IJob
{
    private const string CreatedByTag = "demo-job";
    private static readonly TimeSpan CleanupAge = TimeSpan.FromHours(2);
    private static int _tick;

    // (type, title, message template, href template — {0} = product title, {1} = product id)
    private static readonly (string Type, string Title, string Message, string Href)[] Templates =
    [
        ("price_drop",     "Preț redus 🔥",             "{0} tocmai a scăzut cu 20% — prinde-l cât mai e în stoc!",            "/product/{1}"),
        ("recommendation", "Ceva pe gustul tău ✨",      "AI-ul nostru crede că {0} ți s-ar potrivi perfect.",                  "/product/{1}"),
        ("offer",          "Ofertă nouă 🤝",            "Un cumpărător a făcut o ofertă pentru {0}. Răspunde acum!",           "/profile?section=seller-listings"),
        ("order",          "Update comandă 📦",         "Comanda ta cu {0} a fost predată curierului.",                        "/profile?section=orders"),
        ("system",         "Licitație pe final ⏱️",     "{0} se închide în curând — ultimul bid câștigă!",                     "/auctions"),
        ("price_drop",     "Flash sale ⚡",              "Doar azi: {0} la cel mai mic preț din ultimele 30 de zile.",          "/search?priceMax=150"),
        ("recommendation", "Trending acum 📈",          "{0} e în top căutări azi. Aruncă un ochi!",                           "/product/{1}"),
        ("system",         "KickSneak Live 🚀",         "Notificările în timp real funcționează — livrat prin SignalR + Web Push.", "/"),
    ];

    public async Task Execute(IJobExecutionContext context)
    {
        if (Environment.GetEnvironmentVariable("DEMO_NOTIFICATIONS") is "off" or "false" or "0")
            return;

        var scope = scopeFactory.CreateScope();
        try
        {
            var uow = scope.ServiceProvider.GetRequiredService<IUnitOfWork>();
            var hub = scope.ServiceProvider.GetRequiredService<IHubContext<NotificationHub>>();
            var push = scope.ServiceProvider.GetRequiredService<IWebPushSender>();
            var ct = context.CancellationToken;

            // Only real accounts — seeded bots have FirebaseUid like 'fid_...'.
            var users = await uow.Users.GetAsync(
                u => !u.IsDeleted && u.FirebaseUid != null && !u.FirebaseUid.StartsWith("fid_"), ct);
            if (users.Count == 0) return;

            // Rotate templates; pick a random product for flavour + click destination.
            var template = Templates[Interlocked.Increment(ref _tick) % Templates.Length];
            var products = await uow.Products.GetAsync(p => !p.IsDeleted && p.Title != null, ct);
            var product = products.Count > 0 ? products[Random.Shared.Next(products.Count)] : null;
            var productTitle = product?.Title ?? "Nike Air Jordan 1";
            var productId = product?.Id.ToString() ?? string.Empty;
            var message = string.Format(template.Message, productTitle, productId);
            var href = string.Format(template.Href, productTitle, productId);

            // DB rows (elevated — RLS would block cross-user inserts) + cleanup of old demo rows.
            var cutoff = DateTime.UtcNow - CleanupAge;
            await uow.ExecuteElevatedAsync(async () =>
            {
                var stale = await uow.Notifications.GetAsync(
                    n => n.CreatedBy == CreatedByTag && n.CreatedAt < cutoff, ct);
                if (stale.Count > 0)
                    uow.Notifications.DeleteRange(stale);

                foreach (var u in users)
                {
                    await uow.Notifications.AddAsync(new Notification
                    {
                        UserId = u.Id,
                        Type = template.Type,
                        Title = template.Title,
                        Body = message,
                        Href = href,
                        IsRead = false,
                        CreatedBy = CreatedByTag
                    }, ct);
                }
            }, ct);
            await uow.SaveChangesAsync(ct);

            // Live in-app delivery (toast + bell badge).
            var groups = users.Select(u => $"user:{u.FirebaseUid}").ToList();
            await hub.Clients.Groups(groups).SendAsync("ReceiveNotification", new
            {
                title = template.Title,
                message,
                type = template.Type,
                href,
                createdAt = DateTime.UtcNow
            }, ct);

            // Browser web-push (best-effort, only for users who opted in).
            var userIds = users.Select(u => u.Id).ToList();
            var subs = await uow.PushSubscriptions.GetAsync(s => userIds.Contains(s.UserId), ct);
            if (subs.Count > 0)
            {
                var payload = JsonSerializer.Serialize(new { title = template.Title, body = message, url = href });
                foreach (var s in subs)
                {
                    try
                    {
                        if (!string.IsNullOrEmpty(s.Endpoint) && !string.IsNullOrEmpty(s.PrivateKey) && !string.IsNullOrEmpty(s.AuthKey))
                            await push.SendAsync(s.Endpoint!, s.PrivateKey!, s.AuthKey!, payload, ct);
                    }
                    catch (Exception ex)
                    {
                        Console.WriteLine($"[DemoNotificationJob] web-push failed: {ex.Message}");
                    }
                }
            }

            Console.WriteLine($"[DemoNotificationJob] Sent '{template.Title}' to {users.Count} user(s)");
        }
        catch (Exception ex)
        {
            Console.WriteLine($"[DemoNotificationJob] Failed: {ex.Message}");
        }
        finally
        {
            await ((IAsyncDisposable)scope).DisposeAsync();
        }
    }
}
