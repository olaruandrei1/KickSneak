namespace KickSneak.Notifications.Domain;

/// <summary>
/// A WebPush subscriber loaded from the webpush_subscriptions table.
/// </summary>
public sealed record Subscriber(
    Guid UserId,
    string Endpoint,
    string P256dh,
    string Auth
);
