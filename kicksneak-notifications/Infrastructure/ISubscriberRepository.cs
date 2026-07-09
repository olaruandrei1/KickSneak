using KickSneak.Notifications.Domain;

namespace KickSneak.Notifications.Infrastructure;

public interface ISubscriberRepository
{
    /// <summary>Get all active WebPush subscriptions for a user.</summary>
    Task<IReadOnlyList<Subscriber>> GetSubscribersForUserAsync(Guid userId, CancellationToken ct);

    /// <summary>Check if a notification type is enabled for a user. Returns true if no settings row exists (default on).</summary>
    Task<bool> IsNotificationTypeEnabledAsync(Guid userId, string type, CancellationToken ct);

    /// <summary>Get all user IDs that have at least one active subscription.</summary>
    Task<IReadOnlyList<Guid>> GetAllSubscribedUserIdsAsync(CancellationToken ct);

    /// <summary>Mark a subscription as deleted (expired/gone).</summary>
    Task MarkSubscriptionDeletedAsync(string endpoint, CancellationToken ct);
}
