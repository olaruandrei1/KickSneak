using KickSneak.Application.Contracts.Application;
using KickSneak.Domain.DTOs.Notifications;
using KickSneak.WebApi.Middlewares;

namespace KickSneak.WebApi.Endpoints;

public static class NotificationEndpoints
{
    public static void MapNotificationEndpoints(this WebApplication app)
    {
        var group = app.MapGroup("/notifications").RequireAuth();

        group.MapGet("/", async (INotificationService svc, HttpContext ctx, CancellationToken ct) =>
        {
            var uid = ctx.User.FindFirst("uid")?.Value!;
            return Results.Ok(await svc.GetNotificationsAsync(uid, ct));
        });

        group.MapPatch("/{id:guid}/read", async (INotificationService svc, HttpContext ctx, Guid id, CancellationToken ct) =>
        {
            var uid = ctx.User.FindFirst("uid")?.Value!;
            await svc.MarkReadAsync(uid, id, ct);
            return Results.NoContent();
        });

        group.MapPatch("/read-all", async (INotificationService svc, HttpContext ctx, CancellationToken ct) =>
        {
            var uid = ctx.User.FindFirst("uid")?.Value!;
            await svc.MarkAllReadAsync(uid, ct);
            return Results.NoContent();
        });

        // ── Per-user notification settings (client /profile?section=settings chips) ──
        var profile = app.MapGroup("/profile").RequireAuth();

        profile.MapGet("/notification-settings", async (INotificationService svc, HttpContext ctx, CancellationToken ct) =>
        {
            var uid = ctx.User.FindFirst("uid")?.Value!;
            return Results.Ok(await svc.GetSettingsAsync(uid, ct));
        });

        profile.MapPut("/notification-settings", async (INotificationService svc, HttpContext ctx, NotificationSettingsDto dto, CancellationToken ct) =>
        {
            var uid = ctx.User.FindFirst("uid")?.Value!;
            return Results.Ok(await svc.UpdateSettingsAsync(uid, dto, ct));
        });

        // ── Admin broadcast (kept UI in admin app; wired to these) ──
        var admin = app.MapGroup("/admin/notifications").RequireAuth();

        admin.MapPost("/broadcast", async (INotificationService svc, BroadcastRequestDto dto, CancellationToken ct) =>
            Results.Ok(await svc.BroadcastAsync(dto, ct)));

        admin.MapGet("/broadcasts", async (INotificationService svc, CancellationToken ct) =>
            Results.Ok(await svc.GetBroadcastsAsync(ct)));

        // ── Web Push ──
        // Public: client fetches the VAPID public key before subscribing.
        app.MapGet("/notifications/vapid-public-key", () =>
            Results.Ok(new { publicKey = Environment.GetEnvironmentVariable("VAPID_PUBLIC_KEY") ?? string.Empty }));

        group.MapPost("/subscribe", async (INotificationService svc, HttpContext ctx, PushSubscriptionDto dto, CancellationToken ct) =>
        {
            var uid = ctx.User.FindFirst("uid")?.Value!;
            await svc.SaveSubscriptionAsync(uid, dto, ct);
            return Results.NoContent();
        });
    }
}

