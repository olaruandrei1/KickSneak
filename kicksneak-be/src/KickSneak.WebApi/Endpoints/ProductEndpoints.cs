using KickSneak.Application.Contracts.Application;
using KickSneak.Domain.DTOs.Products;
using KickSneak.WebApi.Middlewares;

namespace KickSneak.WebApi.Endpoints;

public static class ProductEndpoints
{
    public static void MapProductEndpoints(this WebApplication app)
    {
        var pub = app.MapGroup("/products");
        var auth = app.MapGroup("/products").RequireAuth();

        pub.MapGet("/new", async (IProductService svc, CancellationToken ct) =>
            Results.Ok(await svc.GetNewProductsAsync(ct)));

        pub.MapGet("/trending", async (IProductService svc, CancellationToken ct) =>
            Results.Ok(await svc.GetTrendingProductsAsync(ct)));

        pub.MapGet("/recommended", async (IProductService svc, HttpContext ctx, CancellationToken ct) =>
        {
            var uid = ctx.User.FindFirst("uid")?.Value;
            return Results.Ok(await svc.GetRecommendedAsync(uid, ct));
        });

        pub.MapGet("/search", async (IProductService svc, string q, CancellationToken ct) =>
            Results.Ok(await svc.SearchProductsAsync(q, ct)));

        // Browse + search + filters + facets (empty q => all products, newest first)
        pub.MapGet("/search-paged", async (
            IProductService svc,
            string? q = null,
            string[]? brand = null,
            string[]? category = null,
            string[]? color = null,
            string[]? gender = null,
            double? minPrice = null,
            double? maxPrice = null,
            string? sort = null,
            int page = 1,
            int pageSize = 24,
            CancellationToken ct = default) =>
            Results.Ok(await svc.BrowseProductsAsync(
                new ProductBrowseQuery(q, brand, category, color, gender, minPrice, maxPrice, sort, page, pageSize), ct)));

        pub.MapGet("/{id:guid}", async (IProductService svc, Guid id, HttpContext ctx, CancellationToken ct) =>
        {
            var uid = ctx.User.FindFirst("uid")?.Value;
            var product = await svc.GetProductByIdAsync(id, uid, ct);
            if (product is null) return Results.NotFound();
            if (uid is not null)
                await svc.TrackViewAsync(uid, id, ct); 
            return Results.Ok(product);
        });

        auth.MapGet("/recently-viewed", async (IProductService svc, HttpContext ctx, CancellationToken ct) =>
        {
            var uid = ctx.User.FindFirst("uid")?.Value!;
            return Results.Ok(await svc.GetRecentlyViewedAsync(uid, ct));
        });
    }
}
