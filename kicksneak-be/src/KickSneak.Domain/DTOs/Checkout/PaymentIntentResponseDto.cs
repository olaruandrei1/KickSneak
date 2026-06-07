namespace KickSneak.Domain.DTOs.Checkout;

public record PaymentIntentResponseDto(
    string ClientSecret,
    string PaymentIntentId,
    long Amount,
    string Currency
);
