namespace KickSneak.Domain.DTOs.Favorites;

public record FavoriteItemDto(
    Guid Id,
    string Name,
    string Brand,
    double Price,
    string Image,
    string Category,
    bool IsFavorite
);
