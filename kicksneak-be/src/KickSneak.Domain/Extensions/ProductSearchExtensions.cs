using KickSneak.Domain.DTOs.Search;
using KickSneak.Domain.Entities.Catalog;
using KickSneak.Domain.Enums;

namespace KickSneak.Domain.Extensions;

public static class ProductSearchExtensions
{
    public static ProductSearchDocument ToSearchDocument(this Product p) => new()
    {
        Id = p.Id,
        Title = p.Title ?? string.Empty,
        Brand = p.Brand?.Name ?? string.Empty,
        Category = p.Category?.Name ?? string.Empty,
        Color = p.Color?.Name ?? string.Empty,
        Material = p.Material?.Name ?? string.Empty,
        Gender = p.Gender?.Name ?? string.Empty,
        Fit = p.Fit?.Name ?? string.Empty,
        RetailPrice = p.RetailPrice ?? 0,
        LowestAsk = p.StockItems
            .Where(s => !s.IsDeleted && s.StatusItem == ItemStatus.Active)
            .Select(s => s.Price)
            .DefaultIfEmpty(0)
            .Min(),
        Image = p.Photos.FirstOrDefault(ph => ph.IsPrimary)?.PhotoUrl ?? string.Empty,
        ProductUniversalId = p.ProductUniversalId ?? string.Empty,
        ShortDescription = p.ShortDescription ?? string.Empty,
        SoldCount = p.StockItems.Count(s => s.StatusItem == ItemStatus.Sold),
        IsNew = p.ReleaseDate >= DateTime.UtcNow.AddMonths(-3),
        ReleaseDate = p.ReleaseDate
    };
}