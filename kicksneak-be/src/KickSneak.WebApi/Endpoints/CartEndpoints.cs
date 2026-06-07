using KickSneak.Application.Contracts.Application;
using KickSneak.Domain.DTOs.Cart;
using KickSneak.WebApi.Middlewares;

namespace KickSneak.WebApi.Endpoints;

public static class CartEndpoints
{
    public static void MapCartEndpoints(this WebApplication app)
    {
        RouteGroupBuilder group = app.MapGroup("/cart").RequireAuth();

        group.MapGet("/", async (ICartService svc, HttpContext ctx, CancellationToken ct) =>
        {
            var uid = ctx.User.FindFirst("uid")?.Value!;

            return Results.Ok(await svc.GetCartAsync(uid, ct));
        });

        group.MapPost("/add", async (ICartService svc, HttpContext ctx, AddToCartDto dto, CancellationToken ct) =>
        {
            var uid = ctx.User.FindFirst("uid")?.Value!;

            return Results.Ok(await svc.AddToCartAsync(uid, dto, ct));
        });

        group.MapDelete("/{id:guid}", async (ICartService svc, HttpContext ctx, Guid id, CancellationToken ct) =>
        {
            var uid = ctx.User.FindFirst("uid")?.Value!;

            return Results.Ok(await svc.RemoveFromCartAsync(uid, id, ct));
        });
    }
}
