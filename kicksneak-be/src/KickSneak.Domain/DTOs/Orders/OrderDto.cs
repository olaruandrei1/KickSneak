namespace KickSneak.Domain.DTOs.Orders;

public record OrderDto(
    Guid Id,
    string Date,
    string Status,
    double Total,
    List<OrderItemDto> Items,
    string? Tracking,
    string? Address
);
