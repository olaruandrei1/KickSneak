namespace KickSneak.Domain.DTOs.Search;

public sealed class ProductSearchDocument
{
    public Guid Id { get; set; }
    public string Title { get; set; } = string.Empty;
    public string Brand { get; set; } = string.Empty;
    public string Category { get; set; } = string.Empty;
    public string Color { get; set; } = string.Empty;
    public string Material { get; set; } = string.Empty;
    public string Gender { get; set; } = string.Empty;
    public string Fit { get; set; } = string.Empty;
    public double RetailPrice { get; set; }
    public double LowestAsk { get; set; }
    public string Image { get; set; } = string.Empty;
    public string ProductUniversalId { get; set; } = string.Empty;
    public string ShortDescription { get; set; } = string.Empty;
    public int SoldCount { get; set; }
    public bool IsNew { get; set; }
    public DateTime? ReleaseDate { get; set; }
    public DateTime IndexedAt { get; set; } = DateTime.UtcNow;
}

public sealed record SearchProductsRequest(
    string Query,
    string? Brand = null,
    string? Category = null,
    string? Gender = null,
    double? MinPrice = null,
    double? MaxPrice = null,
    int Size = 10
);

public sealed record SearchProductHit(
    Guid Id,
    string Title,
    string Brand,
    string Category,
    double Price,
    string Image,
    int Sold,
    bool IsNew,
    double Score
);

public sealed record SearchProductsResponse(
    List<SearchProductHit> Items,
    int Total,
    long TookMs
);