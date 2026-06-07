using KickSneak.Application.Contracts.Application;
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
    }
}

