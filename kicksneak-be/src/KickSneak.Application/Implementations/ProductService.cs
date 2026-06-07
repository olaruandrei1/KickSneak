using KickSneak.Application.Contracts.Application;
using KickSneak.Application.Contracts.Persistence;
using KickSneak.Domain.DTOs.Products;
using KickSneak.Domain.Entities.Catalog;
using KickSneak.Domain.Enums;

namespace KickSneak.Application.Implementations;

public sealed class ProductService(IUnitOfWork uow) : IProductService
{
    public async Task<ProductsResponseDto> GetNewProductsAsync(CancellationToken ct = default)
    {
        var products = await uow.Products.GetAsync(
            p => p.ReleaseDate >= DateTime.UtcNow.AddMonths(-3), ct,
            p => p.Brand, p => p.Photos, p => p.StockItems);

        return MapToResponse(products.Take(20).ToList());
    }

    public async Task<ProductsResponseDto> GetTrendingProductsAsync(CancellationToken ct = default)
    {
        var products = await uow.Products.GetAllAsync(ct,
            p => p.Brand, p => p.Photos, p => p.StockItems);

        var trending = products
            .OrderByDescending(p => p.StockItems.Count(s => s.StatusItem == ItemStatus.Sold))
            .Take(20)
            .ToList();

        return MapToResponse(trending);
    }

    public async Task<RecommendedProductsDto> GetRecommendedAsync(string? firebaseUid = null, CancellationToken ct = default)
    {
        List<Product> products;

        if (firebaseUid is not null)
        {
            var user = await uow.Users.GetFirstOrDefaultAsync(u => u.FirebaseUid == firebaseUid, ct);
            if (user is not null)
            {
                var viewed = await uow.ProductViews.GetAsync(v => v.UserId == user.Id, ct);
                var viewedIds = viewed.Select(v => v.ProductId).ToHashSet();

                var viewedProducts = await uow.Products.GetAsync(
                    p => viewedIds.Contains(p.Id), ct,
                    p => p.Brand, p => p.Photos, p => p.StockItems);

                var categories = viewedProducts
                    .Select(p => p.CategoryId)
                    .Distinct()
                    .ToHashSet();

                if (categories.Count > 0)
                {
                    products = (await uow.Products.GetAsync(
                        p => categories.Contains(p.CategoryId) && !viewedIds.Contains(p.Id), ct,
                        p => p.Brand, p => p.Photos, p => p.StockItems))
                        .Take(6).ToList();

                    return new RecommendedProductsDto("Recommended For You", products.Select(MapToItemDto).ToList());
                }
            }
        }

        products = (await uow.Products.GetAllAsync(ct,
            p => p.Brand, p => p.Photos, p => p.StockItems))
            .OrderByDescending(p => p.StockItems.Count(s => s.StatusItem == ItemStatus.Sold))
            .Take(6).ToList();

        return new RecommendedProductsDto("Recommended For You", products.Select(MapToItemDto).ToList());
    }

    public async Task<ProductsResponseDto> GetRecentlyViewedAsync(string firebaseUid, CancellationToken ct = default)
    {
        var user = await uow.Users.GetFirstOrDefaultAsync(u => u.FirebaseUid == firebaseUid, ct);
        if (user is null) return new ProductsResponseDto([], 0);

        var viewed = await uow.ProductViews.GetAsync(v => v.UserId == user.Id, ct);
        var productIds = viewed.OrderByDescending(v => v.ViewCount).Select(v => v.ProductId).ToHashSet();

        var products = await uow.Products.GetAsync(p => productIds.Contains(p.Id), ct,
            p => p.Brand, p => p.Photos, p => p.StockItems);

        return MapToResponse(products.Take(10).ToList());
    }

    public async Task<ProductsPagedResponseDto> SearchProductsPagedAsync(
        string query, int page = 1, int pageSize = 12, CancellationToken ct = default)
    {
        var q = query.ToLowerInvariant();

        var (products, total) = await uow.Products.GetPaginatedAsync(
            p => p.Title!.ToLower().Contains(q) ||
                 p.Brand!.Name!.ToLower().Contains(q) ||
                 p.Category!.Name!.ToLower().Contains(q),
            page, pageSize, ct,
            p => p.Brand, p => p.Photos, p => p.StockItems, p => p.Category
        );

        return new ProductsPagedResponseDto(
            Items: products.Select(MapToItemDto).ToList(),
            Total: total,
            Page: page,
            PageSize: pageSize
        );
    }

