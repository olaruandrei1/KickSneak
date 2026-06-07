namespace KickSneak.Domain.DTOs.Checkout;

public record CreatePaymentIntentDto(
    Guid CartItemId,
    Guid? StockItemId,
    Guid? UsedItemId,
    Guid? AddressId
);
