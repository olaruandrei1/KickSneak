namespace KickSneak.Domain.DTOs.Cart;

public record AddToCartDto(
    Guid? StockItemId,
    Guid? UsedItemId,
    Guid? ProductId,
    string? SizeLabel
);