    public async Task<ProductsResponseDto> SearchProductsAsync(string query, CancellationToken ct = default)
    {
        var q = query.ToLowerInvariant();

        var products = await uow.Products.GetAsync(
            p => p.Title!.ToLower().Contains(q) ||
                 p.Brand!.Name!.ToLower().Contains(q) ||
                 p.Category!.Name!.ToLower().Contains(q), ct,
            p => p.Brand, p => p.Photos, p => p.StockItems, p => p.Category);

        return MapToResponse(products.ToList());
    }

    public async Task<ProductDetailDto?> GetProductByIdAsync(Guid id, string? firebaseUid = null, CancellationToken ct = default)
    {
        var product = await uow.Products.GetFirstOrDefaultAsync(p => p.Id == id, ct,
            p => p.Brand, p => p.Photos, p => p.Category, p => p.Color);

        if (product is null) return null;

        var stockItems = await uow.StockItems.GetAsync(
            s => s.ProductId == id && !s.IsDeleted, ct,
            s => s.Size);

        var lowestAsk = stockItems.Select(s => s.Price).DefaultIfEmpty(0).Min();

        var sizes = stockItems
            .Where(s => s.Size is not null)
            .GroupBy(s => s.Size!.SizeEu ?? string.Empty)
            .Select(g => new SizeOptionDto(
                System: "EU",
                Label: $"EU {g.Key}",
                Price: g.Min(s => s.Price),
                XpressShip: false
            )).ToList();

        var colorways = (await uow.Products.GetAsync(
            p => p.BrandId == product.BrandId && p.Id != id, ct,
            p => p.Brand, p => p.Photos, p => p.StockItems))
            .Take(6)
            .Select(p => new ColorwayOptionDto(
                Id: p.Id,
                Name: p.Title ?? string.Empty,
                Image: p.Photos.FirstOrDefault(x => x.IsPrimary)?.PhotoUrl ?? string.Empty,
                Price: p.StockItems.Where(s => !s.IsDeleted).Select(s => s.Price).DefaultIfEmpty(0).Min()
            )).ToList();

        var related = (await uow.Products.GetAsync(
            p => p.CategoryId == product.CategoryId && p.Id != id, ct,
            p => p.Brand, p => p.Photos, p => p.StockItems, p => p.Category))
            .Take(5)
            .Select(MapToItemDto)
            .ToList();

        var orders = await uow.Orders.GetAsync(
            o => o.StockItem != null && o.StockItem.ProductId == id, ct);

        var priceHistory = orders
            .GroupBy(o => o.CreatedAt.ToString("yyyy-MM"))
            .OrderBy(g => g.Key)
            .Select(g => new PriceHistoryPointDto(
                Date: g.Key,
                Price: g.Average(o => o.TotalPrice)
            )).ToList();

        var prices12m = orders.Select(o => o.TotalPrice).ToList();
        var prices3m = orders
            .Where(o => o.CreatedAt >= DateTime.UtcNow.AddMonths(-3))
            .Select(o => o.TotalPrice).ToList();

        var historicalData = new ProductHistoricalDataDto(
            PriceRange12m: prices12m.Count > 0
                ? $"${prices12m.Min():0} - ${prices12m.Max():0}"
                : "N/A",
            PriceRange3m: prices3m.Count > 0
                ? $"${prices3m.Min():0} - ${prices3m.Max():0}"
                : "N/A",
            Volatility: prices12m.Count > 1
                ? $"{(prices12m.Max() - prices12m.Min()) / prices12m.Average() * 100:0}%"
                : "N/A",
            NumberOfSales: stockItems.Count(s => s.StatusItem == ItemStatus.Sold),
            PricePremium: product.RetailPrice > 0
                ? $"{(lowestAsk - (product.RetailPrice ?? 0)) / (product.RetailPrice ?? 1) * 100:0}%"
                : "N/A",
            AvgSalePrice: prices12m.Count > 0 ? prices12m.Average() : 0
        );

        var breadcrumbs = new List<BreadcrumbDto>
        {
            new("Home", "/"),
            new(product.Category?.Name ?? "Sneakers", $"/sneakers/{product.Category?.Name?.ToLower() ?? "all"}"),
            new(product.Brand?.Name ?? string.Empty, $"/brand/{product.Brand?.Name?.ToLower().Replace(" ", "-") ?? string.Empty}"),
        };

        var policies = new ProductPoliciesDto(
            ReturnPolicy: new("Return Policy", "Eligible for return within 14 days. No Fee Resale — resell your purchase without any fees within 90 days of delivery.", Badge: "14 Day Return"),
            BuyerPromise: new("Buyer Promise", "We stand behind every product sold on KickSneak. If we make a mistake, we'll make it right."),
            OurProcess: new("Our Process", "Items are shipped from Sellers to our Verification Centers, where our global team of experts uses a rigorous, multi-step verification process.", Condition: "New")
        );

        return new ProductDetailDto(
            Id: product.Id,
            Name: product.Title ?? string.Empty,
            Subtitle: product.Color is not null
                ? $"{product.Color.Name} ({product.ReleaseDate?.Year.ToString() ?? string.Empty})"
                : string.Empty,
            Brand: product.Brand?.Name ?? string.Empty,
            Price: lowestAsk,
            LastSale: lowestAsk,
            RetailPrice: product.RetailPrice ?? 0,
            Images: product.Photos.Select(p => p.PhotoUrl ?? string.Empty).ToList(),
            Category: product.Category?.Name ?? string.Empty,
            Sold: stockItems.Count(s => s.StatusItem == ItemStatus.Sold),
            IsNew: product.ReleaseDate >= DateTime.UtcNow.AddMonths(-3),
            Sizes: sizes,
            Colorways: colorways,
            PriceHistory: priceHistory,
            RelatedProducts: related,
            Details: new ProductDetailInfoDto(
                Style: product.ProductUniversalId ?? string.Empty,
                Colorway: product.Color?.Name ?? string.Empty,
                RetailPrice: product.RetailPrice ?? 0,
                ReleaseDate: product.ReleaseDate?.ToString("MM/dd/yyyy") ?? string.Empty,
                Description: product.Description ?? string.Empty,
                Accessories: string.Empty
            ),
            Breadcrumbs: breadcrumbs,
            Policies: policies,
            HistoricalData: historicalData
        );
    }

