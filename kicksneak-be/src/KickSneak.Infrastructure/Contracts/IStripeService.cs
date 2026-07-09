namespace KickSneak.Infrastructure.Contracts;

public interface IStripeService
{
    Task<string> CreatePaymentIntentAsync(long amount, string currency, string? metadata = null, CancellationToken ct = default);
    Task<string> CreateCheckoutSessionAsync(string successUrl, string cancelUrl, long amount, string productName, IDictionary<string, string>? metadata = null, CancellationToken ct = default);
}
