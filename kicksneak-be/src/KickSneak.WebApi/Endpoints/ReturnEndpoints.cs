using KickSneak.Application.Contracts.Application;
using KickSneak.Domain.DTOs.Returns;
using KickSneak.WebApi.Middlewares;

namespace KickSneak.WebApi.Endpoints;

public static class ReturnEndpoints
{
    public static void MapReturnEndpoints(this WebApplication app)
    {
        var group = app.MapGroup("/returns").RequireAuth();

        group.MapGet("/", async (IReturnService svc, HttpContext ctx, CancellationToken ct) =>
        {
            var uid = ctx.User.FindFirst("uid")?.Value!;
            return Results.Ok(await svc.GetReturnsAsync(uid, ct));
        });

        group.MapPost("/", async (IReturnService svc, HttpContext ctx, CreateReturnDto dto, CancellationToken ct) =>
        {
            var uid = ctx.User.FindFirst("uid")?.Value!;
            return Results.Ok(await svc.CreateReturnAsync(uid, dto, ct));
        });

        app.MapPost("/orders/{id:guid}/cancel", async (IReturnService svc, HttpContext ctx, Guid id, CancellationToken ct) =>
        {
            var uid = ctx.User.FindFirst("uid")?.Value!;
            await svc.CancelOrderAsync(uid, id, ct);
            return Results.NoContent();
        }).RequireAuth();
    }
}
