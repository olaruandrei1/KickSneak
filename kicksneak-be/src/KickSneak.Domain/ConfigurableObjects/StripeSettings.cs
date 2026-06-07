namespace KickSneak.Domain.ConfigurableObjects;

public sealed class StripeSettings
{
    public string SecretKey { get; init; } = Environment.GetEnvironmentVariable("STRIPE_SECRET_KEY") ?? string.Empty;

    public string PublishableKey { get; init; } = Environment.GetEnvironmentVariable("STRIPE_PUBLISHABLE_KEY") ?? string.Empty;

    public string WebhookSecret { get; init; } = Environment.GetEnvironmentVariable("STRIPE_WEBHOOK_SECRET") ?? string.Empty;
}