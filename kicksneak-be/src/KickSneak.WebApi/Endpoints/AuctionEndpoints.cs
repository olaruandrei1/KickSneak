using KickSneak.Application.Contracts.Application;
using KickSneak.Application.Hubs;
using KickSneak.Domain.DTOs.Auctions;
using KickSneak.WebApi.Middlewares;
using Microsoft.AspNetCore.SignalR;

namespace KickSneak.WebApi.Endpoints;

public static class AuctionEndpoints
{
    public static void MapAuctionEndpoints(this WebApplication app)
    {
        var pub = app.MapGroup("/auctions");
        var auth = app.MapGroup("/auctions").RequireAuth();

        pub.MapGet("/", async (IAuctionService svc, int page = 1, int pageSize = 20, CancellationToken ct = default) =>
            Results.Ok(await svc.GetAuctionsAsync(page, pageSize, ct)));

        pub.MapGet("/{id:guid}", async (IAuctionService svc, Guid id, HttpContext ctx, CancellationToken ct) =>
        {
            var uid = ctx.User.FindFirst("uid")?.Value;
            var auction = await svc.GetAuctionDetailAsync(id, uid, ct);
            return auction is null ? Results.NotFound() : Results.Ok(auction);
        });

        auth.MapPost("/{id:guid}/bids", async (IAuctionService svc, Guid id, HttpContext ctx, PlaceBidDto dto, CancellationToken ct) =>
        {
            var uid = ctx.User.FindFirst("uid")?.Value!;
            return Results.Ok(await svc.PlaceBidAsync(id, uid, dto, ct));
        });

        auth.MapPost("/{id:guid}/auto-bid", async (IAuctionService svc, Guid id, HttpContext ctx, SetAutoBidDto dto, CancellationToken ct) =>
        {
            var uid = ctx.User.FindFirst("uid")?.Value!;
            var result = await svc.SetAutoBidAsync(id, uid, dto, ct);

            return result is null ? Results.BadRequest() : Results.Ok(result);
        });

        auth.MapDelete("/{id:guid}/auto-bid", async (IAuctionService svc, Guid id, HttpContext ctx, CancellationToken ct) =>
        {
            var uid = ctx.User.FindFirst("uid")?.Value!;

            return await svc.CancelAutoBidAsync(id, uid, ct)
                ? Results.Ok(new { success = true })
                : Results.NotFound();
        });

        auth.MapPost("/{id:guid}/watch", async (IAuctionService svc, Guid id, HttpContext ctx, CancellationToken ct) =>
        {
            var uid = ctx.User.FindFirst("uid")?.Value!;

            await svc.ToggleWatchAsync(id, uid, ct);

            return Results.Ok(new { success = true });
        });

        auth.MapGet("/my-bids", async (IAuctionService svc, HttpContext ctx, CancellationToken ct) =>
        {
            var uid = ctx.User.FindFirst("uid")?.Value!;

            return Results.Ok(await svc.GetMyBidsAsync(uid, ct));
        });

        auth.MapGet("/my-won", async (IAuctionService svc, HttpContext ctx, CancellationToken ct) =>
        {
            var uid = ctx.User.FindFirst("uid")?.Value!;

            return Results.Ok(await svc.GetMyWonAuctionsAsync(uid, ct));
        });
    }
}
