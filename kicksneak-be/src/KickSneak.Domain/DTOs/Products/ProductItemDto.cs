namespace KickSneak.Domain.DTOs.Products;

public record ProductItemDto(
    Guid Id,
    string Name,
    string Brand,
    double Price,
    string Image,
    string Category,
    int? Sold,
    bool IsNew,
    bool IsFavorite
);
