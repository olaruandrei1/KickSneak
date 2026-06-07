using KickSneak.Application.Contracts.Application;
using KickSneak.Domain.DTOs.Seller;
using KickSneak.WebApi.Middlewares;

namespace KickSneak.WebApi.Endpoints;

public static class SellerEndpoints
{
    public static void MapSellerEndpoints(this WebApplication app)
    {
        var group = app.MapGroup("/seller").RequireAuth();

        group.MapPost("/become", async (ISellerService svc, IProfileService profileSvc, HttpContext ctx, BecomeSellerDto dto, CancellationToken ct) =>
        {
            var uid = ctx.User.FindFirst("uid")?.Value!;
            var profile = await svc.BecomeSellerAsync(uid, dto, ct);
            return profile is null ? Results.BadRequest() : Results.Ok(profile);
        });

        group.MapGet("/listings", async (ISellerService svc, HttpContext ctx, CancellationToken ct) =>
        {
            var uid = ctx.User.FindFirst("uid")?.Value!;
            return Results.Ok(await svc.GetListingsAsync(uid, ct));
        });

        group.MapPost("/listings", async (ISellerService svc, HttpContext ctx, CreateListingDto dto, CancellationToken ct) =>
        {
            var uid = ctx.User.FindFirst("uid")?.Value!;
            var listing = await svc.CreateListingAsync(uid, dto, ct);
            return listing is null ? Results.BadRequest() : Results.Ok(listing);
        });

        group.MapPatch("/listings/{id:guid}/price", async (ISellerService svc, HttpContext ctx, Guid id, UpdateListingPriceDto dto, CancellationToken ct) =>
        {
            var uid = ctx.User.FindFirst("uid")?.Value!;
            var listing = await svc.UpdateListingPriceAsync(uid, id, dto, ct);
            return listing is null ? Results.NotFound() : Results.Ok(listing);
        });

        group.MapGet("/sales", async (ISellerService svc, HttpContext ctx, CancellationToken ct) =>
        {
            var uid = ctx.User.FindFirst("uid")?.Value!;
            var sales = await svc.GetSalesAsync(uid, ct);
            return sales is null ? Results.NotFound() : Results.Ok(sales);
        });

        group.MapGet("/auctions", async (ISellerService svc, HttpContext ctx, CancellationToken ct) =>
        {
            var uid = ctx.User.FindFirst("uid")?.Value!;
            var auctions = await svc.GetAuctionsAsync(uid, ct);
            return auctions is null ? Results.NotFound() : Results.Ok(auctions);
        });

        group.MapPost("/auctions/create", async (ISellerService svc, HttpContext ctx, CreateAuctionDto dto, CancellationToken ct) =>
        {
            var uid = ctx.User.FindFirst("uid")?.Value!;
            var auction = await svc.CreateAuctionAsync(uid, dto, ct);
            return auction is null ? Results.BadRequest() : Results.Ok(auction);
        });

        group.MapGet("/catalog/search", async (ISellerService svc, string q, CancellationToken ct) =>
        Results.Ok(new { items = await svc.SearchCatalogAsync(q, ct) }));

        group.MapPost("/listings/used", async (ISellerService svc, HttpContext ctx, CreateUsedListingDto dto, CancellationToken ct) =>
        {
            var uid = ctx.User.FindFirst("uid")?.Value!;
            var listing = await svc.CreateUsedListingAsync(uid, dto, ct);
            return listing is null ? Results.BadRequest() : Results.Ok(listing);
        });

        group.MapPost("/listings/{id:guid}/photos", async (ISellerService svc, HttpContext ctx, Guid id, CancellationToken ct) =>
        {
            var uid = ctx.User.FindFirst("uid")?.Value!;
            var form = await ctx.Request.ReadFormAsync(ct);

            var files = form.Files.Select(f => (
                Stream: f.OpenReadStream(),
                FileName: f.FileName,
                ContentType: f.ContentType
            )).ToList();

            var urls = await svc.UploadUsedItemPhotosAsync(uid, id, files, ct);
            return Results.Ok(new { urls });
        }).DisableAntiforgery();

        group.MapGet("/returns", async (ISellerService svc, HttpContext ctx, CancellationToken ct) =>
        {
            var uid = ctx.User.FindFirst("uid")?.Value!;
            var returns = await svc.GetReturnsAsync(uid, ct);
            return returns is null ? Results.NotFound() : Results.Ok(returns);
        });

        group.MapPost("/returns/{returnId:guid}/handle", async (ISellerService svc, HttpContext ctx, Guid returnId, ReturnHandleDto dto, CancellationToken ct) =>
        {
            var uid = ctx.User.FindFirst("uid")?.Value!;
            return await svc.HandleReturnAsync(uid, returnId, dto.Approve, ct)
                ? Results.Ok(new { success = true })
                : Results.NotFound();
        });
    }
}
