namespace KickSneak.Domain.DTOs.Cart;

public record CartItemDto(
    Guid Id,
    string Name,
    string Brand,
    double Price,
    string Image,
    string Category,
    string Size,
    int Quantity
);
