namespace KickSneak.Domain.DTOs.Products;

public record SizeOptionDto(string System, string Label, double? Price, bool XpressShip);
public record ColorwayOptionDto(Guid Id, string Name, string Image, double Price);
public record PriceHistoryPointDto(string Date, double Price);

public record BreadcrumbDto(string Label, string Href);

public record ProductPoliciesDto(
    ProductPolicyDto ReturnPolicy,
    ProductPolicyDto BuyerPromise,
    ProductPolicyDto OurProcess
);

public record ProductPolicyDto(string Title, string Content, string? Badge = null, string? Condition = null);

public record ProductHistoricalDataDto(
    string PriceRange12m,
    string PriceRange3m,
    string Volatility,
    int NumberOfSales,
    string PricePremium,
    double AvgSalePrice
);

public record ProductDetailInfoDto(
    string Style,
    string Colorway,
    double RetailPrice,
    string ReleaseDate,
    string Description,
    string Accessories
);

public record ProductDetailDto(
    Guid Id,
    string Name,
    string Subtitle,
    string Brand,
    double Price,
    double LastSale,
    double RetailPrice,
    List<string> Images,
    string Category,
    int Sold,
    bool IsNew,
    List<SizeOptionDto> Sizes,
    List<ColorwayOptionDto> Colorways,
    List<PriceHistoryPointDto> PriceHistory,
    List<ProductItemDto> RelatedProducts,
    ProductDetailInfoDto Details,
    List<BreadcrumbDto> Breadcrumbs,
    ProductPoliciesDto Policies,
    ProductHistoricalDataDto HistoricalData
);