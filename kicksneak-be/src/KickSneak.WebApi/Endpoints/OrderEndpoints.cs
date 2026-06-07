using KickSneak.Application.Contracts.Application;
using KickSneak.WebApi.Middlewares;

namespace KickSneak.WebApi.Endpoints;

public static class OrderEndpoints
{
    public static void MapOrderEndpoints(this WebApplication app)
    {
        var group = app.MapGroup("/orders").RequireAuth();

        group.MapGet("/", async (IOrderService svc, HttpContext ctx, CancellationToken ct) =>
        {
            var uid = ctx.User.FindFirst("uid")?.Value!;
            return Results.Ok(await svc.GetOrdersAsync(uid, ct));
        });

        group.MapGet("/{id:guid}/confirmation", async (IOrderService svc, HttpContext ctx, Guid id, CancellationToken ct) =>
        {
            var uid = ctx.User.FindFirst("uid")?.Value!;
            var order = await svc.GetOrderByIdAsync(uid, id, ct);
            return order is null ? Results.NotFound() : Results.Ok(order);
        });
    }
}

