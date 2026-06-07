using KickSneak.Domain.DTOs.Checkout;

namespace KickSneak.Application.Contracts.Application;

public interface ICheckoutService
{
    Task<PaymentIntentResponseDto?> CreatePaymentIntentAsync(string firebaseUid, CreatePaymentIntentDto dto, CancellationToken ct = default);
    Task<CheckoutSessionResponseDto?> CreateCheckoutSessionAsync(string firebaseUid, CreateCheckoutSessionDto dto, CancellationToken ct = default);
    Task HandleWebhookAsync(string payload, string stripeSignature, CancellationToken ct = default);
}