    public async Task TrackViewAsync(string firebaseUid, Guid productId, CancellationToken ct = default)
    {
        var user = await uow.Users.GetFirstOrDefaultAsync(u => u.FirebaseUid == firebaseUid, ct);
        if (user is null) return;

        var existing = await uow.ProductViews.GetFirstOrDefaultAsync(
            v => v.UserId == user.Id && v.ProductId == productId, ct);

        if (existing is not null)
        {
            existing.ViewCount++;
            uow.ProductViews.Update(existing);
        }
        else
        {
            await uow.ProductViews.AddAsync(new ProductViewed
            {
                UserId = user.Id,
                ProductId = productId,
                ViewCount = 1
            }, ct);
        }

        await uow.SaveChangesAsync(ct);
    }

    private ProductsResponseDto MapToResponse(List<Product> products)
    {
        var dtos = products.Select(MapToItemDto).ToList();
        return new ProductsResponseDto(dtos, dtos.Count);
    }

    private static ProductItemDto MapToItemDto(Product p) =>
        new(
            Id: p.Id,
            Name: p.Title ?? string.Empty,
            Brand: p.Brand?.Name ?? string.Empty,
            Price: p.StockItems.Where(s => !s.IsDeleted).Select(s => s.Price).DefaultIfEmpty(0).Min(),
            Image: p.Photos.FirstOrDefault(x => x.IsPrimary)?.PhotoUrl ?? string.Empty,
            Category: p.Category?.Name ?? string.Empty,
            Sold: p.StockItems.Count(s => s.StatusItem == ItemStatus.Sold),
            IsNew: p.ReleaseDate >= DateTime.UtcNow.AddMonths(-3),
            IsFavorite: false
        );
}