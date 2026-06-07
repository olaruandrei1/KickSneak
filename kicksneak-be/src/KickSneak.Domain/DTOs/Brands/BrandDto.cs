namespace KickSneak.Domain.DTOs.Brands;

public record BrandDto(
    Guid Id,
    string Name,
    string Slug,
    string Logo,
    int ProductCount,
    string Category
);
