using KickSneak.Infrastructure.Contracts;
using Stripe;
using Stripe.Checkout;

namespace KickSneak.Infrastructure.Implementations;

public class StripeService : IStripeService
{
    public async Task<string> CreatePaymentIntentAsync(long amount, string currency, string? metadata = null, CancellationToken ct = default)
    {
        PaymentIntentCreateOptions options = new()
        {
            Amount = amount,
            Currency = currency,
            AutomaticPaymentMethods = new PaymentIntentAutomaticPaymentMethodsOptions { Enabled = true }
        };

        PaymentIntentService service = new();

        PaymentIntent intent = await service.CreateAsync(options, cancellationToken: ct);

        return intent.ClientSecret;
    }

    public async Task<string> CreateCheckoutSessionAsync(string successUrl, string cancelUrl, long amount, string productName, CancellationToken ct = default)
    {
        SessionCreateOptions options = new()
        {
            PaymentMethodTypes = ["card"],
            LineItems =
            [
                new SessionLineItemOptions
                {
                    PriceData = new SessionLineItemPriceDataOptions
                    {
                        Currency = "usd",
                        UnitAmount = amount,
                        ProductData = new SessionLineItemPriceDataProductDataOptions { Name = productName }
                    },
                    Quantity = 1
                }
            ],
            Mode = "payment",
            SuccessUrl = successUrl,
            CancelUrl = cancelUrl
        };

        SessionService service = new();
        
        Session session = await service.CreateAsync(options, cancellationToken: ct);

        return session.Url;
    }
}
