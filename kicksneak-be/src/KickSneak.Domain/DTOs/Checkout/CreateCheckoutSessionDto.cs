namespace KickSneak.Domain.DTOs.Checkout;

public record CreateCheckoutSessionDto(
    List<Guid> CartItemIds,
    Guid? AddressId,
    string SuccessUrl,
    string CancelUrl,
    CheckoutAddressDto? ShippingAddress
);
