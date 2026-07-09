namespace KickSneak.Notifications.Domain;

/// <summary>
/// A notification that a rule wants to send.
/// The job will check notification_settings before actually sending.
/// </summary>
public sealed record PendingNotification(
    Guid UserId,
    string Type,       // "PriceDrop", "NewReleases", "OrderUpdates", "Marketing"
    string Title,
    string Body,
    string? Url = "/"
);
