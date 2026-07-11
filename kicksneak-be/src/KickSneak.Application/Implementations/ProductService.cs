using System.Linq.Expressions;
using KickSneak.Application.Contracts.Application;
using KickSneak.Application.Contracts.Persistence;
using KickSneak.Domain.DTOs.Products;
using KickSneak.Domain.Entities.Catalog;
using KickSneak.Domain.Enums;
using KickSneak.Infrastructure.Contracts;

namespace KickSneak.Application.Implementations;

public sealed class ProductService(IUnitOfWork uow, IAiRecommendationClient aiClient) : IProductService
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
                // AI-personalized recommendations (best-effort; falls through to DB logic on empty/failure).
                var aiIds = await aiClient.GetRecommendedProductIdsAsync(user.Id.ToString(), 6, ct);
                if (aiIds.Count > 0)
                {
                    var aiProducts = await uow.Products.GetAsync(
                        p => aiIds.Contains(p.Id) && !p.IsDeleted, ct,
                        p => p.Brand, p => p.Photos, p => p.StockItems, p => p.Category);

                    var ordered = aiIds
                        .Select(id => aiProducts.FirstOrDefault(p => p.Id == id))
                        .Where(p => p is not null)
                        .Cast<Product>()
                        .ToList();

                    if (ordered.Count > 0)
                        return new RecommendedProductsDto("Recommended For You", ordered.Select(MapToItemDto).ToList());
                }

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

    // Lower-cased, de-duplicated, non-empty names; returns null when there is nothing to filter on.
    private static string[]? NormalizeNames(string[]? values)
    {
        var normalized = values?
            .Where(v => !string.IsNullOrWhiteSpace(v))
            .Select(v => v.Trim().ToLowerInvariant())
            .Distinct()
            .ToArray();
        return normalized is { Length: > 0 } ? normalized : null;
    }

    public async Task<ProductsPagedResponseDto> BrowseProductsAsync(ProductBrowseQuery query, CancellationToken ct = default)
    {
        var q = string.IsNullOrWhiteSpace(query.Q) || query.Q!.Trim().Length < 2
            ? null
            : query.Q!.Trim().ToLowerInvariant();

        // Filters arrive as display names (multi-select) from the storefront UI.
        var brandNames = NormalizeNames(query.Brand);
        var categoryNames = NormalizeNames(query.Category);
        var colorNames = NormalizeNames(query.Color);
        var genderNames = NormalizeNames(query.Gender);
        var min = query.MinPrice;
        var max = query.MaxPrice;

        Expression<Func<Product, bool>> predicate = p =>
            !p.IsDeleted
            && (q == null
                || (p.Title != null && p.Title.ToLower().Contains(q))
                || (p.Brand != null && p.Brand.Name != null && p.Brand.Name.ToLower().Contains(q))
                || (p.Category != null && p.Category.Name != null && p.Category.Name.ToLower().Contains(q)))
            && (brandNames == null || (p.Brand != null && p.Brand.Name != null && brandNames.Contains(p.Brand.Name.ToLower())))
            && (categoryNames == null || (p.Category != null && p.Category.Name != null && categoryNames.Contains(p.Category.Name.ToLower())))
            && (colorNames == null || (p.Color != null && p.Color.Name != null && colorNames.Contains(p.Color.Name.ToLower())))
            && (genderNames == null || (p.Gender != null && p.Gender.Name != null && genderNames.Contains(p.Gender.Name.ToLower())))
            && ((min == null && max == null)
                || p.StockItems.Any(s => !s.IsDeleted
                    && (min == null || s.Price >= min)
                    && (max == null || s.Price <= max)));

        // Default order: newest first (CreatedAt desc). Price sorts are applied per-page below.
        var (products, total) = await uow.Products.GetPaginatedOrderedAsync(
            predicate,
            p => p.CreatedAt,
            descending: true,
            query.Page, query.PageSize, ct,
            p => p.Brand, p => p.Photos, p => p.StockItems, p => p.Category);

        var items = products.Select(MapToItemDto).ToList();

        items = query.Sort switch
        {
            "price_asc" => items.OrderBy(i => i.Price).ToList(),
            "price_desc" => items.OrderByDescending(i => i.Price).ToList(),
            _ => items
        };

        // Facets: full lookup lists so the filter UI can render all options.
        var brands = (await uow.Brands.GetAsync(b => !b.IsDeleted, ct))
            .Select(b => new FacetItemDto(b.Id, b.Name ?? string.Empty)).OrderBy(f => f.Name).ToList();
        var categories = (await uow.Categories.GetAsync(c => !c.IsDeleted, ct))
            .Select(c => new FacetItemDto(c.Id, c.Name ?? string.Empty)).OrderBy(f => f.Name).ToList();
        var colors = (await uow.Colors.GetAsync(c => !c.IsDeleted, ct))
            .Select(c => new FacetItemDto(c.Id, c.Name ?? string.Empty)).OrderBy(f => f.Name).ToList();
        var genders = (await uow.Genders.GetAsync(g => !g.IsDeleted, ct))
            .Select(g => new FacetItemDto(g.Id, g.Name ?? string.Empty)).OrderBy(f => f.Name).ToList();

        var activeStock = await uow.StockItems.GetAsync(s => !s.IsDeleted && s.StatusItem == ItemStatus.Active, ct);
        var priceRange = activeStock.Count > 0
            ? new PriceRangeDto(activeStock.Min(s => s.Price), activeStock.Max(s => s.Price))
            : new PriceRangeDto(0, 0);

        var facets = new ProductFacetsDto(brands, categories, colors, genders, priceRange);

        // Detected: prefill hint when the query text matches a brand / category name.
        DetectedFiltersDto? detected = null;
        if (q != null)
        {
            var brandMatch = brands.FirstOrDefault(b => b.Name.ToLowerInvariant().Contains(q));
            var catMatch = categories.FirstOrDefault(c => c.Name.ToLowerInvariant().Contains(q));
            if (brandMatch is not null || catMatch is not null)
                detected = new DetectedFiltersDto(brandMatch?.Id, brandMatch?.Name, catMatch?.Id);
        }

        return new ProductsPagedResponseDto(items, total, query.Page, query.PageSize, facets, detected);
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
            .GroupBy(s => s.Size!.Id)
            .Select(g =>
            {
                var sz = g.First().Size!;
                return new SizeOptionDto(
                    SizeId: sz.Id,
                    Label: sz.SizeLabel ?? $"EU {sz.SizeEu}",
                    System: "EU",
                    Us: sz.SizeUs,
                    Eu: sz.SizeEu,
                    Uk: sz.SizeUk,
                    Cm: sz.SizeCm?.ToString("0.#"),
                    Price: g.Min(s => s.Price),
                    Available: g.Any(s => s.StatusItem == ItemStatus.Active),
                    XpressShip: false
                );
            })
            .OrderBy(s => s.Eu)
            .ToList();

        // B17: preselect the user's saved footwear size (matched on EU) if in stock
        Guid? preferredSizeId = null;
        if (firebaseUid is not null)
        {
            var prefUser = await uow.Users.GetFirstOrDefaultAsync(u => u.FirebaseUid == firebaseUid, ct);
            if (prefUser is not null)
            {
                var pref = await uow.UserSizePreferences.GetFirstOrDefaultAsync(p => p.UserId == prefUser.Id, ct);
                if (pref?.FootwearEU is { Length: > 0 } prefEu)
                    preferredSizeId = sizes.FirstOrDefault(s => s.Eu == prefEu)?.SizeId;
            }
        }

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

        // Historical stats are derived from real orders on this product. Each window is
        // filtered to match its UI label ("Last 12 Months" / "Last 3 Months") so the
        // displayed value always agrees with the heading above it.
        var prices12m = orders
            .Where(o => o.CreatedAt >= DateTime.UtcNow.AddMonths(-12))
            .Select(o => o.TotalPrice).ToList();
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
            NumberOfSales: prices3m.Count,
            PricePremium: product.RetailPrice > 0
                ? $"{(lowestAsk - (product.RetailPrice ?? 0)) / (product.RetailPrice ?? 1) * 100:0}%"
                : "N/A",
            AvgSalePrice: prices3m.Count > 0 ? prices3m.Average() : 0
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
            PreferredSizeId: preferredSizeId,
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