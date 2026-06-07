namespace KickSneak.Domain.DTOs.Orders;

public record OrderItemDto(
    string Name,
    string Brand,
    string Size,
    double Price,
    string Image
);
