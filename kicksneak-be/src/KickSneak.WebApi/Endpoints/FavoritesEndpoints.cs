using KickSneak.Application.Contracts.Application;
using KickSneak.Domain.DTOs.Favorites;
using KickSneak.WebApi.Middlewares;

namespace KickSneak.WebApi.Endpoints;

public static class FavoritesEndpoints
{
    public static void MapFavoritesEndpoints(this WebApplication app)
    {
        var group = app.MapGroup("/favorites").RequireAuth();

        group.MapGet("/", async (IFavoritesService svc, HttpContext ctx, CancellationToken ct) =>
        {
            var uid = ctx.User.FindFirst("uid")?.Value!;

            return Results.Ok(await svc.GetFavoritesAsync(uid, ct));
        });

        group.MapPost("/toggle", async (IFavoritesService svc, HttpContext ctx, ToggleFavoriteDto dto, CancellationToken ct) =>
        {
            var uid = ctx.User.FindFirst("uid")?.Value!;

            return Results.Ok(await svc.ToggleFavoriteAsync(uid, dto, ct));
        });
    }
}
