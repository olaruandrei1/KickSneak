namespace KickSneak.Domain.DTOs.Products;

public record FacetItemDto(Guid Id, string Name);

public record PriceRangeDto(double Min, double Max);

public record ProductFacetsDto(
    List<FacetItemDto> Brands,
    List<FacetItemDto> Categories,
    List<FacetItemDto> Colors,
    List<FacetItemDto> Genders,
    PriceRangeDto PriceRange
);

public record DetectedFiltersDto(Guid? BrandId, string? BrandName, Guid? CategoryId);

public record ProductBrowseQuery(
    string? Q = null,
    string[]? Brand = null,
    string[]? Category = null,
    string[]? Color = null,
    string[]? Gender = null,
    double? MinPrice = null,
    double? MaxPrice = null,
    string? Sort = null,      // "newest" (default) | "price_asc" | "price_desc"
    int Page = 1,
    int PageSize = 24
);

public record ProductsPagedResponseDto(
    List<ProductItemDto> Items,
    int Total,
    int Page,
    int PageSize,
    ProductFacetsDto? Facets = null,
    DetectedFiltersDto? Detected = null
);
